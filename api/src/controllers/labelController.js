// src/controllers/labelController.js — Custom Labels Controller for Encrypto
//
// Allows users to manage personal email tags and labels:
// - List labels
// - Create new custom label
// - Delete custom label

const { query } = require('../db');

// GET /api/labels
async function getLabels(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await query(
      `SELECT id, name, color, created_at
       FROM custom_labels
       WHERE user_id = $1
       ORDER BY name ASC`,
      [userId]
    );

    return res.status(200).json({ labels: result.rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/labels
async function createLabel(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, color = '#299EFF' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Label name is required' });
    }

    const trimmedName = name.trim();

    // Check if label already exists for this user
    const existing = await query(
      `SELECT id, name, color FROM custom_labels WHERE user_id = $1 AND LOWER(name) = LOWER($2)`,
      [userId, trimmedName]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A label with this name already exists' });
    }

    const result = await query(
      `INSERT INTO custom_labels (user_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING id, name, color, created_at`,
      [userId, trimmedName, color || '#299EFF']
    );

    return res.status(201).json({ label: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/labels/:id
async function deleteLabel(req, res, next) {
  try {
    const userId = req.user.id;
    const labelId = req.params.id;

    const result = await query(
      `DELETE FROM custom_labels
       WHERE id = $1 AND user_id = $2
       RETURNING id, name`,
      [labelId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Label not found or unauthorized' });
    }

    return res.status(200).json({ message: 'Label deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLabels,
  createLabel,
  deleteLabel,
};
