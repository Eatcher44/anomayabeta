import { describe, it, expect, vi } from 'vitest';

const boundary = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock('../../supabase/functions/_shared/securityHttp.ts', () => ({
  verifiedRequest: boundary.session,
  securityHeaders: () => ({}),
  reply: (_req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status }),
}));

describe('tracked upload interrupted by deletion', () => {
  it('executes authorization, paused commit, deletion freeze, late commit, discard and checkpoint in order', async () => {
    let frozen = false;
    let release: (() => void) | undefined;
    let authorized: (() => void) | undefined;
    const reserved = new Promise<void>(r => { authorized = r; });
    const pause = new Promise<void>(r => { release = r; });
    const steps: string[] = [];
    const upload = vi.fn(async () => { steps.push('storage-start'); authorized?.(); await pause; steps.push('late-commit'); return { error: null }; });
    const remove = vi.fn(async () => { steps.push('remove'); return { error: null }; });
    const rpc = vi.fn(async (name: string, args: { p_removed?: boolean }) => {
      if (name === 'reserve_secure_upload') { steps.push('reserved'); return { data: { id: 'ticket', path: 'owner/photo.png' }, error: null }; }
      if (args.p_removed) { steps.push('checkpoint'); return { data: { removed: true }, error: null }; }
      expect(frozen).toBe(true);
      return { data: { discard: true }, error: null };
    });
    boundary.session.mockResolvedValue({ uid: 'owner', admin: { rpc, storage: { from: () => ({ upload, remove }) } } });
    const file = new File(['bytes'], 'photo.png', { type: 'image/png' });
    const form = new FormData(); form.set('bucket', 'animal-photos'); form.set('file', file);
    const path = '../../supabase/functions/secure-upload/handler.ts';
    const { handleUpload } = await import(/* @vite-ignore */ path);
    // Avoid jsdom/undici File identity differences at the mock HTTP boundary.
    const req = new Request('https://app.invalid/upload', { method: 'POST' });
    vi.spyOn(req, 'formData').mockResolvedValue(form);
    const response = handleUpload(req);
    await reserved;
    frozen = true; steps.push('deletion-freeze'); release?.();
    expect((await response).status).toBe(409);
    expect(remove).toHaveBeenCalledWith(['owner/photo.png']);
    expect(rpc).toHaveBeenLastCalledWith('settle_secure_upload', { p_uid: 'owner', p_ticket: 'ticket', p_removed: true });
    expect(steps).toEqual(['reserved', 'storage-start', 'deletion-freeze', 'late-commit', 'remove', 'checkpoint']);
  });
});