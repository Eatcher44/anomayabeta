import { beforeEach, describe, expect, it, vi } from 'vitest';
import { secureUpload } from '@/utils/secureUpload';
import { uploadAnimalPhoto } from '@/utils/photo';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));

describe('secure upload client contract', () => {
  beforeEach(() => mocks.invoke.mockReset());

  it.each(['animal-photos', 'bug-screenshots', 'sensitive-documents'] as const)(
    'sends %s through the authenticated function with a multipart file', async bucket => {
      const file = new File(['image'], 'photo.png', { type: 'image/png' });
      const result = { path: 'verified-owner/server-issued.png', url: 'https://app.invalid/media' };
      mocks.invoke.mockResolvedValue({ data: result, error: null });
      expect(await secureUpload(bucket, file)).toEqual(result);
      const [name, options] = mocks.invoke.mock.calls[0];
      expect(name).toBe('secure-upload');
      expect(options.body).toBeInstanceOf(FormData);
      expect(options.body.get('bucket')).toBe(bucket);
      expect(options.body.get('file').name).toBe('photo.png');
      expect([...options.body.keys()].sort()).toEqual(['bucket', 'file']);
    },
  );

  it('does not send caller-supplied ownership or animal paths', async () => {
    mocks.invoke.mockResolvedValue({ data: { path: 'server-issued', url: 'https://app.invalid/photo' }, error: null });
    expect(await uploadAnimalPhoto('forged-owner', 'forged-animal', new File(['image'], 'photo.png')))
      .toBe('https://app.invalid/photo');
    expect([...mocks.invoke.mock.calls[0][1].body.keys()].sort()).toEqual(['bucket', 'file']);
  });

  it.each([
    { data: null, error: new Error('network') },
    { data: { path: 'path' }, error: null },
    { data: { url: 'url' }, error: null },
  ])('refuses failed or incomplete server responses', async response => {
    mocks.invoke.mockResolvedValue(response);
    await expect(secureUpload('animal-photos', new File(['image'], 'photo.png'))).rejects.toThrow();
  });
});