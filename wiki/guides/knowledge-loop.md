# Shared Design Passport knowledge loop

Design Passport treats every client engagement and internal tool as its own opaque project context. There is no company-wide style guide. A project may attach one Figma style guide to each target file, while a designer may also add one-off references for inspiration during a single session.

## Designer journey

With an established project, a lead imports the generated style-guide pack once in each target Figma file. Everyone else runs the plugin normally. The Context and Guidance areas show the active pack version/digest and keep three advisory origins visibly separate: project guidance, reference suggestions, and shared client-neutral guidance. Passport findings are still the only grade input.

For a new project, the companion receives the target and style-guide Figma links in one opaque project batch. It validates the links and source roles, fetches with the local maintainer token, and emits sanitized source packs. If facts required for a remote target grade are unavailable, that target fails instead of being guessed; an unchanged plugin-exported target report can be supplied for the multi-file wrapper.

With no style guide, the normal deterministic audit still runs. A reference can be added for the current session, but it is labeled as inspiration and is never silently promoted to project context.

### Authoring machine-readable style guides

The companion derives bounded numeric layout facts, component vocabulary, and variable presence from ordinary Figma structure. A style-guide author can make intentional advisory guidance unambiguous by naming a documentation frame with this exact pattern:

```text
Passport Guidance :: accessibility :: Focus visibility :: Show a visible focus indicator for controls.
```

The second field must be one of `tokens`, `components`, `naming`, `layout`, `breakpoints`, or `accessibility`. The companion imports only the normalized layer name; it does not ingest the frame's design copy. Use short, client-safe labels and guidance.

Declare governed responsive widths with an exact marker such as:

```text
Passport Breakpoint :: Mobile :: 390
```

When one or more breakpoint markers exist, they replace incidental documentation-frame widths in the generated advisory fact. These markers remain advisory only and never enter grading.

## Maintainer journey

The designer must choose **Contribute learnings**, inspect a plain-language preview of the sanitized observations and excluded data, and export it. Raw JSON remains hidden in the designer UI. Scanning alone retains or shares nothing.

The companion deduplicates envelopes by timestamp-independent content digest and groups only exact normalized observation keys and contexts. It generates draft wording, proposed scope, exceptions, and evidence counts. The local Knowledge Review interface shows supporting and contradictory evidence side by side and labels recurrence only as `unique contributions`.

The maintainer chooses **Edit draft**, **Approve**, **Reject**, or **Defer**. Scope starts at **Project only** and can be explicitly changed to **Shared, client-neutral**. Decisions are append-only and bind to an exact candidate digest; editing the draft makes a prior approval stale. Current project approvals compile only to that project's pack. Current shared approvals compile to the pinned team pack for normal repository review and a later release.

No recurrence count validates guidance, no project convention becomes shared automatically, and no advisory becomes a grading rule. A grading change requires its own measurable rule, scope/exceptions, fixtures, documentation, review, and `RULESET_VERSION` bump.

### Run the local companion

Build the CLI and production web application before starting a review session:

```bash
pnpm companion:build
FIGMA_TOKEN=your_figma_personal_access_token pnpm companion knowledge review
```

Open the private URL printed by the command. The process listens only on `127.0.0.1`; stopping it expires the capability. The dashboard supports three tasks: download a sanitized Figma reference pack, import learning exports, and record a human decision for each generated draft.

Each import accepts up to 10 JSON files, 1 MB per file, and 5 MB combined. The companion reports valid, duplicate, and invalid files independently. It keeps valid files when another file fails. If compilation fails after persistence, the dashboard shows **Retry rebuild** and retains the saved input.

The decision queue disables approval, rejection, and deferral while a draft has unsaved edits. Each decision requires a note and binds to the displayed draft digest. A stale browser cannot overwrite a newer draft or decision.

## Batch configuration

Local batch files should live under ignored `.design-passport-local/` and use opaque IDs:

```json
{
  "projectScope": "project:ui-design-library",
  "sources": [
    {
      "sourceId": "target:library",
      "projectScope": "project:ui-design-library",
      "role": "target",
      "url": "https://www.figma.com/design/FILE_KEY/FILE_NAME",
      "readinessProfilePath": "readiness-profile.json",
      "reportPath": "target-report.json"
    },
    {
      "sourceId": "style-guide:library",
      "projectScope": "project:ui-design-library",
      "role": "style-guide",
      "url": "https://www.figma.com/design/FILE_KEY/STYLE_GUIDE"
    }
  ]
}
```

Use `pnpm companion batch ingest --config ... --out ...`. Source URLs and raw file keys remain only in the ignored local input; generated packs contain opaque source IDs and content digests.
