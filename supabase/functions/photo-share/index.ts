import { reply, securityHeaders, verifiedRequest, uuidPattern } from '../_shared/securityHttp.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

// Explicit, revocable sharing of selected private animal photos.
// create/revoke: authenticated owner. resolve: anyone holding the 256-bit token; returns
// 5-minute signed URLs for the selected photos only. Revocation stops new access; copies
// already downloaded cannot be recalled.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: securityHeaders(req) });
  if (req.method !== 'POST') return reply(req, 405, { error: 'method_not_allowed' });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(req, 400, { error: 'invalid_request' }); }
  const action = body?.action;

  if (action === 'resolve') {
    const token = body.token;
    if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return reply(req, 404, { error: 'share_unavailable' });
    const url = Deno.env.get('SUPABASE_URL'); const adminKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !adminKey) return reply(req, 500, { error: 'unavailable' });
    const admin = createClient(url, adminKey, { auth: { persistSession: false } });
    const { data, error } = await admin.rpc('resolve_photo_share', { p_token: token });
    if (error) return reply(req, 500, { error: 'unavailable' });
    const items = (data ?? []) as { bucket: string; path: string }[];
    if (!items.length) return reply(req, 404, { error: 'share_unavailable' });
    const photos: string[] = [];
    for (const it of items) {
      const { data: s, error: e } = await admin.storage.from(it.bucket).createSignedUrl(it.path, 300);
      if (e || !s?.signedUrl) return reply(req, 500, { error: 'unavailable' });
      photos.push(s.signedUrl);
    }
    return reply(req, 200, { photos });
  }

  const session = await verifiedRequest(req);
  if (!session) return reply(req, 401, { error: 'not_authenticated' });
  const { admin, uid } = session;

  if (action === 'create') {
    const paths = body.paths, hours = body.hours;
    if (!Array.isArray(paths) || paths.length < 1 || paths.length > 20
      || !paths.every((p) => typeof p === 'string' && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(p))
      || !Number.isInteger(hours) || (hours as number) < 1 || (hours as number) > 720) return reply(req, 400, { error: 'invalid_share' });
    const { data, error } = await admin.rpc('create_photo_share', { p_uid: uid, p_paths: paths, p_hours: hours });
    if (error) return reply(req, 500, { error: 'unavailable' });
    if (data?.error) return reply(req, data.error === 'temporarily_suspended' ? 503 : 403, { error: data.error });
    return reply(req, 200, data);
  }
  if (action === 'revoke') {
    if (typeof body.share_id !== 'string' || !uuidPattern.test(body.share_id)) return reply(req, 400, { error: 'invalid_share' });
    const { data, error } = await admin.rpc('revoke_photo_share', { p_uid: uid, p_share: body.share_id });
    if (error) return reply(req, 500, { error: 'unavailable' });
    return reply(req, data ? 200 : 404, { revoked: !!data });
  }
  return reply(req, 400, { error: 'invalid_request' });
});
