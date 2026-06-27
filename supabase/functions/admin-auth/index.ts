import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import bcrypt from "npm:bcryptjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_AUTH_SECRET = Deno.env.get('ADMIN_AUTH_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TOKEN_EXPIRY_SECONDS = Number(Deno.env.get('ADMIN_AUTH_TOKEN_EXPIRY_SECONDS') || '86400');

interface LoginRequest {
  email: string;
  password: string;
  action: 'login' | 'validate';
  token?: string;
}

function base64UrlEncode(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return new Uint8Array([...binary].map((ch) => ch.charCodeAt(0)));
}

async function signPayload(payload: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ADMIN_AUTH_SECRET);
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

async function createToken(adminId: string, email: string) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
  const payload = JSON.stringify({ adminId, email, exp });
  const signature = await signPayload(payload);
  return `${base64UrlEncode(new TextEncoder().encode(payload))}.${base64UrlEncode(signature)}`;
}

async function verifyToken(token: string) {
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;

  try {
    const payloadBytes = base64UrlDecode(payloadPart);
    const payload = new TextDecoder().decode(payloadBytes);
    const expectedSignature = await signPayload(payload);
    const actualSignature = base64UrlDecode(signaturePart);

    if (expectedSignature.length !== actualSignature.length) return null;
    for (let i = 0; i < expectedSignature.length; i++) {
      if (expectedSignature[i] !== actualSignature[i]) return null;
    }

    const data = JSON.parse(payload) as { adminId: string; email: string; exp: number };
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: LoginRequest = await req.json();

    if (body.action === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email dan password harus diisi' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !admin) {
        return new Response(
          JSON.stringify({ error: 'Email atau password salah' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(password + email);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const isPasswordValid = admin.password_hash.startsWith('$2')
        ? await bcrypt.compare(password, admin.password_hash)
        : admin.password_hash === hashHex;

      if (!isPasswordValid) {
        return new Response(
          JSON.stringify({ error: 'Email atau password salah' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('admins')
        .update({ last_login: new Date().toISOString() })
        .eq('id', admin.id);

      const token = await createToken(admin.id, admin.email);
      const { password_hash, ...adminWithoutPassword } = admin;

      return new Response(
        JSON.stringify({
          admin: adminWithoutPassword,
          token,
          message: 'Login berhasil'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'validate') {
      const token = body.token;
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token diperlukan' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const verified = await verifyToken(token);
      if (!verified) {
        return new Response(
          JSON.stringify({ error: 'Token tidak valid atau kedaluwarsa' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', verified.adminId)
        .eq('email', verified.email.toLowerCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !admin) {
        return new Response(
          JSON.stringify({ error: 'Admin tidak ditemukan' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { password_hash, ...adminWithoutPassword } = admin;
      return new Response(
        JSON.stringify({ admin: adminWithoutPassword }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Admin auth error:', err);
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan. Silakan coba lagi.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
