// TEMPORARY test helper — delete after account-deletion validation.
import { createClient } from "npm:@supabase/supabase-js@2";
const KEY = "4b15ed86bf6edbf3800f0b693cd8a0b6c0714c395d172084";
const DOMAIN = "@anomaya-deltest.invalid";
Deno.serve(async (req) => {
  if (req.headers.get("x-test-key") !== KEY) return new Response("forbidden", { status: 403 });
  const { action, email, password } = await req.json();
  if (typeof email !== "string" || !email.endsWith(DOMAIN)) return new Response("bad email", { status: 400 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (action === "create") {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    return Response.json({ id: data?.user?.id, error: error?.message });
  }
  if (action === "cleanup") {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const u = data?.users.find((x) => x.email === email);
    if (!u) return Response.json({ gone: true });
    const { error } = await admin.auth.admin.deleteUser(u.id);
    return Response.json({ deleted: u.id, error: error?.message });
  }
  return new Response("bad action", { status: 400 });
});
