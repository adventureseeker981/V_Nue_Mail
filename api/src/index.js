// src/index.js — Express application entry point
//
// Mounts:
//   /api/auth  → registration, login, token verification
//   /api/mail  → inbox CRUD (all routes require JWT)

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const authRouter = require('./routes/auth');
const mailRouter = require('./routes/mail');

const app  = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Allow requests from the React dev server and production build
app.use(cors({
  origin: [
    'http://localhost:3000',   // Create React App default
    'http://localhost:5173',   // Vite default
  ],
  credentials: true,
}));

app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'V_Nue Mail API', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/mail', mailRouter);

// 404 handler — catch requests to unknown routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ---------------------------------------------------------------------------
// Centralised error handler
// Must have 4 parameters so Express identifies it as an error handler.
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  // Never expose internal stack traces to the client
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`V_Nue Mail API listening on port ${PORT}`);
  console.log(`  Health:   http://localhost:${PORT}/api/health`);
  console.log(`  Auth:     http://localhost:${PORT}/api/auth`);
  console.log(`  Mail:     http://localhost:${PORT}/api/mail`);
});

module.exports = app; // exported for testing
