import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FUNCTION_SECRET = Deno.env.get('FUNCTION_SECRET') || '';
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

async function createPayment(orderId: string, amount: number) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Function-Secret': FUNCTION_SECRET,
    },
    body: JSON.stringify({ orderId, amount }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result || result.error) {
    const message = result?.error || 'Failed to create payment';
    throw new Error(message);
  }

  return result.payment;
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
    const uid = String(body.uid || '').trim();
    const whatsapp = String(body.whatsapp || '').trim();
    const productId = String(body.productId || '').trim();
    const quantity = Number(body.quantity || 0);
    const voucherCode = body.voucherCode ? String(body.voucherCode).trim() : '';
    const server = body.server ? String(body.server).trim() : null;
    const email = body.email ? String(body.email).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!uid || !whatsapp || !productId || quantity <= 0) {
      return new Response(JSON.stringify({ error: 'uid, whatsapp, productId dan quantity wajib diisi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (productError || !product || !product.is_active) {
      return new Response(JSON.stringify({ error: 'Produk tidak ditemukan atau tidak aktif' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (product.stock !== -1 && product.stock < quantity) {
      return new Response(JSON.stringify({ error: 'Stok produk tidak mencukupi' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let voucher = null;
    let discountAmount = 0;

    if (voucherCode) {
      const now = new Date().toISOString();
      const { data: voucherData, error: voucherError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode)
        .eq('is_active', true)
        .lte('valid_from', now)
        .gte('valid_until', now)
        .maybeSingle();

      if (voucherError || !voucherData) {
        return new Response(JSON.stringify({ error: 'Voucher tidak valid atau tidak aktif' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (voucherData.usage_limit !== -1 && voucherData.used_count >= voucherData.usage_limit) {
        return new Response(JSON.stringify({ error: 'Voucher sudah tidak dapat digunakan lagi' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      voucher = voucherData;
      const subtotal = Number(product.final_price) * quantity;
      discountAmount = voucher.discount_type === 'percent'
        ? Math.round(subtotal * (Number(voucher.discount_value) / 100))
        : Number(voucher.discount_value);
    }

    const subtotal = Number(product.final_price) * quantity;
    const discount = Math.min(discountAmount, subtotal);
    const total = Math.max(0, subtotal - discount);

    const invoiceNumber = `EZ${new Date().toISOString().slice(2,10).replace(/-/g, '')}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        invoice_number: invoiceNumber,
        uid,
        server,
        whatsapp: whatsapp.replace(/\D/g, ''),
        email,
        status: 'pending',
        payment_status: 'waiting_payment',
        subtotal,
        discount,
        total,
        voucher_id: voucher?.id || null,
        notes,
      }])
      .select()
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Gagal membuat pesanan' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: orderItem, error: orderItemError } = await supabase
      .from('order_items')
      .insert([{
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        quantity,
        price: Number(product.final_price),
        total: subtotal,
      }])
      .select()
      .single();

    if (orderItemError || !orderItem) {
      await supabase.from('orders').delete().eq('id', order.id);
      return new Response(JSON.stringify({ error: 'Gagal menyimpan item pesanan' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (product.stock !== -1) {
      const nextStock = Math.max(0, Number(product.stock) - quantity);
      await supabase
        .from('products')
        .update({ stock: nextStock, updated_at: new Date().toISOString() })
        .eq('id', product.id);
    }

    if (voucher) {
      await supabase
        .from('vouchers')
        .update({ used_count: voucher.used_count + 1 })
        .eq('id', voucher.id);
    }

    try {
      const payment = await createPayment(order.id, total);
      await sendTelegramMessage([
        '📦 Pesanan Masuk',
        `Invoice: ${order.invoice_number}`,
        `UID: ${order.uid}`,
        order.server ? `Server: ${order.server}` : null,
        `WhatsApp: ${order.whatsapp}`,
        `Total: ${formatCurrency(order.total)}`,
        `Status: ${order.status} / ${order.payment_status}`,
        '',
        'Produk:',
        `- ${orderItem.product_name} x${orderItem.quantity}`,
        '',
        'Balas pesan ini dengan:',
        '• selesai',
        '• batalkan',
        '• pending',
        '• diproses',
        '',
        `ORDER_ID: ${order.id}`,
      ].filter(Boolean).join('\n'));

      return new Response(JSON.stringify({ order, payment }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (paymentError) {
      await supabase.from('order_items').delete().eq('order_id', order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      return new Response(JSON.stringify({ error: paymentError instanceof Error ? paymentError.message : 'Gagal membuat pembayaran' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({ error: 'Gagal memproses checkout' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
