import { spawn } from 'node:child_process';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestDatabase } from '../tests/helpers/companion-database.mjs';

const harness = await createTestDatabase();
const workspace = await realpath(await mkdtemp(join(tmpdir(), 'design-passport-e2e-')));
const env = { ...process.env, ...harness.env, DESIGN_PASSPORT_E2E_WORKSPACE: workspace, DESIGN_PASSPORT_WORKSPACE_ROOT: workspace,
  DESIGN_PASSPORT_CAPABILITY: 'e2e-capability', DESIGN_PASSPORT_EXPECTED_ORIGIN: `http://127.0.0.1:${process.env.DESIGN_PASSPORT_E2E_PORT ?? 5180}`,
  DESIGN_PASSPORT_TEST_FIXTURES: 'figma', DESIGN_PASSPORT_TEST_MODEL_REVIEW: 'fixture', FIGMA_TOKEN: 'e2e-fixture-token' };
for (const key of Object.keys(env)) if (/^(SUPABASE_|PGPASSWORD$|DATABASE_URL$|OPENAI_API_KEY$|DESIGN_PASSPORT_MIGRATION_)/u.test(key)) delete env[key];
const dev = process.argv[2] === '--dev';
if (dev) env.DESIGN_PASSPORT_DEV_OUTPUT = '.next-model-review-dev';
const command = dev ? ['--filter', '@design-passport/companion', 'exec', 'next', 'dev', '--hostname', '127.0.0.1', '--port', process.env.DESIGN_PASSPORT_E2E_PORT ?? '5180'] : ['exec', 'playwright', 'test', ...process.argv.slice(2)];
const child = spawn('pnpm', command, { env, stdio: 'inherit', detached: process.platform !== 'win32' });
function stop() {
  if (!child.pid) return;
  try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGTERM'); } catch { /* Owned process group already exited. */ }
}
process.once('SIGINT', stop); process.once('SIGTERM', stop);
try {
  process.exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code) => resolve(code ?? 1)); });
} finally {
  stop(); await harness.close(); await rm(workspace, { recursive: true, force: true });
  process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
}
