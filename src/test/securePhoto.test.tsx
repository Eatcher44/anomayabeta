import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';

const { sign, auth } = vi.hoisted(() => ({ sign: vi.fn(), auth: { callback: null as null | ((event: string, session: { user: { id: string } } | null) => void) } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ createSignedUrl: sign }) }, auth: { onAuthStateChange: (callback: typeof auth.callback) => { auth.callback = callback; return {}; } } },
}));
import SecurePhoto from '@/components/SecurePhoto';
import { clearPrivatePhotoCache, privateMediaPath, resolvePhotoUrl } from '@/utils/photoRef';

const U = '11111111-1111-1111-1111-111111111111', F = '22222222-2222-2222-2222-222222222222';
const PRIV = `https://abc.supabase.co/storage/v1/object/public/animal-media/${U}/${F}.jpg`;
const PUB = `https://abc.supabase.co/storage/v1/object/public/animal-photos/${U}/${F}.jpg`;

beforeEach(() => { cleanup(); sign.mockReset(); clearPrivatePhotoCache(); auth.callback?.('SIGNED_IN', { user: { id: U } }); });

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
  it('clears a rendered private photo on logout and refuses it for another account', async () => {
    sign.mockResolvedValueOnce({ data: { signedUrl: 'https://signed/account-a' }, error: null });
    const { container } = render(<SecurePhoto src={PRIV} alt="private" />);
    await waitFor(() => expect(screen.getByAltText('private').getAttribute('src')).toBe('https://signed/account-a'));
    act(() => auth.callback?.('SIGNED_OUT', null));
    expect(container.querySelector('img')).toBeNull();
    sign.mockResolvedValue({ data: null, error: { message: 'denied' } });
    act(() => auth.callback?.('SIGNED_IN', { user: { id: F } }));
    await waitFor(() => expect(screen.getByRole('img', { name: 'private' }).tagName).toBe('DIV'));
    expect(container.innerHTML).not.toContain('https://signed/account-a');
  });
  it('invalidates delayed A responses without overwriting the B cache', async () => {
    let finish: (value: unknown) => void = () => {};
    sign.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const old = resolvePhotoUrl(PRIV);
    await waitFor(() => expect(sign).toHaveBeenCalledTimes(1));
    auth.callback?.('SIGNED_IN', { user: { id: F } });
    sign.mockResolvedValueOnce({ data: { signedUrl: 'https://signed/account-b' }, error: null });
    expect(await resolvePhotoUrl(PRIV)).toBe('https://signed/account-b');
    finish({ data: { signedUrl: 'https://signed/account-a' }, error: null });
    expect(await old).toBeNull();
    expect(await resolvePhotoUrl(PRIV)).toBe('https://signed/account-b');
    expect(sign).toHaveBeenCalledTimes(2);
  });
  it('invalidates an in-flight expiry retry on logout and authorizes anew on sign-in', async () => {
    let finish: (value: unknown) => void = () => {};
    sign.mockResolvedValueOnce({ data: { signedUrl: 'https://signed/old' }, error: null })
      .mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const { container } = render(<SecurePhoto src={PRIV} alt="private" />);
    await waitFor(() => expect(screen.getByAltText('private').getAttribute('src')).toBe('https://signed/old'));
    fireEvent.error(screen.getByAltText('private'));
    await waitFor(() => expect(sign).toHaveBeenCalledTimes(2));
    act(() => auth.callback?.('SIGNED_OUT', null));
    await act(async () => { finish({ data: { signedUrl: 'https://signed/late' }, error: null }); });
    expect(container.querySelector('img')).toBeNull();
    sign.mockResolvedValue({ data: { signedUrl: 'https://signed/reauthorized' }, error: null });
    act(() => auth.callback?.('SIGNED_IN', { user: { id: U } }));
    await waitFor(() => expect(screen.getByAltText('private').getAttribute('src')).toBe('https://signed/reauthorized'));
  });
  it('renews expired cache through authorization', async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    sign.mockResolvedValueOnce({ data: { signedUrl: 'https://signed/first' }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://signed/renewed' }, error: null });
    expect(await resolvePhotoUrl(PRIV)).toBe('https://signed/first');
    clock.mockReturnValue(now + 301_000);
    expect(await resolvePhotoUrl(PRIV)).toBe('https://signed/renewed');
    clock.mockRestore();
    expect(sign).toHaveBeenCalledTimes(2);
  });
});
