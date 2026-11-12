// src/middleware/auth.js — JWT authentication middleware
//
// Reads the token from the Authorization header:
//   Authorization: Bearer <token>
//
// On success: attaches req.user = { id, email } and calls next()
// On failure: returns 401 JSON error — never reveals why (token missing vs invalid)

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
