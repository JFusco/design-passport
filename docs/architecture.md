# Architecture

## Design principle

The plugin never equates “selected” with “known.” A target may be one selected frame, but analysis always uses a complete file-wide knowledge snapshot.

```mermaid
flowchart LR
  A[Figma pages] -->|sequential load| B[Adapter]
  V[Local + enabled-library variables] --> B
  C[Optional Code Connect parse JSON] -->|validate; discard templates| B
  B --> K[Whole-file Design Knowledge Graph]
  K --> R[Pure rule engine]
  P[Readiness profile] --> R
  R --> G[Per-source grades + file gate]
  R --> M[Typed mutation planner]
  M --> F[Preview / approve / apply]
  F -->|full rebuild| K
  G --> E[JSON + Markdown reports]
  G --> X[Certificate]
  S[Project style-guide pack] -->|private file binding| A1[Advisory evaluator]
  O[Session reference packs] --> A1
  K --> A1
  A1 --> U[Source-qualified guidance]
  G --> L[Explicit sanitized contribution preview]
```

## Subsystems

### Figma adapter

`src/figma/adapter.ts` owns dynamic page loading, traversal, component/instance relationships, variable discovery, annotations, dev-resource counts, and normalized snapshots.

- `figma.skipInvisibleInstanceChildren = true` is enabled before traversal.
- Pages call `page.loadAsync()` sequentially.
- Traversal is iterative, yields every 500 nodes, reports progress, and checks cancellation.
- Invisible instance internals remain skipped unless a future rule explicitly requires them.
- Dev-resource URLs are counted but never stored or fetched.
- Text characters are not copied into the graph; only length and fingerprint are retained.

### Whole-file Design Knowledge Graph

`DesignKnowledgeGraph` is in-memory and contains:

- page roles and coverage;
- normalized nodes and parent/child relationships;
- component definitions, instances, and main-component relationships;
- approved local and enabled-library variable descriptors;
- inferred and applied variable bindings;
- responsive specimen families;
- repeated structural groups;
- designated source-frame IDs;
- verified Code Connect evidence without templates or source paths;
- a deterministic snapshot hash over code-relevant design facts.

The graph is reusable by a future REST/CLI adapter because no Figma runtime objects enter the pure rule engine.

### Pure rule engine

`src/core/rules.ts` accepts only a graph, a profile, and target IDs. It returns deterministic `Finding` records with measured evidence, node paths, source references, confidence, fixability, and optional pattern resolution.

Node-linked punch-list entries that explain an aggregate failure can set `scoreImpact: false`; this prevents one underlying defect from being deducted twice while preserving navigation and repair detail.

### Advisory boundary

`src/core/knowledge-loop.ts` evaluates project, one-off reference, and shared knowledge only after the deterministic report has been built. None of those inputs enter `evaluateRules`, `buildReadinessReport`, certification, or mutation planning. Given an unchanged graph, profile, catalog, and ruleset, every legacy finding, score, blocker, grade, readiness field, and certificate remains unchanged regardless of advisory packs.

One `DesignReferencePackV1` may be bound to a target Figma file as its project style guide. The binding contains an opaque project scope, target-file fingerprint, pack version/digest, and sanitized facts. References stay in memory for the current plugin session.

### Local companion

`src/companion/main.ts` builds to `dist/companion.mjs`. It is the only networked part of the design. It validates exact Figma URLs, keeps `FIGMA_TOKEN` local, ingests each source into an isolated graph, produces sanitized packs, imports explicitly exported learning envelopes, groups exact observation keys, generates candidate wording, and serves the maintainer interface only on `127.0.0.1` behind a per-process capability token.

Repository-owned `knowledge/` stores sanitized observations, current drafts, append-only decisions, project packs, and shared releases. A decision is bound to the exact candidate digest, so editing a candidate invalidates an earlier approval automatically.

### Grading and report builder

`src/core/grading.ts` groups findings by rule and source root, applies severity weights, computes all eight axis scores, and applies axis multipliers. `src/core/report.ts` grades every source independently and uses the limiting frame for the file result.

### Mutation planner and executor

`src/core/planner.ts` converts only explicitly fixable findings to typed operations. `src/figma/mutations.ts` owns Figma writes, version checkpoints, undo boundaries, clone validation, postconditions, and rollback.

### React UI

`src/ui` provides profile setup, scan scope, progress/cancellation, grade and blocker summaries, filtered findings, pattern confirmation, cleanup review, context inventory, Code Connect import, token creation, certification, and report export. React text rendering is used throughout; no untrusted HTML is injected.

## Context freshness

A graph is fresh only when it is complete and no older than 15 minutes. Any document change marks it dirty. Certification requires:

- a complete graph covering every page;
- a report tied to the same graph hash;
- grade B or better for every designated source frame;
- no blockers;
- no unresolved severity-4 reviews.

Certificate metadata stores the graph hash, report hash, ruleset version, catalog version, and timestamp. A later scan compares existing certificates with the rebuilt graph and reports stale metadata.

Component sets are certified only at the root. Their concise canvas annotation includes the aggregate grade and direct-variant count; variant coverage and descendant findings remain report data. Re-certification removes only child annotations with the exact legacy Design Passport coverage prefix, preserves unrelated annotations, and returns the deletion count to the UI. Published effect styles count as machine-readable token evidence for their visible effect fields; unstyled effects still require explicit variable bindings.
