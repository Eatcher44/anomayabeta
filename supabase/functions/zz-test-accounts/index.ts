// TEMPORARY test helper — delete after account-deletion validation.
import { createClient } from "npm:@supabase/supabase-js@2";
const KEY = "4b15ed86bf6edbf3800f0b693cd8a0b6c0714c395d172084";
const DOMAIN = "@anomaya-deltest.invalid";
Deno.serve(async (req) => {
  if (req.headers.get("x-test-key") !== KEY) return new Response("forbidden", { status: 403 });
  const body = await req.clone().json(); const { action, email, password } = body;
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
  if (action === "transfer") {
    // Simulates a completed claim between TWO test accounts only.
    const { animal_id, to_email, code_id } = await req.clone().json().catch(() => ({})) as any;
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const from = data?.users.find((x) => x.email === email);
    const to = data?.users.find((x) => x.email === to_email);
    if (!from || !to || !to_email?.endsWith(DOMAIN)) return new Response("bad users", { status: 400 });
    const { data: an } = await admin.from("animals").update({ user_id: to.id, litter_id: null, mother_id: null }).eq("id", animal_id).eq("user_id", from.id).select("id");
    await admin.from("transfer_codes").update({ to_user_id: to.id, claimed_at: new Date().toISOString() }).eq("id", code_id).eq("from_user_id", from.id);
    return Response.json({ moved: an?.length ?? 0 });
  }
  return new Response("bad action", { status: 400 });
});
