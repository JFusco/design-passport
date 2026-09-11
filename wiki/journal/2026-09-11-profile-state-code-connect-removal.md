---
topics: [design-passport-architecture, design-readiness-standard, whole-file-design-knowledge, mutation-certification-safety, figma-runtime-qa]
plans: [2026-09-11-profile-state-fix-and-code-connect-removal-80d06ac784.md]
---

# Profile state recovery and pipeline simplification

## Change

Design Passport `0.1.1` now separates the sandbox-owned audit profile from the editable React draft. Scan requests carry only target scope and refresh intent. Conventional product and component-library structures are deterministically classified from page names, component-section boundaries, local Semantic collections, and standard breakpoints, so a designer can audit immediately without a setup step. Audit setup moved out of the primary navigation; its file-type and mapping controls stay collapsed unless safe inference fails or the designer deliberately opens Advanced.

Unsaved, invalid, or reconciled advanced drafts block audits and every report-dependent mutation or export until the designer explicitly saves or discards them. Semantic problems render inline, while deleted page mappings return through a typed recovery response with current page options and fresh suggestions. The six primary tabs now share the complete navigation width.

The obsolete optional integration was removed from the current profile contract, knowledge graph, runtime messages, rule inventory, grading, UI, generated validators, tests, and documentation. Legacy stored profiles are still accepted after their removed boolean is stripped in memory; nothing is rewritten until explicit Save. The ruleset advanced to `1.0.0-beta.2`, intentionally making earlier certifications stale.

## Rationale

An editable draft previously traveled with every scan and was persisted before validation. A designer could switch a library profile to Product without mapping Screens, leave Profile, and trigger a global validation error while the previous report remained visible. Keeping drafts out of the scan contract makes Save the only persistence boundary and turns page deletion into a recoverable profile state instead of a runtime failure. Hiding routine setup also keeps the user journey centered on choosing an audit target, understanding findings, applying previewed cleanup, and making only the decisions that cannot be determined safely.

## Evidence

- [GitHub issue JFusco/design-passport#17](https://github.com/JFusco/design-passport/issues/17) carries both `bug` and `enhancement` labels.
- Implementation branch: `codex/17-profile-state-code-connect-removal`, based on `c0acfd3`.
- Automated verification covers draft state, automatic classification, stale mappings, semantic validation, legacy migration, and the transient-node mutation guard.
- Figma Desktop recovery checks in `UI Design Library`: valid/invalid drafts, downstream gating, Save/Discard, duplicate and invalid breakpoints, deleted-page recovery, deterministic mapping of 1 Foundations and 27 component pages, and both local Semantic collections passed.
- A disposable 37th page began F/49.9 with 25 controlled findings. Safe/guarded and structural cleanup, follow-up binding, manual resolution, stale-state handling, re-audit, and repeat certification moved it to B/81.2 ready. This exposed and fixed a delayed transient-clone race in the single structural-plan path. Exactly one grade annotation remained after repeat certification.
- The disposable page was deleted, restoring the original 36-page topology. A final Current page audit on the real library completed B/87.8 ready with 36/36 pages loaded. The development plugin was not published.

## Affected topics

- [Design Passport architecture](../topics/design-passport-architecture.md)
- [Design readiness standard](../topics/design-readiness-standard.md)
- [Whole-file design knowledge](../topics/whole-file-design-knowledge.md)
- [Mutation and certification safety](../topics/mutation-certification-safety.md)
- [Figma runtime and release QA](../topics/figma-runtime-qa.md)
