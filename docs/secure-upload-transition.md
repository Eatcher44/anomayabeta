# Secure upload transition — 2026-10-18

## Targeted compatibility result: NO

All active application upload paths invoke secure-upload. No active browser Storage upload/update/remove bypass was found. This is source coverage, not complete device acceptance.

| Entry | Implementation | Evidence |
| --- | --- | --- |
| Profile photo | ProfilPage → uploadAnimalPhoto → secureUpload | Passed-on-real-backend through authenticated preview; persisted/rendered after reload |
| Animal creation, edit and camera/library picker | HomePage → uploadAnimalPhoto | Source inspected; shared multipart helper tested with mocks; individual wizard and Android camera not executed |
| Kitten gallery | KittenPhotoGallery → uploadAnimalPhoto | Source inspected; component currently has no imports/rendering entry in src, so no active gallery UI to exercise |
| Breeder logo | BreederProfilePage → secureUpload(animal-photos) | Passed-on-real-backend upload; profile save succeeds, logo present in stored profile |
| Private signature | BreederProfilePage → secureUpload(sensitive-documents) → privateDocumentUrl | Failed end-to-end: upload HTTP 200, owner signed read HTTP 400 Object not found; path consequently not set/saved by UI |
| Bug screenshot | FeedbackPage → secureUpload(bug-screenshots) | Passed-on-real-backend through preview; form receives path and shows Capture ajoutée; no support email sent |

33 tests passed with mocks: secureUploadClient, uploadLifecycle, uploadRecovery, securityContainment, feedbackHandler, feedbackSecurity. New client contract tests remain in src/test/secureUploadClient.test.ts. These do not prove production concurrency safety.

## Concrete signature blocker

Service-uploaded objects have null Storage owner_id, while trusted_media correctly records the verified custodian and active status. The server-uploaded private-document SELECT policy queries trusted_media inline, but authenticated clients cannot read that service-only table. Consequently the owner cannot obtain a signed URL. A narrowly scoped security-definer authorization predicate checking auth.uid(), active account and exact active media custody is needed; do not grant clients trusted_media access or make the bucket public. Production policy correction requires approval and real owner/foreign/anonymous regression tests. No authorization change applied this pass.

## Legacy paths still supported

Published TWA uses legacy uploads per supplied context; its actual installed artifact/network flow was not exercised this pass. Legacy INSERT policies remain for animal-photos, bug-screenshots and sensitive-documents. Animal-photo UPDATE/DELETE policies exist but are effectively false and must not be reopened. Historical integration scripts use direct Storage uploads as fixtures; they are not active application entry points. Preserve read access and existing images.

## Safe order, separate approvals

1. Fix signature owner-read authorization and pass its real save/reload and denial tests; finish current-preview wizard/camera acceptance.
2. Keep secure-upload/reconciliation backend and legacy INSERT permissions running together. Keep transfer/deletion global gates false.
3. Execute/report mandatory release gate; request explicit approval to publish compatible frontend. Current targeted results alone do not authorize publication.
4. After approved publication, verify actual published TWA photo/logo/signature/screenshot requests use secure-upload; reopen/reload existing sessions and check caching/offline behavior. Do not infer adoption from source or one updated device.
5. Approve controlled legacy INSERT retirement only after compatibility evidence and a stale-client strategy. Remove only direct-write permissions, never legitimate reads; do not use a client-provided version as authorization.
6. Treat pre-cutover authorized writes as unresolved until conclusive evidence exists; keep deletion blocked. Recover observed commits, preserve shared media, never resolve from elapsed time or absence alone.
7. Execute late-commit/retry/legacy regressions, then seek separate approval to reopen deletion. Transfer reopening remains independent.

Rollback before deletion reopening can retain compatible frontend/backend and legacy permission coexistence. Do not blindly restore direct uploads after deletion reopening: that recreates the race. Gate deletion first and require approved rollback authorization.

## Isolated real late-commit requirement

No controllable isolated Storage service is available in this session. A real test needs a disposable, separately provisioned Storage/database/auth stack with a supported barrier at the storage authorization-to-durable-commit boundary. Pause the authorized request, start deletion, release the commit and verify discard/retry/auth-last behavior. Delaying the handler before issuing a Storage request tests a different boundary; mocks or a request before authorization cannot count as this result. Never inject crashes into shared production.

## Preservation

One disposable account was created and removed, with zero remaining files; allowlist restored empty. Before/after: 74 accounts (identity hash unchanged), 136 animals (content hash unchanged). Public transfer/deletion flags stayed false. No publication, legacy permission removal, bucket-visibility change, real-record mutation or crash injection.

Before release rerun change-specific upload contracts, real owner/foreign/private reads, legacy cutover/late-commit recovery and the mandatory security release checklist. Remaining critical/high release evidence from prior tasks remains outside this focused pass.