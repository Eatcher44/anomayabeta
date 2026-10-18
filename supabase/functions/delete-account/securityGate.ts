// Temporary containment until trusted media provenance and deletion coordination exist.
// Fail before any storage or database mutation, including for otherwise valid sessions.
export function accountDeletionIsEnabled(): boolean {
  return false;
}