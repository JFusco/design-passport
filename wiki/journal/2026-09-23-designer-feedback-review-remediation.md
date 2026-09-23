---
topics: [design-passport-architecture, figma-runtime-qa, mutation-certification-safety, whole-file-design-knowledge]
plans: [2026-09-23-designer-feedback-review-remediation-571ceec1d3.md]
issue: "https://github.com/JFusco/design-passport/issues/27"
issues: ["https://github.com/JFusco/design-passport/issues/27"]
---

# Designer-feedback review remediation

Review of `aec7cf7..7e4c543` reproduced eight defects that kept release acceptance open after JFusco/design-passport#27 was closed. Required spacer sizing, detachment acknowledgement, and instance inheritance evidence were absent from the knowledge digest; Figma's native `fontName` override was not mapped to its three normalized typography fields; unbound effect dimensions could inherit through scaling; exported names bypassed Layer naming modes; variant syntax was treated as catalog vocabulary; development certificates were indistinguishable on canvas and relaunch; the Development copy trusted Production bytes; and dirty Production builds retained the clean commit identity.

The correction expands freshness material across rule-relevant ownership, page, path, layout, detachment, instance, and structural evidence while keeping the self-referential certificate outside its own digest. Native override normalization, scale-sensitive effects, and nearest-owner nested-instance tests make inherited coverage conservative. Export naming now follows the Layer naming mode, while catalog vocabulary evaluates component sets and standalone components rather than their child variant syntax.

Development certificates identify their channel in both durable canvas annotations and relaunch labels. Build generation now emits channel, source, dirtiness, and controller/UI hashes; the Development copy validates those hashes and rejects any non-Development metadata. Production builds require a clean checkout, and Development builds append a content-derived dirty suffix so local modifications cannot masquerade as a verified commit build.

Automated evidence covers the corrected freshness, inheritance, policy, certificate, and build contracts. A Development build completed with matching embedded dirty identity and artifact metadata, while the same dirty checkout was deliberately rejected by the Production build. Native Figma proof for overrides and scaled/nested instances plus two non-publisher organization checks remain publication blockers and must be recorded in a separate open acceptance follow-up.

The prior rollback archives were also reconciled. Their differing controller and companion hashes came only from 13 esbuild source comments containing a machine-specific symlink path; normalizing that non-executable prefix makes the files byte-identical. The reproducible `0.3.0-beta.3-aec7cf7-exact` archive and its three SHA-256 hashes are now authoritative in the repository QA record. Publication and rollout communication remain held until the outstanding acceptance is complete.
