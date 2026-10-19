import { reply, securityHeaders, verifiedRequest } from "../_shared/securityHttp.ts";
import { reconcileUploads } from '../_shared/uploadRecovery.ts';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: securityHeaders(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "Méthode non autorisée" });
  const session = await verifiedRequest(req);
  if (!session) return reply(req, 401, { error: "Session invalide" });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(req, 400, { error: "Confirmation manquante" }); }
  if (!body || body.confirm !== "SUPPRIMER") return reply(req, 400, { error: "Confirmation manquante" });
  const { uid, admin } = session;
  try {
    const { data: uploads, error: freezeError } = await admin.rpc('freeze_secure_uploads', { p_uid: uid });
    if (freezeError) return reply(req, 409, { error: 'Suppression en attente. Réessayez.' });
    if (uploads?.error) return reply(req, 503, { error: 'Suppression suspendue', code: uploads.error });
    if (uploads?.pending) {
      const recovered = await reconcileUploads(session);
      if (recovered.pending) return reply(req, 409, { error: 'Un dépôt reste incertain. La suppression est bloquée pour protéger vos fichiers.', code: 'uploads_pending' });
    }
    // Database preparation freezes writes and produces an immutable authorized manifest.
    // No URL, folder name or requested user ID from the HTTP body authorizes deletion.
    const { data: manifest, error } = await admin.rpc("prepare_account_cleanup", { p_uid: uid });
    if (error) return reply(req, error.code === "40001" ? 409 : 500, { error: "La suppression n'a pas pu se terminer. Réessayez." });
    if (manifest?.error) return reply(req, 503, { error: "La suppression automatique est temporairement indisponible. Contactez support@anomaya.app.", code: manifest.error });
    // Idempotent: the owner's photo share links (items cascade) never outlive the account.
    const { error: shareError } = await admin.from("photo_shares").delete().eq("owner_id", uid);
    if (shareError) throw new Error("share_cleanup_failed");
    for (const file of manifest?.files ?? []) {
      const { error: removeError } = await admin.storage.from(file.bucket).remove([file.path]);
      if (removeError) throw new Error("storage_cleanup_failed");
      const { error: markError } = await admin.rpc("complete_media_cleanup", { p_uid: uid, p_media: file.media_id });
      if (markError) throw new Error("cleanup_checkpoint_failed");
    }
    if (!manifest?.complete) {
      const { error: finalizeError } = await admin.rpc("finalize_secure_account_deletion", { p_uid: uid });
      if (finalizeError) throw new Error("cleanup_incomplete");
    }
    const { error: authError } = await admin.auth.admin.deleteUser(uid);
    if (authError && authError.status !== 404) throw new Error("auth_cleanup_failed");
    return reply(req, 200, { success: true });
  } catch {
    // Never log identities, media paths, access tokens or database error details.
    return reply(req, 500, { error: "La suppression n'a pas pu se terminer. Réessayez : les données déjà supprimées ne reviendront pas." });
  }
});
