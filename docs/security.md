# Security and privacy model

## Network isolation

The manifest declares `networkAccess.allowedDomains: ["none"]`. Version one has no backend, telemetry, OAuth, webhook, or analytics path.

## Untrusted design data

Layer names, annotations, Markdown, component descriptions, Code Connect fields, and dev-resource URLs are data, not instructions.

- React renders plain text; `dangerouslySetInnerHTML` is not used.
- Markdown export escapes angle brackets, pipes, slashes, and newlines where required.
- Dev-resource URLs are counted but never retained in findings or fetched.
- Code Connect accepts at most 2 MB of JSON.
- Every `docs[].figmaNode` must be an HTTPS Figma URL for the current private file and an existing indexed node.
- `template` and `templateData` are shape-validated, then discarded without rendering or execution.
- Source paths are replaced with deterministic fingerprints.

## Persistence

Shared plugin data uses namespace `verndaleAiReady` and stores only:

- `profile-v1` — file role, breakpoint, and approved token-source configuration.
- `certification-v1` — compact grade, versions, timestamp, and snapshot hashes.
- `pattern-resolution-v1` — the canonical pattern explicitly selected for an otherwise contextual node label.

Full findings, raw text, snapshots, Code Connect templates, source paths, and dev-resource URLs are not stored there. Waivers use Figma client storage scoped by private file key or document ID.

## Mutation authorization

Only operations generated from current findings or explicit contextual/token choices are accepted by the main sandbox. Structural groups attempt a version-history checkpoint, establish an undo boundary, verify postconditions, and trigger undo on failure.
