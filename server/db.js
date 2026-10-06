const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable'
    ? false
    : { rejectUnauthorized: false },
});

pool.on('error', err => {
  console.error('Unexpected PG pool error:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function get(text, params) {
  const r = await pool.query(text, params);
  return r.rows[0];
}

async function all(text, params) {
  const r = await pool.query(text, params);
  return r.rows;
}

async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, get, all, tx };
