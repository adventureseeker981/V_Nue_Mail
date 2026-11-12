// src/db.js — PostgreSQL connection pool
//
// Reads DATABASE_URL from the environment.
// Supports two formats:
//   1. Standard URL:   postgresql://user:pass@host:port/dbname
//   2. libpq keyword:  host=localhost user=postgres password=postgres dbname=v_nue_mail
//
// The Rust SMTP server uses libpq format; we convert it to a URL for the pg module.

require('dotenv').config();
const { Pool } = require('pg');

function buildConnectionString(raw) {
  // Already a URL — use as-is
  if (raw.startsWith('postgresql://') || raw.startsWith('postgres://')) {
    return raw;
  }

  // libpq keyword=value format → parse into parts
  const parts = {};
  for (const token of raw.trim().split(/\s+/)) {
    const [key, ...rest] = token.split('=');
    if (key) parts[key] = rest.join('=');
  }

  const user     = parts.user     || 'postgres';
  const password = parts.password || 'postgres';
  const host     = parts.host     || 'localhost';
  const port     = parts.port     || '5432';
  const dbname   = parts.dbname   || 'v_nue_mail';

  return `postgresql://${user}:${password}@${host}:${port}/${dbname}`;
}

const rawUrl = process.env.DATABASE_URL ||
  'host=localhost user=postgres password=postgres dbname=v_nue_mail';

const connectionString = buildConnectionString(rawUrl);

const pool = new Pool({ connectionString });

pool.on('error', (err) => {
  console.error('Unexpected database error:', err.message);
});

// Simple query helper — the only way the rest of the app talks to the DB
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log(`[db] ${text.slice(0, 60).replace(/\s+/g, ' ')} — ${duration}ms`);
  return result;
}

module.exports = { query, pool };
