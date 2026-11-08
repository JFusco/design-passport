'use strict';

const fs = require('node:fs');

/** GitHub's installed App identity, not a branch prefix, grants this metadata exception. */
function isPinCourierPR(pull, repository) {
  return typeof repository === 'string' && repository.length > 0 && pull?.draft !== true &&
    pull?.user?.login === 'pin-courier[bot]' && pull.user.id === 351979519 &&
    pull.user.type === 'Bot' && pull.head?.repo?.full_name === repository &&
    pull.base?.repo?.full_name === repository && pull.base.ref === 'main' &&
    typeof pull.head.ref === 'string' && pull.head.ref.startsWith('renovate/');
}

if (require.main === module) {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `trusted=${isPinCourierPR(event.pull_request, process.env.GITHUB_REPOSITORY)}\n`);
}

module.exports = { isPinCourierPR };
