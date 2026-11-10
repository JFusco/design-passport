---
status: "implemented"
executed: true
evidence: ["JFusco/design-passport#135; tests/component-metadata-capture.test.ts; src/figma/operations/component.ts"]
source_tool: "repository"
source: "/private/tmp/design-passport-context-capture-plan.md"
topics: ["whole-file-design-knowledge"]
digest: "22b74ef776f6dccb8f4db30395831acae8e13d93416826f4b963dd0aa829dc0c"
---

# Tolerate unreadable component metadata during context capture

## Goal

Fix JFusco/design-passport#135 without changing the client design or weakening
document mutation and context freshness checks.

## Executed steps

1. Preserve unrelated work in the original checkout; update main in an isolated
   worktree, create and verify the bug issue, and branch from updated main.
2. Consolidate component metadata capture behind guarded Figma reads. Record
   unavailable fields separately from empty metadata and refresh the complete
   bundle on cache reuse. Include metadata in scene freshness signatures.
3. Keep unreadable metadata from granting a disabled-state accessibility
   exemption. Show the affected-layer count and explain the Design mode
   requirement beside disabled page exclusion controls.
4. Verify full capture, cache reuse, recovery, later-page capture, component
   definition ownership, summary rendering, and exclusion capability behavior.
5. Update the durable topic and journal, refresh the code and wiki graphs,
   run the complete CI gate, commit, push, lint the PR body, and open a PR.

## Evidence and limits

The screenshot reports a throwing componentProperties getter. A read-only
hosted Figma check of the reported page inspected 43 component-related nodes
without reproducing the exception. Regression fixtures reproduce the exact
getter failure; the live invalid instance remains unidentified. The change
does not publish or deploy a plugin release, or edit client canvas content.
