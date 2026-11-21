// src/index.js — Encrypto Express Application Entry Point
//
// Mounts:
//   /api/auth (and /auth)       → registration, login, logout, profile
//   /api/emails (and /emails)   → inbox, sent, send, read, delete
//   /api/labels (and /labels)   → custom folder tags and labels
//   /api/settings (and /settings) → user preferences and mailbox settings
//   /api/mail (and /mail)       → backward compatibility with previous mail routes
//   /api/health (and /health)   → system health check (database & rust bridge status)

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env and .env.local (supports root and api directory invocation)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const emailsRouter = require('./routes/emails');
const mailRouter = require('./routes/mail');
const labelsRouter = require('./routes/labels');
const settingsRouter = require('./routes/settings');
const { signup, login, getMe, logout } = require('./controllers/authController');
const { requireAuth } = require('./middleware/auth');
const { checkRustHealth, RUST_SERVER_URL } = require('./services/rustService');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Vercel Serverless URL Normalization Middleware
// ---------------------------------------------------------------------------
app.use((req, _res, next) => {
  // If Vercel or an API gateway rewrote req.url to the physical file path,
  // restore the original incoming path from x-forwarded-uri or x-original-url.
  const forwarded = req.headers['x-forwarded-uri'] || req.headers['x-original-url'] || req.headers['x-matched-path'];
  if (forwarded && (req.url === '/src/index.js' || req.url === '/index.js' || req.url === '/src' || req.url.startsWith('/src/index.js?') || req.url.startsWith('/index.js?'))) {
    req.url = forwarded;
  }
  next();
});

// ---------------------------------------------------------------------------
// Middleware & CORS Configuration
// ---------------------------------------------------------------------------

// Allowed origins for CORS (local development + production Vercel frontend)
const ALLOWED_ORIGINS = [
  'https://encrypto-frontend-zeta.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

if (process.env.CLIENT_URL) {
  ALLOWED_ORIGINS.push(process.env.CLIENT_URL.trim().replace(/\/+$/, ''));
}
if (process.env.FRONTEND_URL) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL.trim().replace(/\/+$/, ''));
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.trim().replace(/\/+$/, '');

    // Allow explicitly defined origins
    if (ALLOWED_ORIGINS.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // Allow Vercel preview deployments for this project (e.g., https://encrypto-frontend-*.vercel.app)
    if (/^https:\/\/encrypto-frontend[a-z0-9-]*\.vercel\.app$/.test(cleanOrigin)) {
      return callback(null, true);
    }

    // Origin not allowed (do not set Access-Control-Allow-Origin header)
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 86400, // 24 hours preflight cache
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// ---------------------------------------------------------------------------
// Health & Root status routes
// ---------------------------------------------------------------------------
app.get(['/', '/api'], (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Encrypto Express API',
    health: '/api/health',
  });
});

app.get(['/api/health', '/health'], async (_req, res) => {
  const rustHealth = await checkRustHealth();

  let dbStatus = 'unconfigured';
  let dbMessage = 'DATABASE_URL is not set in environment variables';
  let dbConnected = false;

  if (process.env.DATABASE_URL) {
    try {
      const { query } = require('./db');
      await query('SELECT 1');
      dbStatus = 'connected';
      dbConnected = true;
      dbMessage = 'PostgreSQL database connection verified';
    } catch (err) {
      dbStatus = 'connection_error';
      dbConnected = false;
      dbMessage = `Failed to connect to PostgreSQL: ${err.message}`;
    }
  }

  res.json({
    status: 'ok',
    service: 'Encrypto Express API',
    port: PORT,
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      connected: dbConnected,
      configured: Boolean(process.env.DATABASE_URL),
      message: dbMessage,
    },
    rustBridge: {
      targetUrl: rustHealth.url || null,
      status: rustHealth.online ? 'connected' : 'offline',
      details: rustHealth,
    },
  });
});

// ---------------------------------------------------------------------------
// Mount Route Handlers (Dual Prefix: /api/* and direct /*)
// ---------------------------------------------------------------------------
app.use(['/api/auth', '/auth'], authRouter);
app.use(['/api/emails', '/emails'], emailsRouter);
app.use(['/api/labels', '/labels'], labelsRouter);
app.use(['/api/settings', '/settings'], settingsRouter);
app.use(['/api/mail', '/mail'], mailRouter); // Retained for backward compatibility

// Direct root auth aliases for extra client flexibility
app.post(['/api/signup', '/signup', '/api/register', '/register'], signup);
app.post(['/api/login', '/login'], login);
app.post(['/api/logout', '/logout'], logout);
app.get(['/api/me', '/me'], requireAuth, getMe);

// 404 Handler
app.use((req, res) => {
  console.warn(`[404 Not Found] ${req.method} ${req.originalUrl || req.url}`);
  res.status(404).json({
    error: 'Route not found',
    requestedUrl: req.originalUrl || req.url,
    method: req.method,
  });
});

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Error Handler]', err.message);

  // If database connection fails (e.g. DATABASE_URL unset or pointing to unreachable host)
  if (err.message && (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND') || err.code === 'ECONNREFUSED' || err.code === '28P01')) {
    return res.status(503).json({
      error: 'Database connection failed. Please ensure DATABASE_URL is set in your Vercel project environment variables to a cloud PostgreSQL instance (e.g. Neon, Supabase, Render).',
      code: err.code || 'DB_CONNECTION_ERROR',
      details: err.message,
    });
  }

  // If table does not exist
  if (err.code === '42P01') {
    return res.status(500).json({
      error: 'Database table missing. Please run setup_db.sql in your PostgreSQL database.',
      code: 'DB_TABLE_MISSING',
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// ---------------------------------------------------------------------------
// Start the Express Server (only when run directly in dev/standalone, not on Vercel or in test)
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 Encrypto Express API running on port ${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/api/health`);
    console.log(`   Auth API:     http://localhost:${PORT}/api/auth`);
    console.log(`   Emails API:   http://localhost:${PORT}/api/emails`);
    console.log(`   Rust Bridge:  ${RUST_SERVER_URL}`);
    console.log(`===============================================`);
  });

  // Handle server errors cleanly (e.g., when port 3001 is already occupied)
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ [Server Error] Port ${PORT} is already in use by another process (EADDRINUSE).`);
      console.error(`   Another instance of Express may already be running in the background.`);
      console.error(`   To find and free port ${PORT}, run in your terminal:`);
      console.error(`     lsof -ti :${PORT} | xargs kill -9`);
      console.error(`   Then restart with:`);
      console.error(`     npm run dev\n`);
    } else {
      console.error(`\n❌ [Server Error] Failed to start server:`, err.message);
    }
    process.exit(1);
  });
}

module.exports = app; // Exported for unit and integration testing
