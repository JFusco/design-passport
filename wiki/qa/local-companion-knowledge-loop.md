---
title: Local companion knowledge loop assessment
topics: [supabase-companion]
---

# Local companion knowledge loop assessment

**First change: let a designer remove withdrawn project guidance from an existing Figma file.** The maintainer can withdraw the last approval today. The companion then hides the only replacement that would bring the file up to date. Fix this in the existing download flow before adding a direct plugin connection.

## What happened in the synthetic project

| Person and screen | Action and observed result |
| --- | --- |
| Designer, plugin Guidance | A local run used the audit rules and contribution builder on a synthetic desktop frame. The companion imported the report and sanitized contribution separately, linked them by project and report identity, and recognized a repeated contribution as a duplicate. |
| Maintainer, review queue | The first project approval produced one advisory. A wording change made the approval stale. Reapproving the new revision produced a different pack. The Figma adapter installed both revisions in sequence and the next audit evaluation showed the revised wording. |
| Designer, Guidance after withdrawal | Deferring the last approval produced a stored project pack with zero facts. The dashboard’s download list excluded it. The previously installed wording still appeared on a fresh evaluation. Supplying the stored empty pack directly to the adapter removed only the reviewed advice. The original style-guide fact remained. |
| Maintainer, shared approval | An explicit shared approval staged one entry. A release export in a temporary workspace produced matching release and bundle inputs. An isolated development build contained the exact approved wording. A fresh scan through the plugin controller with that input returned the relevant shared advisory. |
| Maintainer, next review | A second audit with changed annotations and frame width produced distinct evidence for the same candidate. Support rose from one contribution to two, the candidate revision changed, and the prior shared approval stopped qualifying for the next build. The previously exported pack still represented its original decision. |

### Published Figma plugin and local browser check

In the synthetic integration file, Design Passport 0.5.0 (build `8af5a12060b0`) ran a current-page audit. **Report → Guidance → Preview contribution** displayed nine sanitized observations. The browser accepted the exported file once and recognized its duplicate. A reviewer using the synthetic project saved, approved, and downloaded two successive wordings.

In Figma Design Mode, **Settings → Context & style guide** accepted both downloads. **Report → Guidance** showed the first wording, then a fresh current-page audit showed the revised instruction, “Compare the desktop headline and primary action with the original screenshot.” The reviewer had deferred that revision. The dashboard had no download link, and its authorized download URL returned HTTP 404. The file still displayed the revised instruction.

For diagnosis, the test retrieved the same project's stored zero-fact pack from the disposable database and supplied it through Figma's ordinary pack importer. The next current-page audit showed “No advisory guidance matched this review.” The tester then removed the temporary binding and verified the file returned to its original unconnected state. This diagnostic retrieval explains the missing product step. It is unsuitable as a designer workflow.

The browser used the built companion with the repository migrations and restricted runtime role on a disposable database. A separate adapter run checked preservation of an existing style guide, and a controller test with a newly built shared pack checked shared applicability. Hosted database operation and publication of the synthetic shared pack were outside the run. [Browser workflow](../../tests/e2e/companion.spec.ts) · [Plugin audit recovery tests](../../tests/plugin-audit-recovery.test.ts) · [Knowledge build](../../src/companion/exports.ts)

## Gaps in priority order

| Priority and person | Where the task breaks | Acceptance for a follow-up |
| --- | --- | --- |
| 1 · Designer with an installed pack | After the final approval is withdrawn or becomes stale, the guidance download returns 404. An unrelated style guide may share the binding, so removing the entire guide loses useful information. | For a project that previously had approved guidance, the dashboard offers an explicitly labeled withdrawal download. Importing it clears only reviewed project facts. A fresh audit omits them, an earlier saved audit keeps its snapshot, and the grade, readiness, and repair plan stay consistent for the same design. Unknown scopes and projects that never published guidance remain distinguishable. |
| 2 · Designer checking a revision | The companion shows downloadable guidance. Figma shows the active combined pack reference. Combining a style guide and reviewed facts produces another digest. Neither screen tells the designer which approved revision of the project guidance is installed. | With a base style guide present, a designer can compare a stable project-guidance revision on both screens, recognize an older revision, and verify applying the replacement. Reimporting identical guidance should confirm the same reviewed revision. |
| 3 · Contributor following a decision | Import results show a filename and outcome. To reach the actual candidate the contributor must separately find the contribution in learning history. That history page already links to the current candidate and lists the decisions. | Each successfully imported or duplicate file opens its exact saved contribution, including when two files have the same filename. From there the contributor can reach the current draft and read the decision or see that review is pending. |
| 4 · Maintainer checking shared delivery | The dashboard counts current shared approvals. That count alone cannot identify the pack inside a particular plugin build. Several builds can use the same knowledge version. | Given a specific build, a maintainer can match its pack digest to the exported pack, identify the exact approved revision, and report a publication only when its release record exists. |
| 5 · Maintainer evaluating usefulness | A later contribution can strengthen or contradict a candidate. Its observations describe findings, fixes, waivers, and rescan outcomes. They do not record whether the designer saw or used a specific piece of advice. | Distinguish recurrence from usefulness in review. If explicit feedback is needed, the designer can preview an optional relevance response tied to the exact advisory revision. Ordinary repeat findings alone cannot establish that the advice helped. |

The plugin derives project scope from an active project guide, then from a file fingerprint, with a shared unbound-session fallback. A future direct connection must resolve an explicit project and must handle unsaved and copied files before sending or retrieving guidance. [Contribution scope](../../src/plugin/main.ts) · [Import results](../../apps/companion/app/learnings/import/ImportForm.tsx) · [Pack composition and observations](../../src/core/knowledge-loop.ts) · [Companion downloads](../../apps/companion/app/api/guidance/route.ts)

## Which handoff to build

| User task | Guided files | Direct plugin actions |
| --- | --- | --- |
| Contribute | Preview and export in Figma, import in the companion, then follow a link to the saved contribution. A file can wait until the companion opens. | Preview and choose **Send contribution**. Show the confirmed project, return a receipt after import, and safely retry the same contribution if the reply is lost. |
| Receive an update | Download the project update, including withdrawal, then import it under **Settings → Context & style guide**. Compare its reviewed revision in both places. | Choose **Check for guidance updates**, inspect the destination and revision, then apply it. An unavailable companion needs a clear status while installed guidance remains usable. |
| Establish access | Reuse the authorized companion download and existing file-bound import. | The production manifest allows Conductor hosts. The companion starts on a dynamic loopback port and authorizes its browser session. Verify desktop connectivity, pairing, revocation, and project-limited reads and writes with a disposable companion before adopting this route. |

Ship priority 1 first. The server already produces the required replacement and the plugin can apply it. Expose that replacement for projects with prior approvals and describe what it removes at download time. Exercise revision, defer, reject, loss of the last approval, and removal of one among several approvals through the supported screens. Preserve duplicate-import safety, project isolation, historical audits, and human review. This first repair needs no new transport or change to the learning envelope. Evaluate a direct connection after the guided workflow can reliably deliver and withdraw the same guidance. [Project pack derivation](../../src/companion/repository.ts) · [Plugin file binding](../../src/figma/adapter.ts) · [Plugin network policy](../../manifest.json)
