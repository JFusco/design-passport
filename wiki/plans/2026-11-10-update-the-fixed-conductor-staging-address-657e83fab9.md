---
status: "implemented"
executed: true
evidence: ["src/plugin/conductor-environments.ts; manifest.json; development/manifest.json; tests/manifest.test.ts; https://github.com/JFusco/design-passport/issues/134"]
source_tool: "repository"
source: "/private/tmp/dp134-plan.md"
topics: ["conductor-design-workspaces"]
digest: "657e83fab9236d820ff17972e3c4bf97a8368c5c48a8dff9a670f5d74f70ec0b"
---

# Update the fixed Conductor staging address

1. Update the plugin's staging origin and both Figma network allowlists to the authenticated current bluewave staging host.
2. Extend the existing manifest check to cover consistency with configured hosted transport origins. Preserve production, development loopback, plugin identities and exact-origin enforcement.
3. Record the evidence and publication boundary in the context wiki. Review transport destination validation and run the required repository verification.
4. Commit and push the issue branch, validate the canonical PR body, then open and read back one PR linked to issue 134. Stop before merge or plugin publication.
