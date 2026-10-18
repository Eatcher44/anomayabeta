import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickPhotoFile } from '@/utils/photo';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

function input() {
  const el = document.querySelector<HTMLInputElement>('input[type=file]');
  if (!el) throw new Error('Missing picker');
  return el;
}
afterEach(() => { document.querySelector('input[type=file]')?.dispatchEvent(new Event('cancel')); vi.restoreAllMocks(); });

describe('native photo selection', () => {
  it('cancels without a file and removes the input', async () => {
    const promise = pickPhotoFile();
    input().dispatchEvent(new Event('cancel'));
    expect(await promise).toBeNull();
    expect(document.querySelector('input[type=file]')).toBeNull();
  });
  it('does not guess cancellation on focus before camera file delivery', async () => {
    vi.useFakeTimers();
    const resolved = vi.fn();
    const promise = pickPhotoFile('image/png', 'camera');
    promise.then(resolved);
    expect(input().getAttribute('capture')).toBe('environment');
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(resolved).not.toHaveBeenCalled();
    const file = new File(['photo'], 'camera.png', { type: 'image/png' });
    Object.defineProperty(input(), 'files', { value: [file] });
    input().dispatchEvent(new Event('change'));
    expect(await promise).toBe(file);
    vi.useRealTimers();
  });
  it('reopening a gallery supersedes an unresolved old camera picker', async () => {
    const camera = pickPhotoFile('image/*', 'camera');
    const old = input();
    const gallery = pickPhotoFile();
    expect(await camera).toBeNull();
    expect(old.isConnected).toBe(false);
    expect(document.querySelectorAll('input[type=file]')).toHaveLength(1);
    input().dispatchEvent(new Event('cancel'));
    expect(await gallery).toBeNull();
  });
  it('empty change is cancellation and later stale events cannot deliver a file', async () => {
    const pending = pickPhotoFile();
    const old = input();
    old.dispatchEvent(new Event('change'));
    Object.defineProperty(old, 'files', { value: [new File(['x'], 'late.png')] });
    old.dispatchEvent(new Event('change'));
    expect(await pending).toBeNull();
  });
});