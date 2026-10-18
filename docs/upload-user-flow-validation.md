# Targeted upload flow validation — 2026-10-18

## Real authenticated preview browser results

Two ordinary disposable signup sessions, no production-account tests. Browser: bundled desktop Chromium, localhost preview, real hosted backend, 1280×1800. No physical Android/TWA execution.

| Flow | Result | Evidence |
| --- | --- | --- |
| Animal creation wizard with gallery photo | Passed-on-real-backend | Complete name/species/sex/sterilization/breed/birth wizard; secure-upload 200; inserted animal has returned photo URL; profile displays image after navigation |
| Replace animal photo | Passed-on-real-backend | Profile image picker, secure-upload 200; changed image displays after reload |
| Kitten photo | Not-executed | KittenPhotoGallery has no active importing/rendering screen; no new UI added |
| Breeder logo | Passed-on-real-backend | Pick, upload 200, save profile; logo persisted and rendered after reload |
| Private signature | Passed-on-real-backend | Pick, upload 200, save profile, reload; displayed image; path persisted, signed URL not persisted |
| Bug report with screenshot | Passed-on-real-backend | Screenshot upload 200; real send-feedback-email 200 and browser confirmation; one clearly marked disposable test email sent to support (delivery/inbox contents not independently verified) |
| Bug draft after reload | Failed persistence expectation | Form resets; no draft/history retrieval exists. Backend owner signing remains 200 after reload, so file exists, but there is no screenshot viewer or restored attachment in the page. Do not describe this as browser readback success |
| Foreign animal profile | Passed-on-real-backend | Second-account browser shows “Animal introuvable”; backend SELECT empty and attempted foreign photo update returns no affected rows |
| Foreign screenshot/signature access | Passed-on-real-backend, backend-only checks | Signing denied 400; signature direct private read and public URL denied; anonymous private signature signing denied |
| Known animal photo URL from another account | Failed private-photo expectation; existing known exposure | HTTP 200 because animal-photos remains public by design during transition; record access denied does not make photo bytes private |
| Offline replacement | Browser fault injection with real persisted readback | Offline before dispatch: error shown, previous image retained after connection restored and reload; not an authorized in-flight Storage failure |
| Slow operation | Browser request-delay injection | Request delayed 2 seconds before sending; then real upload succeeds and reload displays image. Not bandwidth throttling, physical Android or authorization-to-commit evidence |
| Empty picker selection + focus | Browser event injection | Home creation saves an animal without a photo. This reproduces application cancellation semantics, not actual Android picker cancellation |

Screenshots inspected for created/replaced image, reloaded signature, report confirmation and visible foreign denial. Browser central-flow run had no page errors. Script locator/announcement failures were corrected; no failed locator is counted as application failure. Previously successful server mock suites were not repeated; no new concurrency mock test was run.

## Engineering findings and Android status

All active upload paths use secure-upload. No active direct Storage upload/update/remove bypass was found. Library selection uses native file input; camera uses capture="camera" (browser-dependent, not a portable guarantee of camera selection). No native permission integration, resumable upload, abort control, upload progress or persisted draft/ticket recovery is present in the browser helper.

The shared picker resolves cancellation on window focus after 300 ms if files are empty. Camera file delivery may follow focus; this timing is not verified on Android. The Home creation branch calls finalSave(null) on cancellation, confirmed with browser event injection. A targeted frontend fix is recommended: deterministic picker change/cancel lifecycle with listener cleanup, camera capture hint suitable for target browsers, and cancellation leaving the creation wizard unchanged. Do not silently save a new animal on picker cancellation. This pass identifies the issue only; no product flow changed.

Refreshing unsaved breeder edits or the bug form loses local attachment associations. Mid-upload refresh, background process death, actual slow bandwidth and authorized in-flight failure remain Not-executed. Server reconciliation protects tickets, not browser drafts. Decide whether persistent owner-scoped drafts/recovery are required before adding them; never persist signed URLs as permanent document identifiers.

## Short phone checklist

Use a dedicated test account only. The installed published TWA may still run old code; its result does not validate unpublished preview code. Test the current preview in Android Chrome where accessible, then repeat installed TWA adoption checks only after separately approved publication.

