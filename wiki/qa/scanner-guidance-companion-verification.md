# Scanner guidance and companion verification

Status: **complete for the candidate build**. The actual Figma plugin UI and the running local companion were exercised end to end on 2026-09-14 with isolated QA knowledge. The release remains governed by the parent scanner verification record and current GitHub workflow results.

## Build and isolation

The candidate was built from `codex/ai-readiness-scanner-maintenance` on base `1fe3ce28b8464ce8d37397d4b0745e3a27fe14f2` with Node `24.14.0` and pnpm `10.33.0`. The native runs used production plugin SHA-256 `f573ce3584fda8d51c3c512f4857aff35ea4f9a48de3bca82f749fa45f90dfde`, production UI SHA-256 `103b383ed819ef8ec9a4b106e769c6ce059b73f9cb35bde2aa881d155a8ee2e6`, and native harness identity `7a3f094f2888ad1e27ff442b602c3e66d4414a189c82d5808954ac4d7ce94b5f`. The final production companion bundle SHA-256 was `0217be5ab1f55a5f3ec665fca4643d361112227bc226a257766a77e20af609d0`.

All Figma writes were confined to private copies protected by the native harness allowlist. Companion observations, decisions, candidates, project packs, and the one explicitly approved shared test pack were stored in an isolated temporary directory. Hash comparisons before and after the run confirmed that the repository's real candidates, shared release pack, and bundled shared pack were unchanged. No QA learning entered the real shared release.

Raw file keys, local paths, screenshots, exported reports, and contribution envelopes remain in the local evidence archive. This document records sanitized outcomes.

## Guidance lifecycle in Figma

A style-guide pack was created through the real read-only Figma REST path and then imported through the plugin's visible picker into a private UI library copy. It contained 15 facts across all six guidance domains, reported complete source coverage, version `2026.09.14`, and short digest reference `0D5F-6E52`. The UI showed project origin, version, digest, applicability, and source-layer navigation. The binding survived a plugin restart and did not appear in a different file.

The last valid pack remained active while the plugin rejected each of these replacements:

- malformed JSON;
- unsafe content using a reserved network address;
- a 90,001-byte pack;
- a digest-invalid pack;
- a copied binding wrapper rather than a pack;
- a schema-invalid pack;
- a pack with the wrong role.

An exact 90,000-byte valid boundary pack was accepted. Duplicating the connected private Figma file and reopening the same plugin identity caused the stored binding to be rejected because it belonged to the source file; the copied file started with no connected guide.

Two session references were available as inspiration during the session and disappeared after restart. In Dev Mode, the guide remained readable while project-pack replace, use, and remove controls were blocked.

## Grading isolation

The same captured selection was audited with zero advisory packs, one project pack, multiple advisory packs, and the project pack produced by the companion round trip. The following stable report fields matched exactly in all four cases: schema and ruleset versions, catalog identity, profile hash, captured target, every axis and frame result, grade, readiness, blockers, findings, issue groups, and applied changes.

Every comparison produced A/90.5, ready, zero blockers, 29 raw findings, and six issue groups. The equality also held after an incremental refresh and saved-report restoration. Guidance changed only the advice shown to the designer; it did not change the score or authorize certification.

## Contribution privacy and freshness

The plugin displayed a contribution preview only from a freshly verified report. Cancelling the preview created no export. The subsequent actual export was 2,048 bytes with six sanitized observations. Inspection found no source text, URLs, Figma file keys, local paths, email addresses, or other excluded client data. Occurrence counts remained one per observation so grouping could not inflate contribution evidence.

Historical results remained browsable and exportable as historical, but could not authorize a contribution, cleanup, waiver, learning decision, or certificate.

## Companion import, review, and compilation

The native envelope was imported into a running local companion. Reimporting the identical envelope and a timestamp-only variant created zero new contributions. A controlled opposite-direction observation and a second project produced three unique contributions and 12 candidate drafts across two opaque project scopes.

The browser review page exercised the full decision lifecycle:

- project-only remained the default approval scope;
- editing an approved project candidate invalidated the prior approval, preserved the earlier decision record, and required approval of the new digest;
- one balanced candidate displayed one supporting, one contradictory, and two unique contributions before an explicit shared test approval;
- a separate candidate was rejected and another deferred with a note;
- five append-only decision records and all edits survived reload;
- submitting an obsolete candidate digest returned HTTP 409 with `Candidate changed; reload before deciding` and did not add a decision.

An import with a corrupt envelope digest exited unsuccessfully without changing the 12 candidate files, three observation files, or five decision files. Repeating the original and timestamp-only imports after the decisions again produced zero new contributions and preserved the edits and decisions.

Compilation produced one fact for the approved project, no facts for the independent project, and one entry in the isolated shared test pack. Both approved exception lines survived project compilation. The shared entry appeared only after the reviewer explicitly selected shared scope. Supporting and contradictory counts remained neutral evidence totals rather than an approval score.

Production validators accepted the project reference pack, the empty independent-project pack, and the test team pack. The companion reconstructed project and shared insights while leaving a healthy readiness report unchanged. This run also verified the fixes that preserve approved exceptions through compilation and align approved guidance with the 1,000-character wording limit.

After the complete repository build, the final production companion bytes rebuilt the same isolated 12-candidate, three-contribution, five-decision store and loaded the review UI with the expected 12 generated drafts and eight awaiting decisions. This final-byte smoke keeps the browser lifecycle evidence tied to the release bundle.

## Native round trip

The generated project pack was reimported through the actual plugin UI. It appeared as project guidance in the components domain with version `1.0.0`, short digest reference `14F9-55A7`, approved-project provenance, and both reviewer exceptions. Its single fact applied to the expected context.

`Recheck changes` completed in incremental `requested-refresh` mode with zero resolved and six remaining actionable issues. The report stayed A/90.5, ready, with zero blockers, 29 findings, and six groups, matching the zero-pack report exactly on all stable fields. The explicitly approved shared test guidance remained only in the isolated companion store.

## Regression coverage

Focused tests cover replacement retention, copied-file rejection, Dev Mode access, UTF-8 byte boundaries, zero/one/multiple-pack grading isolation, timestamp deduplication, group-neutral contributions, digest-bound approvals, legacy pack compatibility, exception preservation, and safe input limits. These checks run again inside the repository-wide `pnpm verify` release gate.
