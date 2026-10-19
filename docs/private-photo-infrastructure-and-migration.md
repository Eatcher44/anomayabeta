# Private photo infrastructure (Phase D) and future migration plan — 2026-10-19

## Built (flag `private_photos_enabled` = false; only the test allowlist can use it)
- Private bucket `animal-media` (10 MB). No client INSERT/UPDATE/DELETE policy: writes only via secure-upload, removal only via deletion cleanup.
- Read policy: active trusted media AND (current custodian OR holder of a trusted binding, e.g. the sender's own transfer archive) AND flag allowed. Transfer claim moves custodian + animal bindings to the new owner.
- secure-upload accepts `animal-media` only when the flag allows the caller.
- Sharing: `photo_shares` / `photo_share_items` (service-only) + `photo-share` function: create (owner, 1-20 selected photos he holds on his own animals, 1-720 h), revoke, resolve (256-bit token, sha256 stored) -> 5-minute signed URLs of selected photos only. Shares die on expiry, revocation, owner deletion or transfer. Downloaded copies cannot be recalled.
- delete-account removes the owner's shares; photos still bound to another account are preserved by the existing cleanup rule.

## Real tests (3 disposable accounts, 30/30 PASS)
Flag-off refusal; owner read; other account, anonymous and public URL denied; direct delete/overwrite denied; share exposes only selected photo; foreign share, excessive duration, forged token, foreign revoke refused; revoked and expired links refused; transfer: new owner reads profile + gallery, former owner keeps only archived profile photo, loses gallery, third account denied, former share ends; nobody can delete/replace transferred photo; former owner deletion preserves referenced photos; full cleanup. Script: `src/test/integration/privatePhotosReal.cjs`.

## Not done
App screens do not yet display `animal-media` references (needs signed-URL resolution in photo components). No Android test.

## Future migration of existing public photos (NOT executed, needs approval)
1. Freeze: legacy upload policies already revoked (cutover step B) so no new public objects appear.
2. Copy: server job copies each `animal-photos` object into `animal-media` at a new immutable path, registers trusted_media with the same custodian, verifies byte length + sha256 of both copies. Originals untouched.
3. Dual-read: client resolves private refs via signed URLs and still renders public URLs; ship and verify (incl. Android) before step 4.
4. Re-point: per animal/profile/archive, replace public URL with private ref in one transaction under the security mutex; bindings recomputed by the existing trigger; mapping table old->new kept.
5. Retire: after an observation window, make `animal-photos` private (approval). Public URLs then fail closed; delete public copies only after a further separate approval.
- Transfers/galleries: bindings follow the animal; archives point to the copy owned at transfer time.
- Rollback: re-point rows to the old public URL from the mapping table. Never make `animal-media` public; rollback only restores old public references, which existed before.
