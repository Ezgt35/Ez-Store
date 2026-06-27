import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8324049083:AAHSHm4p_xLUBPaTeAY30vGaLkc0CEpodik';
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || '5222135100';

async function generateSignature(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
  return new Uint8Array(signatureBuffer);
}

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

function toHex(buffer: Uint8Array) {
  return Array.from(buffer, (value) => value.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fersakuWebhookSecret = Deno.env.get('FERSAKU_WEBHOOK_SECRET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const signature = req.headers.get('X-Webhook-Signature') || req.headers.get('X-Signature') || req.headers.get('X-Fersaku-Signature');

    if (fersakuWebhookSecret) {
      if (!signature) {
        return new Response(JSON.stringify({ error: 'Missing webhook signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const expectedSignature = await generateSignature(rawBody, fersakuWebhookSecret);
      const normalizedSignature = signature.replace(/^sha256=/i, '').trim();
      const expectedHex = toHex(expectedSignature);

      if (normalizedSignature !== expectedHex && normalizedSignature !== `sha256=${expectedHex}`) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const body = JSON.parse(rawBody);
    const event = String(body.event || '').toLowerCase();
    const payloadStatus = String(body.status || body.data?.status || body.payment?.status || '').toLowerCase();
    const paymentId = body.payment_id || body.id || body.payment?.id || body.transaction_id;
    const orderId = body.order_id || body.external_id || body.reference_id;

    function mapWebhookStatus(status: string) {
      const normalized = (status || '').toLowerCase();
      if (/(paid|success|successful|completed|settled)/.test(normalized)) return 'paid';
      if (/(expired|expired_at|timeout|timed_out)/.test(normalized)) return 'expired';
      if (/(failed|cancelled|canceled|rejected|declined)/.test(normalized)) return 'failed';
      return 'pending';
    }

    const candidates = [body.reference_id, body.external_id, paymentId, orderId].filter(Boolean) as string[];

    for (const candidate of candidates) {
      const { data, error } = await supabase
        .from('payments')
        .select('*, orders(*)')
        .eq('reference_id', candidate)
        .maybeSingle();

      if (!error && data) {
        payment = data;
        break;
      }
    }

    if (!payment) {
      const { data: payments } = await supabase.from('payments').select('*, orders(*)');
      payment = payments?.find((item: Record<string, any>) => {
        const raw = item.raw_response || {};
        return [raw.provider_payment_id, raw.id, raw.payment_id, raw.order_id, raw.external_id, raw.reference_id]
          .filter(Boolean)
          .includes(paymentId || orderId);
      }) || null;
    }

    const now = new Date().toISOString();

    const normalizedPaymentStatus = mapWebhookStatus(payloadStatus || event);

    if (payment) {
      const updateData: Record<string, unknown> = {
        status: normalizedPaymentStatus,
        webhook_received_at: now,
        updated_at: now,
        raw_response: {
          ...(payment.raw_response || {}),
          webhook_payload: body,
        },
      };

      if (payloadStatus === 'paid') {
        updateData.paid_at = body.paid_at || body.transaction_date || now;
      }

      await supabase
        .from('payments')
        .update(updateData)
        .eq('id', payment.id);

      if (normalizedPaymentStatus === 'paid') {
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'processing',
            updated_at: now,
          })
          .eq('id', payment.order_id);

        console.log(`Order ${payment.orders?.invoice_number || payment.order_id} paid successfully`);

        await sendTelegramMessage([
          '✅ Pembayaran Diterima',
          `Invoice: ${payment.orders?.invoice_number || payment.order_id}`,
          `UID: ${payment.orders?.uid || ''}`,
          `Total: ${formatCurrency(payment.amount)}`,
          'Status Web: processing',
        ].filter(Boolean).join('\n'));
      } else if (normalizedPaymentStatus === 'expired') {
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

        await supabase
          .from('orders')
          .update({
            payment_status: 'expired',
            status: 'cancelled',
            updated_at: now,
          })
          .eq('id', payment.order_id);
      } else if (payloadStatus === 'failed' || payloadStatus === 'cancelled') {
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

        await supabase
          .from('orders')
          .update({
            payment_status: 'failed',
            status: 'cancelled',
            updated_at: now,
          })
          .eq('id', payment.order_id);
      }
    } else {
      console.log('Webhook received without matching payment record', { event, paymentId, orderId });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
