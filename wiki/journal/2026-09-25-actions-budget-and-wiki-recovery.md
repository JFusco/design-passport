---
date: 2026-09-25
topics: [persistent-audits]
plans: [2026-09-26-reduce-actions-usage-and-recover-wiki-synchronization-a7e32708e7.md]
issue: "https://github.com/jfusco/design-passport/issues/35"
pr: https://github.com/JFusco/design-passport/pull/36
issues: ["https://github.com/jfusco/design-passport/issues/35"]
---
# Reduce Actions work and add wiki recovery

Hosted merge testing showed that API authentication did not configure Git after checkout. Both wiki bot workflows now give `actions/checkout` the validated `PR_BOT_TOKEN`, so review branches can be pushed without expanding workflow permissions.

Weekly maintenance replaces the daily wiki schedule. Merge sync now supports single and dated batch replay, defaults to 90 days, updates review PRs through REST, and runs without application or browser dependencies. Quality keeps the full browser-backed suite for ready substantive changes while drafts and wiki-only changes receive lightweight checks. Strict frontmatter validation now covers every wiki page.
