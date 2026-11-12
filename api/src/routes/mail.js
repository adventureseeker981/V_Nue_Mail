// src/routes/mail.js — Mailbox operations
//
// All routes require a valid JWT (requireAuth middleware).
// CRITICAL RULE: every query that returns messages uses
//   LOWER(recipient) = LOWER($n)
// with req.user.email — users can NEVER read each other's mail.
//
// GET    /api/mail          — list all messages in the authenticated user's inbox
// GET    /api/mail/:id      — get a single message (must belong to the user)
// PATCH  /api/mail/:id/read   — mark message as read
// PATCH  /api/mail/:id/unread — mark message as unread
// DELETE /api/mail/:id      — delete a message

const express         = require('express');
const { query }       = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All mail routes require authentication
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Helper: fetch a single message and verify it belongs to the current user.
// Returns the row or null — never throws a 404 itself (caller decides).
// ---------------------------------------------------------------------------
async function findOwnedMessage(messageId, userEmail) {
  const result = await query(
    `SELECT * FROM messages
     WHERE id = $1
       AND LOWER(recipient) = LOWER($2)`,
    [messageId, userEmail]
  );
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// GET /api/mail
// Returns all messages for the authenticated user, newest first.
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, sender, recipient, subject, status, created_at
       FROM messages
       WHERE LOWER(recipient) = LOWER($1)
       ORDER BY created_at DESC`,
      [req.user.email]
    );

    return res.json({ messages: result.rows });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/mail/:id
// Returns the full message including body and headers.
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const message = await findOwnedMessage(req.params.id, req.user.email);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    return res.json({ message });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/mail/:id/read
// ---------------------------------------------------------------------------
router.patch('/:id/read', async (req, res, next) => {
  try {
    // Verify ownership before updating
    const message = await findOwnedMessage(req.params.id, req.user.email);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const result = await query(
      `UPDATE messages SET status = 'read'
       WHERE id = $1 AND LOWER(recipient) = LOWER($2)
       RETURNING id, status`,
      [req.params.id, req.user.email]
    );

    return res.json({ message: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/mail/:id/unread
// ---------------------------------------------------------------------------
router.patch('/:id/unread', async (req, res, next) => {
  try {
    const message = await findOwnedMessage(req.params.id, req.user.email);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const result = await query(
      `UPDATE messages SET status = 'unread'
       WHERE id = $1 AND LOWER(recipient) = LOWER($2)
       RETURNING id, status`,
      [req.params.id, req.user.email]
    );

    return res.json({ message: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/mail/:id
// Returns 204 No Content on success.
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM messages
       WHERE id = $1 AND LOWER(recipient) = LOWER($2)
       RETURNING id`,
      [req.params.id, req.user.email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
