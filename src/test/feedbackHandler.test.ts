import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const mocks = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn(), send: vi.fn(), sign: vi.fn() }));
vi.mock('../../supabase/functions/send-feedback-email/runtime.ts', () => ({ z, Resend: class { emails = { send: mocks.send }; } }));
vi.mock('../../supabase/functions/_shared/securityHttp.ts', () => ({
  securityHeaders: () => ({}), reply: (_: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status }),
  verifiedRequest: mocks.session,
}));

describe('feedback HTTP boundary', () => {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  beforeEach(async () => {
    vi.resetModules(); vi.clearAllMocks();
    vi.stubGlobal('Deno', { serve: (fn: typeof handler) => { handler = fn; }, env: { get: () => 'https://storage.invalid' } });
    mocks.session.mockResolvedValue({ uid: 'owner', email: 'verified@example.invalid', admin: { rpc: mocks.rpc, storage: { from: () => ({ createSignedUrl: mocks.sign }) } } });
    mocks.rpc.mockResolvedValue({ data: true, error: null }); mocks.send.mockResolvedValue({ error: null });
    const path = '../../supabase/functions/send-feedback-email/index.ts';
    await import(/* @vite-ignore */ path);
  });
  const request = (body: unknown) => new Request('https://app.invalid/feedback', { method: 'POST', body: JSON.stringify(body) });
  it('uses verified attribution and escapes the actual emitted email', async () => {
    if (!handler) throw new Error('Missing handler');
    expect((await handler(request({ type: 'feedback', message: '<img src=x onerror=alert(1)>', userId: 'victim', userEmail: 'forged@example.invalid' }))).status).toBe(200);
    const email = mocks.send.mock.calls[0][0];
    expect(email.text).toContain('User ID: owner');
    expect(email.text).toContain('verified@example.invalid');
    expect(email.text).not.toContain('forged@example.invalid');
    expect(email.html).toContain('&lt;img');
    expect(email.html).not.toContain('<img');
  });
  it('refuses unverified sessions before quota or email', async () => {
    mocks.session.mockResolvedValue(null);
    if (!handler) throw new Error('Missing handler');
    expect((await handler(request({ type: 'feedback', message: 'test' }))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it('honors persistent quota denial without sending and returns retry guidance', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    if (!handler) throw new Error('Missing handler');
    const response = await handler(request({ type: 'feedback', message: 'test' }));
    expect(response.status).toBe(429); expect(response.headers.get('Retry-After')).toBe('3600');
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('rejects invalid and oversized input before mutation', async () => {
    if (!handler) throw new Error('Missing handler');
    expect((await handler(request({ type: 'other', message: {} }))).status).toBe(400);
    expect((await handler(request({ type: 'feedback', message: 'x'.repeat(40000) }))).status).toBe(413);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('refuses foreign screenshots without signing them', async () => {
    if (!handler) throw new Error('Missing handler');
    expect((await handler(request({ type: 'bug', message: 'test', screenshotPath: 'victim/file.png' }))).status).toBe(400);
    expect(mocks.sign).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
});