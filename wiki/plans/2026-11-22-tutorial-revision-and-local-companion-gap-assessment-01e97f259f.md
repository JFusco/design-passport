---
status: "partial"
executed: true
evidence: ["wiki/qa/local-companion-knowledge-loop.md"]
source_tool: "codex"
source: "User-approved plan, repository-relative references"
topics: ["supabase-companion"]
digest: "01e97f259f4c7688dc32c4d1962e198056190137a4f5298d8c235577581ab49d"
---

# Tutorial revision and local companion gap assessment

## 1. Pilot “Prepare a Figma Workspace”

Start with video 04 because it crosses from Conductor into Figma, exactly where a first-time viewer can lose their bearings. Eight of its nine shots specify a crop. The current 43-second narration asks the viewer to check the linked file, target device, and original design in one sentence. Each choice deserves an explanation while its effect is visible. Current script and timing (local video delivery) · Current shots (local video delivery)

| Scene | What the viewer sees and learns |
|---|---|
| Start in Conductor | Show the full feature page, identify the **Design** tab, and state the goal in plain language: “We’re going to give the designer a Figma workspace for this feature.” |
| Choose what to prepare | Open **Prepare in Figma** from the full page. Explain each choice as it appears. The source is the design being referenced, the device sets the working dimensions, and the linked file tells the designer where to go. |
| Move into Figma | Show the saved request, follow the linked file, and establish the full Figma window with the canvas and Design Passport panel visible together. Explain why **Refresh workspaces** comes next. |
| Verify the result | Show **Reference**, **Wireframe**, and **Design** together. Make one visible edit in **Design**. End with what the designer has accomplished, where to continue working, and when they would send the change back. |

Use a pointer or outline while keeping the surrounding screen visible. Use a close-up only after locating the control, then return to the wider view for the result. Recapture wide footage wherever the retained source is already cropped. Keep the synthetic example, Marin narration, and synchronized captions. Let the explanation determine the runtime.

**Pilot acceptance:** Give a first-time viewer the video and the same sample task. Without coaching, they should be able to find the starting screen, explain why they chose the file and device, prepare the workspace, identify the frame to edit, and say whether their edit has reached Conductor. Revise wherever they hesitate before producing the other eight videos.

## 2. Apply the pilot feedback across all nine videos

Review both full walkthroughs and the six remaining task clips against the accepted pilot. For each, identify the viewer’s starting point, the decision they need to make, and the visible result that tells them they succeeded. Give particular attention to app switches, what an annotation recipient actually sees, and how to distinguish a saved design from its Slack delivery status.

Deliver a new numbered, MP4-only upload folder in the existing viewing order. Preserve the originals and keep scripts, editable shot lists, and SRT/VTT captions alongside the production sources. Check playback, caption timing, readability at ordinary playback size, and agreement between the narration and the screen. Current nine-video delivery (local video delivery)

## 3. Assess the existing local companion from one audit to the next

The current loop already supports sanitized contributions, human review, project guidance downloads, and shared guidance bundled into a plugin release. **The first repair to prioritize is withdrawal.** When the last project approval is withdrawn, the companion creates an empty replacement pack. Both the dashboard and download API exclude that pack, so a designer who imported the previous version cannot retrieve the correction through the normal flow. I verified this in source. The 24 focused knowledge-loop and pack-replacement tests passed locally. The complete designer journey still needs a runtime check. [Pack creation and filtering](../../src/companion/repository.ts) · [Download route](../../apps/companion/app/api/guidance/route.ts)

Trace one synthetic project through **audit → contribution preview → companion import → human decision → project pack → fresh Figma audit**. Repeat after revising and withdrawing the guidance. Record the screen, actor, next action, and visible evidence at each handoff. Prioritize four questions:

| Question | Evidence to collect |
|---|---|
| Can the designer follow their contribution? | From the import result, find the resulting draft, its supporting evidence, the reviewer’s decision, and the next action. Repeat with a duplicate import and a deferred decision. |
| Can the designer tell which guidance reached Figma? | Match an approved revision to guidance shown in a fresh audit. Withdraw the last approval and verify the old advice disappears while the underlying style guide and historical audit remain intact. |
| Can the maintainer distinguish approval from delivery? | Trace one shared approval through staging, build, and the bundle used by a subsequent audit. Identify which stages the companion can substantiate and which need release evidence. |
| Does later evidence improve the guidance? | Follow a subsequent contribution back to the candidate. Check what the maintainer can tell about recurring findings, exceptions, and whether a particular piece of advice was relevant. Verify that guidance remains advisory and preserves grading and certification behavior. |

## 4. Recommend the smallest change that closes the loop

Compare **a guided file handoff** with **explicit “Send contribution” and “Check for guidance updates” actions in the plugin**. Use the same synthetic journey for both. Compare designer effort, visibility of the active revision, recovery from a missed or stale update, and behavior when the local companion is closed. For the direct option, assess Figma Desktop connectivity and project-scoped authorization. The current production manifest allows the Conductor hosts, and the local companion uses a private browser session. [Plugin network configuration](../../manifest.json) · [Companion session entry](../../apps/companion/app/bootstrap/route.ts)

The companion deliverable is a **ranked gap assessment and recommended first implementation**. Each finding should name the affected person, show the evidence, and give a pass/fail acceptance test. Start with the withdrawal defect, then rank the remaining work by where a designer or maintainer actually gets stuck. The assessment covers the existing local companion. A Conductor migration is outside this plan.
