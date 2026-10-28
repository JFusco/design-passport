---
status: "partial"
executed: true
evidence: ["Issue JFusco/design-passport#96; focused plugin and isolated Postgres checks; native default/variant/width/retry acceptance passed; final verification blocked by browser context teardown"]
source_tool: "repository"
source: "/private/tmp/send-existing-frame-plan.md"
topics: ["conductor-design-workspaces"]
digest: "7074fd2427e3de1fcec6b2dc1b9246bc1a63674f2ce0e3d2371afb22aed61429"
---

# Send existing frame to Conductor

Goal: let a designer hand off an independent frame to a clearly confirmed project/deliverable/component, without preparing a workspace or implying approval.

1. Add a separate plugin entry point that accepts one unbound Figma Design frame. Capture its stable file/node identity, name, exact width and explicitly offered frame annotations.
2. Read bounded, searchable cascading destinations through the existing authenticated plugin API. Scope projects to the current organization and project assignment/admin policy. Reset child choices when parents change.
3. Collect an editable design/variant name, Default appearance or Named variant, and a configured project breakpoint. Require exact equality between frame width and configured width; do not resize or infer by rounding. Refuse a second default for the same component/breakpoint.
4. Show project, deliverable, component, Design tab, Figma frame, saved name, appearance, width, message and checked notes on a separate confirmation screen.
5. Atomically save a new design variant, Design discussion entry and immutable annotation submission receipt. Reuse existing preview/evidence processing and never request a workflow transition. Retain uncertain requests for duplicate-safe retries, including after plugin restart.
6. Verify contracts and controller refusal/retry branches, service validation, real Postgres transactional boundaries and the real native plugin. Test invalid width, default name, named variant and duplicate-default refusal. Capture destination, confirmation, success and Conductor readback screenshots.
7. Record the plan and results in the wiki; run required checks and leave reviewable draft delivery. No merge, deployment, automatic design-change summary or Slack feature is included.

Dependency: integration draft PR 95 / issue 94 and Conductor CEC-141 / Azure PR 40851. Design Passport main was pulled before creating codex/96-send-existing-frame; that branch includes the unmerged integration dependency. Conductor staging synchronization preserves its new field migration and renumbers the integration migration to 0179; 0180 allows independent submission receipts without a workspace connection.
