// src/index.js — Encrypto Express Application Entry Point
//
// Mounts:
//   /api/auth    → registration, login, logout, profile
//   /api/emails  → inbox, sent, send, read, delete
//   /api/mail    → backward compatibility with previous mail routes
//   /api/health  → system health check (database & rust bridge status)

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const emailsRouter = require('./routes/emails');
const mailRouter = require('./routes/mail');
const labelsRouter = require('./routes/labels');
const settingsRouter = require('./routes/settings');
const { checkRustHealth, RUST_SERVER_URL } = require('./services/rustService');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Enable CORS for frontend development servers
app.use(
  cors({
    origin: [
      'http://localhost:3000', // React default (Vite configured for 3000)
      'http://localhost:5173', // Vite default
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  })
);

app.use(express.json());

// ---------------------------------------------------------------------------
// Health check route
// ---------------------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
  const rustHealth = await checkRustHealth();

  res.json({
    status: 'ok',
    service: 'Encrypto Express API',
    port: PORT,
    timestamp: new Date().toISOString(),
    rustBridge: {
      targetUrl: RUST_SERVER_URL,
      status: rustHealth.online ? 'connected' : 'offline',
      details: rustHealth,
    },
  });
});

// ---------------------------------------------------------------------------
// Mount Route Handlers
// ---------------------------------------------------------------------------
app.use('/api/auth', authRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/labels', labelsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/mail', mailRouter); // Retained for backward compatibility

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Error Handler]', err.message);
  // Never leak database stack traces to the frontend
  res.status(500).json({ error: 'Internal server error' });
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
