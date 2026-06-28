import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getSecretCandidates() {
  const secrets = new Set<string>();
  const primary = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (primary) secrets.add(primary);
  secrets.add('fallback-secret-key');
  return Array.from(secrets);
}

function base64UrlDecode(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return new Uint8Array([...atob(base64)].map(ch => ch.charCodeAt(0)));
}

async function signPayload(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
  return new Uint8Array(sig);
}

async function verifyToken(token: string) {
  const [payloadPart, sigPart] = token.split('.');
  if (!payloadPart || !sigPart) return null;
  try {
    const payload = new TextDecoder().decode(base64UrlDecode(payloadPart));
    const actual = base64UrlDecode(sigPart);

    for (const secret of getSecretCandidates()) {
      const expected = await signPayload(payload, secret);
      if (expected.length !== actual.length) continue;
      let matched = true;
      for (let i = 0; i < expected.length; i++) {
        if (expected[i] !== actual[i]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        const data = JSON.parse(payload) as { adminId: string; email: string; exp: number };
        if (data.exp < Math.floor(Date.now() / 1000)) return null;
        return data;
      }
    }

    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers.get('X-Admin-Token') || req.headers.get('x-admin-token') || '');
    const verified = await verifyToken(token);

    if (!verified) {
      return new Response(JSON.stringify({ error: 'Unauthorized', debug: { hasToken: !!token, verified: !!verified } }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    if (action === 'fetch_dashboard') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [productsRes, ordersRes, todayOrdersRes, monthOrdersRes, recentOrdersRes, popularProductsRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('orders').select('id', { count: 'exact' }),
        supabase.from('orders').select('total').eq('payment_status', 'paid').gte('created_at', today.toISOString()),
        supabase.from('orders').select('total').eq('payment_status', 'paid').gte('created_at', monthStart.toISOString()),
        supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(10),
        supabase.from('products').select('*').eq('is_active', true).eq('is_popular', true).limit(5),
      ]);

      const todayRevenue = todayOrdersRes.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const monthRevenue = monthOrdersRes.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
      const pendingOrders = ordersRes.data?.filter((o: any) => o.status === 'pending').length || 0;
      const completedOrders = ordersRes.data?.filter((o: any) => o.status === 'completed').length || 0;

      return new Response(JSON.stringify({
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        todayRevenue,
        monthRevenue,
        pendingOrders,
        completedOrders,
        recentOrders: recentOrdersRes.data || [],
        popularProducts: popularProductsRes.data || [],
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('admin-action error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
            todayRevenue,
            monthRevenue,
            pendingOrders,
            completedOrders,
            recentOrders: recentOrdersRes.data || [],
            popularProducts: popularProductsRes.data || [],
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'fetch_orders': {
        const statusFilter = String(payload.statusFilter || '');
        const searchQuery = String(payload.searchQuery || '').trim();
        const limit = Number(payload.limit || 100);

        let query = supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(limit);

        if (statusFilter) {
          query = query.eq('status', statusFilter);
        }

        if (searchQuery) {
          query = query.or(
            `invoice_number.ilike.%${searchQuery}%,uid.ilike.%${searchQuery}%,whatsapp.ilike.%${searchQuery}%`
          );
        }

        const { data, error } = await query;
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ orders: data || [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'fetch_categories': {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order');

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ categories: data || [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'fetch_products': {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ products: data || [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_order_status': {
        const orderId = String(payload.orderId || '');
        const status = String(payload.status || '');
        if (!orderId || !status) {
          return new Response(JSON.stringify({ error: 'orderId and status are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle();

        if (orderError || !order) {
          return new Response(JSON.stringify({ error: 'Order tidak ditemukan' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const updatePayload: Record<string, unknown> = {
          status,
          updated_at: new Date().toISOString(),
        };

        if (status === 'cancelled') {
          updatePayload.payment_status = 'failed';
        }

        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update(updatePayload)
          .eq('id', orderId)
          .select()
          .single();

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (status === 'cancelled') {
          await supabase
            .from('payments')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('order_id', orderId);
        }

        await sendTelegramMessage([
          'ℹ️ Update Status Pesanan',
          `Invoice: ${order.invoice_number}`,
          `UID: ${order.uid}`,
          `Status Web: ${mapStatusLabel(status)}`,
        ].join('\n'));

        return new Response(JSON.stringify({ order: updatedOrder }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'category_create': {
        const category = payload.category || {};
        const { data, error } = await supabase.from('categories').insert([category]).select().single();
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ category: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'category_update': {
        const category = payload.category || {};
        if (!category.id) {
          return new Response(JSON.stringify({ error: 'Category id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { id, ...updates } = category;
        const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single();
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ category: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'category_delete': {
        const categoryId = String(payload.categoryId || '');
        if (!categoryId) {
          return new Response(JSON.stringify({ error: 'Category id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabase.from('categories').delete().eq('id', categoryId);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'product_create': {
        const product = payload.product || {};
        const { data, error } = await supabase.from('products').insert([product]).select().single();
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ product: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'product_update': {
        const product = payload.product || {};
        if (!product.id) {
          return new Response(JSON.stringify({ error: 'Product id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { id, ...updates } = product;
        const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ product: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'product_delete': {
        const productId = String(payload.productId || '');
        if (!productId) {
          return new Response(JSON.stringify({ error: 'Product id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default: {
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  } catch (error) {
    console.error('Admin action error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Admin action failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
