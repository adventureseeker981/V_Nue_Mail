// src/controllers/settingsController.js — User Settings Controller for Encrypto
//
// Manages user preferences:
// - Density (comfortable, cozy, compact)
// - Theme (dark, modern-blue, high-contrast)
// - Email signature
// - Keyboard shortcuts toggle

const { query } = require('../db');

// GET /api/settings
async function getSettings(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT theme, density, signature, keyboard_shortcuts, updated_at
       FROM user_settings
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Default preferences
      return res.status(200).json({
        settings: {
          theme: 'dark',
          density: 'comfortable',
          signature: '',
          keyboard_shortcuts: true,
        },
      });
    }

    return res.status(200).json({ settings: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PUT /api/settings
async function updateSettings(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      theme = 'dark',
      density = 'comfortable',
      signature = '',
      keyboard_shortcuts = true,
    } = req.body;

    const result = await query(
      `INSERT INTO user_settings (user_id, theme, density, signature, keyboard_shortcuts, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET theme = EXCLUDED.theme,
           density = EXCLUDED.density,
           signature = EXCLUDED.signature,
           keyboard_shortcuts = EXCLUDED.keyboard_shortcuts,
           updated_at = NOW()
       RETURNING theme, density, signature, keyboard_shortcuts, updated_at`,
      [userId, theme, density, signature, keyboard_shortcuts]
    );

    return res.status(200).json({
      message: 'Settings updated successfully',
      settings: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
