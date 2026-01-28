const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

// WHY: load DATABASE_URL from apps/api/.env so migrate uses the same DB as your API
require("dotenv").config({ path: path.join(__dirname, "..", "apps", "api", ".env") });

const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not found (apps/api/.env)");

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  // WHY: track applied migrations so we don’t apply the same file twice
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith(".sql")).sort();
  const applied = new Set(
    (await client.query("SELECT filename FROM schema_migrations")).rows.map(r => r.filename)
  );

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    console.log("Applying", file);

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(filename) VALUES($1)", [file]);
      await client.query("COMMIT");
      console.log("Done", file);
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("Failed to apply migration:", file);
      console.error("Error message:", e.message);
      console.error("Error detail:", e.detail);
      console.error("Full error:", JSON.stringify(e, null, 2));
      process.exit(1);
    }
  }

  await client.end();
  console.log("All migrations applied.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
