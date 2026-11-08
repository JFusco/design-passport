import { test } from "vitest";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { isPinCourierPR } = require("../scripts/is-pin-courier-pr.cjs");

const repository = 'JFusco/design-passport';
const valid = { user: { login: 'pin-courier[bot]', id: 351979519, type: 'Bot' }, draft: false,
  head: { ref: 'renovate/tool', repo: { full_name: repository } },
  base: { ref: 'main', repo: { full_name: repository } } };
test('only an installed same-repository ready Pin Courier PR earns the metadata exception', () => {
  assert.equal(isPinCourierPR(valid, repository), true);
  for (const change of [
    { user: { ...valid.user, id: 1 } }, { user: { ...valid.user, type: 'User' } },
    { user: { login: 'human', id: 2, type: 'User' } }, { draft: true },
    { head: { ...valid.head, repo: { full_name: 'fork/project' } } },
    { base: { ...valid.base, ref: 'staging' } }, { head: { ...valid.head, ref: 'human/tool' } },
  ]) assert.equal(isPinCourierPR({ ...valid, ...change }, repository), false);
});
