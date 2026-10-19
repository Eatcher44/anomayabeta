import { reply, securityHeaders, verifiedRequest } from '../_shared/securityHttp.ts';

export async function handleUpload(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: securityHeaders(req) });
  if (req.method !== 'POST') return reply(req, 405, { error: 'method_not_allowed' });
  const session = await verifiedRequest(req);
  if (!session) return reply(req, 401, { error: 'not_authenticated' });
  let form: FormData;
  try { form = await req.formData(); } catch { return reply(req, 400, { error: 'invalid_file' }); }
  const file = form.get('file');
  const bucket = form.get('bucket');
  // animal-media (private photos) is additionally gated server-side by the private_photos flag.
  const allowed = ['animal-photos', 'bug-screenshots', 'sensitive-documents', 'animal-media'];
  if (!(file instanceof File) || typeof bucket !== 'string' || !allowed.includes(bucket)
    || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    || file.size === 0 || file.size > (bucket === 'bug-screenshots' ? 5 : 10) * 1024 * 1024) {
    return reply(req, 400, { error: 'invalid_file' });
  }
  const { admin, uid } = session;
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const { data: ticket, error: reserveError } = await admin.rpc('reserve_secure_upload_v2', { p_uid: uid, p_bucket: bucket, p_ext: ext });
  if (reserveError) return reply(req, 409, { error: 'upload_unavailable' });
  if (ticket?.error) return reply(req, 409, { error: ticket.error });
  if (!ticket?.id || !ticket?.path) return reply(req, 500, { error: 'upload_unavailable' });
  const storageBucket = ticket.bucket ?? bucket;
  if (!allowed.includes(storageBucket) || (storageBucket !== bucket && !(bucket === 'animal-photos' && storageBucket === 'animal-media'))) {
    return reply(req, 500, { error: 'upload_unavailable' });
  }
  // No SQL transaction or advisory mutex spans this network operation.
  // A lost response remains pending: never guess it is safe to finalize deletion.
  try {
    const { data: started, error: startError } = await admin.rpc('begin_secure_upload', { p_uid: uid, p_ticket: ticket.id });
    if (startError || !started) return reply(req, 409, { error: 'upload_not_started' });
    const { error } = await admin.storage.from(storageBucket).upload(ticket.path, file, { upsert: false, contentType: file.type });
    if (error) return reply(req, 503, { error: 'upload_pending_reconciliation' });
    const { data: result, error: settleError } = await admin.rpc('settle_secure_upload', { p_uid: uid, p_ticket: ticket.id, p_removed: false });
    if (settleError) return reply(req, 503, { error: 'upload_pending_reconciliation' });
    if (result?.pending || result?.removed || result?.preserved) return reply(req, 409, { error: 'upload_pending_reconciliation' });
    if (result?.discard) {
      const { error: removeError } = await admin.storage.from(storageBucket).remove([ticket.path]);
      if (removeError) return reply(req, 503, { error: 'upload_pending_reconciliation' });
      const { error: checkpointError } = await admin.rpc('settle_secure_upload', { p_uid: uid, p_ticket: ticket.id, p_removed: true });
      if (checkpointError) return reply(req, 503, { error: 'upload_pending_reconciliation' });
      return reply(req, 409, { error: 'account_deletion_in_progress' });
    }
    return reply(req, 200, { path: ticket.path, url: result?.url });
  } catch {
    return reply(req, 503, { error: 'upload_pending_reconciliation' });
  }
}