# Release audit
- [x] Validate real preview animal creation/replacement, breeder media and bug submission with two cleaned disposable accounts; private denial passes, public animal URLs remain readable and bug drafts reset. Android checklist/legacy and late-commit blockers documented in docs/upload-user-flow-validation.md; no publication or permission removal.
- [ ] Implement approved picker cancellation/explicit save correction, test failure/retry and duplicate prevention in preview; no publication, permissions or reactivation changes.
- [ ] Execute physical Android camera/Back/permission acceptance; blocked on a physical device, not browser emulation.
- [x] Inspect all upload entry points and run 33 targeted client/server regressions; real preview animal photo/logo/screenshot uploads succeed, signature upload succeeds but owner signed read fails. Test account/files cleaned; original fingerprints unchanged.
- [x] Apply approved narrowly scoped private signature read predicate; real owner save/reload, foreign/anonymous/public denial and photo/logo regressions pass; two disposable accounts/files cleaned, 27 mocked regressions pass. No publication/reactivation; remaining transition blockers documented.
- [x] Add versioned write-start evidence, owner-only reconciliation, committed-file/shared-media recovery and removal-checkpoint retry; 17 targeted local tests pass, three disposable hosted accounts cleaned up.
- [ ] Resolve started-but-absent uploads conclusively in an isolated instrumentable Storage environment; never infer completion from a timeout. Coordinated legacy cutover requires approval before deletion can reopen.
- [x] Implement service-only durable upload tickets, deletion freeze and pending-ticket finalization denial; execute paused late-commit/discard handler test with mocked HTTP boundary and real normal upload/cleanup.
- [ ] Complete conclusive reconciliation of genuinely uncertain writes and retire direct legacy uploads in an approved coordinated release; recoverable checkpoint/no-start states now handled, but deletion cannot safely reopen with in-flight legacy uploads.
- [x] Verify real private-note HTTP 400, ten committed creation attempts and twenty failed claims; propose medical review and private-photo compatibility rollout without moving existing files.
- [ ] Execute full relationship/expiration matrix and real instrumented late-commit scenario after isolated service instrumentation is available; only mocked pause/discard scenario executed this pass.
- [x] Update and verify the existing public privacy page.
- [x] Audit current code, database policies, storage, auth, and dependencies; record unverified settings.
- [x] Execute bounded disposable-data security tests locally and on three disposable live accounts; clean all fixtures and record omissions.
- [x] Compare final production-data fingerprints to the baseline: original identities, application rows and storage metadata unchanged.
- [x] Deliver initial release audit: NOT READY TO PUBLISH; no publication.
- [x] Receive approval for emergency containment and safe security remediation.

# Emergency transfer security review
- [x] Verify current deployed transfer authorization and photo exposure without production mutations.
- [x] Report reversible containment, permanent correction, user impact and required tests.
- [x] Obtain explicit approval before any production containment or remediation; do not publish.

# Approved security containment and remediation
- [x] Immediately revoke client transfer claiming and verify effective permissions/direct API denial.
- [x] Receive user-confirmed latest backup timestamp: 2026-10-18 03:17:46 UTC (inventory not independently accessible; storage excluded).
- [x] Obtain approval and apply additive trusted-media/transfer/deletion changes without changing original records.
- [x] Implement server-issued hashed codes, durable attempt limits, atomic claims and authorized cleanup manifests.
- [x] Apply temporary global photo overwrite/delete denial and gate automatic account deletion before mutations.
- [x] Run bounded disposable containment tests, remediate critical/high dependency alerts in preview, rescan and verify account/animal/storage fingerprints.
- [x] Execute three bounded disposable suites: forgery, limits, same/different-code claims, media preservation/cleanup, active sender-delete versus active recipient-claim and authenticated preview readback; remove all disposable accounts and test allowlists.
- [x] Replace stale containment helper test with handler authorization/gate tests; five targeted tests passed, preview build OK.
- [x] Verify original 74 account IDs, 136 animal contents and 68 photo metadata fingerprints unchanged; secondary row counts match baseline.
- [x] Deliver final nine-item report; fresh basic scan clear, two moderate dependency advisories, no publication.
- [x] Implement conservative transfer relationship checks at issuance and ownership change; refuse foreign-linked deletion preflight without editing original records.
- [x] Execute mocked deletion storage-failure/checkpoint/auth-retry and caller-only tests; execute feedback auth/escaping/quota/input tests and legacy-care tests.
- [x] Add private document bucket, owner-only access, private signature object paths and deletion coverage; preserve existing photo bucket visibility.
- [x] Verify six-page synthetic PDF with photo/logo/signature and ten-page overflow PDF; preserve large weight/observation history and actual numbering.
- [x] Deploy safe feedback corrections and persistent five/hour quota; apply targeted Vite/Vitest patch updates without major upgrades.
- [x] Re-run basic scan, dependency review, RLS/grant inspection and original account/animal/storage fingerprints; deliver seven-point report with omissions.
- [x] Execute real hosted disposable relationship/media/concurrency/private-signature suite using ordinary authenticated sessions and a scoped allowlist; remove all disposable accounts and allowlists.
- [x] Verify successive transfers, shared-photo preservation, private signature cleanup, and three simultaneous upload/deletion runs on the real backend; zero remaining test storage objects.
- [ ] Prove finalization against a real upload deliberately paused after authorization and before object commit: mocked handler pause executed, but real Storage commit instrumentation remains unavailable; keep deletion suspended.
- [x] Temporarily disable only kitten PDF export, preserve source and files, remove its checklist blocker and defer visual/PDF acceptance requirements.
- [x] Block transfers containing private notes at issuance and ownership mutation without removing history; verify late-added notes and private signature reads on the real backend.
- [x] Assess installed tooling versus runtime advisories; apply bounded PostCSS/Rollup patches and verify 25 local tests, report remaining tooling and router risks.
- [ ] Validate tooling major-version fixes in an isolated compatibility environment and verify the actual published bundle: no frontend publication allowed, old published artifact not rebuilt.
- [ ] Publish or reopen public operations only after remaining acceptance tests and explicit release approval; current global gates remain false and test allowlist empty.