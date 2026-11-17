// src/routes/labels.js — Custom Labels Management Routes
const express = require('express');
const { getLabels, createLabel, deleteLabel } = require('../controllers/labelController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', getLabels);
router.post('/', createLabel);
router.delete('/:id', deleteLabel);

module.exports = router;
