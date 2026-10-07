---
status: "implemented"
executed: true
evidence: ["Issue 88; eight focused Chromium cases; src/ui/styles.css"]
source_tool: "repository"
source: "/tmp/design-passport-88-grade-parity-plan.md"
topics: ["plugin-style-parity", "stepped-audits-micro-fixes"]
digest: "fb40cb78bc608ea77a47e94f8ac350bcfe4c3027ce7dfae134bb43ed66cd81b3"
---

# Correct the Figma grade card and shared style values

Implement issue 88 from current remote main and preserve existing checkouts.

1. Read the current Audit, Report, expanded-issue and saved-result frames in
   Figma. Confirm the presence or absence of variables and reusable styles.
2. Correct the saved grade badge's inherited report dimensions. Use distinct
   40px and 100px treatments, exact type, tracking, corners, preview geometry,
   report score presentation and shared literal style tokens.
3. Verify actual browser geometry at 320, 456 and 500px. Keep supported checks,
   stale warnings, historical exports and keyboard behavior. Record exact
   source contrast failures rather than claiming an accessibility pass.
4. Record evidence, archive the plan, refresh the code map and wiki graph, and
   run verify:ci. Retain earlier native evidence; record missing native access
   separately if the updated bundle cannot be inspected in Figma.
5. Commit and push with ordinary Git. Validate and open the canonical PR,
   verify its saved content and checks, and leave review and merging to Joe.
