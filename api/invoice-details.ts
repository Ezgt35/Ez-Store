import { createSupabaseAdmin, corsHeaders, getJsonBody } from './_lib/supabase-admin.js';

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
    const invoiceNumber = String(body.invoiceNumber || body.invoice_number || '').trim();

    if (!invoiceNumber) {
      res.status(400).json({ error: 'invoiceNumber is required' });
      return;
    }

    const supabase = createSupabaseAdmin();
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq('invoice_number', invoiceNumber)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (!order) {
      res.status(404).json({ error: 'Invoice tidak ditemukan' });
      return;
    }

    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Gagal memuat invoice' });
  }
}
