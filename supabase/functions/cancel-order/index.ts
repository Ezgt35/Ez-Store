import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || '';

async function sendTelegramMessage(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body || !body.ok) {
    console.error('Telegram send failed', body);
  }
}

function formatCurrency(value: unknown) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId || '').trim();
    const invoiceNumber = String(body.invoiceNumber || body.invoice_number || '').trim();
    const reason = String(body.reason || 'Dibatalkan oleh pengguna').trim();

    if (!orderId || !invoiceNumber) {
      return new Response(JSON.stringify({ error: 'orderId dan invoiceNumber wajib diisi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('invoice_number', invoiceNumber)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Pesanan tidak ditemukan' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (order.status !== 'pending' || order.payment_status !== 'waiting_payment') {
      return new Response(JSON.stringify({ error: 'Pesanan tidak bisa dibatalkan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    for (const item of orderItems || []) {
      const { data: productData } = await supabase
        .from('products')
        .select('id, stock')
        .eq('id', item.product_id)
        .maybeSingle();

      if (productData && productData.stock !== -1) {
        const nextStock = Number(productData.stock) + Number(item.quantity);
        await supabase
          .from('products')
          .update({ stock: nextStock, updated_at: new Date().toISOString() })
          .eq('id', item.product_id);
      }
    }

    if (payment) {
      await supabase
        .from('payments')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', payment.id);
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError || !updatedOrder) {
      return new Response(JSON.stringify({ error: 'Gagal membatalkan pesanan' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await sendTelegramMessage([
      '❌ Pesanan Dibatalkan',
      `Invoice: ${updatedOrder.invoice_number}`,
      `UID: ${updatedOrder.uid}`,
      `Total: ${formatCurrency(updatedOrder.total)}`,
      `Alasan: ${reason}`,
    ].join('\n'));

    return new Response(JSON.stringify({ order: updatedOrder }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return new Response(JSON.stringify({ error: 'Gagal memproses pembatalan' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
