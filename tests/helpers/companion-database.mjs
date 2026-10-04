import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function createTestDatabase() {
  const db = await PGlite.create();
  let server;
  try {
    await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin;');
    const directory = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url));
    for (const file of (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()) await db.exec(await readFile(`${directory}/${file}`, 'utf8'));
    await db.exec('create role design_passport_test login inherit nosuperuser nobypassrls nocreatedb nocreaterole noreplication; grant design_passport_app to design_passport_test;');
    // Socket startup does not authenticate roles; establish the restricted identity
    // on the single underlying session before exposing it to Postgres.js.
    await db.exec('set role design_passport_test;');
    server = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0, maxConnections: 1 });
    await server.start();
    const port = new URL(`postgres://${server.getServerConn()}`).port;
    return {
      db,
      env: { DESIGN_PASSPORT_DATABASE_TEST_MODE: 'pglite', DESIGN_PASSPORT_DATABASE_URL: `postgres://design_passport_test@127.0.0.1:${port}/pglite` },
      close: async () => { await server.stop(); await db.close(); },
    };
  } catch (error) { if (server) await server.stop(); await db.close(); throw error; }
}
