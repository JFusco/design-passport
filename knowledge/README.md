# Design Passport knowledge

This directory is the repository-owned audit trail for the human-gated knowledge loop.

- `observations/` contains explicitly exported, sanitized learning envelopes.
- `candidates/current.json` contains generated, editable draft guidance.
- `decisions/` contains append-only maintainer decisions bound to candidate digests.
- `project-packs/` contains approved project-only guidance packs.
- `releases/` contains only approved, client-neutral shared guidance.

Scanning a Figma file does not write here. Import an envelope explicitly with the local companion, review its generated candidate in the loopback-only Knowledge Review interface, and make a human decision before rebuilding packs.

Project packs remain project-scoped. Only `shared` approvals whose candidate digest is still current can enter the team release pack, and advisory packs never enter the grading evaluator.
