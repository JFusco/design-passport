# Native scanner verification

Build the production plugin in each source checkout, then generate the harness from this checkout:

```sh
node scripts/qa/build-native-harness.mjs \
  --source-dir /absolute/path/to/built-checkout \
  --out /private/tmp/design-passport-native-qa \
  --allowed-write-files PRIVATE_COPY_FILE_KEY
```

Import the generated `manifest.json` as a Figma development plugin. The harness retains every production JavaScript/HTML byte. Appended QA controls drive the production message handler and actual Figma APIs. `qa-build.json` records the original bundle hashes, resulting harness bundle hashes, source revision, working-tree status/diff hash, and QA implementation hash. The revision is checkout provenance at generation time; the bundle hashes identify exactly what ran.

By default the source plugin ID is retained, including its bounded local storage. To keep unrelated QA storage isolated, first use Figma's **New plugin** development flow to obtain a separate development plugin ID, then pass that real ID as `--development-plugin-id`. Use the same development ID for the baseline and candidate so compatibility checks share a storage namespace. Only the generated harness manifest changes; metadata records both IDs and whether storage is isolated. Do not invent IDs or change the production manifest. File-key write guards still apply with either identity.

For a source archive without Git metadata, supply `--source-revision` with its full commit SHA. An explicit revision that conflicts with an available checkout HEAD is rejected.

Open **Native QA controls**, inspect the current file/selection, and export collected evidence after each case. The evidence includes the actual reports, repair plans, captured targets, refresh metadata, storage status, and production diagnostic logs. QA-button timing starts before sending the request across the bridge. `reportVisibleElapsedMs` measures when the result arrives; `handlerCompleteElapsedMs` includes preflight and post-save maintenance and is the complete benchmark duration. Wait for the correlated command-complete event before exporting. Runs launched through the ordinary production interface start at `qa-handler-start`, excluding the outbound UI bridge; missing handler instrumentation is labeled `audit-started` rather than treated as complete timing. Failed and cancelled attempts retain their elapsed time and error. The last 30 runs and 5,000 events are retained, with dropped records counted explicitly. Raw file names, keys, layer names, and reports belong in private local evidence; sanitize before committing a QA summary.

Use **Create fixture page** only in a private copy whose exact key appears in the generation allowlist. Production setup, cleanup, waiver, and guidance writes are also blocked outside that allowlist. Controlled QA edits are limited to existing-node name, visibility, opacity, dimensions, radius, and stroke weight. Existing pages, saved audits, and cache are retained unless explicitly exercising Forget/Clear through the production UI in an allowlisted, task-owned copy. Back up that copy's evidence first; originals and other ongoing QA files remain protected.

**Current page / fresh session** requests the ordinary production page audit. “Fresh session” describes the plugin process, not empty persistent storage. For a cold baseline use a fresh private file key with no previous scanner context, then retain the same copy for validated-cache timings. The candidate supports explicit full, changes, component, and issue rechecks. The older baseline has no production forced-full or targeted commands, so those controls are disabled rather than relabeled. Do not compare its validated-cache refresh as though it were forced-full.

The normal production interface remains present and can be used for guidance/learnings, cleanup, saved-history, and batch regressions. Close the QA controls to expose the complete interface. Harness guard tests prove byte preservation and write boundaries; they do not substitute for recorded native Figma runs.

## Certification retirement checks

Use only the authorized copy `nxRqnuVDvB93PKgiuEXaSa` for this retirement smoke check. Run the candidate without document writes: no certification, controlled edits, fixtures, cleanup, or lock bypass.

1. Confirm the candidate producer identity and export a baseline inspection of the audited roots and affected variants. Retain exact `verndaleAiReady` / `certification-v1` strings, full annotations, and relaunch maps.
2. Run an audit, refresh the same captured target, and export JSON and Markdown. Wait for each correlated handler completion and retain failure or cancellation evidence.
3. Inspect the same node IDs again and compare exact metadata with the baseline. Preserve raw exports privately. Record missing access or unproven comparisons as partial.
4. Check that certification controls, progress, pause notices, and relaunch declarations are absent. The harness blocks both old commands even in allowlisted copies; no live certification attempt is needed.

Retirement supersedes the two certification acceptance checks and certification speed/rollback work under [issue 53](https://github.com/JFusco/design-passport/issues/53), including its former timing and concurrent-edit-rollback procedure. Audit-cache semantic parity and the native performance and screen-saver matrix remain open there. Local fixtures do not establish native preservation or performance.

Compare two completed runs with `node scripts/qa/compare-native-evidence.mjs LEFT.json RIGHT.json [LEFT_RUN RIGHT_RUN]`. Run numbers select entries in harness exports; without them the last completed report is used. The comparator retains document/knowledge hashes, findings, coverage, grades, readiness, groups and repairs. It verifies each original report hash before excluding the generation timestamp and the report hash derived from that timestamp. It rejects changed build identities when both are present. Ordinary report exports can establish report equality, but are explicitly insufficient for repair-plan or build parity. Batch parity and repeated, preflight-inclusive performance measurements require their own recorded cases.

## Matched in-session refresh benchmark

Generate both baseline and candidate with the same current harness, a real
Figma-assigned `--development-plugin-id`, and
`--benchmark-file-key PRIVATE_COPY_FILE_KEY`. Omit `--allowed-write-files` so
document changes remain blocked. Keep both source revisions and byte digests;
the runtime inspection also records the actual `figma.pluginId`.

**Export file storage checkpoint** reads only audit/context/view records for
the exact configured file and runtime plugin identity. A separate reader using
the original identity can export its existing file records without restoring
or clearing that namespace. Keep the resulting checkpoint privately. Checkpoint
reads require an idle production handler.

**Restore isolated QA storage** accepts that checkpoint only on the matching
file, in an idle plugin whose actual ID matches the separately assigned
development ID. It validates ordered scoped keys, digest, entry count, and the
shared 4 MB budget before replacing any records. Other files and plugin keys
are retained. Restore then reads back and verifies the exact checkpoint. A
failed restore invalidates the attempt; preserve the checkpoint and diagnostics.
Original/production storage cannot be restored. The controls do not change the
production storage policy or add document-write authority.

For each matched pair, launch the build and warm its ordinary audit on the same
target. Wait for correlated handler completion, import the common checkpoint,
wait for `qa-storage-restored`, then use **Recheck changes**. The evidence records
the checkpoint digest/count/bytes on that timed run. Alternate baseline/candidate
order across three pairs. Retain all attempts, diagnostic counters, actual
cache coverage, and any lock intervals; exclude interrupted or unmatched cases
from an uninterrupted speed claim.

Use `compare-native-evidence.mjs --cross-build LEFT.json RIGHT.json LEFT_RUN
RIGHT_RUN` for baseline/candidate semantic comparison. This explicit mode
requires complete clean source/byte identities, the same harness, and a report
producer SHA matching each source revision. It excludes only `producer.buildSha`
in addition to the ordinary timestamp exclusions; plugin/ruleset/channel and
all semantic report fields and repairs still match exactly. Strict comparison
remains the default. Cross-build parity does not establish same-build release
parity or a speed improvement by itself.

The focused gate is median complete candidate handler duration at most 80% of
baseline, with three matched successful pairs and exact semantic parity. It
measures refreshes within an open session under quota-limited retained/mixed
disk cache. Restart, cold-cache, screen-saver, and out-of-memory acceptance remain
under issue 53; session reuse does not establish those outcomes.
