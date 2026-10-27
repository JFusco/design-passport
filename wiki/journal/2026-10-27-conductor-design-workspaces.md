---
topics: [conductor-design-workspaces, design-passport-architecture]
plans: [2026-10-27-final-implementation-plan-ec46cfe592.md]
---

# Connected Conductor design workspaces

Implementation began from updated main under [issue 94](https://github.com/JFusco/design-passport/issues/94), coordinated with [CEC-141](https://verndale.atlassian.net/browse/CEC-141). The new panel isolates connected transport and browser pairing from offline audits. Bounded contracts and digests validate native canvas instructions, shared stamps support recovery, and reference/wireframe roles are excluded from audit targets. Explicit submission captures bound Design frames, messages and selected annotation snapshots.

The native development plugin opens in a new Verndale integration-test file. Live testing found and fixed initial environment selection, development-manifest networking, sandbox URL availability and native fetch response compatibility. The full verification rerun passed 648 unit tests, 15 browser tests, the companion build and development bundle; four explicit annotation-selection tests passed separately. Unit verification used a temporary single-worker setting to limit host contention; the repository configuration was restored. Complete pairing/canvas/submission acceptance remains unverified while the Mac is locked.

The [workspace topic](../topics/conductor-design-workspaces.md) records ownership, security and rollout decisions. Companion migration remains separately scheduled; original history is preserved pending verified export/mapping/recovery. No deployment or plugin publication occurred.

The user expanded acceptance to selected annotations in Functional Spec generation and saved-version review. The workspace topic now includes explicit live checks for selected/unselected notes, cross-component exclusion, source links, contradictory BA decisions, deterministic resume and historical review cutoffs. All remain pending while the Mac is locked; browser fixtures are not native acceptance.
