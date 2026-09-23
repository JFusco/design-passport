---
topics: [design-passport-architecture, figma-runtime-qa]
plans: [2026-09-23-designer-feedback-hardening-and-stale-build-prevention-859c045c42.md]
issue: "https://github.com/JFusco/design-passport/issues/27"
issues: ["https://github.com/JFusco/design-passport/issues/27", "https://github.com/jfusco/design-passport/issues/27"]
---

# Designer-feedback hardening and stale-build prevention

The implementation for [JFusco/design-passport#27](https://github.com/JFusco/design-passport/issues/27) turns four designer walkthroughs into explicit scanner and distribution contracts. Plugin `0.4.0` and ruleset `1.0.0-beta.4` preserve the beta.3 rendered-stroke, zero-default, hidden-value, and individual-corner corrections while exposing exactly why every token field is bound, inherited, ignored, or missing.

Coverage now uses `(bound + inherited) / (bound + inherited + missing)`, displays Not applicable for an empty denominator, stores exact grouped counts with at most 50 samples, and pages all current live matches from the verified graph. Unsupported typography units, documentation scaffolding, non-rendered values, and inert defaults are explicit ignored evidence. Instance descendants inherit only when Figma exposes override evidence and that exact field is not overridden; changes to instance override entries invalidate cached evidence.

Profile v2 adds Required, Advisory, and Off modes for team conventions while locked safety rules remain immutable. Component pages resolve documentation wrappers to their real component sources, semantic category paths are accepted, detached layers can carry typed standalone acknowledgements, valid sizing-based spacer layers pass, external documentation links are never required, and token-source setup explains the difference between available and approved collections.

Report v3, certificate v2, and bootstrap/export identity now retain plugin version, ruleset, Git build SHA, and Production/Development channel. The existing organization plugin ID remains production-only; Figma assigned a separate ID to `Design Passport (Development)`. The plugin remains offline, historical schemas remain readable, and no saved evidence is silently upgraded.

The native candidate was exercised through the separately imported `Design Passport (Development)` identity at commit `8ad23c1`. A 65-page disposable file confirmed source-only component-page targeting, explicit rejection of an unmarked documentation wrapper, the four-bucket ledger, historical-result labeling across build SHAs, the persistent development warning, and exact producer identity. Its final recheck retained C/74.0 and 13 findings with 16 bound, 0 inherited, 17 ignored, and 10 missing entries, and exposed the friendly `Validated stored context` refresh result instead of an internal cache-state label.

The native pass found and fixed three release-boundary defects: Figma deduplicated production and development manifests stored in one directory, wrapper fragments could preserve parent links without repeated child IDs, and initial persisted-fragment reuse surfaced `not-loaded` in the UI. Development now lives under `development/manifest.json`, the graph resolver follows both child and parent evidence, and refresh reasons have stable user-facing labels. Merged-main publication evidence is maintained in [the verification record](../../docs/qa/designer-feedback-hardening.md) before the issue is closed.

The first merged-main production dry run found a fourth boundary defect: the release command reused the default build pipeline and copied Production-stamped bytes into `development/dist/`. The build scripts now share artifact compilation but mirror into the development directory only for the default Development build. A sequential Development-then-Production check verifies both development hashes remain unchanged across the release build.
