---
topics: [whole-file-design-knowledge, mutation-certification-safety]
---

# Stepped audits and micro-fixes

## Decision

The plugin follows Generate context → Run audit → View report → Address issues. Audit, Report and Cleanup are the main destinations; context tools and Audit Setup remain in settings. The primary Figma layout supplies the dark palette, local Inter font and icons. Approval stays absent and certification stays retired.

The hero always uses the existing capped worst-module `report.grade`. Check again reads a bounded live closure, then recomputes all original target roots over staged evidence. There is no estimated score or independent award for Clear, waivers or supporting findings. Waived deductions remain in scoring.

## Figma presentation fidelity

The header and Audit/Report/Cleanup navigation form one sticky group before
notices, saved results and progress. The header is 49px high; navigation uses
Inter Semi Bold at 16px with 16px gaps, 24px page insets and Settings at the
right. These values come from nodes `1:2`, `13:485`, `13:986` and `16:1112` in
the supplied design. The file exposes no variable definitions, so its literal
values are shared CSS tokens rather than invented Figma variable names.

Report opens with one card containing target metadata, the 100px grade,
deterministic summary, cleanup callout and collapsed category rows. Grade
letters use Inter Black at 39.6px, with 16.6px score text and 4px corners.
Filters, evidence, history/storage, verification and exports remain available
through expandable controls. The reference's secondary gray buttons, exact
palette, 8px cards and local assets apply across the plugin. This does not
change grading, host authorization or saved-report evidence.

The user's request for exact styling supersedes the earlier readable-metadata
adjustment: reference footer text is 7px and inactive navigation opacity is
40%. Axe identifies the two inactive navigation labels as a known text
contrast exception. The browser check records those exact findings and fails
on every other accessibility finding; this is not a blanket WCAG pass.

See [issue 84](https://github.com/JFusco/design-passport/issues/84) and the
[Figma fidelity journal](../journal/2026-10-07-figma-navigation-styles.md).

Final parity inspection separated the saved preview's 40px grade from the
report's 100px grade and matched the two-decimal score, 9px preview corners
and primary Report badge colors. Exact green score badges add a documented
contrast exception. See [issue 87](https://github.com/JFusco/design-passport/issues/87)
and the [grade parity journal](../journal/2026-10-07-figma-grade-style-parity.md).

## Evidence and authority

Confirmed `excludedPageIds` belong to profile v3 and are separate from page roles. Older live profiles normalize to no exclusions; historical packet profiles remain unchanged. Report v4 discloses exclusions and full-audit/micro-check provenance while readers retain versions 1–3. Excluded pages retain topology-only identities and remain watched. Required excluded component sources cannot silently become valid evidence.

A changed-property journal includes supported LOCAL and REMOTE edits on every included page. Supported naming, existing binding/style, scalar Auto Layout, annotation and export edits are staged with proven component consumers and rendering/layout dependents. Unsupported properties, uncaptured scenes, structure, resource-definition drift or incomplete dependencies require regeneration. Creating a new global token may require regeneration. The bounded path never calls whole-file capture, REST export or the ordinary scan fallback.

Whole-context validation is session-only and lasts 15 minutes. An explicit clean audit can renew it after verifying the full unchanged environment without changing capture time. Micro-checks, batch page guards, restored saved timestamps and Clear do not renew it.

Candidate graph, report, plans and issue state commit together only after pre/post-write verification. Intervening changes or cancellation preserve predecessor evidence and pending journal entries. A verified candidate with failed persistence may publish as not saved; its durable predecessor remains retained.

Stable semantic issue keys keep unresolved aggregates anchored when a representative node changes. Resolved rows remain until Clear. Clear is a hash-bound saved-report overlay: it never changes report evidence, saved time or score, never hides actionable rows, and recurrence unhides the issue. Corrupt or mismatched overlays are ignored without losing the saved report.

## Verification boundaries

Adapter fixtures cover scoped capture, field patching, combined edits, resource enrollment/rejection and full-capture semantic parity. Host integration tests cover publication races, saving/cancellation, context generation and aged clean validation. Chromium UI checks cover the stepped flow, Clear, cleanup opt-outs, responsive widths, keyboard focus and contrast. These are local evidence.

New native Figma execution in a Verndale disposable file verified combined naming/gap edits (55.0 → 57.0), layout-dependent semantic parity with fresh full capture, explicit unsupported-edit fallback, confirmed exclusion, Clear across restart, historical check rejection and checkpointed guarded Auto Layout with native Undo. Bundle byte identities, retained raw evidence and native limitations are recorded in the [execution journal](../journal/2026-10-07-stepped-audits-micro-fixes.md). The original design and earlier QA files were preserved.

See [issue 81](https://github.com/JFusco/design-passport/issues/81) and [whole-file knowledge](./whole-file-design-knowledge.md).
