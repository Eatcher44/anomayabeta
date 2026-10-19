# Secure-upload cutover and private-photo preparation (2026-10-19)

## Entry points (current frontend)
| Flow | Path | Status |
|---|---|---|
| Animal photo (create/replace) | utils/photo.ts -> secureUpload | secure-upload only (real browser tests 2026-10-18) |
| Breeder logo | BreederProfilePage -> secureUpload | secure-upload only (real) |
| Private signature | BreederProfilePage -> secureUpload (sensitive-documents) | secure-upload only (real, owner read OK, others refused) |
| Bug screenshot | FeedbackPage -> secureUpload | secure-upload only (real) |
| Animal documents | components/elevage/DocumentsSection.tsx | NOT mounted, its table/bucket do not exist; guarded by test |

Guard test `src/test/noDirectStorageWrites.test.ts` fails on any new direct Storage write, any import of the dead component, or any app-shell service worker.

## Caching (PWA/TWA)
- No service worker, no vite-plugin-pwa: an Android TWA loads the published site through Chrome's HTTP cache; HTML is revalidated, JS chunks are hashed. Old clients upgrade on next online launch; a TWA kept open in background can keep the old bundle until reload.
- Consequence: legacy clients cannot be counted to zero; the cutover must be enforced server-side.

## Legacy detection (privacy-preserving, no new telemetry)
Client direct uploads set `storage.objects.owner_id`; secure-upload service writes leave it null and create a ticket. Count only, per bucket/week:
`select bucket_id, owner_id is null, date_trunc('week',created_at), count(*) from storage.objects where created_at > now()-interval '30 days' group by 1,2,3;`
Result 2026-10-19: 0 client-direct uploads in 30 days. Zero observed is not proof of upgrade.

## Late legacy upload: why the cutover is safe
Legacy INSERT policies call `security_upload_allowed`, which refuses after the account freeze. Remaining gap: a request authorized before the freeze whose object commits after. Closing it does not depend on clients:
1. Publish the compatible frontend (approval A).
2. Wait a cache window (>= 7 days) while monitoring the count above.
3. Revoke the legacy INSERT policies on animal-photos and bug-screenshots (approval B). From then on every write needs a service ticket; old clients get an error, no data loss.
4. Wait > max Storage request duration (1 h margin) so any request authorized before step 3 has committed or failed.
5. Run a reconciliation sweep: client-owned objects (owner_id not null) created before step 3 and not in trusted_media are registered to their folder owner (append-only, nothing deleted).
6. Only then may deletion be reactivated (approval C); deletion keeps refusing while any ticket is unresolved (409).
Deletion must not be reactivated before step 5 completes.

## Private photos (design, not applied)
- New private bucket `animal-media` (owner folder), existing public `animal-photos` untouched.
- Access via a security-definer predicate: reader = current animal owner from trusted_media_bindings, or holder of an active, unexpired, unrevoked share row.
- Transfer: binding owner moves with the animal in the existing secure claim; previous owner loses read; storage UPDATE/DELETE stays denied for all clients.
- Sharing table `photo_shares(media_id, grantee_id, expires_at, revoked_at)` written only through a server function.
- Display: short-lived signed URLs generated on read, never persisted; galleries/archives keep their old public URLs until a separately approved migration.
- Deletion: new bucket added to the deletion manifest before first use.
No schema created yet: an unused bucket/table adds deletion-coverage obligations with no benefit before approval D.
