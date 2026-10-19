import { reply, securityHeaders, verifiedRequest, uuidPattern } from "../_shared/securityHttp.ts";

const ACTIONS = ["preview", "create", "claim", "list"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: securityHeaders(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "method_not_allowed" });
  const session = await verifiedRequest(req);
  if (!session) return reply(req, 401, { error: "not_authenticated" });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(req, 400, { error: "invalid_input" }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply(req, 400, { error: "invalid_input" });
  const action = body.action;
  // Reject identity, ownership or field-selection inputs rather than silently accepting them.
  if (Object.keys(body).some(k => !["action", "animal_id", "code", "approval"].includes(k))) return reply(req, 400, { error: "invalid_input" });
  if (!ACTIONS.includes(String(action))) return reply(req, 400, { error: "invalid_input" });
  if (action !== "claim" && (typeof body.animal_id !== "string" || !uuidPattern.test(body.animal_id))) return reply(req, 400, { error: "invalid_input" });
  if (action === "claim" && (typeof body.code !== "string" || body.code.length > 64)) return reply(req, 400, { error: "invalid_input" });
  if (action === "create" && (typeof body.approval !== "string" || !/^[0-9a-f]{64}$/.test(body.approval))) return reply(req, 400, { error: "review_required" });
  if (action !== "create" && body.approval !== undefined) return reply(req, 400, { error: "invalid_input" });
  const { admin, uid } = session;
  if (action === "create" || action === "claim") {
    // Quota is committed in its own transaction so a later business rollback cannot refund it.
    const quota = await admin.rpc("consume_transfer_attempt", { p_uid: uid, p_action: action });
    if (quota.error || typeof quota.data !== "boolean") return reply(req, 503, { error: "temporarily_suspended" });
    if (!quota.data) return reply(req, 429, { error: "rate_limited" });
  }
  const operation = action === "create" ? "secure_create_transfer_reviewed" : action === "claim" ? "secure_claim_transfer_reviewed" : action === "preview" ? "secure_preview_transfer" : "secure_list_transfers";
  const params = action === "claim" ? { p_uid: uid, p_code: body.code }
    : action === "create" ? { p_uid: uid, p_animal: body.animal_id, p_approval: body.approval }
    : { p_uid: uid, p_animal: body.animal_id };
  const { data, error } = await admin.rpc(operation, params);
  if (error) {
    if (error.message?.includes('private_notes_require_support')) return reply(req, 400, { error: 'private_notes_require_support' });
    if (error.message?.includes('linked_records_require_support')) return reply(req, 400, { error: 'linked_records_require_support' });
    return reply(req, error.code === "40001" ? 409 : 500, { error: error.code === "40001" ? "operation_busy" : "operation_failed" });
  }
  const failure = data?.error;
  if (failure) return reply(req, failure === "rate_limited" ? 429 : failure === "temporarily_suspended" ? 503 : failure === "review_required" ? 409 : 400, { error: failure });
  return reply(req, 200, data);
});
