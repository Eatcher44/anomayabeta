import { Resend } from "npm:resend@2.0.0";
import { z } from "npm:zod@3.25.76";
import { reply, securityHeaders, verifiedRequest } from "../_shared/securityHttp.ts";
import { escapeHtml, ownedScreenshotPath } from "./validation.ts";

const schema = z.object({
  type: z.enum(["feedback", "bug"]), subject: z.string().max(200).optional(),
  message: z.string().trim().min(1).max(10000), steps: z.string().max(10000).optional(),
  route: z.string().max(500).optional(), screenshotPath: z.string().max(500).optional(),
  screenshotUrl: z.string().max(2000).optional(),
}); // Legacy identity fields are ignored, never used as attribution.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: securityHeaders(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "Méthode non autorisée" });
  const session = await verifiedRequest(req);
  if (!session) return reply(req, 401, { error: "Session invalide" });
  try {
    // Bound the actual streamed body, not just an untrusted Content-Length header.
    const reader = req.body?.getReader();
    if (!reader) return reply(req, 400, { error: "Message manquant" });
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 32768) { await reader.cancel(); return reply(req, 413, { error: "Message trop volumineux" }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let input: unknown;
    try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply(req, 400, { error: "Message invalide" }); }
    const parsed = schema.safeParse(input);
    if (!parsed.success) return reply(req, 400, { error: "Message invalide" });
    const data = parsed.data;
    const path = ownedScreenshotPath(data.screenshotPath, data.screenshotUrl, session.uid, Deno.env.get("SUPABASE_URL") ?? "");
    if ((data.screenshotPath || data.screenshotUrl) && !path) return reply(req, 400, { error: "Capture non autorisée" });
    const { data: allowed, error: quotaError } = await session.admin.rpc("consume_feedback_attempt", { p_uid: session.uid });
    if (quotaError) return reply(req, 503, { error: "Service temporairement indisponible" });
    if (!allowed) {
      const response = reply(req, 429, { error: "Trop de messages envoyés. Réessayez dans une heure." });
      response.headers.set("Retry-After", "3600"); return response;
    }
    let screenshot = "";
    if (path) {
      const { data: signed, error } = await session.admin.storage.from("bug-screenshots").createSignedUrl(path, 3600);
      if (error || !signed?.signedUrl) return reply(req, 400, { error: "Capture indisponible" });
      screenshot = signed.signedUrl;
    }
    const text = `Type: ${data.type}\nUser ID: ${session.uid}\nUser email: ${session.email ?? "N/A"}\nRoute: ${data.route ?? "N/A"}\nTimestamp: ${new Date().toISOString()}\n\nMessage:\n${data.message}\n\n${data.steps ?? ""}`;
    const html = escapeHtml(text).replace(/\n/g, "<br>") + (screenshot ? `<br><a href="${escapeHtml(screenshot)}">Capture d'écran</a>` : "");
    const { error } = await new Resend(Deno.env.get("RESEND_API_KEY")).emails.send({
      from: "support@anomaya.app", to: ["support@anomaya.app"],
      subject: `[ANOMAYA BETA] ${data.type === "bug" ? "BUG" : "Feedback"} – ${(data.subject || "Sans sujet").replace(/[\r\n]/g, " ")}`,
      text: text + (screenshot ? `\nCapture: ${screenshot}` : ""), html,
    });
    return error ? reply(req, 500, { error: "Envoi impossible. Réessayez." }) : reply(req, 200, { success: true });
  } catch { return reply(req, 500, { error: "Service temporairement indisponible" }); }
});
