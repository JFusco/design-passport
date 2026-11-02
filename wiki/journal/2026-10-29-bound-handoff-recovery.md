---
date: 2026-10-29
topics: [conductor-design-workspaces]
plans: [2026-10-29-bound-handoff-session-recovery-c7863b299f.md]
issue: 'https://github.com/jfusco/design-passport/issues/96'
issues: ['https://github.com/jfusco/design-passport/issues/96']
---

# Bound handoff recovery and connection regression

The bound workspace flow now clears only its matching pending request after a definite server refusal, retaining the attempted message for correction. Unknown transport outcomes and incomplete acknowledgements retain their original identity. Every asynchronous storage, request, receipt and presentation continuation checks the captured session and credential owner.

A separate follow-up repaired two overlap races: a reopened session can submit while its predecessor's network request remains unresolved, and stale cleanup cannot release a newer submission or clear a newer loading state. Same-account reopening recovers its original pending payload; another account submits independently without consuming the original owner's draft.

## Verification

The bound recovery review independently passed its three repairs, then remained unresolved on a newly identified ownership suggestion. Fresh run `c1fde30c-b12f-48d3-ab18-06ef8b96660a` independently passed both ownership repairs and completed. Typecheck and 149 focused tests pass, including six new deferred-I/O overlap cases. Earlier failures and unresolved run artifacts remain preserved; they were not rewritten as passes.

The previous full gate passed 737 unit tests and the companion production build but failed two browser cases. Both subsequently passed focused retries with normal tracing and timeouts. The viewport cleanup diagnostic isolated a wait in Playwright tracing flush; it did not establish a product defect and no dependency, tracing or timeout change was retained. A fresh complete `pnpm run verify:ci` passed on October 29: 743 unit tests, all 15 browser cases with normal tracing and unchanged timeouts, companion production build and plugin development build. Log: `/private/tmp/dp97-final-verify-ci-oct29.log`. New-head hosted evidence remains a delivery prerequisite.

Native Figma control recovered on October 29. Local Conductor restarted against the existing isolated fixture with external notifications disabled and no migration or reset. Browser readback confirms the Tablet (1024px) caption, saved variant name and scoped Design discussion, and the Prepare dialog's disabled loading controls followed by enabled current sources. The expired plugin grant correctly refuses refresh; the user approved renewal of the same eight-hour local scope for the final native test. Final rebuilt-plugin acceptance is recorded separately when performed.

No merge, deployment, hosted migration or remote capability activation occurred. Automatic change summaries, subscriber Slack notifications and companion migration remain separate work.

## Final native regression

The rebuilt plugin (`5e9eeac3573f-dirty.94a635052004`) restored the saved audit and completed the browser-approved local renewal. Card → Hero → Card selection resolved each component independently: Hero offered no Card note, while Card offered only `ANN-CARD-CEC141`. The actual save created submission `b71be0a2-b0ac-4666-85c2-c06241e0295f` at `2026-10-29T12:36:23.514Z` with one selected annotation on node `46:29`, one Card Design discussion comment, `transition: not_requested` and `notification: disabled`. The browser still displays Draft. The initial transient notification-pending UI resolved to disabled in the persisted receipt; no external delivery is claimed.

A read-only query through the production annotation repository admitted that exact submission and its node link for Functional Spec source evidence, and excluded a foreign organization. This checks the latest actual submission's evidence path; it is separate from the earlier live Hero annotation-to-saved-spec/conflict test and does not claim that a new Card spec was generated. Captures: `/private/tmp/dp97-native-card-confirmation-oct29.png`, `/private/tmp/dp97-native-card-saved-oct29.png`, and `/private/tmp/dp97-card-discussion-saved-oct29.png`.

Restarting the test server initially inherited a public `127.0.0.1` origin that pairing refuses. The owned process was restarted with the plugin's fixed `http://localhost:3109` origin. Root secrets and hosted environments were not edited. The expired-grant refusal and unavailable-server result remain recorded as attempts, not successful pairing.

Post-save native navigation also passed: Audit retained its saved result, returning to Conductor retained Connected, and Refresh workspaces displayed the final disabled-notification status from the persisted receipt.
