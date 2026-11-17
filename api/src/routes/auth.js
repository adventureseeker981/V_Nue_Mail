// src/routes/auth.js — Authentication Routes
const express = require('express');
const { signup, login, getMe, logout } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup & POST /api/auth/register
router.post('/signup', signup);
router.post('/register', signup); // Backward compatible with Phase 7

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me (requires valid JWT token)
router.get('/me', requireAuth, getMe);

module.exports = router;
