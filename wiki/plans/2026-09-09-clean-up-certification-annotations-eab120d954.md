---
status: "implemented"
executed: true
evidence: ["GitHub issue JFusco/design-passport#12; live Figma cleanup removed 173 legacy notes and zero on repeat; pnpm verify:ci"]
source_tool: "repository"
source: "/private/tmp/design-passport-certification-annotation-cleanup-plan.md"
topics: ["mutation-certification-safety", "figma-runtime-qa"]
digest: "eab120d954c24bde8eeeb65117c8b7ece80b17e9afd422d57202aeb48d2ca436"
---

# Clean Up Certification Annotations

## Summary

Replace repeated per-variant canvas annotations with one concise component-set summary while preserving variant coverage and findings inside Design Passport. Migrate every affected component in the live `UI Design Library` file, then ship through a fully verified GitHub PR.

## Delivery workflow

- File a labeled GitHub bug linked to issue #7.
- Branch from updated `main`, implement and test the cleanup, and ship a ready PR.
- Wait for every required check to pass, squash-merge, and verify the issue closes.

## Implementation

- Keep one concise grade annotation on each certified component-set root.
- Preserve `AI source frame`, compact certification metadata, and the relaunch action.
- Remove legacy `[Design Passport] Covered by` annotations from current direct variants while preserving designer-authored notes.
- Report the legacy-note removal count and make repeat certification idempotent.
- Preserve variant coverage in the report, UI filters, descendant attribution, and Markdown export, but explain that variants and descendants are scanned while the score belongs to the component set.
- Archive the plan and update certification-safety and runtime-QA documentation.

## Acceptance

- Add unit coverage for parent notes, exact-prefix removal, unrelated-note preservation, counts, and idempotency.
- Run `pnpm verify:ci` and `git diff --check`.
- Load the development plugin in Figma Desktop, re-certify all affected component sets in `UI Design Library`, confirm the first cleanup removes legacy notes and the repeat pass removes zero, and visually check Button Light, Button Dark, Toast, Datepicker, and In-page navigation.
- Update the repository wiki and Glean project after verification.
