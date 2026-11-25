---
status: "partial"
executed: true
evidence: ["src/plugin/companion-send.ts, scripts/conductor-release.mjs, tests/conductor-companion-contracts.test.ts"]
source_tool: "repository"
source: "/Users/joe.fusco/.codex/visualizations/2026/11/25/01a2139f-6bc4-7551-be44-6cbe5e22f14c/companion-implementation-plan.md"
topics: ["model-assisted-learning-review"]
digest: "f39ec94fa457d1645cd7222795603cf84695ad73879893e2f5b0001c40a62bb3"
---

# Design Passport Companion in Conductor

Build a native workspace at `/design-passport` with a permanent Conductor navigation entry and project deep links. Every admitted internal Conductor user can open it. A user with no assigned projects sees an empty workspace. Full Companion parity is the general-release condition.

## 1. Establish the two-repository contract

Conductor owns identity, memberships, the plugin contribution API, stored evidence, model jobs and the release approval ledger. Design Passport owns the evidence formats, per-kind limits, validation, deterministic knowledge and pack rules, offline plugin and publication. Mirror the minimum portable contracts and logic into the consuming repo with the owner's revision and source hashes, following the existing Conductor contract mirror. Run golden fixtures in both repositories for valid and invalid inputs, historical formats, limits, semantic digests and deterministic pack results.

Local planning baselines were Design Passport main `f866911` and Conductor staging `6f633ce`. The latter pins DBOS SDK 4.23.6 in its lockfile. Confirm both branch heads and the deployed database/provider versions when work starts. Verify an ordinary workforce account can enter in staging and production during rollout. Universal employee entitlement in production was not established.

## 2. Ship the workspace and access policy in Conductor

Use the shell's native routes, same-origin browser API, server-side services, Azure PostgreSQL persistence and durable worker. Expose audit and learning imports, previews, filtered history, original downloads, candidate revisions, project guidance, Figma reference/style-guide packs and governed model reviews. Preserve the existing plugin pairing route under `/design-passport/pair`.

| Actor | Allowed actions |
|---|---|
| Internal user with project read access | Open the workspace and read, search or download within authorized projects. |
| Project member with contributor access | Submit evidence, revise candidates, make project-only decisions, create packs, and start or apply model reviews within the allowance. |
| Source project's assigned Creative Director | Set model allowance, reconcile spend, and approve, supersede or withdraw client-neutral guidance for the plugin. |
| Plugin release maintainer | Retrieve an eligible public pack and prepare or publish the verified build through the existing release process. |

Check workforce identity and matrix level before the current project assignment. Use the server-side project-role resolver and the `creative_director` / `cd` aliases. Its separate workforce-admin flag grants no Companion CD authority. Filter project lists and counts at query time. Resolve existing records to their stored project. Use this policy on direct links, mutations, downloads and receipts. The UI's “My Projects” display filter is unsuitable for authorization because it permits an unknown principal. For credentialed Figma reads, resolve the approved project/file association before invoking the adapter. Use existing project/deliverable file links where applicable; shared style-guide files require an explicit authorized project association.

## 3. Deliver both contribution paths

Keep web file upload and add **Send to Companion** to the existing audit and learning export flows in Figma. Show the destination and data disclosure before sending. Keep normal auditing and file export available offline. Reuse browser pairing, expiry, revocation and fixed Conductor origins. Add an independently consented, contribution-only grant for the new destination, send and receipt operations under `/api/figma-plugin/v1/`. Preserve the legacy workspace-only credential contract. Clients that already paired must explicitly approve contribution access.

Route both transports through one import service. Enforce actual streamed byte limits before parsing, including multipart and batch limits. Current per-file limits are 10 MB for audits and 1 MB for learnings, with 10 files per batch and 25 MB / 5 MB aggregate respectively. Preserve the exact received file bytes and validate the versioned payload. Keep its raw-byte SHA-256 distinct from the existing semantic evidence digest. Treat any scope in the evidence as provenance and enforce the selected, authorized destination.

Persist a caller-bound request ID before first send. Bind it to project, evidence kind and byte digest. Atomically write the receipt and channel and link them to evidence deduplicated within project and kind. Concurrent retries with identical input recover the first result; conflicting reuse fails. A deliberate upload after a successful send produces a separate receipt for the same evidence. Preserve separate export variants and the existing logical audit/report relationship.

## 4. Move governed model reviews to the durable worker

Keep explicit preview, Start and Apply. Freeze the disclosed sanitized input, guide, candidate revisions and selection of one to eight candidates. Use zero initial lifetime allowance. Reserve funds atomically with admission, then schedule the stable review ID. Serialize allowance changes, holds, settlements and reconciliation per project.

