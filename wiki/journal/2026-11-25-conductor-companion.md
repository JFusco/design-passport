---
title: Native Conductor Companion local implementation
topics: [model-assisted-learning-review, project-scoped-knowledge-loop]
plans: [2026-11-25-design-passport-companion-in-conductor-f39ec94fa4.md]
---

# Native Conductor Companion

The Figma export actions can send the selected audit or sanitized learning file to an assigned Conductor project. The browser pairing records contribution consent. Before sending, the plugin saves the confirmed export and request ID on the device. Open **Conductor → Companion receipts** to check for a receipt or review and retry the same export with the original project. The saved bytes are eligible for retry for 24 hours. The plugin clears expired bytes at the next launch or when opening Companion receipts and retains the receipt lookup. A confirmed receipt clears the saved bytes. The plugin reserves up to 750 KB for compressed retries. If the export cannot fit, download the JSON to keep a copy. File export and offline auditing continue to work.

Conductor owns the project-scoped evidence, candidate decisions, model accounting and CD publication approvals. Design Passport retains its portable validators, deterministic rules and bundled offline pack. A release maintainer prepares a Conductor export, builds both plugin artifacts, and checks live eligibility before publishing. The release check covers rollback builds.

The local rehearsal uses synthetic accounts and a simulated provider. Staging workforce admission, a send from a real Figma host, production cutover and organization publication require their respective operators.
