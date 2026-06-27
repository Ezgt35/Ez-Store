import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8324049083:AAHSHm4p_xLUBPaTeAY30vGaLkc0CEpodik';
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || '5222135100';
const SETTINGS_KEY = 'telegram_last_update_id';

function formatCurrency(value: unknown) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

async function sendTelegramMessage(chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body || !body.ok) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(body)}`);
  }
  return body;
}

function normalizeCommand(text: string): 'completed' | 'cancelled' | 'pending' | 'processing' | null {
  const normalized = text.trim().toLowerCase();
  if (/\bselesai\b|\bcompleted\b|\bdone\b/.test(normalized)) return 'completed';
  if (/\bbatalkan\b|\bbatal\b|\bcancelled\b|\bcancel\b/.test(normalized)) return 'cancelled';
  if (/\bpending\b/.test(normalized)) return 'pending';
  if (/\bdiproses\b|\bprocessing\b/.test(normalized)) return 'processing';
  return null;
}

function extractInvoiceOrId(text: string) {
  const invoiceMatch = text.match(/Invoice:\s*([A-Za-z0-9_-]+)/i);
  if (invoiceMatch) return { type: 'invoice', value: invoiceMatch[1] };
  const idMatch = text.match(/ORDER_ID:\s*([A-Za-z0-9-]+)/i);
  if (idMatch) return { type: 'id', value: idMatch[1] };
  return null;
}

async function getLastUpdateId(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();
  if (error || !data || !data.value) return 0;
  return Number(data.value) || 0;
}

async function setLastUpdateId(supabase: ReturnType<typeof createClient>, value: number) {
  await supabase.from('settings').upsert({ key: SETTINGS_KEY, value: String(value), updated_at: new Date().toISOString() });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const functionSecret = Deno.env.get('FUNCTION_SECRET');
    const incomingSecret = req.headers.get('X-Function-Secret') || '';
    if (functionSecret && incomingSecret !== functionSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const overrideOffset = body.offset ? Number(body.offset) : undefined;

    const lastUpdateId = overrideOffset || (await getLastUpdateId(supabase));
    const offset = lastUpdateId > 0 ? lastUpdateId + 1 : 0;

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=0&limit=100`);
    const updatePayload = await response.json().catch(() => null);
    if (!response.ok || !updatePayload || !updatePayload.ok) {
      throw new Error(`Telegram getUpdates failed: ${JSON.stringify(updatePayload)}`);
    }

    const updates = updatePayload.result || [];
    let processed = 0;
    let skipped = 0;
    let newestId = lastUpdateId;
    const messages: string[] = [];

    for (const update of updates) {
      newestId = Math.max(newestId, update.update_id || 0);

      const message = update.message;
      if (!message || !message.reply_to_message || !message.text) {
        skipped += 1;
        continue;
      }

      const replyText = String(message.text);
      const command = normalizeCommand(replyText);
      if (!command) {
        skipped += 1;
        continue;
      }

      const reference = extractInvoiceOrId(String(message.reply_to_message.text));
      if (!reference) {
        skipped += 1;
        continue;
      }

      let orderQuery = supabase.from('orders').select('*');
      if (reference.type === 'invoice') {
        orderQuery = orderQuery.eq('invoice_number', reference.value);
      } else {
        orderQuery = orderQuery.eq('id', reference.value);
      }

      const { data: order, error: orderError } = await orderQuery.maybeSingle();
      if (orderError || !order) {
        messages.push(`Order tidak ditemukan untuk referensi ${reference.value}`);
        skipped += 1;
        continue;
      }

      const updates: Record<string, unknown> = {
        status: command,
        updated_at: new Date().toISOString(),
      };
      if (command === 'cancelled') {
        updates.payment_status = 'failed';
      }

      if (order.status === command && (command !== 'cancelled' || order.payment_status === 'failed')) {
        messages.push(`Invoice ${order.invoice_number} sudah berstatus ${command}`);
        skipped += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', order.id);

      if (updateError) {
        messages.push(`Gagal memperbarui order ${order.invoice_number}`);
        skipped += 1;
        continue;
      }

      if (command === 'cancelled') {
        await supabase
          .from('payments')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('order_id', order.id);
      }

      processed += 1;
      messages.push(`Invoice ${order.invoice_number} diubah ke ${command}`);

      const statusText = command === 'completed' ? 'selesai' : command === 'cancelled' ? 'dibatalkan' : command;
      const text = [
        '✅ Status Pesanan Diperbarui',
        `Invoice: ${order.invoice_number}`,
        `Status Web: ${statusText}`,
      ]
        .filter(Boolean)
        .join('\n');
      await sendTelegramMessage(TELEGRAM_CHAT_ID, text);
    }

    if (updates.length > 0) {
      await setLastUpdateId(supabase, newestId + 1);
    }

    return new Response(JSON.stringify({ success: true, processed, skipped, messages }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Telegram updates error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Telegram updates failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
