---
status: "implemented"
executed: true
evidence: ["Issue 87; Figma 13:485 and 13:986 literal styles"]
source_tool: "repository"
source: "/tmp/design-passport-87-plan.md"
topics: ["stepped-audits-micro-fixes"]
digest: "4247cafb41fe454cb5a52a7de999520b61af4492e3d57065b7e93759a8e18605"
---

# Complete Figma grade and score styling

Correct the presentation differences verified against nodes 13:485 and 13:986
without changing scoring or micro-check contracts. Preserve concurrent edits in
the prior worktree and implement in the clean issue 87 checkout.

1. Separate 40px compact grade from 100px report grade and match saved preview
   corners, typography and spacing.
2. Format the report score to two decimals, with an accessible out-of-100 label;
   retain stale status while removing the extra current-status line from hero.
3. Use the primary Report's green/red category score literals consistently.
   Record contrast exceptions from the exact reference, without suppressing
   unrelated accessibility findings.
4. Extend the existing eight focused browser cases for computed geometry and
   typography. Run required CI, archive this plan and refresh wiki/Graphify.
5. Deliver and merge after hosted checks under the user's existing authorization.
   Verify merged bytes and preserve the earlier native proof if the native
   automation window remains unavailable.
