import { createHash } from "node:crypto";
import { mkdir, open, realpath, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { TransactionSql } from "postgres";
import { transaction } from "./database";
import { CompanionError } from "./errors";
import { MODEL_TABLES } from "./model-review/repository";

const historyTables = [
  "projects", "audits", "audit_exports", "findings", "contributions", "observations",
  "candidates", "candidate_revisions", "decisions", "guidance_packs", ...MODEL_TABLES,
].sort();

const digest = (input: string) => createHash("sha256").update(input).digest("hex");

// Inventory comes from PostgreSQL's catalog, primary keys and byte hashes. The
// independent export reads row documents separately at the same MVCC snapshot.
async function inventory(tx: TransactionSql) {
  const tables = await tx<{ name: string; keys: string[] }[]>`
    select c.relname as name, array_agg(a.attname::text order by k.position)::text[] as keys
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_index i on i.indrelid = c.oid and i.indisprimary
    cross join lateral unnest(i.indkey) with ordinality k(attribute, position)
    join pg_catalog.pg_attribute a on a.attrelid = c.oid and a.attnum = k.attribute
    where n.nspname = 'design_passport' and c.relkind = 'r'
    group by c.relname order by c.relname collate "C"`;
  const allTables = await tx`select tablename as name from pg_tables where schemaname='design_passport' order by tablename collate "C"`;
  if (JSON.stringify(historyTables) !== JSON.stringify(allTables.map(t => t.name))
    || JSON.stringify(historyTables) !== JSON.stringify(tables.map(t => t.name))) {
    throw new CompanionError("conflict", "The source schema changed. Review the migration contract before capturing history.", 409);
  }
  const entries = [];
  for (const table of tables) {
    const rows = await tx<{ key: string; sha256: string }[]>`
      select (select jsonb_agg(to_jsonb(s)->field order by ord)::text
        from unnest(${tx.array(table.keys)}::text[]) with ordinality k(field,ord)) as key,
        encode(sha256(convert_to(to_jsonb(s)::text,'UTF8')),'hex') as sha256
      from ${tx(`design_passport.${table.name}`)} s order by 1`;
    entries.push({ table: table.name, keys: table.keys, rows: rows.map(({ key, sha256 }) => ({ key, sha256 })) });
  }
  const ledger = await tx`
    select p.scope, coalesce(ms.allowance,0)::numeric(24,12)::text as allowance,
      coalesce(sum(case when a.amount is null then r.reservation else 0 end),0)::numeric(24,12)::text as held,
      coalesce(sum(a.amount),0)::numeric(24,12)::text as spent, count(r.id)::int as runs
    from design_passport.projects p left join design_passport.model_settings ms on ms.project_scope=p.scope
    left join design_passport.model_runs r on r.project_scope=p.scope
    left join lateral (select amount from design_passport.model_accounting a where a.run_id=r.id order by version desc limit 1) a on true
    group by p.scope,ms.allowance order by p.scope collate "C"`;
  const [status] = await tx`
    select clock_timestamp()::text as cutoff, pg_current_snapshot()::text as snapshot,
      not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='design_passport' and c.relkind='r' and
          (has_any_column_privilege(current_user,c.oid,'INSERT,UPDATE') or has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE')
           or has_any_column_privilege('design_passport_app',c.oid,'INSERT,UPDATE') or has_table_privilege('design_passport_app',c.oid,'DELETE,TRUNCATE'))) as fenced`;
  return { version: 1, cutoff: status!.cutoff, snapshot: status!.snapshot, fenced: status!.fenced, tables: entries, ledger: Array.from(ledger) };
}

export async function captureMigration(root: string, destination: string) {
  const path = resolve(destination);
  if (await realpath(dirname(path)) !== dirname(path)) throw new CompanionError("invalid-input", "Choose a physical backup directory.", 400);
  await mkdir(path, { mode: 0o700 }); // exclusive creation; partial captures are diagnostic only
  const handle = await open(join(path, "history.ndjson"), "wx", 0o600);
  const hash = createHash("sha256");
  let rows = 0;
  try {
    const witness = await transaction(root, async (tx) => {
      await tx`set local time zone 'UTC'`;
      const result = await inventory(tx);
      for (const table of historyTables) {
        const query = tx<{ document: string; artifact: string | null }[]>`
          select to_jsonb(s)::text as document,
            case when ${table}::text in ('audit_exports','contributions') then (to_jsonb(s)->'payload')::text end as artifact
          from ${tx(`design_passport.${table}`)} s`;
        // A source snapshot may contain many multi-megabyte audit variants.
        for await (const page of query.cursor(4)) for (const row of page) {
          const line = JSON.stringify({ table, ...row }) + "\n";
          await handle.writeFile(line);
          hash.update(line);
          rows++;
        }
      }
      return result;
    });
    await handle.sync();
    const bytes = JSON.stringify(witness);
    await writeFile(join(path, "source-inventory.json"), bytes, { flag: "wx", mode: 0o600 });
    await writeFile(join(path, "manifest.json"), JSON.stringify({ version: 1, historySha256: hash.digest("hex") }), { flag: "wx", mode: 0o600 });
    return { path, inventorySha256: digest(bytes), fenced: witness.fenced, rows };
  } finally {
    await handle.close();
  }
}
