import { reply, securityHeaders, verifiedRequest, uuidPattern } from "../_shared/securityHttp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: securityHeaders(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "method_not_allowed" });
  const session = await verifiedRequest(req);
  if (!session) return reply(req, 401, { error: "not_authenticated" });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(req, 400, { error: "invalid_input" }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply(req, 400, { error: "invalid_input" });
  const action = body.action;
  // Reject identity/ownership fields rather than silently accepting them.
  if (Object.keys(body).some(k => !["action", "animal_id", "code"].includes(k))) return reply(req, 400, { error: "invalid_input" });
  if (!["create", "claim", "list"].includes(String(action))) return reply(req, 400, { error: "invalid_input" });
  if (action !== "claim" && (typeof body.animal_id !== "string" || !uuidPattern.test(body.animal_id))) return reply(req, 400, { error: "invalid_input" });
  if (action === "claim" && (typeof body.code !== "string" || body.code.length > 64)) return reply(req, 400, { error: "invalid_input" });
  const { admin, uid } = session;
  const operation = action === "create" ? "secure_create_transfer" : action === "claim" ? "secure_claim_transfer" : "secure_list_transfers";
  const params = action === "claim" ? { p_uid: uid, p_code: body.code } : { p_uid: uid, p_animal: body.animal_id };
  const { data, error } = await admin.rpc(operation, params);
  if (error) return reply(req, error.code === "40001" ? 409 : 500, { error: error.code === "40001" ? "operation_busy" : "operation_failed" });
  const failure = data?.error;
  if (failure) return reply(req, failure === "rate_limited" ? 429 : failure === "temporarily_suspended" ? 503 : 400, { error: failure });
  return reply(req, 200, data);
});