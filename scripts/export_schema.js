/**
 * export_schema.js
 * ----------------
 * Connects to election_db and exports every database object into organised
 * subfolders under  db/DATABASE/.
 *
 * Folders produced:
 *   tables/            – CREATE TABLE statements
 *   types/             – ENUM / composite types
 *   functions/         – Plain SQL / plpgsql FUNCTIONS
 *   procedures/        – CALL-able PROCEDURES
 *   triggers/          – Trigger definitions
 *   indexes/           – Non-PK / non-unique-constraint indexes
 *   constraints/       – PK, FK, UNIQUE, CHECK  (grouped)
 *   views/             – Views (if any)
 *
 * Usage:  node scripts/export_schema.js
 */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const DB_URL =
  "postgresql://election_user:election123@localhost:5432/election_db";
const OUT_DIR = path.join(__dirname, "..", "db", "DATABASE");

// ── helpers ──────────────────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeSQL(folder, filename, content) {
  ensureDir(folder);
  const safe = filename.replace(/[<>:"/\\|?*]/g, "_");
  fs.writeFileSync(path.join(folder, `${safe}.sql`), content.trim() + "\n");
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

// ── main ─────────────────────────────────────────────────────────────
async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log("Connected to election_db");

  // Wipe old export
  cleanDir(OUT_DIR);

  // ─── 1. ENUM TYPES ────────────────────────────────────────────────
  const typesDir = path.join(OUT_DIR, "types");
  const { rows: enums } = await client.query(`
    SELECT t.typname,
           string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS labels
    FROM   pg_type t
    JOIN   pg_enum e ON e.enumtypid = t.oid
    JOIN   pg_namespace n ON n.oid = t.typnamespace
    WHERE  n.nspname = 'public'
    GROUP  BY t.typname
    ORDER  BY t.typname
  `);
  for (const row of enums) {
    const sql = `CREATE TYPE ${row.typname} AS ENUM (\n  '${row.labels
      .split(", ")
      .join("',\n  '")
      }'\n);`;
    writeSQL(typesDir, row.typname, sql);
  }
  console.log(`  types/            ${enums.length} exported`);

  // ─── 2. TABLES ─────────────────────────────────────────────────────
  const tablesDir = path.join(OUT_DIR, "tables");
  const { rows: tables } = await client.query(`
    SELECT table_name
    FROM   information_schema.tables
    WHERE  table_schema = 'public'
      AND  table_type = 'BASE TABLE'
    ORDER  BY table_name
  `);

  for (const { table_name } of tables) {
    // columns
    const { rows: cols } = await client.query(
      `SELECT column_name, data_type, udt_name, is_nullable,
              column_default, character_maximum_length,
              numeric_precision, numeric_scale
       FROM   information_schema.columns
       WHERE  table_schema = 'public' AND table_name = $1
       ORDER  BY ordinal_position`,
      [table_name]
    );

    const colDefs = cols.map((c) => {
      let type = c.data_type === "USER-DEFINED" ? c.udt_name : c.data_type;
      if (c.data_type === "character varying" && c.character_maximum_length)
        type = `VARCHAR(${c.character_maximum_length})`;
      if (c.data_type === "numeric" && c.numeric_precision)
        type = `NUMERIC(${c.numeric_precision},${c.numeric_scale || 0})`;
      if (c.data_type === "integer") type = "INTEGER";
      if (c.data_type === "bigint") type = "BIGINT";
      if (c.data_type === "smallint") type = "SMALLINT";
      if (c.data_type === "boolean") type = "BOOLEAN";
      if (c.data_type === "text") type = "TEXT";
      if (c.data_type === "date") type = "DATE";
      if (c.data_type === "timestamp with time zone") type = "TIMESTAMPTZ";
      if (c.data_type === "timestamp without time zone") type = "TIMESTAMP";

      let def = `  ${c.column_name}  ${type}`;
      if (c.column_default) def += `  DEFAULT ${c.column_default}`;
      if (c.is_nullable === "NO") def += "  NOT NULL";
      return def;
    });

    const sql = `CREATE TABLE ${table_name} (\n${colDefs.join(",\n")}\n);`;
    writeSQL(tablesDir, table_name, sql);
  }
  console.log(`  tables/           ${tables.length} exported`);

  // ─── 3. CONSTRAINTS (grouped per type) ─────────────────────────────
  const constraintsDir = path.join(OUT_DIR, "constraints");
  const { rows: constraints } = await client.query(`
    SELECT tc.constraint_name, tc.table_name, tc.constraint_type,
           ccu.column_name,
           kcu.column_name AS key_column,
           rc.unique_constraint_name,
           /* FK target */
           (SELECT rel_tco.table_name
            FROM   information_schema.table_constraints rel_tco
            WHERE  rel_tco.constraint_name = rc.unique_constraint_name
              AND  rel_tco.constraint_schema = 'public'
            LIMIT 1) AS ref_table,
           cc.check_clause
    FROM   information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
          ON  kcu.constraint_name = tc.constraint_name
          AND kcu.constraint_schema = 'public'
    LEFT JOIN information_schema.constraint_column_usage ccu
          ON  ccu.constraint_name = tc.constraint_name
          AND ccu.constraint_schema = 'public'
    LEFT JOIN information_schema.referential_constraints rc
          ON  rc.constraint_name = tc.constraint_name
          AND rc.constraint_schema = 'public'
    LEFT JOIN information_schema.check_constraints cc
          ON  cc.constraint_name = tc.constraint_name
          AND cc.constraint_schema = 'public'
    WHERE  tc.table_schema = 'public'
    ORDER  BY tc.constraint_type, tc.table_name, tc.constraint_name
  `);

  // Deduplicate (multi-column constraints come back as multiple rows)
  const seen = new Set();
  const groups = { PRIMARY_KEY: [], FOREIGN_KEY: [], UNIQUE: [], CHECK: [] };

  for (const c of constraints) {
    const key = c.constraint_name;
    if (seen.has(key)) continue;
    seen.add(key);

    const ctype = c.constraint_type.replace(" ", "_");
    if (!groups[ctype]) groups[ctype] = [];
    groups[ctype].push(c);
  }

  // Now build full constraint definitions with all columns
  // Primary Keys
  const pkSQL = [];
  const pkNames = [...new Set(constraints.filter(c => c.constraint_type === 'PRIMARY KEY').map(c => c.constraint_name))];
  for (const name of pkNames) {
    const rows = constraints.filter(c => c.constraint_name === name);
    const tbl = rows[0].table_name;
    const cols = [...new Set(rows.map(r => r.key_column).filter(Boolean))];
    pkSQL.push(`ALTER TABLE ${tbl} ADD CONSTRAINT ${name}\n  PRIMARY KEY (${cols.join(", ")});`);
  }
  if (pkSQL.length) writeSQL(constraintsDir, "primary_key_constraints", pkSQL.join("\n\n"));

  // Foreign Keys
  const fkSQL = [];
  const fkNames = [...new Set(constraints.filter(c => c.constraint_type === 'FOREIGN KEY').map(c => c.constraint_name))];
  for (const name of fkNames) {
    const rows = constraints.filter(c => c.constraint_name === name);
    const tbl = rows[0].table_name;
    const srcCols = [...new Set(rows.map(r => r.key_column).filter(Boolean))];
    const refTbl = rows[0].ref_table || '??';
    const refCols = [...new Set(rows.map(r => r.column_name).filter(Boolean))];

    // Get ON DELETE / ON UPDATE actions
    const { rows: fkActions } = await client.query(`
      SELECT update_rule, delete_rule
      FROM   information_schema.referential_constraints
      WHERE  constraint_name = $1 AND constraint_schema = 'public'
    `, [name]);
    let extra = '';
    if (fkActions.length) {
      if (fkActions[0].delete_rule !== 'NO ACTION') extra += `\n  ON DELETE ${fkActions[0].delete_rule}`;
      if (fkActions[0].update_rule !== 'NO ACTION') extra += `\n  ON UPDATE ${fkActions[0].update_rule}`;
    }
    fkSQL.push(`ALTER TABLE ${tbl} ADD CONSTRAINT ${name}\n  FOREIGN KEY (${srcCols.join(", ")})\n  REFERENCES ${refTbl} (${refCols.join(", ")})${extra};`);
  }
  if (fkSQL.length) writeSQL(constraintsDir, "foreign_key_constraints", fkSQL.join("\n\n"));

  // Unique
  const uqSQL = [];
  const uqNames = [...new Set(constraints.filter(c => c.constraint_type === 'UNIQUE').map(c => c.constraint_name))];
  for (const name of uqNames) {
    const rows = constraints.filter(c => c.constraint_name === name);
    const tbl = rows[0].table_name;
    const cols = [...new Set(rows.map(r => r.key_column).filter(Boolean))];
    uqSQL.push(`ALTER TABLE ${tbl} ADD CONSTRAINT ${name}\n  UNIQUE (${cols.join(", ")});`);
  }
  if (uqSQL.length) writeSQL(constraintsDir, "unique_constraints", uqSQL.join("\n\n"));

  // Check
  const ckSQL = [];
  const ckNames = [...new Set(constraints.filter(c => c.constraint_type === 'CHECK').map(c => c.constraint_name))];
  for (const name of ckNames) {
    const rows = constraints.filter(c => c.constraint_name === name);
    const tbl = rows[0].table_name;
    const clause = rows[0].check_clause || '';
    ckSQL.push(`ALTER TABLE ${tbl} ADD CONSTRAINT ${name}\n  CHECK (${clause});`);
  }
  if (ckSQL.length) writeSQL(constraintsDir, "check_constraints", ckSQL.join("\n\n"));

  console.log(`  constraints/      ${pkNames.length} PK, ${fkNames.length} FK, ${uqNames.length} UQ, ${ckNames.length} CK`);

  // ─── 4. INDEXES ────────────────────────────────────────────────────
  const indexesDir = path.join(OUT_DIR, "indexes");
  const { rows: indexes } = await client.query(`
    SELECT indexname, tablename, indexdef
    FROM   pg_indexes
    WHERE  schemaname = 'public'
      AND  indexname NOT IN (
            SELECT constraint_name
            FROM   information_schema.table_constraints
            WHERE  table_schema = 'public'
           )
    ORDER  BY tablename, indexname
  `);
  for (const idx of indexes) {
    writeSQL(indexesDir, idx.indexname, idx.indexdef + ";");
  }
  console.log(`  indexes/          ${indexes.length} exported`);

  // ─── 5. FUNCTIONS & PROCEDURES ─────────────────────────────────────
  const functionsDir = path.join(OUT_DIR, "functions");
  const proceduresDir = path.join(OUT_DIR, "procedures");

  const { rows: routines } = await client.query(`
    SELECT n.nspname, p.proname, p.prokind, p.oid
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.prokind IN ('f', 'p')   -- functions & procedures only, skip aggregates/window
      AND  NOT EXISTS (              -- skip extension-owned functions
            SELECT 1 FROM pg_depend d
            JOIN   pg_extension e ON e.oid = d.refobjid
            WHERE  d.objid = p.oid AND d.deptype = 'e'
           )
    ORDER  BY p.prokind, p.proname
  `);

  let fnCount = 0, procCount = 0;
  for (const r of routines) {
    let definition;
    try {
      const { rows: defRows } = await client.query(
        `SELECT pg_get_functiondef($1) AS def`, [r.oid]
      );
      definition = defRows[0]?.def;
    } catch {
      // Skip functions that pg_get_functiondef can't handle (aggregates etc.)
      continue;
    }
    if (!definition) continue;
    const sql = definition + ";";
    if (r.prokind === 'p') {
      writeSQL(proceduresDir, r.proname, sql);
      procCount++;
    } else {
      writeSQL(functionsDir, r.proname, sql);
      fnCount++;
    }
  }
  console.log(`  functions/        ${fnCount} exported`);
  console.log(`  procedures/       ${procCount} exported`);

  // ─── 6. TRIGGERS ───────────────────────────────────────────────────
  const triggersDir = path.join(OUT_DIR, "triggers");
  const { rows: triggers } = await client.query(`
    SELECT tg.tgname           AS trigger_name,
           cls.relname         AS table_name,
           pg_get_triggerdef(tg.oid, true) AS definition
    FROM   pg_trigger tg
    JOIN   pg_class cls ON cls.oid = tg.tgrelid
    JOIN   pg_namespace n  ON n.oid = cls.relnamespace
    WHERE  n.nspname = 'public'
      AND  NOT tg.tgisinternal
    ORDER  BY cls.relname, tg.tgname
  `);
  for (const t of triggers) {
    const sql = `-- Trigger on table: ${t.table_name}\n${t.definition};`;
    writeSQL(triggersDir, t.trigger_name, sql);
  }
  console.log(`  triggers/         ${triggers.length} exported`);

  // ─── 7. VIEWS ──────────────────────────────────────────────────────
  const { rows: views } = await client.query(`
    SELECT table_name, view_definition
    FROM   information_schema.views
    WHERE  table_schema = 'public'
    ORDER  BY table_name
  `);
  if (views.length) {
    const viewsDir = path.join(OUT_DIR, "views");
    for (const v of views) {
      const sql = `CREATE OR REPLACE VIEW ${v.table_name} AS\n${v.view_definition}`;
      writeSQL(viewsDir, v.table_name, sql);
    }
    console.log(`  views/            ${views.length} exported`);
  }

  await client.end();

  console.log(`\nDone! All objects exported to db/DATABASE/`);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
