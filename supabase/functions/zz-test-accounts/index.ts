// TEMPORARY: creates confirmed disposable test accounts only. Delete after testing.
import { createClient } from "npm:@supabase/supabase-js@2";
const KEY = "eb06344ba384413fb5ce5ee00611a42ee216ba4fcd9fcdc9";
const DOMAIN = "@anomaya-deltest.invalid";
Deno.serve(async (req) => {
  if (req.headers.get("x-test-key") !== KEY) return new Response("forbidden", { status: 403 });
  const { email, password } = await req.json();
  if (typeof email !== "string" || !email.endsWith(DOMAIN)) return new Response("bad email", { status: 400 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  return Response.json({ id: data?.user?.id, error: error?.message });
});
