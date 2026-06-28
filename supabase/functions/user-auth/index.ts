import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import bcrypt from "npm:bcryptjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'fallback-secret-key';
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface LoginRequest {
  email: string;
  password: string;
  action: 'login' | 'register';
}

function base64UrlEncode(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return new Uint8Array([...atob(base64)].map(ch => ch.charCodeAt(0)));
}

async function signPayload(payload: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET);
  const payloadData = encoder.encode(payload);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
  return new Uint8Array(sig);
}

async function createToken(userId: string, email: string) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
  const payload = JSON.stringify({ userId, email, exp });
  const sig = await signPayload(payload);
  return `${base64UrlEncode(new TextEncoder().encode(payload))}.${base64UrlEncode(sig)}`;
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

      const emailLower = email.toLowerCase();

      // Check if user exists
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', emailLower)
        .maybeSingle();

      if (error || !user) {
        return new Response(
          JSON.stringify({ error: 'Email atau password salah' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify password
      const isPasswordValid = user.password_hash.startsWith('$2')
        ? await bcrypt.compare(password, user.password_hash)
        : user.password_hash === require('crypto').createHash('sha256').update(password + email).digest('hex');

      if (!isPasswordValid) {
        return new Response(
          JSON.stringify({ error: 'Email atau password salah' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      const token = await createToken(user.id, user.email);
      const { password_hash, ...userWithoutPassword } = user;

      return new Response(
        JSON.stringify({
          user: userWithoutPassword,
          token,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('User auth error:', err);
    return new Response(
      JSON.stringify({ error: 'Terjadi kesalahan. Silakan coba lagi.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
