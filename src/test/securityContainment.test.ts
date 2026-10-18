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
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('prepare_account_cleanup', { p_uid: 'verified-owner' });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it('refuses an unverified session without preparing deletion', async () => {
    mocks.session.mockResolvedValue(null);
    if (!handler) throw new Error('Handler not registered');
    expect((await handler(new Request('https://app.invalid/delete', { method: 'POST' }))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});