---
status: "implemented"
executed: true
evidence: ["Independent runs 7c348152-cde8-4e6d-8003-3de549bf28ad and c1fde30c-b12f-48d3-ab18-06ef8b96660a; source repairs independently passed, typecheck and 149 focused tests passed"]
source_tool: "repository"
source: "/private/tmp/dp97-final-session-plan.md"
topics: ["conductor-design-workspaces"]
digest: "c7863b299f9a6bed3751d701b1f03e96f8c3230a2e39094c4b65046abd69b867"
---

# Bound handoff session recovery

Preserve the existing Conductor integration and independent-frame handoff. Repair definite bound submission refusals so only the matching pending request is cleared and the user's message can be corrected. Keep uncertain outcomes on their original request identity. Fence asynchronous storage, network, receipt and presentation work to its captured session and credential owner.

Give each in-flight submit and loading operation ownership. Reset releases the previous session's submit latch; stale completion may not release a newer submit or clear a newer loading state. Add deferred-I/O regressions for offline/disconnect, same/different account reopening, original-owner recovery and stale cleanup.

Independent review and recheck use the scoped controller/tests. Run focused controller/contracts/storage/transport tests and typecheck, then complete repository verification and hosted checks separately. Native local acceptance remains a distinct gate; no merge, deployment or remote activation.
