// src/controllers/authController.js — User authentication logic for ENCRYPTO
//
// Handles:
// - User registration (signup)
// - User login with password verification
// - Current user profile retrieval (me)
// - Logout

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const SALT_ROUNDS = 10;
const JWT_EXPIRY = '7d';

// Helper function to sign a JWT token for an authenticated user
function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev-secret-key-12345';
  return jwt.sign(
    { id: user.id, email: user.email },
    secret,
    { expiresIn: JWT_EXPIRY }
  );
}

// ---------------------------------------------------------------------------
// POST /api/auth/signup (or /register)
// ---------------------------------------------------------------------------
async function signup(req, res, next) {
  try {
    const email = req.body.email ? req.body.email.toLowerCase().trim() : '';
    const password = req.body.password ? req.body.password : '';
    // Support all common name field variations (name, displayName, display_name)
    const displayName = req.body.display_name || req.body.displayName || req.body.name || null;

    // 1. Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Guard: Verify DATABASE_URL is configured on Vercel
    if (!process.env.DATABASE_URL && process.env.VERCEL) {
      return res.status(503).json({
        error: 'Database is not configured. Please add DATABASE_URL in Vercel Project Settings (Environment Variables) to connect your PostgreSQL database.',
        code: 'DATABASE_UNCONFIGURED',
      });
    }

    // 2. Check if email already exists in PostgreSQL
    const existingUser = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingUser.rows && existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'This email is already registered. Please sign in.' });
    }

    // 3. Hash the password before saving to PostgreSQL (never plaintext)
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Insert into the database
    const result = await query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, created_at`,
      [email, password_hash, displayName ? displayName.trim() : null]
    );

    const user = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({
      message: 'Your Encrypto account has been created successfully!',
      token,
      user,
    });
  } catch (err) {
    // Code 23505 is PostgreSQL's unique_violation error code
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This email is already registered. Please sign in.' });
    }
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
async function login(req, res, next) {
  try {
    const email = req.body.email ? req.body.email.toLowerCase().trim() : '';
    const password = req.body.password ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Guard: Verify DATABASE_URL is configured on Vercel
    if (!process.env.DATABASE_URL && process.env.VERCEL) {
      return res.status(503).json({
        error: 'Database is not configured. Please add DATABASE_URL in Vercel Project Settings (Environment Variables) to connect your PostgreSQL database.',
        code: 'DATABASE_UNCONFIGURED',
      });
    }

    // 1. Look up user by email
    const result = await query(
      'SELECT id, email, password_hash, display_name, created_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    const user = result.rows[0];

    // Dummy hash to prevent timing attacks if user does not exist
    const dummyHash = '$2a$10$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const hash = user ? user.password_hash : dummyHash;
    const isPasswordCorrect = await bcrypt.compare(password, hash);

    if (!user || !isPasswordCorrect) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 2. Sign token and omit password hash from response
    const token = signToken(user);
    const safeUser = {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      created_at: user.created_at,
    };

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/auth/me (Protected route)
// ---------------------------------------------------------------------------
async function getMe(req, res, next) {
  try {
    const result = await query(
      'SELECT id, email, display_name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
function logout(_req, res) {
  return res.status(200).json({ message: 'Logged out successfully' });
}

module.exports = {
  signup,
  login,
  getMe,
  logout,
};
