// Applies a SQL migration file directly to the Supabase Postgres database.
// Used because neither `psql` nor the `supabase` CLI is installed in this
// environment. Reads credentials from environment variables only - never
// hardcode the database password here.
//
// Usage: node dev-control/scripts/run-supabase-migration.cjs <path-to.sql>
// Required env: VITE_SUPABASE_URL, SUPABASE_DB_PASSWORD
//   (load both from .env.local first, e.g.:
//    node --env-file=.env.local dev-control/scripts/run-supabase-migration.cjs supabase/migrations/0001_init.sql)
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const sqlPath = process.argv[2];
  if (!sqlPath) {
    console.error('Usage: run-supabase-migration.cjs <path-to.sql>');
    process.exit(1);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!supabaseUrl || !password) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_DB_PASSWORD in environment.');
    process.exit(1);
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const host = `db.${projectRef}.supabase.co`;

  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    host,
    port: 5432,
    user: 'postgres',
    password,
    database: 'postgres',
    ssl: true,
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log(`Applied migration: ${sqlPath}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
