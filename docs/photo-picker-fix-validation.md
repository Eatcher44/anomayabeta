# Photo picker correction — 18 October 2026

## Scope and correction

Approved frontend-only correction; no auth, migrations, Storage permissions, server deployments or feature-gate changes.

Root cause: Home routed an empty picker result into finalSave(null), while the picker inferred cancellation from focus plus 300 ms. Camera file delivery can occur later than focus. Successful file selection also created the animal automatically.

Now change/cancel events settle the attached native input; focus never guesses cancellation. Inputs/listeners are cleaned; reopening supersedes an old unresolved picker. Camera uses capture=environment. Unsupported native cancel on an old browser leaves a harmless unresolved picker until reopened; it never saves. Device behavior is not certified.

Creation keeps the selected file locally until explicit “Créer l’animal” or “Créer sans photo”. Cancellation leaves wizard values and selected file intact. No file upload occurs on selection/cancellation alone. A synchronous guard suppresses repeated saves; an uploaded file is reused through failed record-save retries. A per-draft UUID prevents duplicate inserts after response loss; an owner-scoped read confirms the already committed row. Photo updates require a returned row; errors preserve the existing image, display French failure and allow retry. All uploads retain secure-upload authorization/validation.

## Evidence

- 30 passing local tests across picker, mocked Home creation, context insert-response-loss, secure-upload client/private-document and existing upload lifecycle/recovery suites. Native event and Home modal tests are simulations, not Android.
- Real authenticated desktop Chromium preview: native cancel EVENT injection for gallery/camera preserves open form with no create; explicit no-photo creation persists name; selection alone does not create; pre-dispatch upload abort creates no partial animal; real retry persists image; three synchronous save clicks issue one upload and one insert; replacement cancel/failure retain original image; real replacement retry displays after reload; zero page errors.
- Real insert deliberately completed through request interception then its response discarded: owner read confirms exactly one row and UI success. This is real committed database evidence with browser fault injection, NOT Storage late-commit evidence.
- Two disposable signup sessions only. Six test animals (including preparation fixture), four successful photo uploads; all cleaned through scoped delete-account. No cancellation/pre-dispatch failure uploaded an object. Superseded old replacement files remain tracked for owner cleanup rather than unsafe direct deletion.
- Original 74 account IDs, 136 animal rows and 69 original Storage rows must match baseline after cleanup; final values reported in chat after verification.

## Remaining acceptance

Physical Android/TWA camera acceptance/refusal, camera cancel/Back, focus before change, gallery-camera switching and old-browser cancel support remain unexecuted. Run on a disposable account: fill name/breed, cancel gallery, deny/cancel camera, press Back, reopen camera, capture then explicitly create; verify values and exactly one animal. Replace photo, interrupt mobile connection, retry and reopen. Test installed updated AND cached TWA only after separately approved publication.

This patch is not durable refresh/crash draft recovery. A refresh after upload but before record save can lose the local association; the server-owned tracked object remains eligible for existing reconciliation/account cleanup. No claim of general orphan-free interrupted uploads or real Storage post-authorization safety is made. Public photos and suspended deletion/transfer release blockers remain unchanged.

Before release rerun change-specific creation/update/idempotency tests, real upload/readback and private/foreign authorization, Android acceptance, legacy transition/late-write recovery and the mandatory security release gate. No new full audit performed; next task awaits approval.