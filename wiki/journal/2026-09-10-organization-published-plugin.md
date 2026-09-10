---
topics: [design-passport-architecture, figma-runtime-qa]
---

# Organization-published plugin documentation

## Change

Updated the repository-facing documentation for Design Passport's publication to the Verndale organization. The README now gives normal operators the published-plugin path through Figma Resources, makes the first-run/audit/certification sequence explicit, and confines manifest importing to unreleased local-build testing. Manual QA now distinguishes organization-distribution coverage from development-copy smoke testing. The package description matches the published distribution.

Reconciled all five Glean project artifacts with the same distribution model. **Start Here**, **How to Use Design Passport**, and **Technical Reference** now explain the organization-published path and the separate maintainer-only development path; **Why Design Passport** and **Readiness Standard** carry matching distribution metadata. The artifacts are displayed in numbered reading order, left-to-right and then top-to-bottom: 01 Start Here, 02 Why Design Passport, 03 How to Use Design Passport, 04 Readiness Standard, and 05 Technical Reference. The canonical source set now also includes the repository's `manifest.json` alongside the existing README and manual-QA sources.

## Rationale

The committed manifest now carries the Figma-assigned published plugin ID. Telling ordinary users to import that manifest would bypass the intended organization deployment flow and can obscure published-only capabilities such as eligible private-plugin file identity.

## Evidence

- `manifest.json` uses Figma plugin ID `1679932628975716363`.
- [README](../../README.md) documents the organization-user and local-development paths separately.
- [Manual rollout QA](../../docs/manual-qa.md) exercises the published plugin before the development-copy smoke test.
- [Glean project 17](https://app.glean.com/projects/17) presents artifacts 01–05 in numbered grid order and references the canonical published manifest.

## Durable decision

The committed manifest identifies the organization-published plugin. It is a release-controlled artifact, not a per-user installation file. See [Design Passport architecture](../topics/design-passport-architecture.md) and [Figma runtime and release QA](../topics/figma-runtime-qa.md).
