import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const sign = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ createSignedUrl: sign }) }, auth: { onAuthStateChange: () => ({}) } },
}));
import SecurePhoto from '@/components/SecurePhoto';
import { clearPrivatePhotoCache, privateMediaPath } from '@/utils/photoRef';

const U = '11111111-1111-1111-1111-111111111111', F = '22222222-2222-2222-2222-222222222222';
const PRIV = `https://abc.supabase.co/storage/v1/object/public/animal-media/${U}/${F}.jpg`;
const PUB = `https://abc.supabase.co/storage/v1/object/public/animal-photos/${U}/${F}.jpg`;

beforeEach(() => { sign.mockReset(); clearPrivatePhotoCache(); });

describe('photo references', () => {
  it('only exact private references are treated as private', () => {
    expect(privateMediaPath(PRIV)).toBe(`${U}/${F}.jpg`);
    expect(privateMediaPath(PUB)).toBeNull();
    expect(privateMediaPath(PRIV + '?x')).toBeNull();
  });
  it('public photos render unchanged without signing', () => {
    render(<SecurePhoto src={PUB} alt="pub" />);
    expect(screen.getByAltText('pub').getAttribute('src')).toBe(PUB);
    expect(sign).not.toHaveBeenCalled();
  });
  it('private photo renders the signed URL, never the stored reference', async () => {
    sign.mockResolvedValue({ data: { signedUrl: 'https://signed/1' }, error: null });
    render(<SecurePhoto src={PRIV} alt="priv" />);
    await waitFor(() => expect(screen.getByAltText('priv').getAttribute('src')).toBe('https://signed/1'));
  });
  it('refused access shows a placeholder with no public fallback', async () => {
    sign.mockResolvedValue({ data: null, error: { message: 'Object not found' } });
    const { container } = render(<SecurePhoto src={PRIV} alt="priv" />);
    await waitFor(() => expect(screen.getByRole('img', { name: 'priv' }).tagName).toBe('DIV'));
    expect(container.innerHTML).not.toContain('animal-media');
  });
  it('an expired signed URL is refreshed once, then falls back to the placeholder', async () => {
    sign.mockResolvedValueOnce({ data: { signedUrl: 'https://signed/old' }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://signed/new' }, error: null });
    render(<SecurePhoto src={PRIV} alt="priv" />);
    await waitFor(() => expect(screen.getByAltText('priv').getAttribute('src')).toBe('https://signed/old'));
    fireEvent.error(screen.getByAltText('priv'));
    await waitFor(() => expect(screen.getByAltText('priv').getAttribute('src')).toBe('https://signed/new'));
    fireEvent.error(screen.getByAltText('priv'));
    await waitFor(() => expect(screen.getByRole('img', { name: 'priv' }).tagName).toBe('DIV'));
    expect(sign).toHaveBeenCalledTimes(2);
  });
});
