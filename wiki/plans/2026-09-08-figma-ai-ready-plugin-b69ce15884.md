---
status: "implemented"
executed: true
evidence: ["commit 5d329084809aa1c1b477663e7920439756b7b25f", "pnpm verify: 19 test files and 95 tests passing", "wiki/topics/figma-runtime-qa.md live Figma Desktop verification"]
source_tool: "codex"
source: "codex:/Users/joe.fusco/.codex/sessions/2026/09/07/rollout-2026-09-07T16-38-00-01a07d97-6b20-78c3-b15b-e3d8cade4a5b_01a07d97-923e-78a0-bb51-ff4c745df31c.jsonl"
topics: ["design-passport-architecture", "design-readiness-standard", "whole-file-design-knowledge", "mutation-certification-safety", "figma-runtime-qa"]
digest: "b69ce158844434211c867aba17f12d832e2bfd06cb47d3c7ec6fe285b5248db4"
---

# Figma AI Ready Plugin

## Summary

Build an internal/private Figma Design plugin that audits, repairs, and certifies frames for MCP/API consumption. It will scan the current selection by default, support current-page and opt-in full-file scans, offer staged cleanup, and issue an AI-ready certificate only when the result is grade B or better with no hard blockers.

The standard will combine:

- The eight-axis grading and blocker model from the Figma AI Readiness skill.
- Exact component terminology from [`@verndale/ui-design-brain@1.17.0`](https://www.npmjs.com/package/@verndale/ui-design-brain), pinned in the lockfile. Its 80 canonical patterns govern names and aliases, but not normative accessibility.
- [Figma’s official MCP structure guidance](https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/): components, Code Connect, variables, semantic names, Auto Layout, annotations, and dev resources.
- [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/) for measurable accessibility requirements.
- The supplied [AI-era Figma practices article](https://arie-m-prasetyo.medium.com/figma-recommended-practices-in-the-age-of-ai-e766b098ef9f) as non-normative guidance for page roles, responsive specimens, semantic layers, and source-of-truth marking.

## Standards and Rules

### Naming and file organization

- Resolve component families against the UI Design Brain manifest: canonical name first, then plain aliases. Contextual aliases such as `CTA`, `Banner`, `Label`, and `Stepper` always require designer confirmation; unknown terms are recorded as novel rather than guessed.
- Normalize components as `<Canonical pattern> / <qualifier>`, such as `Card / Product` or `Icon / Search`.
- Use lower-camel component properties (`variant`, `size`, `state`, `showIcon`) and lowercase, full-word values (`primary`, `small`, `focus-visible`).
- Require semantic child-layer names while allowing domain-specific roles; reject Figma defaults such as `Frame 42`, `Group 8`, and `Text 3`.
- Name responsive specimens `<Artifact> / <Breakpoint> / <Width>`, for example `Hero / Desktop / 1440`.
- Map pages to `Foundations`, `Components`, and `Screens` roles without forcing page renames or moves. Product files may point Foundations and Components to enabled external libraries; library files may omit Screens.
- Default breakpoint profile: Desktop 1440, Tablet 768, Mobile 375. Store per-file overrides in the profile.

### Readiness axes

| Axis | Automated evidence and cleanup |
|---|---|
| Token foundation | Detect local and enabled-library variables, semantic aliases, modes, scopes, and web code syntax. Preserve designated existing token sources. |
| Token application | Measure binding coverage for color, stroke, radius, spacing, layout, effects, and typography; compare bindings across breakpoints. Bind only a unique, compatible `inferredVariables` candidate automatically. |
| Layer naming | Measure default-name percentage, duplicate artboards, canonical pattern resolution, property/value grammar, and semantic layer roles. |
| Structure / Auto Layout | Detect layout containers without Auto Layout, spacer layers, inappropriate groups, fixed sizing, clipping, and inconsistent gap/padding. Use Figma’s `inferredAutoLayout` only after clone-based geometry validation. |
| Component hygiene | Detect detached instances, missing descriptions, generic properties, incomplete/duplicate variants, and structurally repeated component candidates. Show the resolved UI Design Brain checklist. |
| Responsive completeness | Validate configured widths or variable modes, unique breakpoint mapping, content consistency, token parity, and first-class tablet/mobile specimens. |
| Accessibility | Calculate WCAG 2.2 AA text contrast for resolvable solid backgrounds, enforce 24×24 minimum targets, flag 44×44 as the preferred touch target, and require manual review for focus, keyboard, ARIA, gradients, or imagery. |
| Pipeline readiness | Require frame/component-level source targets, semantic structure, named export assets, annotations, dev resources, variable-backed values, and optional Code Connect evidence. |

### Deterministic grading

- Rules return `pass`, `fail`, `needs-review`, `waived`, or `not-applicable`, with severity weights of 1, 2, or 4.
- Axis score is passed applicable weight divided by total applicable weight. `needs-review` scores as failed until resolved; waivers remain deductions so they cannot inflate quality.
- Weight Token application, Layer naming, and Pipeline readiness at 2; all other axes at 1.
- Grade thresholds: A ≥90, B ≥80, C ≥70, D ≥50, F below 50.
- Preserve the existing readiness thresholds: under 5% default layer names is healthy, 5–15% is C territory, and over 15% is D or worse; token coverage requires at least 85% for B and 95% for A.
- Hard blockers include a page/canvas used instead of a consumable frame, a wholly unbound breakpoint tier, colliding responsive names or widths, no real responsive signal, and wholly literal code-relevant styling.
- `ready = grade ≥ B && no blockers && no unresolved critical reviews`.
- Missing Code Connect evidence caps the result at B but does not block readiness; A requires verified evidence for every in-scope core component.
- Grade each source frame independently. A file is ready only when all designated source frames and file-level rules pass; never average a poor frame out of view.

## Plugin Architecture and Interfaces

- Scaffold the empty workspace with Node 24.14, pnpm, TypeScript, React, an esbuild/Vite production bundle, Vitest, and JSON Schema validation.
- Use a private-plugin manifest with `editorType: ["figma"]`, `documentAccess: "dynamic-page"`, `permissions: ["teamlibrary"]`, `enablePrivatePluginApi: true`, and `networkAccess.allowedDomains: ["none"]`.
- Keep four isolated subsystems:
  - Figma adapter: selection/page traversal, variables, components, annotations, and mutations.
  - Pure rule engine: normalized snapshots in, deterministic findings/reports out; reusable by a future REST/CLI adapter.
  - Mutation planner: findings to previewable, typed change operations.
  - React UI: profile setup, progress, findings, cleanup review, certification, and exports.
- Enable `skipInvisibleInstanceChildren`; do not descend through instance internals unless a rule requires it. Load additional pages sequentially only for explicit full-file scans, with progress and cancellation, following [Figma’s dynamic-loading guidance](https://developers.figma.com/docs/plugins/accessing-document/).

Define and JSON-schema validate these contracts:

```ts
ReadinessProfile {
  schemaVersion: 1
  profileId: "verndale-web-v1"
  artifactKind: "product" | "library"
  pageRoles
  breakpoints
  tokenSourceCollectionKeys
  namingPolicy: "code-aligned-strict"
}

Finding {
  ruleId
  axis
  severity
  nodeId
  nodePath
  status
  evidence
  sourceRefs
  patternResolution
  fixability: "automatic" | "guarded" | "manual"
  confidence
  waiver?
}

ChangePlan {
  id
  findingIds
  risk
  operations
  expectedPostconditions
  rollbackBoundary
}

ReadinessReport {
  schemaVersion: 1
  rulesetVersion
  catalogVersion
  catalogDigest
  profileHash
  target
  axes
  grade
  ready
  blockers
  findings
  appliedChanges
}
```

- Persist the file profile and compact certification summaries using shared plugin-data namespace `verndaleAiReady`; never store full findings, Code Connect source paths, or sensitive content there.
- Add a concise annotation and relaunch action to certified source frames. Include grade, ruleset/catalog versions, timestamp, and snapshot hash so a later scan can detect stale certification.
- Export complete JSON and Markdown reports. JSON is the stable machine contract for future CI/API validation.
- Accept optional JSON from `figma connect parse`; validate `docs[].figmaNode` against the current private file key and node IDs. Never execute or render its `template` field. The supported parse shape follows [Figma’s Code Connect parser contract](https://developers.figma.com/docs/code-connect/custom-parsers/).
- Treat layer text, annotations, Markdown, Code Connect templates, and dev-resource URLs as untrusted display data: escape it, never evaluate it, and never fetch embedded URLs.

## Cleanup Workflow and Safety

1. On first run, choose product or library file, map page roles, select allowed local/enabled-library token collections, and confirm breakpoint widths.
2. Scan selected roots and present grade, blockers, axis summaries, and node-linked findings.
3. Build a staged cleanup plan:
   - Automatic: whitespace/case normalization, unambiguous canonical aliases, lossless property/value normalization, annotations, metadata, and export-name cleanup.
   - Guarded: unique variable bindings, inferred Auto Layout, exact detached-instance reconnection, duplicate-to-component conversion, and variant grouping.
   - Manual: contextual aliases, multiple token matches, semantic token names, uncertain component extraction, responsive restructuring, and non-measurable accessibility behavior.
4. For unmatched values repeated at least three times, offer a token-creation wizard. Require the designer to choose an existing collection and semantic slash-separated name; never generate a raw-value token and call it semantic.
5. Before structural changes, await a version-history checkpoint named `Before Figma AI Ready cleanup`. If unavailable, allow low-risk changes but require an explicit undo-only acknowledgement for structural work.
6. Test Auto Layout changes on a temporary clone. Apply only when Figma supplies inferred properties, child order is unchanged, no clipping/overlap is introduced, and every measured bound remains within 0.5 px.
7. Commit each approved risk group separately to Figma undo history. Roll back immediately when a postcondition fails.
8. Never delete content, move pages, enable libraries, or guess semantic mappings. High-risk component conversion remains individually confirmed even when “Fix all” is used.
9. Rescan after cleanup; certification and report export use only the post-cleanup result.

## Test Plan and Rollout

- Resolver tests cover all 80 canonical patterns, every plain alias, all six contextual alias entries, path-qualified names, casing, and novel terms.
- Golden snapshot fixtures cover each rule, grade boundary, blocker, waiver, responsive profile, local/external token source, and unresolved manual review.
- Mutation tests prove preview/apply parity, idempotency, undo grouping, failed-postcondition rollback, unique-token matching, clone cleanup, and the 0.5 px geometry limit.
- Contract tests validate UI messages, profile storage, shared certification metadata, report schemas, Markdown escaping, and malformed or hostile Code Connect imports.
- Performance fixtures cover 10k- and 50k-node pages; selection scans should remain interactive, while full-file scans must show progress and support cancellation.
- Create a golden Figma fixture containing a clean component library, product screens at three breakpoints, and deliberate failures for every axis. Manually verify node navigation, annotations, version checkpoints, undo, exports, and dark/light plugin UI.
- Pilot internally on one design-system file, one current product file, and one legacy file. Resolve false positives with the design-system owner before freezing ruleset `1.0.0`.
- Catalog upgrades occur only through an explicit dependency/version change and reviewed generated-manifest diff. No live `latest` lookup is allowed.
- Version one has no backend, telemetry, OAuth, webhook, or organization-wide enforcement. Its normalized snapshot and report contracts are intentionally reusable by a later Figma REST/CI adapter.
