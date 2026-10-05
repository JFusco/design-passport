import "server-only";
import { database } from "../../../../src/companion/database";
import type { WorkspacePaths } from "../../../../src/companion/filesystem";
import {
  assertFixtureEnvironment,
  fixtureTransport,
} from "../../../../src/companion/model-review/fixture";
import { ModelReviewRunner } from "../../../../src/companion/model-review/runner";
const host = globalThis as unknown as {
  modelFixtureRunners?: Map<string, ModelReviewRunner>;
};
export async function initializeModelReview(
  paths: WorkspacePaths,
): Promise<boolean> {
  if (process.env.DESIGN_PASSPORT_TEST_MODEL_REVIEW !== undefined) {
    assertFixtureEnvironment();
    await database(paths.root);
    host.modelFixtureRunners ??= new Map();
    if (!host.modelFixtureRunners.has(paths.root)) {
      const runner = new ModelReviewRunner(paths, fixtureTransport());
      host.modelFixtureRunners.set(paths.root, runner);
      runner.start();
    }
    return true;
  }
  return process.env.DESIGN_PASSPORT_MODEL_REVIEW_CONFIGURED === "true";
}
