import { describe, it, expect, vi } from 'vitest';

async function run(result: unknown, options: { removeFails?: boolean; checkpointFails?: boolean } = {}) {
  const rpc = vi.fn(async (name: string, args: { p_removed?: boolean }) => {
    if (name === 'list_pending_secure_uploads') return { data: [{ id: 'ticket' }], error: null };
    if (args.p_removed) return { data: result && typeof result === 'object' && 'pending' in result ? result : { removed: true }, error: options.checkpointFails ? {} : null };
    return { data: result, error: null };
  });
  const remove = vi.fn(async () => ({ error: options.removeFails ? {} : null }));
  const modulePath = '../../supabase/functions/_shared/uploadRecovery.ts';
  const { reconcileUploads } = await import(/* @vite-ignore */ modulePath);
  const promise = reconcileUploads({ uid: 'verified-owner', admin: { rpc, storage: { from: () => ({ remove }) } } });
  return { promise, rpc, remove };
}

describe('caller-scoped upload recovery boundary (simulated backend)', () => {
  it('keeps an absent but started write uncertain without deleting files', async () => {
    const test = await run({ pending: true });
    expect(await test.promise).toEqual({ pending: 1 });
    expect(test.remove).not.toHaveBeenCalled();
    expect(test.rpc).toHaveBeenCalledWith('list_pending_secure_uploads', { p_uid: 'verified-owner' });
  });
  it('resolves a cancelled unstarted ticket without destructive calls', async () => {
    const test = await run({ removed: true });
    expect(await test.promise).toEqual({ pending: 0 });
    expect(test.remove).not.toHaveBeenCalled();
  });
  it('preserves another owner’s binding without deleting the shared file', async () => {
    const test = await run({ preserved: true, complete: true });
    expect(await test.promise).toEqual({ pending: 0 });
    expect(test.remove).not.toHaveBeenCalled();
  });
  it('discards only the exact server-authorized committed file then checkpoints', async () => {
    const test = await run({ discard: true, bucket: 'animal-photos', path: 'verified-owner/immutable.png' });
    expect(await test.promise).toEqual({ pending: 0 });
    expect(test.remove).toHaveBeenCalledExactlyOnceWith(['verified-owner/immutable.png']);
    expect(test.rpc).toHaveBeenLastCalledWith('settle_secure_upload', { p_uid: 'verified-owner', p_ticket: 'ticket', p_removed: true });
  });
  it.each([{ removeFails: true }, { checkpointFails: true }])('does not report resolution on cleanup failure %j', async options => {
    const test = await run({ discard: true, bucket: 'animal-photos', path: 'verified-owner/immutable.png' }, options);
    await expect(test.promise).rejects.toThrow('cleanup_pending');
  });
  it('does not repeat removal after the durable checkpoint', async () => {
    const test = await run({ removed: true });
    await test.promise;
    expect(test.remove).not.toHaveBeenCalled();
  });
  it('recovers lost removal acknowledgement only with database confirmation of absence', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: [{ id: 'ticket' }], error: null })
      .mockResolvedValueOnce({ data: { pending: true }, error: null })
      .mockResolvedValueOnce({ data: { removed: true }, error: null });
    const remove = vi.fn();
    const modulePath = '../../supabase/functions/_shared/uploadRecovery.ts';
    const { reconcileUploads } = await import(/* @vite-ignore */ modulePath);
    expect(await reconcileUploads({ uid: 'owner', admin: { rpc, storage: { from: () => ({ remove }) } } })).toEqual({ pending: 0 });
    expect(remove).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenLastCalledWith('settle_secure_upload', { p_uid: 'owner', p_ticket: 'ticket', p_removed: true });
  });
});