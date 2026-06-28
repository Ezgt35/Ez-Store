import { createSupabaseAdmin, corsHeaders, getJsonBody } from './_lib/supabase-admin.js';

function formatCurrency(value: unknown) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
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
    const body = getJsonBody(req);
    const uid = String(body.uid || '').trim();
    const whatsapp = String(body.whatsapp || '').trim();
    const productId = String(body.productId || '').trim();
    const quantity = Number(body.quantity || 0);
    const voucherCode = body.voucherCode ? String(body.voucherCode).trim() : '';
    const server = body.server ? String(body.server).trim() : null;
    const email = body.email ? String(body.email).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!uid || !whatsapp || !productId || quantity <= 0) {
      res.status(400).json({ error: 'uid, whatsapp, productId dan quantity wajib diisi' });
      return;
    }

    const supabase = createSupabaseAdmin();
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (productError || !product || !product.is_active) {
      res.status(404).json({ error: 'Produk tidak ditemukan atau tidak aktif' });
      return;
    }

    if (product.stock !== -1 && product.stock < quantity) {
      res.status(409).json({ error: 'Stok produk tidak mencukupi' });
      return;
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
        res.status(400).json({ error: 'Voucher tidak valid atau tidak aktif' });
        return;
      }

      if (voucherData.usage_limit !== -1 && voucherData.used_count >= voucherData.usage_limit) {
        res.status(400).json({ error: 'Voucher sudah tidak dapat digunakan lagi' });
        return;
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
    const invoiceNumber = `EZ${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

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
      res.status(500).json({ error: 'Gagal membuat pesanan' });
      return;
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
      res.status(500).json({ error: 'Gagal menyimpan item pesanan' });
      return;
    }

    if (product.stock !== -1) {
      const nextStock = Math.max(0, Number(product.stock) - quantity);
      await supabase.from('products').update({ stock: nextStock, updated_at: new Date().toISOString() }).eq('id', product.id);
    }

    if (voucher) {
      await supabase.from('vouchers').update({ used_count: voucher.used_count + 1 }).eq('id', voucher.id);
    }

    const referenceId = `EZ-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expiryMinutes = Number(process.env.FERSAKU_EXPIRY_MINUTES || 30);
    const expiredAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    const fersakuSecretKey = process.env.FERSAKU_SECRET_KEY || process.env.FERSAKU_API_KEY || '';
    const fersakuApiUrl = (process.env.FERSAKU_API_URL || 'https://fersaku.com/api/v1').replace(/\/$/, '');

    let qrisResponse: Record<string, any> = {};
    let usedFallbackQr = false;

    if (fersakuSecretKey) {
      try {
        const fersakuRes = await fetch(`${fersakuApiUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${fersakuSecretKey}`,
          },
          body: JSON.stringify({
            amount: Math.round(total),
            customer_name: order.uid || order.whatsapp || 'Customer',
            customer_email: order.email || undefined,
            description: `Pembayaran ${order.invoice_number}`,
            external_id: referenceId,
            expired_minutes: expiryMinutes,
          }),
        });

        qrisResponse = await fersakuRes.json().catch(() => ({}));
        if (!fersakuRes.ok) {
          usedFallbackQr = true;
        }
      } catch {
        usedFallbackQr = true;
      }
    } else {
      usedFallbackQr = true;
    }

    if (usedFallbackQr || (!qrisResponse.qr_string && !qrisResponse.qris_string && !qrisResponse.qris && !qrisResponse.qr && !qrisResponse.qr_image_url && !qrisResponse.qr_code_url && !qrisResponse.qrcode_url && !qrisResponse.qr_url)) {
      qrisResponse = {
        qr_string: `000201010211${referenceId}5300336ID5913EZ-STORE DEMO6013ID6013EZ-STORE DEMO6304`,
        qr_image_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=000201010211${referenceId}`,
        external_id: referenceId,
        fallback: true,
      };
    }

    const qrisString = String(qrisResponse.qr_string || qrisResponse.qris_string || qrisResponse.qris || qrisResponse.qr || '');
    const qrCodeUrl = String(qrisResponse.qr_image_url || qrisResponse.qr_code_url || qrisResponse.qrcode_url || qrisResponse.qr_url || '');

    const providerPaymentId = String(qrisResponse.id || qrisResponse.payment_id || qrisResponse.order_id || referenceId);

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        payment_method: 'qris',
        amount: total,
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
      await supabase.from('order_items').delete().eq('order_id', order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      res.status(500).json({ error: 'Gagal membuat pembayaran' });
      return;
    }

    await supabase.from('orders').update({ payment_status: 'waiting_payment', updated_at: new Date().toISOString() }).eq('id', order.id);

    res.status(200).json({
      order,
      payment: {
        id: payment.id,
        amount: payment.amount,
        qr_code_url: payment.qr_code_url,
        qris_string: payment.qris_string,
        reference_id: payment.reference_id,
        expired_at: payment.expired_at,
        checkout_url: qrisResponse.checkout_url || null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal memproses checkout' });
  }
}
