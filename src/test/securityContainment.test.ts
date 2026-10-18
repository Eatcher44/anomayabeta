import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), deleteUser: vi.fn(), session: vi.fn() }));
vi.mock('../../supabase/functions/_shared/securityHttp.ts', () => ({
  securityHeaders: () => ({}),
  reply: (_req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status }),
  verifiedRequest: mocks.session,
}));

describe('deployed account deletion handler', () => {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    handler = undefined;
    vi.stubGlobal('Deno', { serve: (fn: typeof handler) => { handler = fn; } });
    mocks.session.mockResolvedValue({ uid: 'verified-owner', admin: {
      rpc: mocks.rpc, storage: { from: mocks.from }, auth: { admin: { deleteUser: mocks.deleteUser } },
    } });
    // Keep the Deno handler outside the browser's TypeScript dependency graph.
    const handlerPath = '../../supabase/functions/delete-account/index.ts';
    await import(/* @vite-ignore */ handlerPath);
  });
  it('uses the verified owner and stops before cleanup when the database gate refuses', async () => {
    mocks.rpc.mockResolvedValue({ data: { error: 'temporarily_suspended' }, error: null });
    if (!handler) throw new Error('Handler not registered');
    const response = await handler(new Request('https://app.invalid/delete', { method: 'POST',
      body: JSON.stringify({ confirm: 'SUPPRIMER', user_id: 'other-owner' }) }));
    expect(response.status).toBe(503);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('freeze_secure_uploads', { p_uid: 'verified-owner' });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it('refuses an unverified session without preparing deletion', async () => {
    mocks.session.mockResolvedValue(null);
    if (!handler) throw new Error('Handler not registered');
    expect((await handler(new Request('https://app.invalid/delete', { method: 'POST' }))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('keeps authentication intact on storage failure and resumes the authorized manifest', async () => {
    const remove = vi.fn().mockResolvedValueOnce({ error: { message: 'simulated outage' } }).mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ remove });
    mocks.rpc.mockImplementation((name: string) => Promise.resolve(name === 'prepare_account_cleanup'
      ? { data: { files: [{ bucket: 'animal-photos', path: 'verified-owner/file.png', media_id: 'media-1' }] }, error: null }
      : { data: null, error: null }));
    mocks.deleteUser.mockResolvedValue({ error: null });
    if (!handler) throw new Error('Handler not registered');
    const request = () => new Request('https://app.invalid/delete', { method: 'POST', body: JSON.stringify({ confirm: 'SUPPRIMER' }) });
    expect((await handler(request())).status).toBe(500);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalledWith('complete_media_cleanup', expect.anything());
    expect((await handler(request())).status).toBe(200);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenCalledWith('complete_media_cleanup', { p_uid: 'verified-owner', p_media: 'media-1' });
    expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith('verified-owner');
  });
  it('does not delete authentication when a checkpoint fails after storage removal', async () => {
    mocks.from.mockReturnValue({ remove: vi.fn().mockResolvedValue({ error: null }) });
    mocks.rpc.mockImplementation((name: string) => Promise.resolve(name === 'freeze_secure_uploads'
      ? { data: { pending: false }, error: null } : name === 'prepare_account_cleanup'
      ? { data: { files: [{ bucket: 'animal-photos', path: 'verified-owner/file.png', media_id: 'media-1' }] }, error: null }
      : { data: null, error: { message: 'checkpoint unavailable' } }));
    if (!handler) throw new Error('Handler not registered');
    expect((await handler(new Request('https://app.invalid/delete', { method: 'POST', body: JSON.stringify({ confirm: 'SUPPRIMER' }) }))).status).toBe(500);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it('retries authentication deletion from an already complete database manifest', async () => {
    mocks.rpc.mockResolvedValue({ data: { complete: true, files: [] }, error: null });
    mocks.deleteUser.mockResolvedValueOnce({ error: { status: 500 } }).mockResolvedValueOnce({ error: null });
    if (!handler) throw new Error('Handler not registered');
    const request = () => new Request('https://app.invalid/delete', { method: 'POST', body: JSON.stringify({ confirm: 'SUPPRIMER', user_id: 'victim' }) });
    expect((await handler(request())).status).toBe(500);
    expect((await handler(request())).status).toBe(200);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.deleteUser).toHaveBeenNthCalledWith(1, 'verified-owner');
    expect(mocks.deleteUser).toHaveBeenNthCalledWith(2, 'verified-owner');
  });
  it('allows authorized private-signature cleanup before authentication removal', async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ remove });
    mocks.rpc.mockImplementation((name: string) => Promise.resolve(name === 'prepare_account_cleanup'
      ? { data: { files: [{ bucket: 'sensitive-documents', path: 'verified-owner/signature.png', media_id: 'signature-1' }] }, error: null }
      : { data: null, error: null }));
    mocks.deleteUser.mockResolvedValue({ error: null });
    if (!handler) throw new Error('Handler not registered');
    const response = await handler(new Request('https://app.invalid/delete', { method: 'POST', body: JSON.stringify({ confirm: 'SUPPRIMER' }) }));
    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith('sensitive-documents');
    expect(remove).toHaveBeenCalledWith(['verified-owner/signature.png']);
    expect(mocks.rpc).toHaveBeenCalledWith('complete_media_cleanup', { p_uid: 'verified-owner', p_media: 'signature-1' });
    expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith('verified-owner');
  });
  it('waits for pending uploads without removing records or authentication', async () => {
    mocks.rpc.mockImplementation((name: string) => Promise.resolve({ error: null, data:
      name === 'freeze_secure_uploads' ? { pending: true } : name === 'list_pending_secure_uploads' ? [{ id: 'pending-ticket' }] : { pending: true } }));
    if (!handler) throw new Error('Handler not registered');
    const response = await handler(new Request('https://app.invalid/delete', { method: 'POST', body: JSON.stringify({ confirm: 'SUPPRIMER' }) }));
    expect(response.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalledWith('prepare_account_cleanup', expect.anything());
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});