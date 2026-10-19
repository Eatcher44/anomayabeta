# Android photo-only test authorization — 19 October 2026

## Scope
- Independent service-controlled `private_photo_test_users` array; default empty.
- Only the user-supplied disposable Android identity is enabled. The shared transfer/deletion allowlist is empty, and all global release flags remain false.
- Ordinary `animal-photos` requests from independently authorized photo testers receive an `animal-media` upload ticket. The upload handler uses the server-selected bucket for upload and removal. Other users retain the existing public-photo behavior; no existing files or references are migrated.
- Trusted custody/binding read checks remain unchanged. No administrator privileges are granted.

## Real backend results
- PASS: normal animal-photo request from Android test account produces a private animal-media reference.
- PASS: owner obtains a viewing link and reads the object.
- PASS: other ordinary disposable account cannot obtain a viewing link.
- PASS: anonymous client cannot obtain a viewing link.
- PASS: private reference saved to a new animal belonging only to the Android test account.
- PASS: transfer code creation and claiming both return 503 temporarily_suspended.
- PASS: account deletion returns 503 temporarily_suspended; no upload freeze is created for the Android account.
- PASS: global flags remain disabled, shared test list empty, photo-only list contains exactly one identity, and no other existing account is included.
- Transfer preview remains an owner-only read, not a transfer: an initial assertion expecting it to return 503 failed. Inspection confirmed previews intentionally remain readable; creation and claims remain refused. No widening of preview authorization was introduced.

## Browser and local tests
- Real authenticated preview: the saved private photo loads on its animal profile (1280×1800 desktop browser).
- 30 focused mocked/local tests pass: server-selected private bucket, upload lifecycle/recovery, containment, upload client and SecurePhoto.
- Physical Android not performed; awaiting user results in Chrome shared preview, not the published TWA.

## Preservation and cleanup
- Original 136 animals: full row fingerprint unchanged (`81ae55c79abb0fc846c140d4a7b0aeee`).
- 75 accounts after cleanup: the 74 original accounts plus the user's Android disposable account; account-ID fingerprint matches the pre-change baseline.
- One additional ordinary disposable account used for cross-account denial was deleted through the existing secure deletion process; its temporary cleanup authorization was removed.
- Retain the Android account and its new animal “Test Android photo privée” with an app-icon photo until the user confirms testing is complete. No original animal or user data changed.
- No publication, global activation, legacy-permission removal or migration.

## Required release reruns
Before any separately approved release: independent feature-gate checks, private owner/foreign/anonymous reads, upload recovery and containment regressions, physical Android results, and the mandatory security release gate. Unresolved legacy late-upload and public-photo migration decisions remain outside this task.