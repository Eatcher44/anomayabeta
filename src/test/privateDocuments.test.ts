import { beforeEach, describe, expect, it, vi } from 'vitest';
import { privateDocumentUrl } from '@/utils/privateDocuments';

const mocks = vi.hoisted(() => ({ from: vi.fn(), sign: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: mocks.from } },
}));

describe('private signature client reads', () => {
  beforeEach(() => {
    mocks.from.mockReset().mockReturnValue({ createSignedUrl: mocks.sign });
    mocks.sign.mockReset();
  });

  it('requests a five-minute authorized URL from the private bucket', async () => {
    mocks.sign.mockResolvedValue({ data: { signedUrl: 'https://app.invalid/temporary' }, error: null });
    expect(await privateDocumentUrl('owner/server-issued.png')).toBe('https://app.invalid/temporary');
    expect(mocks.from).toHaveBeenCalledWith('sensitive-documents');
    expect(mocks.sign).toHaveBeenCalledWith('owner/server-issued.png', 300);
  });

  it('does not fall back to a public URL when authorization fails', async () => {
    mocks.sign.mockResolvedValue({ data: null, error: new Error('denied') });
    await expect(privateDocumentUrl('foreign/signature.png')).rejects.toThrow('Document privé indisponible');
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it('refuses an incomplete signed response', async () => {
    mocks.sign.mockResolvedValue({ data: {}, error: null });
    await expect(privateDocumentUrl('owner/signature.png')).rejects.toThrow('Document privé indisponible');
  });
});