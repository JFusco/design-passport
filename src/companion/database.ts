// Node-only module: imported by server routes and the CLI, never client components.
import postgres, { type Sql, type TransactionSql } from "postgres";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { isAbsolute, join, resolve } from "node:path";
import { CompanionError } from "./errors";

const runtimeKeys = ["DESIGN_PASSPORT_DATABASE_URL", "DESIGN_PASSPORT_DATABASE_CA_PATH", "FIGMA_TOKEN"];
const pools = new Map<string, Sql>();

export async function loadRuntimeEnvironment(root: string): Promise<void> {
  // Disposable fixtures never read a user's runtime file.
  if (process.env.DESIGN_PASSPORT_DATABASE_TEST_MODE === "pglite") return;
  try {
    const values = parseEnv(await readFile(join(root, ".env.local"), "utf8"));
    for (const key of runtimeKeys) if (process.env[key] === undefined && values[key] !== undefined) process.env[key] = values[key];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new CompanionError("not-configured", "The runtime configuration could not be loaded. Check .env.local permissions.", 503);
  }
}

export async function database(root: string): Promise<Sql> {
  const existing = pools.get(root);
  if (existing) return existing;
  await loadRuntimeEnvironment(root);
  const retained = pools.get(root);
  if (retained) return retained;
  const value = process.env.DESIGN_PASSPORT_DATABASE_URL;
  if (!value) throw new CompanionError("not-configured", "Configure DESIGN_PASSPORT_DATABASE_URL and DESIGN_PASSPORT_DATABASE_CA_PATH in the workspace .env.local.", 503);
  let url: URL;
  try { url = new URL(value); } catch { throw new CompanionError("not-configured", "The database connection configuration is invalid.", 503); }
  const test = process.env.DESIGN_PASSPORT_DATABASE_TEST_MODE === "pglite";
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.search || url.hash) throw new CompanionError("not-configured", "Use a Postgres connection URL without query parameters.", 503);
  if (test && (url.hostname !== "127.0.0.1" || url.username !== "design_passport_test" || url.pathname !== "/pglite")) throw new CompanionError("not-configured", "Disposable database mode requires the literal harness loopback connection.", 503);
  if (!test && (!/^design_passport_runtime\.[a-z]{20}$/u.test(url.username) || !url.hostname.endsWith(".pooler.supabase.com") || url.port !== "5432")) throw new CompanionError("not-configured", "Use the restricted design_passport_runtime session pooler connection on port 5432.", 503);
  let ca: string | undefined;
  if (!test) {
    const path = process.env.DESIGN_PASSPORT_DATABASE_CA_PATH;
    if (!path) throw new CompanionError("not-configured", "Configure the project database CA path. Verified TLS is required.", 503);
    try { ca = await readFile(isAbsolute(path) ? path : resolve(root, path), "utf8"); }
    catch { throw new CompanionError("not-configured", "The project database CA could not be read.", 503); }
  }
  const sql = postgres(value, {
    ssl: test ? false : { ca: ca!, rejectUnauthorized: true },
    max: test ? 1 : 2, connect_timeout: 10, idle_timeout: 20,
    connection: { statement_timeout: 15_000, lock_timeout: 2_000, application_name: "design-passport" },
    onnotice: () => undefined,
  });
  pools.set(root, sql);
  return sql;
}

export async function closeDatabases(): Promise<void> {
  const current = [...pools.values()];
  pools.clear();
  await Promise.all(current.map((sql) => sql.end({ timeout: 5 })));
}

export function databaseError(error: unknown): CompanionError {
  if (error instanceof CompanionError) return error;
  const code = (error as { code?: string })?.code;
  if (code === "55P03" || code === "57014" || code === "40P01") return new CompanionError("busy", "The database is busy. Retry the same action in a moment.", 423);
  return new CompanionError("unavailable", "The database is unavailable. Check connectivity and the Supabase project status, then retry the same action; it may already have committed.", 503);
}

export async function transaction<T>(root: string, operation: (sql: TransactionSql) => Promise<T>, write = false): Promise<T> {
  try {
    const sql = await database(root);
    const result = await sql.begin(write ? "isolation level read committed" : "isolation level repeatable read read only", async (tx) => {
      // Supavisor can ignore startup parameters. Set the bounds on this transaction
      // before application queries or lock acquisition, regardless of role defaults.
      await tx`set local statement_timeout = '15s'`;
      await tx`set local lock_timeout = '2s'`;
      if (write) await tx`select pg_advisory_xact_lock(1146110800)`;
      return operation(tx);
    });
    return result as T;
  } catch (error) { throw databaseError(error); }
}

export function runtimeChildEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^(SUPABASE_|PGPASSWORD$|DATABASE_URL$|DESIGN_PASSPORT_MIGRATION_)/u.test(key)) delete env[key];
  return env;
}
