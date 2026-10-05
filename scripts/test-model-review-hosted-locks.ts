// Explicit rollout probe. Creates retained synthetic history; never calls a model.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { database, closeDatabases } from "../src/companion/database";
import {
  importLearning,
  readKnowledgeState,
  workspacePaths,
} from "../src/companion/repository";
import {
  cancel,
  claim,
  preview,
  projectSummary,
  settings,
  start,
} from "../src/companion/model-review/repository";
import { RESERVATION } from "../src/companion/model-review/policy";
import { learningFixture } from "../tests/helpers/companion-fixtures";

async function main() {
  assert.equal(
    process.env.DESIGN_PASSPORT_HOSTED_MODEL_LOCK_PROBE,
    "authorized",
  );
  assert.equal(process.env.DESIGN_PASSPORT_DATABASE_TEST_MODE, undefined);
  assert.equal(process.env.DESIGN_PASSPORT_TEST_MODEL_REVIEW, undefined);
  const paths = workspacePaths(process.cwd()),
    sql = await database(paths.root);
  const first = await sql.reserve(),
    second = await sql.reserve();
  let distinctConnections = 0;
  try {
    const a = await first`select pg_backend_pid() as pid,current_user as role`;
    const b = await second`select pg_backend_pid() as pid,current_user as role`;
    assert.notEqual(a[0]!.pid, b[0]!.pid);
    assert.equal(a[0]!.role, "design_passport_runtime");
    assert.equal(b[0]!.role, "design_passport_runtime");
    distinctConnections = 2;
  } finally {
    first.release();
    second.release();
  }
  const project = `project:model-lock-probe:${randomUUID()}`;
  const imported = await importLearning(paths, [
    {
      name: "synthetic-lock-probe",
      content: JSON.stringify(learningFixture(project, project)),
    },
  ]);
  assert.equal(imported.imported, 1);
  await settings(paths, project, { allowance: RESERVATION });
  const candidate = (await readKnowledgeState(paths)).candidates.find(
    (c) => c.projectScope === project,
  )!;
  const selection = [
    { candidateId: candidate.candidateId, digest: candidate.digest },
  ];
  const disclosure = await preview(paths, project, selection);
  const attempts = await Promise.allSettled(
    [1, 2].map(() =>
      start(paths, {
        requestId: randomUUID(),
        project,
        selection,
        previewDigest: disclosure.digest,
      }),
    ),
  );
  const accepted = attempts.filter((r) => r.status === "fulfilled");
  assert.equal(accepted.length, 1);
  assert.equal(
    (await projectSummary(paths, project)).reservations,
    RESERVATION,
  );
  const leases = await Promise.all([
    claim(paths, randomUUID(), project),
    claim(paths, randomUUID(), project),
  ]);
  // Keep production runners stopped so they cannot claim this synthetic run.
  const lease = leases.find((l) => l?.project === project);
  assert.ok(lease);
  assert.equal(leases.filter(Boolean).length, 1);
  await cancel(paths, lease.id);
  assert.equal(
    (await projectSummary(paths, project)).reservations,
    "0.000000000000",
  );
  process.stdout.write(
    JSON.stringify({
      project,
      distinctConnections,
      reservationAndClaim: "passed",
      generationRequests: 0,
    }) + "\n",
  );
}
main()
  .catch(() => {
    process.stderr.write(
      "Hosted model locking probe failed. Synthetic history is retained; inspect it locally before retrying.\n",
    );
    process.exitCode = 1;
  })
  .finally(closeDatabases);
