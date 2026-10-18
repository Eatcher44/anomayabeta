import { reply, securityHeaders, verifiedRequest } from '../_shared/securityHttp.ts';
import { reconcileUploads } from '../_shared/uploadRecovery.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: securityHeaders(req) });
  if (req.method !== 'POST') return reply(req, 405, { error: 'method_not_allowed' });
  const session = await verifiedRequest(req);
  if (!session) return reply(req, 401, { error: 'not_authenticated' });
  // No client-supplied identity, path, or ticket is accepted as cleanup authority.
  try {
    const result = await reconcileUploads(session);
    return reply(req, result.pending ? 409 : 200, result);
  } catch {
    return reply(req, 503, { error: 'reconciliation_pending' });
  }
});