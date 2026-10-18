// Default release policy. The database is authoritative; this is not an authorization decision.
// A release migration must not enable operations before the backend acceptance suite passes.
export function accountDeletionIsEnabled(): boolean {
  return false;
}