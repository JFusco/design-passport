---
name: graphify
description: Use Design Passport's shared Graphify code map to trace current source relationships in src/ and apps/companion/, assess impact, or refresh the map after code changes. Use source files for exact behavior and the context wiki for history.
---

# Graphify code map

Use the Graphify 0.9.36 CLI from the repository root. The shared map is in `graphify-out/`; `.graphifyignore` limits it to maintained `src/` and `apps/companion/` code. It does not describe wiki history or the app's design knowledge.

## Orient with the CLI

- For a broad current-code question, run `graphify query "<question>"` to get a scoped subgraph.
- For a specific symbol, run `graphify explain "<symbol>"`. For a relationship between two symbols, use `graphify path "<from>" "<to>"`; for downstream impact, use `graphify affected "<symbol>"`.
- Follow the returned file and line references into source before asserting behavior. Confirm `INFERRED` and `AMBIGUOUS` relationships in source.
- For an exact file, symbol, or command question, inspect the named source directly. For rationale or change history, follow the `wiki/` navigation rules in `AGENTS.md`. Do not read generated graph JSON as a substitute for a scoped CLI query.

## Keep the map current

- After changing eligible code, or after a pull or merge, run `PYTHONHASHSEED=0 graphify update .`. Native `post-commit` and `post-checkout` hooks also refresh the graph in the background; let them finish before staging generated output.
- To rebuild from scratch without model calls, run `PYTHONHASHSEED=0 GRAPHIFY_MAX_WORKERS=1 graphify extract . --code-only --force`, then `PYTHONHASHSEED=0 graphify update .`.
- On a new clone, run `graphify hook install` and confirm with `graphify hook status`. This registers the local merge driver and the native Git hooks beside Husky's quality hooks.
- Keep `graphify-out/memory/` empty because Graphify 0.9.36 scans it even for code-only extraction. If saving query outcomes, use ignored `graphify-out/local-memory/` with `--memory-dir`.

The [README](../../../README.md#maintainer-code-map-graphify) lists the shareable outputs and setup commands. The project skill guides CLI use; it does not install agent tool hooks.
