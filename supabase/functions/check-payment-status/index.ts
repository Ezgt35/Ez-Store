import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8324049083:AAHSHm4p_xLUBPaTeAY30vGaLkc0CEpodik';
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || '5222135100';

async function sendTelegramMessage(text: string) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || !data.ok) {
    throw new Error(`Telegram failed: ${JSON.stringify(data)}`);
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

interface CheckPaymentStatusRequest {
  orderId?: string;
  paymentId?: string;
}

function mapStatus(status: string | undefined) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'paid' || normalized === 'success' || normalized === 'successful') return 'paid';
  if (normalized === 'expired' || normalized === 'expired_at') return 'expired';
  if (normalized === 'failed' || normalized === 'cancelled' || normalized === 'canceled') return 'failed';
  return 'pending';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fersakuSecretKey = Deno.env.get('FERSAKU_SECRET_KEY') || Deno.env.get('FERSAKU_API_KEY');
    const fersakuApiUrl = (Deno.env.get('FERSAKU_API_URL') || 'https://fersaku.com/api/v1').replace(/\/$/, '');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: CheckPaymentStatusRequest = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { orderId, paymentId } = body;

    if (!orderId && !paymentId) {
      return new Response(
        JSON.stringify({ error: 'orderId atau paymentId wajib diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentQuery = orderId
      ? supabase.from('payments').select('*').eq('order_id', orderId).maybeSingle()
      : supabase.from('payments').select('*').eq('id', paymentId!).maybeSingle();

    const { data: payment, error: paymentError } = await paymentQuery;

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Pembayaran tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const providerPaymentId = String(
      payment.raw_response?.provider_payment_id || payment.raw_response?.id || payment.raw_response?.payment_id || payment.reference_id || ''
    );

    if (!providerPaymentId || !fersakuSecretKey) {
      return new Response(
        JSON.stringify({ payment, order: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`${fersakuApiUrl}/payments/${providerPaymentId}/check-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fersakuSecretKey}`,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Gagal memeriksa status Fersaku', details: result }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const updatedStatus = mapStatus(result.status || result.data?.status || result.payment?.status);
    const now = new Date().toISOString();
    const previousStatus = payment.status;

    const updateData: Record<string, unknown> = {
      status: updatedStatus,
      updated_at: now,
      raw_response: {
        ...(payment.raw_response || {}),
        status_check: result,
      },
    };

    if (updatedStatus === 'paid') {
      updateData.paid_at = result.paid_at || result.data?.paid_at || now;
    }

    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment.id)
      .select()
      .single();

    if (!updateError && updatedPayment && previousStatus !== 'paid' && updatedStatus === 'paid') {
      await sendTelegramMessage([
        '✅ Pembayaran Diterima (Polling)',
        `Order ID: ${updatedPayment.order_id}`,
        `Total: ${formatCurrency(updatedPayment.amount)}`,
        'Status Web: processing',
      ].join('\n'));
    }

    if (updateError || !updatedPayment) {
      return new Response(
        JSON.stringify({ error: 'Gagal memperbarui status pembayaran', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updatedOrder = null;
    if (updatedStatus === 'paid') {
      const { data: orderData } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'processing',
          updated_at: now,
        })
        .eq('id', payment.order_id)
        .select()
        .single();

      updatedOrder = orderData;
    } else if (updatedStatus === 'expired') {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', payment.order_id);

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
            .update({ stock: nextStock, updated_at: now })
            .eq('id', item.product_id);
        }
      }

      const { data: orderData } = await supabase
        .from('orders')
        .update({
          payment_status: 'expired',
          status: 'cancelled',
          updated_at: now,
        })
        .eq('id', payment.order_id)
        .select()
        .single();

      updatedOrder = orderData;
    } else if (updatedStatus === 'failed') {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', payment.order_id);

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
            .update({ stock: nextStock, updated_at: now })
            .eq('id', item.product_id);
        }
      }

      const { data: orderData } = await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status: 'cancelled',
          updated_at: now,
        })
        .eq('id', payment.order_id)
        .select()
        .single();

      updatedOrder = orderData;
    }

    return new Response(
      JSON.stringify({ payment: updatedPayment, order: updatedOrder }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Check payment status error:', error);
    return new Response(
      JSON.stringify({ error: 'Gagal memeriksa status pembayaran' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
