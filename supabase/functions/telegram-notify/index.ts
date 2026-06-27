import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8324049083:AAHSHm4p_xLUBPaTeAY30vGaLkc0CEpodik';
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || '5222135100';

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

    const body = await req.json().catch(() => null);
    if (!body || !body.orderId || !body.type) {
      return new Response(JSON.stringify({ error: 'orderId dan type wajib diisi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chatId = String(body.chatId || TELEGRAM_CHAT_ID);
    const type = String(body.type);
    const orderId = String(body.orderId);
    const reason = body.reason ? String(body.reason) : undefined;
    const status = body.status ? String(body.status) : undefined;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order tidak ditemukan' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const items = (order.order_items || []).map((item: any) => `- ${item.product_name} x${item.quantity}`).join('\n');
    let text = '';

    if (type === 'new_order') {
      text = [
        '📦 Pesanan Masuk',
        `Invoice: ${order.invoice_number}`,
        `UID: ${order.uid}`,
        order.server ? `Server: ${order.server}` : null,
        `WhatsApp: ${order.whatsapp}`,
        `Total: ${formatCurrency(order.total)}`,
        `Status: ${order.status} / ${order.payment_status}`,
        '',
        'Produk:',
        items || '- Tidak ada item',
        '',
        'Balas pesan ini dengan:',
        '• selesai',
        '• batalkan',
        '• pending',
        '• diproses',
        '',
        `ORDER_ID: ${order.id}`,
      ]
        .filter(Boolean)
        .join('\n');
    } else if (type === 'order_cancelled') {
      text = [
        '❌ Pesanan Dibatalkan oleh pengguna',
        `Invoice: ${order.invoice_number}`,
        `UID: ${order.uid}`,
        `Total: ${formatCurrency(order.total)}`,
        `Status Web: cancelled`,
        reason ? `Alasan: ${reason}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    } else if (type === 'order_status') {
      if (!status) {
        return new Response(JSON.stringify({ error: 'status wajib diisi untuk type order_status' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      text = [
        'ℹ️ Update Status Pesanan',
        `Invoice: ${order.invoice_number}`,
        `UID: ${order.uid}`,
        `Total: ${formatCurrency(order.total)}`,
        `Status Web: ${status}`,
        reason ? `Catatan: ${reason}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    } else {
      return new Response(JSON.stringify({ error: 'type tidak valid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await sendTelegramMessage(chatId, text);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Telegram notify error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Telegram notification failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