Record and claim a provider-attempt ID before dispatch. Retrieve a known result after recovery. If dispatch might have succeeded and the provider cannot guarantee safe replay, keep the reservation and mark the outcome for CD reconciliation. Exercise cancellation, timeouts and worker restart. A fresh paid retry requires a new authorized action unless the provider guarantees the original request can be replayed without a second charge. Only an explicit, currently authorized Apply can change project knowledge. Check the frozen candidate revisions and commit application and resultant project decisions once.

## 5. Close the release path from Creative Director to Figma

Show the CD exactly what will ship, including identifiers, domain, wording, optional exceptions and contexts. Use opaque identifiers and retain private lineage, raw evidence, actor identity and rationale in Conductor. Record the actor's actual project assignment, exact candidate revision and digest, approved fields, rationale and time.

Approval for that exact revision survives CD reassignment. A successor can withdraw or supersede it. An edit requires fresh approval. A previously shipped historical entry can enter a future release only with a verifiable matching decision from an assigned source-project CD.

Conductor issues an immutable versioned export tied to its exact pack bytes and approval records. A Design Passport release command retrieves it from the trusted Conductor origin, verifies those bindings, updates the two existing pack files, checks byte parity and binds the pack to the built artifact. Recheck live eligibility immediately before the maintainer publishes. Cover production, corrective and rollback builds. If an entry became ineligible or the export cannot be verified, rebuild from a currently eligible export. The local CLI's ability to produce identical files cannot serve as release approval. Existing distributed plugin versions keep their bundled guidance until updated.

## 6. Rehearse migration and cut over to one writer

At a consistent cutoff, inventory source records independently of the export manifest. Include original source identities and timestamps, relationships, revisions, decision history, guidance packs and all model accounting. Map each legacy project scope explicitly. Retain and count unmapped evidence in restricted quarantine, with a recorded disposition. Import historical decisions as historical facts. Require valid CD provenance for future publication.

For **new** captures, verify exact input bytes against the downloaded artifact. The **legacy** importer stored parsed JSON and its semantic digest. Where a raw file survives, retain and verify its byte digest. Otherwise preserve the database payload and digest plus the exact verified migration-export bytes, labelled by provenance. Never certify unavailable original upload bytes. Compare restored IDs, digests, links, timestamps, counts and ledger totals with the independent inventory. Test a missing revision with a recomputed manifest, a replay and a complete restore.

Before the final snapshot, fence legacy uploads, mutations and provider dispatch. Drain or transfer unresolved attempts and held reservations by their original identities. Disable the old worker before activating hosted execution. Retain the read-only source and verified backup. After hosted writes begin, recover forward from hosted data through its last acknowledged writes. Reopening the old writer would lose new evidence, decisions and accounting.

## Delivery and go-live evidence

1. Deliver Conductor first behind a rollout flag on a PR targeting `staging`. Include wiki, affected typecheck, focused tests and CI. For Design Passport create a new canonical issue. Closed issue #94 is historical context. Deliver the plugin and release importer on its issue branch, include the wiki, run `pnpm run verify:ci` and `pnpm run lint:pr`, then stop at the verified open PR to `main`. Rollout, cutover and Figma publication are separate operator actions.
2. Exercise every local Companion capability in staging, including previews, direct history/downloads, both pack types, guidance, budgets, cancellation, recovery and Apply. Check authorized, empty, revoked and cross-project sessions, and refusal of an unrelated Figma file before provider access.
3. Demonstrate a real plugin send, lost-response recovery, file-upload deduplication, limit rejection before parsing, and compatibility with existing workspace-only pairings. Verify new original downloads byte for byte.
4. Race model starts against a budget edit. Interrupt after paid dispatch and prove the charge, hold and reconciliation behavior. Retry Apply and prove one project decision with no shared promotion.
5. Demonstrate CD-only promotion, reassignment, withdrawal after export, stale or tampered pack refusal, and offline consumption in a development plugin. Rehearse migration and recovery with a provider attempt crossing cutover and subsequent hosted writes.

## Review record

The independent recheck passed all 14 findings on the first refined plan. Claude reported a weekly usage limit; the helper's recorded Codex GPT-6 Astra reviewer ran at maximum effort, independently from the GPT-6.2 Astra coordinator. Automatic approval review rejected sending the large private-source packet to the nested researcher, so the independent stages used the draft, a behavior summary and public primary sources. The baseline revisions, source-specific implementation notes and legacy JSON byte qualification above were checked locally. Production entitlements, deployed provider behavior, migration counts and the staging journeys remain implementation and rollout checks.

[Full independently rechecked plan](./plan-review/b05e9952-0c67-411d-a5b4-1d9e781502e1/final.md) · [Review findings and evidence](./plan-review/b05e9952-0c67-411d-a5b4-1d9e781502e1/handoff.md)
