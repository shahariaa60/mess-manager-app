require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const sql = fs.readFileSync('schema.sql', 'utf8');
  const r = await pool.query(sql);
  console.log('SCHEMA OK');
  const t = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  console.log('TABLES:', t.rows.map((x) => x.table_name).join(', '));
  const m = await pool.query('SELECT COUNT(*) FROM messes');
  console.log('messes count:', m.rows[0].count);
  await pool.end();
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});