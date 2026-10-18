import type { verifiedRequest } from './securityHttp.ts';

type Session = NonNullable<Awaited<ReturnType<typeof verifiedRequest>>>;

// One immutable path, no overwrite: repeated removal cannot destroy a replacement.
// SQL reserves cleanup by marking media deleting before any network removal.
export async function reconcileUploads({ admin, uid }: Session) {
  const { data: tickets, error } = await admin.rpc('list_pending_secure_uploads', { p_uid: uid });
  if (error || !Array.isArray(tickets)) throw new Error('reconciliation_unavailable');
  let pending = 0;
  for (const ticket of tickets) {
    const { data: result, error: settleError } = await admin.rpc('settle_secure_upload', {
      p_uid: uid, p_ticket: ticket.id, p_removed: false,
    });
    if (settleError || !result) throw new Error('reconciliation_unavailable');
    if (result.discard) {
      const { error: removeError } = await admin.storage.from(result.bucket).remove([result.path]);
      if (removeError) throw new Error('cleanup_pending');
      const { data: checkpoint, error: checkpointError } = await admin.rpc('settle_secure_upload', {
        p_uid: uid, p_ticket: ticket.id, p_removed: true,
      });
      if (checkpointError || !checkpoint?.removed) throw new Error('cleanup_pending');
    } else if (result.pending) {
      // Recover a lost removal checkpoint. SQL accepts this only when it has
      // durable observed-commit/cleanup evidence and the object is now absent.
      const { data: checkpoint, error: checkpointError } = await admin.rpc('settle_secure_upload', {
        p_uid: uid, p_ticket: ticket.id, p_removed: true,
      });
      if (checkpointError || !checkpoint) throw new Error('cleanup_pending');
      if (!checkpoint.removed && !checkpoint.complete) pending += 1;
    }
  }
  return { pending };
}