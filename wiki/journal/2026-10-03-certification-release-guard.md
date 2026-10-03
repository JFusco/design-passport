---
title: Certification release guard
topics: [persistent-audits]
issue: 'https://github.com/jfusco/design-passport/issues/61'
issues: ['https://github.com/jfusco/design-passport/issues/61']
---

# Certification release guard

The timed native cross-client rename in the [postmerge acceptance record](./2026-10-03-postmerge-native-acceptance.md)
was visible in Figma before the final scene check completed, yet the plugin
reported six new certificates. The remote change reached its callback after
the certification handler settled. Repeating a node lookup inside the handler
did not see the rename. Figma documents batched asynchronous change delivery
and supplies no synchronous remote-edit checkpoint for Design plugins.

[Issue #61](https://github.com/JFusco/design-passport/issues/61) adds a
temporary release guard. The Overview buttons are disabled with a brief
explanation. Both direct certification commands fail before any metadata
write. The previous certificate fields and review action are retained.
Audits, exports, and cleanup continue. Existing certification code and its
focused regression coverage remain for issue #53's eventual restoration.

Focused handler and presentation tests, TypeScript checking, and one Chromium
test passed. `DESIGN_PASSPORT_E2E_PORT=5190 pnpm run verify:ci` exited zero
with 510 unit tests and three Chromium tests. Independent review found no
pause-path blocker. The scoped native QA harness retained production code
SHA-256 `7c36e359b8d086474192977582ff87f2a86d62db03aa32af9265f7f2f0c984ce`
and UI SHA-256 `5d6c8080822da123cd9e7879f26f9812cf589ab6ebc15f9a8b487840d63fa6be`,
used the isolated development plugin ID, and allowed writes only to the
disposable copy. The unlocked Figma Design window showed the expected file
key and page, a saved six-root result, the new dirty development identity,
both disabled certification buttons, the pause text, and working export
controls. The new harness's QA control panel did not appear in that window,
so this visual check produced no new raw export or correlated handler record.
Earlier exports were retained. The direct-command rejection has fixture
coverage; no native direct-command claim is made.

This is an audit-and-reporting release boundary, not native certification acceptance.
Issue #53 remains open for a reliable concurrent-edit result, exact-prior
rollback and Undo proof, and the unfinished timing matrix.
