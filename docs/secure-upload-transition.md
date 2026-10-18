# Secure upload transition — 2026-10-18

## Targeted signature compatibility result: YES; full transition readiness: NO

All active application upload paths invoke secure-upload. No active browser Storage upload/update/remove bypass was found. This is source coverage, not complete device acceptance.

Follow-up real wizard/replacement, bug submission, Android/source analysis and manual checklist: [upload-user-flow-validation.md](./upload-user-flow-validation.md). Creation/replacement now pass in preview; Android remains unverified. Picker cancellation creates an animal without a photo, bug drafts reset, and known public animal URLs remain accessible to other accounts. These limitations must not be hidden by upload HTTP success.

| Entry | Implementation | Evidence |
| --- | --- | --- |
| Profile photo | ProfilPage → uploadAnimalPhoto → secureUpload | Passed-on-real-backend through authenticated preview; persisted/rendered after reload |
| Animal creation, edit and camera/library picker | HomePage → uploadAnimalPhoto | Source inspected; shared multipart helper tested with mocks; individual wizard and Android camera not executed |
| Kitten gallery | KittenPhotoGallery → uploadAnimalPhoto | Source inspected; component currently has no imports/rendering entry in src, so no active gallery UI to exercise |
| Breeder logo | BreederProfilePage → secureUpload(animal-photos) | Passed-on-real-backend upload; profile save succeeds, logo present in stored profile |
| Private signature | BreederProfilePage → secureUpload(sensitive-documents) → privateDocumentUrl | Passed-on-real-backend after approved migration 0022: upload, save, reload and rendered image; owner signing/fetch HTTP 200; other-account/anonymous signing and direct private reads HTTP 400; public URL HTTP 400 |
| Bug screenshot | FeedbackPage → secureUpload(bug-screenshots) | Passed-on-real-backend through preview; form receives path and shows Capture ajoutée; no support email sent |

33 tests passed with mocks: secureUploadClient, uploadLifecycle, uploadRecovery, securityContainment, feedbackHandler, feedbackSecurity. New client contract tests remain in src/test/secureUploadClient.test.ts. These do not prove production concurrency safety.

## Concrete signature blocker

Service-uploaded objects have null Storage owner_id, while trusted_media correctly records the verified custodian and active status. The server-uploaded private-document SELECT policy queried trusted_media inline, but RLS hides registry rows from authenticated clients (live SELECT privilege exists, but no applicable read policy). Consequently the owner could not obtain a signed URL.

Approved migration 0022 replaces only that inline policy condition with security_private_document_read_allowed(bucket,path), a fixed-search-path STABLE SECURITY DEFINER predicate. It verifies auth.uid(), account activity, exact sensitive-documents bucket/path and active trusted custody. No caller UID, prefix fallback, registry grant, bucket publicity or write permission is introduced. PUBLIC/anon execution is revoked. Existing owner_id-based legacy SELECT remains unchanged for backward compatibility; it does not authorize these null-owner server uploads. Its eventual registry-only transition needs separate legacy compatibility review.

### Targeted authorization evidence — 21:09 UTC

Two disposable signup accounts only. Passed-on-real-backend: service-uploaded null-owner signature, owner signing/fetch, breeder profile saved with object path and null signature_url, displayed signature after reload (browser screenshot checked), saved/rendered logo, saved/read animal photo; other account and anonymous signed/direct access denied; direct public URL denied; forged foreign path predicate denied; wrong-bucket predicate false; registry contents remain invisible. Both accounts removed through delete-account using the scoped test allowlist, with zero remaining test files/profile rows. Test allowlist removed; global transfer/deletion flags remain false.

27 Passed-with-mocks-only regressions across privateDocuments, secureUploadClient, uploadLifecycle, uploadRecovery and securityContainment. New privateDocuments tests assert 300-second signing and no public fallback on denial or incomplete response. These do not prove concurrency. Short-lived signed URLs are bearer capabilities: anyone given a valid URL can read it until expiry; denial tests target unauthorized issuance and public/direct endpoints, not possession of an owner-issued token.

No additional full audit or concurrency/crash test attempted. Remaining transition blockers: wizard/Android camera acceptance, actual published/TWA and cached-client adoption after separately approved publication, approved legacy INSERT retirement, conclusive resolution of already authorized writes, real isolated authorization-to-commit late-write test, mandatory release gate and separate reactivation approval.

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

Latest pass: two disposable accounts created and removed, zero remaining files/profile rows. Before/after: 74 accounts (identity hash 6a1ac6c914abeb85793e020ebb14aad0), 136 animals (content hash 7723640525d49a14df6aa9453e1f0293), 69 original Storage objects (metadata hash 88b5d6dd640d197ed35cb07c65d942b2). Public transfer/deletion flags stayed false. No publication, legacy permission removal, bucket-visibility change, original-record mutation or crash injection.

Before release rerun change-specific upload contracts, real owner/foreign/private reads, legacy cutover/late-commit recovery and the mandatory security release checklist. Remaining critical/high release evidence from prior tasks remains outside this focused pass.