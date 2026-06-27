import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreatePaymentRequest {
  orderId: string;
  amount: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fersakuSecretKey = Deno.env.get('FERSAKU_SECRET_KEY') || Deno.env.get('FERSAKU_API_KEY');
    const fersakuApiUrl = (Deno.env.get('FERSAKU_API_URL') || 'https://fersaku.com/api/v1').replace(/\/$/, '');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: CreatePaymentRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Request body harus berupa JSON valid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const functionSecret = Deno.env.get('FUNCTION_SECRET');
    const incomingSecret = req.headers.get('X-Function-Secret') || '';
    if (functionSecret && incomingSecret !== functionSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, amount } = body;

    if (!orderId || typeof amount !== 'number' || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Order ID dan amount harus diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Pesanan tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', orderId);

    if (orderItemsError) {
      return new Response(
        JSON.stringify({ error: 'Gagal memeriksa item pesanan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (orderItems?.length) {
      const productIds = [...new Set(orderItems.map((item) => item.product_id))];
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, stock')
        .in('id', productIds);

      if (productsError) {
        return new Response(
          JSON.stringify({ error: 'Gagal memeriksa stok produk' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const insufficient = orderItems.some((item) => {
        const product = products?.find((p) => p.id === item.product_id);
        return product && product.stock !== -1 && product.stock < item.quantity;
      });

      if (insufficient) {
        return new Response(
          JSON.stringify({ error: 'Stok produk tidak mencukupi untuk pesanan ini' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const referenceId = `EZ-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expiryMinutes = Number(Deno.env.get('FERSAKU_EXPIRY_MINUTES') || 30);
    const expiredAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    let qrisResponse: Record<string, unknown> = {};

    if (fersakuSecretKey) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fersakuSecretKey}`,
      };

      try {
        const fersakuRes = await fetch(`${fersakuApiUrl}/payments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            amount: Math.round(amount),
            customer_name: order.uid || order.whatsapp || 'Customer',
            customer_email: order.email || undefined,
            description: `Pembayaran ${order.invoice_number}`,
            external_id: referenceId,
            expired_minutes: expiryMinutes,
          }),
        });

        qrisResponse = await fersakuRes.json();

        if (!fersakuRes.ok) {
          console.error('Fersaku error:', qrisResponse);
          return new Response(
            JSON.stringify({ error: 'Fersaku payment creation gagal', details: qrisResponse }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (fetchError) {
        console.error('Fersaku fetch failed:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Gagal terhubung ke Fersaku. Periksa host/API URL dan kredensial.', details: String(fetchError) }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      qrisResponse = {
        qr_string: `000201010211${referenceId}5300336ID5913EZ-STORE DEMO6013ID6013EZ-STORE DEMO6304`,
        qr_image_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=000201010211${referenceId}`,
        external_id: referenceId,
      };
    }

    const qrisString = String(
      qrisResponse.qr_string || qrisResponse.qris_string || qrisResponse.qris || qrisResponse.qr || ''
    );
    const qrCodeUrl = String(
      qrisResponse.qr_image_url || qrisResponse.qr_code_url || qrisResponse.qrcode_url || qrisResponse.qr_url || ''
    );

    if (!qrisString && !qrCodeUrl) {
      console.error('Fersaku response missing QR data', qrisResponse);
      return new Response(
        JSON.stringify({ error: 'Fersaku tidak mengembalikan QR.', details: qrisResponse }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const providerPaymentId = String(qrisResponse.id || qrisResponse.payment_id || qrisResponse.order_id || referenceId);

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        payment_method: 'qris',
        amount: amount,
        status: 'pending',
        qris_string: qrisString || null,
        qr_code_url: qrCodeUrl || null,
        reference_id: referenceId,
        expired_at: expiredAt,
        raw_response: {
          ...qrisResponse,
          internal_reference_id: referenceId,
          provider_payment_id: providerPaymentId,
        },
      })
      .select()
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Gagal membuat pembayaran' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('orders')
      .update({ payment_status: 'waiting_payment', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    return new Response(
      JSON.stringify({
        payment: {
          id: payment.id,
          amount: payment.amount,
          qr_code_url: payment.qr_code_url,
          qris_string: payment.qris_string,
          reference_id: payment.reference_id,
          expired_at: payment.expired_at,
          checkout_url: qrisResponse.checkout_url || null,
        },
        order: {
          invoice_number: order.invoice_number,
          total: order.total,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Create payment error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const details = err instanceof Error && err.stack ? err.stack : err;
    return new Response(
      JSON.stringify({ error: message, details }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