1. Create an animal with a gallery JPG/PNG, save and reopen; replace its image and reopen again.
2. Choose “Prendre une photo”; grant camera access, capture, confirm and reopen. Repeat camera permission refusal, Android Back and picker cancellation: no silent animal creation or photo clearing should occur.
3. Upload logo and signature, press Enregistrer, close/reopen profile; both should display. Test a screenshot report using a clearly marked test message; note that unsent draft currently disappears after reload.
4. Repeat on a slow mobile connection; cut connection during upload, restore it and retry; check old photo retained on failure and no duplicate animal. Record exact stage/time and any error, not tokens.
5. During upload, background app, return; separately refresh/force-close and reopen. Check saved image, lost drafts, duplicate records and whether retry remains available.
6. After approved publication: cold-start installed TWA and existing cached sessions, retry uploads, and have engineering verify secure-upload requests; do not clear all caches first, as stale-client behavior is the point of the test.

## Legacy transition and detection

Compatibility is conditional, not proven for installed clients. No service-worker registration/cache implementation or Android wrapper is found in current source; deployed origins, historical workers, browser HTTP cache and installed TWA package remain unverified.

Keep existing legacy INSERT permissions unchanged until a separately approved cutover. Safe sequence remains: fix picker/finish device acceptance → mandatory release gate and explicit frontend-publication approval → publish compatible client → inspect updated AND cached/reopened TWA sessions → approve legacy retirement/stale-client strategy → resolve authorized writes → separately approve deletion reopening. Never restore direct writes after deletion reopening without gating deletion first.

Detect legacy candidates through supported Storage/gateway write logs correlated with exact bucket/object_path secure_uploads tickets. secure-upload itself writes to Storage, so a Storage POST alone is not legacy evidence. New completed objects without a ticket are investigation candidates, not automatic proof: exclude historical objects, fixtures and other legitimate writers, and account for log retention/delay. Existing trusted_media alone does not identify upload transport. No observed legacy traffic or a client version/user-agent header can prove safe retirement. Historical/live adoption telemetry was not gathered in this pass.

## Remaining late-upload risk

For tracked uploads, started-but-absent remains pending; delete-account attempts reconciliation and returns 409 before destructive preparation/auth removal if uncertainty persists. Observed commits are registered for retryable cleanup; bindings preserve legitimate references. This is the correct fail-closed containment and was previously tested with controlled states, but it may block deletion indefinitely and does not establish real Storage race safety.

Legacy direct writes have no durable ticket, so pre-freeze authorization followed by late commit is still unresolved. Public deletion remains suspended; do not count the secure-ticket fail-safe as protection for all legacy requests.

Smallest practical real experiment: a disposable self-hosted Storage/Auth/Postgres stack on an isolated machine/CI runner, matching deployed versions as closely as supported, with a one-request barrier inserted INSIDE the Storage service after RLS authorization and before object/metadata commit. Include test bucket, relevant policies, secure lifecycle and deletion handler. Pause exact request, freeze/delete, release commit and verify blocked finalization, discard, retry and shared-reference preservation. No public test endpoint/admin secret exposure. Storage internals are not controllable in the shared hosted environment. A proxy delaying before authorization, or delaying only the function call, is not equivalent. Isolated results still require deployed-version/behavior correspondence; do not call them a production execution.

## Preservation and release decision

Two disposable accounts and all their stored files removed via scoped server deletion allowlist; original 74 account identities, 136 animal contents and 69 Storage metadata rows compared unchanged. One test support email is external and can remain under support retention; no email-deletion claim is made. No frontend/server deployment, migration, permission removal, publication, photo migration or public reactivation occurred.

Coordinated publication remains blocked by picker/device acceptance, legacy cached-client adoption/cutover, unresolved late writes and prior mandatory release evidence. Private-by-default animal photos remain a separate approved-in-principle design, not a completed privacy guarantee. Before next release rerun picker regressions, real upload attachment/readback and private/foreign denial, Android/TWA tests, legacy/late-commit recovery and the mandatory comprehensive security gate. Await approval for the next engineering stage.