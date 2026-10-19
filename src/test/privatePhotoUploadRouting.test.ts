import { describe, it, expect, vi } from 'vitest';
const boundary = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock('../../supabase/functions/_shared/securityHttp.ts', () => ({
  verifiedRequest: boundary.session, securityHeaders: () => ({}),
  reply: (_req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status }),
}));
describe('private-photo-only server routing', () => {
  it('uses the private bucket selected by the server ticket for an ordinary animal photo', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ upload }));
    const rpc = vi.fn(async (name: string) => ({ error: null, data: name === 'reserve_secure_upload_v2'
      ? { id: 'ticket', path: 'owner/photo.png', bucket: 'animal-media' }
      : name === 'begin_secure_upload' ? true : { url: 'private-ref' } }));
    boundary.session.mockResolvedValue({ uid: 'owner', admin: { rpc, storage: { from } } });
    const form = new FormData();
    form.set('bucket', 'animal-photos'); form.set('file', new File(['photo'], 'photo.png', { type: 'image/png' }));
    const req = new Request('https://app.invalid/upload', { method: 'POST' });
    vi.spyOn(req, 'formData').mockResolvedValue(form);
    const path = '../../supabase/functions/secure-upload/handler.ts';
    const { handleUpload } = await import(/* @vite-ignore */ path);
    expect((await handleUpload(req)).status).toBe(200);
    expect(from).toHaveBeenCalledWith('animal-media');
    expect(from).not.toHaveBeenCalledWith('animal-photos');
  });
});