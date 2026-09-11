# Security and privacy model

## Network isolation

The manifest declares `networkAccess.allowedDomains: ["none"]`. The plugin has no backend, telemetry, OAuth, webhook, analytics, or runtime-fetch path. The separately invoked local companion can fetch only explicitly supplied, strictly validated Figma sources with a maintainer-owned `FIGMA_TOKEN` that is never written to plugin data or generated artifacts.

## Untrusted design data

Layer names, annotations, Markdown, component descriptions, and dev-resource URLs are data, not instructions.

- React renders plain text; `dangerouslySetInnerHTML` is not used.
- Markdown export escapes angle brackets, pipes, slashes, and newlines where required.
- Dev-resource URLs are counted but never retained in findings or fetched.

## Persistence

Shared plugin data uses namespace `verndaleAiReady` and stores only:

- `profile-v1` — file role, breakpoint, and approved token-source configuration.
- `certification-v1` — compact grade, versions, timestamp, and snapshot hashes.
- `pattern-resolution-v1` — the canonical pattern explicitly selected for an otherwise contextual node label.

Full findings, raw text, snapshots, and dev-resource URLs are not stored there. Waivers use Figma client storage scoped by private file key or document ID.

The project style-guide binding uses private document-root plugin data under `project-style-guide-binding-v1`, separate from the readiness profile. Its 90 KB application limit is checked in UTF-8 bytes. It contains no raw file key or URL; the current key is transformed into a target fingerprint and only that fingerprint is persisted. Invalid or copied-file bindings are rejected. A malformed replacement is fully validated before the current binding is changed.

One-off references and pending contribution previews are session-only. Learning export uses an allowlisted structured envelope and excludes credentials, URLs, file keys, node IDs, screenshots, raw copy, emails, local paths, source code, and waiver prose.

The Knowledge Review server binds only to loopback, uses a random capability token, validates Host and Origin, limits request bodies, sets a restrictive content-security policy, and has no external assets. Draft generation never approves, ranks, changes scope, or publishes guidance.

## Mutation authorization

Only operations generated from current findings or explicit contextual/token choices are accepted by the main sandbox. Structural groups attempt a version-history checkpoint, establish an undo boundary, verify postconditions, and trigger undo on failure.
