require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const bcrypt = require('bcryptjs');

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

  // seed the site-wide super admin (only when none exists yet)
  const s = await pool.query('SELECT id FROM site_admins LIMIT 1');
  if (s.rows.length === 0) {
    const adminU = (process.env.SITE_ADMIN_USERNAME || 'admin').trim();
    const adminP = process.env.SITE_ADMIN_PASSWORD || 'admin12345';
    await pool.query('INSERT INTO site_admins (username, password) VALUES ($1, $2)', [
      adminU,
      bcrypt.hashSync(adminP, 10),
    ]);
    console.log('SITE ADMIN CREATED ->', adminU, '/', adminP);
  } else {
    console.log('SITE ADMIN EXISTS (kept existing)');
  }

  await pool.end();
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});