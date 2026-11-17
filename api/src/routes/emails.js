// src/routes/emails.js — Comprehensive Gmail-Style Email Routes for Encrypto
//
// All routes require valid JWT authentication via requireAuth.
//
// Endpoints:
// - GET    /api/emails/inbox         → Inbox messages (supports ?category=primary|social|promotions|updates|forums)
// - GET    /api/emails/starred       → Starred messages
// - GET    /api/emails/snoozed       → Snoozed messages
// - GET    /api/emails/sent          → Sent messages
// - GET    /api/emails/drafts        → Saved drafts
// - GET    /api/emails/important     → Important messages
// - GET    /api/emails/all-mail      → All messages (Inbox, Sent, Archive)
// - GET    /api/emails/spam          → Spam messages
// - GET    /api/emails/trash         → Trash folder
// - GET    /api/emails/counts        → Unread / total folder counts for sidebar badges
// - GET    /api/emails/search        → Multi-field server search (q, from, to, subject, hasAttachment, etc.)
// - POST   /api/emails/send          → Send new email (with Rust SMTP encryption)
// - POST   /api/emails/drafts        → Save or autosave draft
// - DELETE /api/emails/drafts/:id    → Discard draft
// - POST   /api/emails/bulk          → Apply bulk action on message IDs array
// - DELETE /api/emails/trash/empty   → Empty entire trash folder
// - GET    /api/emails/:id           → Read full email details
// - PATCH  /api/emails/:id/read      → Mark as read
// - PATCH  /api/emails/:id/unread    → Mark as unread
// - PATCH  /api/emails/:id/star      → Toggle star status
// - PATCH  /api/emails/:id/important → Toggle important status
// - POST   /api/emails/:id/archive   → Archive email
// - POST   /api/emails/:id/unarchive → Move archived email back to inbox
// - POST   /api/emails/:id/spam      → Report email as spam
// - POST   /api/emails/:id/unspam    → Move spam email back to inbox
// - POST   /api/emails/:id/snooze    → Snooze email until ISO datetime
// - POST   /api/emails/:id/restore   → Restore email from trash
// - DELETE /api/emails/:id/permanent → Permanently remove email from database
// - DELETE /api/emails/:id           → Soft-delete email to trash

const express = require('express');
const {
  getInbox,
  getStarred,
  getSnoozed,
  getSent,
  getDrafts,
  getImportant,
  getAllMail,
  getSpam,
  getTrash,
  getCounts,
  searchEmails,
  getEmailById,
  sendEmail,
  saveDraft,
  discardDraft,
  markAsRead,
  markAsUnread,
  toggleStar,
  toggleImportant,
  archiveEmail,
  unarchiveEmail,
  reportSpam,
  unmarkSpam,
  snoozeEmail,
  handleBulkAction,
  deleteEmail,
  restoreEmail,
  deleteEmailPermanently,
  emptyTrash,
} = require('../controllers/emailController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Protect all email endpoints with JWT authentication middleware
router.use(requireAuth);

// ---------------------------------------------------------------------------
// 1. Folder Views
// ---------------------------------------------------------------------------
router.get('/inbox', getInbox);
router.get('/starred', getStarred);
router.get('/snoozed', getSnoozed);
router.get('/sent', getSent);
router.get('/drafts', getDrafts);
router.get('/important', getImportant);
router.get('/all-mail', getAllMail);
router.get('/spam', getSpam);
router.get('/trash', getTrash);

// ---------------------------------------------------------------------------
// 2. Folder Counts & Search
// ---------------------------------------------------------------------------
router.get('/counts', getCounts);
router.get('/search', searchEmails);

// ---------------------------------------------------------------------------
// 3. Drafts, Send & Bulk Actions
// ---------------------------------------------------------------------------
router.post('/send', sendEmail);
router.post('/drafts', saveDraft);
router.delete('/drafts/:id', discardDraft);
router.post('/bulk', handleBulkAction);
router.delete('/trash/empty', emptyTrash);

// ---------------------------------------------------------------------------
// 4. Single Message Operations
// ---------------------------------------------------------------------------
router.get('/:id', getEmailById);
router.patch('/:id/read', markAsRead);
router.patch('/:id/unread', markAsUnread);
router.patch('/:id/star', toggleStar);
router.patch('/:id/important', toggleImportant);
router.post('/:id/archive', archiveEmail);
router.post('/:id/unarchive', unarchiveEmail);
router.post('/:id/spam', reportSpam);
router.post('/:id/unspam', unmarkSpam);
router.post('/:id/snooze', snoozeEmail);
router.post('/:id/restore', restoreEmail);
router.delete('/:id/permanent', deleteEmailPermanently);
router.delete('/:id', deleteEmail);

module.exports = router;
