import { createSupabaseAdmin } from './_lib/supabase-admin';

function mapStatus(status: string | undefined) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'paid' || normalized === 'success' || normalized === 'successful') return 'paid';
  if (normalized === 'expired' || normalized === 'expired_at') return 'expired';
  if (normalized === 'failed' || normalized === 'cancelled' || normalized === 'canceled') return 'failed';
  return 'pending';
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, Apikey');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const orderId = body.orderId ? String(body.orderId) : '';
    const paymentId = body.paymentId ? String(body.paymentId) : '';

    if (!orderId && !paymentId) {
      res.status(400).json({ error: 'orderId atau paymentId wajib diisi' });
      return;
    }

    const supabase = createSupabaseAdmin();
    const paymentQuery = orderId
      ? supabase.from('payments').select('*').eq('order_id', orderId).maybeSingle()
      : supabase.from('payments').select('*').eq('id', paymentId).maybeSingle();

    const { data: payment, error: paymentError } = await paymentQuery;

    if (paymentError || !payment) {
      res.status(404).json({ error: 'Pembayaran tidak ditemukan' });
      return;
    }

    const providerPaymentId = String(payment.raw_response?.provider_payment_id || payment.raw_response?.id || payment.raw_response?.payment_id || payment.reference_id || '');
    const fersakuSecretKey = process.env.FERSAKU_SECRET_KEY || process.env.FERSAKU_API_KEY || '';
    const fersakuApiUrl = (process.env.FERSAKU_API_URL || 'https://fersaku.com/api/v1').replace(/\/$/, '');

    if (!providerPaymentId || !fersakuSecretKey) {
      res.status(200).json({ payment, order: null });
      return;
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
      res.status(502).json({ error: 'Gagal memeriksa status Fersaku', details: result });
      return;
    }

    const updatedStatus = mapStatus(result.status || result.data?.status || result.payment?.status);
    const now = new Date().toISOString();

    const updateData: Record<string, any> = {
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

    if (updateError || !updatedPayment) {
      res.status(500).json({ error: 'Gagal memperbarui status pembayaran' });
      return;
    }

    let updatedOrder = null;
    if (updatedStatus === 'paid') {
      const { data: orderData } = await supabase
        .from('orders')
        .update({ payment_status: 'paid', status: 'processing', updated_at: now })
        .eq('id', payment.order_id)
        .select()
        .single();
      updatedOrder = orderData;
    } else if (updatedStatus === 'expired' || updatedStatus === 'failed') {
      const { data: orderItems } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', payment.order_id);
      for (const item of orderItems || []) {
        const { data: productData } = await supabase.from('products').select('id, stock').eq('id', item.product_id).maybeSingle();
        if (productData && productData.stock !== -1) {
          await supabase.from('products').update({ stock: Number(productData.stock) + Number(item.quantity), updated_at: now }).eq('id', item.product_id);
        }
      }

      const { data: orderData } = await supabase
        .from('orders')
        .update({ payment_status: updatedStatus, status: 'cancelled', updated_at: now })
        .eq('id', payment.order_id)
        .select()
        .single();
      updatedOrder = orderData;
    }

    res.status(200).json({ payment: updatedPayment, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal memeriksa status pembayaran' });
  }
}
