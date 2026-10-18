import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const origins = ["https://anomayabeta.lovable.app", "https://id-preview--e2e69dec-0ed1-47cc-b36e-14ea0b61a40f.lovable.app", "http://localhost:8080"];

export function securityHeaders(req: Request) {
  const origin = req.headers.get("Origin");
  return { ...corsHeaders, "Access-Control-Allow-Origin": origin && origins.includes(origin) ? origin : origins[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Origin" };
}

export function reply(req: Request, status: number, data: unknown) {
  return new Response(JSON.stringify(data), { status, headers: securityHeaders(req) });
}

export async function verifiedRequest(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const bearer = req.headers.get("Authorization");
  if (!url || !key || !adminKey || !bearer?.startsWith("Bearer ")) return null;
  const client = createClient(url, key, { auth: { persistSession: false } });
  try {
    // Online validation also rejects a token belonging to a deleted account.
    const { data, error } = await client.auth.getUser(bearer.slice(7));
    if (error || !data.user) return null;
    const admin = createClient(url, adminKey, { auth: { persistSession: false } });
    return { uid: data.user.id, email: data.user.email, admin };
  } catch { return null; }
}

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;