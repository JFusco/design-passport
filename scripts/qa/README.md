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

Use **Create fixture page** only in a private copy whose exact key appears in the generation allowlist. Production setup, cleanup, certification, waiver, and guidance writes are also blocked outside that allowlist. Controlled QA edits are limited to existing-node name, visibility, opacity, dimensions, radius, and stroke weight. Existing pages, saved audits, and cache are retained unless explicitly exercising Forget/Clear through the production UI in an allowlisted, task-owned copy. Back up that copy's evidence first; originals and other ongoing QA files remain protected.

**Current page / fresh session** requests the ordinary production page audit. “Fresh session” describes the plugin process, not empty persistent storage. For a cold baseline use a fresh private file key with no previous scanner context, then retain the same copy for validated-cache timings. The candidate supports explicit full, changes, component, and issue rechecks. The older baseline has no production forced-full or targeted commands, so those controls are disabled rather than relabeled. Do not compare its validated-cache refresh as though it were forced-full.

The normal production interface remains present and can be used for guidance/learnings, cleanup, saved-history, and batch regressions. Close the QA controls to expose the complete interface. Harness guard tests prove byte preservation and write boundaries; they do not substitute for recorded native Figma runs.

Compare two completed runs with `node scripts/qa/compare-native-evidence.mjs LEFT.json RIGHT.json [LEFT_RUN RIGHT_RUN]`. Run numbers select entries in harness exports; without them the last completed report is used. The comparator retains document/knowledge hashes, findings, coverage, grades, readiness, groups and repairs. It verifies each original report hash before excluding the generation timestamp and the report hash derived from that timestamp. It rejects changed build identities when both are present. Ordinary report exports can establish report equality, but are explicitly insufficient for repair-plan or build parity. Batch parity and repeated, preflight-inclusive performance measurements require their own recorded cases.
