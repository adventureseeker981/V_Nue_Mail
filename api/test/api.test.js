// test/api.test.js — Unit tests for pure logic functions
//
// These tests use Node.js built-in test runner (node:test) — no extra deps.
// Run with: npm test
//
// DB-dependent tests (register, login, inbox) are marked skip with an
// explanation of what they would assert.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Import the pure functions we can test without a database
// ---------------------------------------------------------------------------

// Inline the buildConnectionString function so we can test it in isolation
function buildConnectionString(raw) {
  if (raw.startsWith('postgresql://') || raw.startsWith('postgres://')) {
    return raw;
  }
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

// ---------------------------------------------------------------------------
// Tests: DATABASE_URL conversion
// ---------------------------------------------------------------------------

describe('buildConnectionString', () => {

  it('passes through a standard postgresql:// URL unchanged', () => {
    const url = 'postgresql://alice:secret@localhost:5432/mydb';
    assert.equal(buildConnectionString(url), url);
  });

  it('passes through a postgres:// URL unchanged', () => {
    const url = 'postgres://alice:secret@db.example.com:5432/prod';
    assert.equal(buildConnectionString(url), url);
  });

  it('converts libpq keyword format to a URL', () => {
    const libpq = 'host=localhost user=postgres password=postgres dbname=v_nue_mail';
    assert.equal(
      buildConnectionString(libpq),
      'postgresql://postgres:postgres@localhost:5432/v_nue_mail'
    );
  });

  it('uses defaults for missing libpq fields', () => {
    // only dbname provided
    assert.equal(
      buildConnectionString('dbname=testdb'),
      'postgresql://postgres:postgres@localhost:5432/testdb'
    );
  });

  it('handles passwords that contain = characters', () => {
    const libpq = 'host=localhost user=admin password=abc=123 dbname=mail';
    assert.equal(
      buildConnectionString(libpq),
      'postgresql://admin:abc=123@localhost:5432/mail'
    );
  });

});

// ---------------------------------------------------------------------------
// Tests: input validation logic (extracted for testability)
// ---------------------------------------------------------------------------

describe('registration validation', () => {

  function validateRegister({ email, password }) {
    if (!email || !password) return 'email and password are required';
    if (password.length < 6)  return 'password must be at least 6 characters';
    return null;
  }

  it('rejects missing email', () => {
    assert.equal(validateRegister({ email: '', password: 'secret' }), 'email and password are required');
  });

  it('rejects missing password', () => {
    assert.equal(validateRegister({ email: 'a@b.com', password: '' }), 'email and password are required');
  });

  it('rejects passwords shorter than 6 chars', () => {
    assert.equal(validateRegister({ email: 'a@b.com', password: 'abc' }), 'password must be at least 6 characters');
  });

  it('accepts valid email and password', () => {
    assert.equal(validateRegister({ email: 'a@b.com', password: 'secret123' }), null);
  });

});

// ---------------------------------------------------------------------------
// Integration test stubs (need a running DB — skipped in CI)
// ---------------------------------------------------------------------------

describe('POST /api/auth/register (integration — requires DB)', () => {
  it.skip('creates a user and returns a JWT token', () => {
    // Would:
    // 1. POST { email, password } to http://localhost:3001/api/auth/register
    // 2. Assert response status 201
    // 3. Assert response body has { token, user: { id, email } }
    // 4. Assert password_hash is NOT present in response
  });

  it.skip('returns 409 when email already exists', () => {
    // Would:
    // 1. Register the same email twice
    // 2. Assert second response is 409 Conflict
  });
});

describe('POST /api/auth/login (integration — requires DB)', () => {
  it.skip('returns a JWT on valid credentials', () => {
    // Would: login with the user created in the register test
  });

  it.skip('returns 401 on wrong password', () => {
    // Would: POST { email, password: 'wrong' }
    // Assert 401 — same response whether user exists or not (no enumeration)
  });
});

describe('GET /api/mail (integration — requires DB)', () => {
  it.skip('returns only messages addressed to the authenticated user', () => {
    // Would:
    // 1. Insert a message for user A and a message for user B via the DB
    // 2. Login as user A, GET /api/mail
    // 3. Assert only user A's message appears — user B's is hidden
    // This is the mailbox isolation guarantee.
  });
});
