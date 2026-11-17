// src/controllers/emailController.js — Complete Gmail-grade Email Controller for ENCRYPTO
//
// Handles:
// - Standard & Advanced Mailbox Views:
//   Inbox (with category filtering), Starred, Snoozed, Sent, Drafts, Important, All Mail, Spam, Trash
// - Unread & Folder Counts for Live Badges
// - Single Email Retrieval with Authorization Checks
// - Sending Emails (Bridging to Rust Server)
// - Draft Auto-saving & Discarding
// - Reading / Unread Toggles
// - Starring / Unstarring
// - Importance Toggles
// - Archiving / Unarchiving
// - Spam Reporting & Un-spamming
// - Snooze Scheduling
// - Label Application & Removal
// - Bulk Operations on Multiple Selected Emails
// - Soft Delete to Trash & Permanent Deletion & Empty Trash
// - Advanced Multi-Field Server Search

const { query } = require('../db');
const { forwardEmailToRust } = require('../services/rustService');

// ---------------------------------------------------------------------------
// Helper: Verify if user owns the message (as recipient or sender)
// and has not permanently deleted it from their account.
// ---------------------------------------------------------------------------
async function findAuthorizedMessage(messageId, userEmail) {
  const result = await query(
    `SELECT * FROM messages
     WHERE id = $1
       AND (
         (LOWER(recipient::text) LIKE '%' || LOWER($2) || '%' AND recipient_deleted IS NOT TRUE)
         OR
         (LOWER(sender) = LOWER($2) AND sender_deleted IS NOT TRUE)
       )`,
    [messageId, userEmail]
  );
  return result.rows[0] || null;
}

// ---------------------------------------------------------------------------
// Helper: Format message row with user-specific flags (starred, important, etc.)
// ---------------------------------------------------------------------------
function formatMessageForUser(row, userEmail) {
  const isSender = row.sender && row.sender.toLowerCase() === userEmail;
  return {
    ...row,
    is_starred: isSender ? !!row.sender_starred : !!row.recipient_starred,
    is_important: isSender ? !!row.sender_important : !!row.recipient_important,
    is_archived: isSender ? !!row.sender_archived : !!row.recipient_archived,
    is_trashed: isSender ? !!row.sender_trash : !!row.recipient_trash,
    is_spam: !!row.recipient_spam,
    original_folder: isSender ? 'sent' : 'inbox',
  };
}

// ---------------------------------------------------------------------------
// GET /api/emails/inbox
// Category support: ?category=primary | social | promotions | updates | forums
// ---------------------------------------------------------------------------
async function getInbox(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const category = req.query.category ? req.query.category.toLowerCase() : null;

    let sql = `
      SELECT *
      FROM messages
      WHERE (
        LOWER(recipient::text) LIKE '%' || $1 || '%'
        OR LOWER(COALESCE(cc, '')) LIKE '%' || $1 || '%'
        OR LOWER(COALESCE(bcc, '')) LIKE '%' || $1 || '%'
      )
        AND (recipient_trash IS NOT TRUE)
        AND (recipient_deleted IS NOT TRUE)
        AND (recipient_archived IS NOT TRUE)
        AND (recipient_spam IS NOT TRUE)
        AND (is_draft IS NOT TRUE)
        AND (snoozed_until IS NULL OR snoozed_until <= NOW())
        AND (scheduled_for IS NULL OR scheduled_for <= NOW())
    `;
    const params = [userEmail];

    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND (category = $${params.length} OR ($${params.length} = 'primary' AND category IS NULL))`;
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);
    const messages = result.rows.map((row) => formatMessageForUser(row, userEmail));

    return res.status(200).json({
      folder: 'inbox',
      category: category || 'primary',
      count: messages.length,
      messages,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/starred
// Returns all starred emails for the user
// ---------------------------------------------------------------------------
async function getStarred(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();

    const sql = `
      SELECT *
      FROM messages
      WHERE (
        (LOWER(recipient::text) LIKE '%' || $1 || '%' AND recipient_starred = TRUE AND recipient_trash IS NOT TRUE AND recipient_deleted IS NOT TRUE)
        OR
        (LOWER(sender) = $1 AND sender_starred = TRUE AND sender_trash IS NOT TRUE AND sender_deleted IS NOT TRUE)
      )
      ORDER BY created_at DESC
    `;

    const result = await query(sql, [userEmail]);
    const messages = result.rows.map((row) => formatMessageForUser(row, userEmail));

    return res.status(200).json({
      folder: 'starred',
      count: messages.length,
      messages,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/snoozed
// Returns emails currently scheduled as snoozed
// ---------------------------------------------------------------------------
async function getSnoozed(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();

    const sql = `
      SELECT *
      FROM messages
      WHERE snoozed_until > NOW()
        AND (
          (LOWER(recipient::text) LIKE '%' || $1 || '%' AND recipient_trash IS NOT TRUE AND recipient_deleted IS NOT TRUE)
          OR
          (LOWER(sender) = $1 AND sender_trash IS NOT TRUE AND sender_deleted IS NOT TRUE)
        )
      ORDER BY snoozed_until ASC
    `;

    const result = await query(sql, [userEmail]);
    const messages = result.rows.map((row) => formatMessageForUser(row, userEmail));

    return res.status(200).json({
      folder: 'snoozed',
      count: messages.length,
      messages,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/sent
// Returns sent messages (non-drafts, non-trashed)
// ---------------------------------------------------------------------------
async function getSent(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();

    const result = await query(
      `SELECT *
       FROM messages
       WHERE LOWER(sender) = $1
         AND (is_draft IS NOT TRUE)
         AND (sender_trash IS NOT TRUE)
         AND (sender_deleted IS NOT TRUE)
       ORDER BY created_at DESC`,
      [userEmail]
    );

    const messages = result.rows.map((row) => formatMessageForUser(row, userEmail));

    return res.status(200).json({
      folder: 'sent',
      count: messages.length,
      messages,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/drafts
// Returns saved drafts
// ---------------------------------------------------------------------------
async function getDrafts(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();

    const result = await query(
      `SELECT *
       FROM messages
       WHERE LOWER(sender) = $1
         AND is_draft = TRUE
         AND (sender_trash IS NOT TRUE)
         AND (sender_deleted IS NOT TRUE)
       ORDER BY created_at DESC`,
      [userEmail]
    );

    const messages = result.rows.map((row) => formatMessageForUser(row, userEmail));

    return res.status(200).json({
      folder: 'drafts',
      count: messages.length,
      messages,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/important
// Returns messages marked as important
// ---------------------------------------------------------------------------
async function getImportant(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();

    const sql = `
      SELECT *
      FROM messages
      WHERE (
        (LOWER(recipient::text) LIKE '%' || $1 || '%' AND recipient_important = TRUE AND recipient_trash IS NOT TRUE AND recipient_deleted IS NOT TRUE)
        OR
        (LOWER(sender) = $1 AND sender_important = TRUE AND sender_trash IS NOT TRUE AND sender_deleted IS NOT TRUE)
      )
      ORDER BY created_at DESC
    `;

    const result = await query(sql, [userEmail]);
    const messages = result.rows.map((row) => formatMessageForUser(row, userEmail));

    return res.status(200).json({
      folder: 'important',
      count: messages.length,
      messages,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/all-mail
// Returns all non-spam, non-trashed, non-draft messages
// ---------------------------------------------------------------------------
async function getAllMail(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();

    const sql = `
      SELECT *
      FROM messages
      WHERE (is_draft IS NOT TRUE)
        AND (
          (LOWER(recipient::text) LIKE '%' || $1 || '%' AND recipient_trash IS NOT TRUE AND recipient_deleted IS NOT TRUE AND recipient_spam IS NOT TRUE)
          OR
          (LOWER(sender) = $1 AND sender_trash IS NOT TRUE AND sender_deleted IS NOT TRUE)
        )
      ORDER BY created_at DESC
    `;

    const result = await query(sql, [userEmail]);
    const messages = result.rows.map((row) => formatMessageForUser(row, userEmail));

    return res.status(200).json({
      folder: 'all-mail',
      count: messages.length,
      messages,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/spam
// Returns emails marked as spam
// ---------------------------------------------------------------------------
async function getSpam(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();

    const sql = `
      SELECT *
      FROM messages
      WHERE LOWER(recipient::text) LIKE '%' || $1 || '%'
        AND recipient_spam = TRUE
        AND recipient_trash IS NOT TRUE
        AND recipient_deleted IS NOT TRUE
      ORDER BY created_at DESC
    `;

    const result = await query(sql, [userEmail]);
    const messages = result.rows.map((row) => formatMessageForUser(row, userEmail));

    return res.status(200).json({
      folder: 'spam',
      count: messages.length,
      messages,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/trash
// Returns trashed emails
// ---------------------------------------------------------------------------
async function getTrash(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();

    const sql = `
      SELECT *
      FROM messages
      WHERE (
        (LOWER(recipient::text) LIKE '%' || $1 || '%' AND recipient_trash = TRUE AND recipient_deleted IS NOT TRUE)
        OR
        (LOWER(sender) = $1 AND sender_trash = TRUE AND sender_deleted IS NOT TRUE)
      )
      ORDER BY created_at DESC
    `;

    const result = await query(sql, [userEmail]);
    const messages = result.rows.map((row) => formatMessageForUser(row, userEmail));

    return res.status(200).json({
      folder: 'trash',
      count: messages.length,
      messages,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/counts
// Real-time unread & total counts for all folders to display on badges
// ---------------------------------------------------------------------------
async function getCounts(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();

    // Inbox unread
    const inboxUnread = await query(
      `SELECT COUNT(*) FROM messages
       WHERE (
         LOWER(recipient::text) LIKE '%' || $1 || '%'
         OR LOWER(COALESCE(cc, '')) LIKE '%' || $1 || '%'
         OR LOWER(COALESCE(bcc, '')) LIKE '%' || $1 || '%'
       )
         AND status = 'unread'
         AND recipient_trash IS NOT TRUE
         AND recipient_deleted IS NOT TRUE
         AND recipient_archived IS NOT TRUE
         AND recipient_spam IS NOT TRUE
         AND is_draft IS NOT TRUE
         AND (scheduled_for IS NULL OR scheduled_for <= NOW())`,
      [userEmail]
    );

    // Starred count
    const starredCount = await query(
      `SELECT COUNT(*) FROM messages
       WHERE (
         (LOWER(recipient::text) LIKE '%' || $1 || '%' AND recipient_starred = TRUE AND recipient_trash IS NOT TRUE AND recipient_deleted IS NOT TRUE)
         OR
         (LOWER(sender) = $1 AND sender_starred = TRUE AND sender_trash IS NOT TRUE AND sender_deleted IS NOT TRUE)
       )`,
      [userEmail]
    );

    // Drafts count
    const draftsCount = await query(
      `SELECT COUNT(*) FROM messages
       WHERE LOWER(sender) = $1 AND is_draft = TRUE AND sender_trash IS NOT TRUE AND sender_deleted IS NOT TRUE`,
      [userEmail]
    );

    // Spam count
    const spamCount = await query(
      `SELECT COUNT(*) FROM messages
       WHERE LOWER(recipient::text) LIKE '%' || $1 || '%' AND recipient_spam = TRUE AND recipient_trash IS NOT TRUE AND recipient_deleted IS NOT TRUE`,
      [userEmail]
    );

    // Trash count
    const trashCount = await query(
      `SELECT COUNT(*) FROM messages
       WHERE (
         (LOWER(recipient::text) LIKE '%' || $1 || '%' AND recipient_trash = TRUE AND recipient_deleted IS NOT TRUE)
         OR
         (LOWER(sender) = $1 AND sender_trash = TRUE AND sender_deleted IS NOT TRUE)
       )`,
      [userEmail]
    );

    return res.status(200).json({
      inbox: parseInt(inboxUnread.rows[0].count, 10),
      starred: parseInt(starredCount.rows[0].count, 10),
      drafts: parseInt(draftsCount.rows[0].count, 10),
      spam: parseInt(spamCount.rows[0].count, 10),
      trash: parseInt(trashCount.rows[0].count, 10),
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/search
// Advanced server search supporting keywords and specific filters
// ---------------------------------------------------------------------------
async function searchEmails(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const { q, from, to, subject, hasAttachment, isStarred, isImportant, dateFrom, dateTo, folder } = req.query;

    let sql = `
      SELECT * FROM messages
      WHERE (
        (LOWER(recipient::text) LIKE '%' || $1 || '%' AND recipient_deleted IS NOT TRUE)
        OR
        (LOWER(sender) = $1 AND sender_deleted IS NOT TRUE)
      )
    `;
    const params = [userEmail];

    // General query across multiple fields
    if (q && q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      sql += ` AND (
        LOWER(subject) LIKE $${params.length}
        OR LOWER(body) LIKE $${params.length}
        OR LOWER(sender) LIKE $${params.length}
        OR LOWER(recipient::text) LIKE $${params.length}
      )`;
    }

    // Specific filters
    if (from && from.trim()) {
      params.push(`%${from.trim().toLowerCase()}%`);
      sql += ` AND LOWER(sender) LIKE $${params.length}`;
    }

    if (to && to.trim()) {
      params.push(`%${to.trim().toLowerCase()}%`);
      sql += ` AND LOWER(recipient::text) LIKE $${params.length}`;
    }

    if (subject && subject.trim()) {
      params.push(`%${subject.trim().toLowerCase()}%`);
      sql += ` AND LOWER(subject) LIKE $${params.length}`;
    }

    if (isStarred === 'true') {
      sql += ` AND (recipient_starred = TRUE OR sender_starred = TRUE)`;
    }

    if (isImportant === 'true') {
      sql += ` AND (recipient_important = TRUE OR sender_important = TRUE)`;
    }

    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND created_at >= $${params.length}::timestamptz`;
    }

    if (dateTo) {
      params.push(dateTo);
      sql += ` AND created_at <= $${params.length}::timestamptz`;
    }

    // Filter by specific folder if provided
    if (folder === 'inbox') {
      sql += ` AND recipient_trash IS NOT TRUE AND recipient_archived IS NOT TRUE AND recipient_spam IS NOT TRUE AND is_draft IS NOT TRUE`;
    } else if (folder === 'trash') {
      sql += ` AND (recipient_trash = TRUE OR sender_trash = TRUE)`;
    } else if (folder === 'spam') {
      sql += ` AND recipient_spam = TRUE`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await query(sql, params);
    const messages = result.rows.map((row) => formatMessageForUser(row, userEmail));

    return res.status(200).json({
      count: messages.length,
      messages,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/emails/:id
// ---------------------------------------------------------------------------
async function getEmailById(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const message = await findAuthorizedMessage(req.params.id, userEmail);

    if (!message) {
      return res.status(404).json({ error: 'Email not found or access denied' });
    }

    return res.status(200).json({ message: formatMessageForUser(message, userEmail) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/emails/send
// ---------------------------------------------------------------------------
async function sendEmail(req, res, next) {
  try {
    const sender = req.user.email.toLowerCase();
    const {
      recipient,
      cc = '',
      bcc = '',
      subject,
      body,
      body_html = '',
      bodyHtml = '',
      attachments = [],
      is_confidential = false,
      isConfidential = false,
      scheduled_for = null,
      scheduledFor = null,
      draftId,
      category,
    } = req.body;

    if (!recipient || (Array.isArray(recipient) && recipient.length === 0)) {
      return res.status(400).json({ error: 'Recipient email address is required' });
    }

    const cleanRecipient = Array.isArray(recipient)
      ? recipient.map((r) => r.trim().toLowerCase()).filter(Boolean).join(', ')
      : recipient.toLowerCase().trim();

    const cleanCc = Array.isArray(cc)
      ? cc.map((c) => c.trim().toLowerCase()).filter(Boolean).join(', ')
      : (cc || '').toLowerCase().trim();

    const cleanBcc = Array.isArray(bcc)
      ? bcc.map((b) => b.trim().toLowerCase()).filter(Boolean).join(', ')
      : (bcc || '').toLowerCase().trim();

    const cleanSubject = subject ? subject.trim() : '(No Subject)';
    const cleanBody = body ? body.trim() : '';
    const cleanBodyHtml = body_html || bodyHtml || '';
    const confidential = Boolean(is_confidential || isConfidential);
    const scheduled = scheduled_for || scheduledFor || null;
    const cleanAttachments = Array.isArray(attachments) ? JSON.stringify(attachments) : '[]';

    // Bridge to Rust server
    const rustResponse = await forwardEmailToRust({
      sender,
      recipient: cleanRecipient,
      subject: cleanSubject,
      body: cleanBody,
    });

    const rawHeaders = `From: ${sender}\r\nTo: ${cleanRecipient}${cleanCc ? `\r\nCc: ${cleanCc}` : ''}\r\nSubject: ${cleanSubject}\r\nDate: ${new Date().toUTCString()}`;

    // If sending an existing draft, update it to sent status, else insert new
    let savedMessage;
    if (draftId) {
      const updateResult = await query(
        `UPDATE messages
         SET recipient = $1, cc = $2, bcc = $3, subject = $4, body = $5, body_html = $6,
             attachments = $7::jsonb, is_confidential = $8, scheduled_for = $9, raw_headers = $10,
             is_draft = FALSE, status = 'unread', created_at = NOW()
         WHERE id = $11 AND LOWER(sender) = $12
         RETURNING *`,
        [
          cleanRecipient,
          cleanCc,
          cleanBcc,
          cleanSubject,
          cleanBody,
          cleanBodyHtml,
          cleanAttachments,
          confidential,
          scheduled,
          rawHeaders,
          draftId,
          sender,
        ]
      );
      if (updateResult.rows.length > 0) {
        savedMessage = updateResult.rows[0];
      }
    }

    if (!savedMessage) {
      const insertResult = await query(
        `INSERT INTO messages (
           sender, recipient, cc, bcc, subject, body, body_html, attachments,
           is_confidential, scheduled_for, raw_headers, status, category,
           recipient_trash, sender_trash, recipient_deleted, sender_deleted, is_draft
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, 'unread', $12, FALSE, FALSE, FALSE, FALSE, FALSE)
         RETURNING *`,
        [
          sender,
          cleanRecipient,
          cleanCc,
          cleanBcc,
          cleanSubject,
          cleanBody,
          cleanBodyHtml,
          cleanAttachments,
          confidential,
          scheduled,
          rawHeaders,
          category || 'primary',
        ]
      );
      savedMessage = insertResult.rows[0];
    }

    return res.status(201).json({
      message: 'Email sent successfully',
      email: formatMessageForUser(savedMessage, sender),
      rustBridge: rustResponse,
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/emails/drafts
// Autosaves or updates draft
// ---------------------------------------------------------------------------
async function saveDraft(req, res, next) {
  try {
    const sender = req.user.email.toLowerCase();
    const {
      id,
      recipient = '',
      cc = '',
      bcc = '',
      subject = '',
      body = '',
      body_html = '',
      bodyHtml = '',
      attachments = [],
      is_confidential = false,
      isConfidential = false,
    } = req.body;

    const cleanRecipient = Array.isArray(recipient)
      ? recipient.map((r) => r.trim().toLowerCase()).filter(Boolean).join(', ')
      : (recipient || '').toLowerCase().trim();

    const cleanCc = Array.isArray(cc)
      ? cc.map((c) => c.trim().toLowerCase()).filter(Boolean).join(', ')
      : (cc || '').toLowerCase().trim();

    const cleanBcc = Array.isArray(bcc)
      ? bcc.map((b) => b.trim().toLowerCase()).filter(Boolean).join(', ')
      : (bcc || '').toLowerCase().trim();

    const cleanSubject = (subject || '').trim() || '(Draft)';
    const cleanBody = body || '';
    const cleanBodyHtml = body_html || bodyHtml || '';
    const confidential = Boolean(is_confidential || isConfidential);
    const cleanAttachments = Array.isArray(attachments) ? JSON.stringify(attachments) : '[]';

    const rawHeaders = `From: ${sender}\r\nTo: ${cleanRecipient}${cleanCc ? `\r\nCc: ${cleanCc}` : ''}\r\nSubject: ${cleanSubject}\r\nDate: ${new Date().toUTCString()}`;

    let savedDraft;
    if (id) {
      const updateResult = await query(
        `UPDATE messages
         SET recipient = $1, cc = $2, bcc = $3, subject = $4, body = $5, body_html = $6,
             attachments = $7::jsonb, is_confidential = $8, raw_headers = $9, created_at = NOW()
         WHERE id = $10 AND LOWER(sender) = $11 AND is_draft = TRUE
         RETURNING *`,
        [
          cleanRecipient,
          cleanCc,
          cleanBcc,
          cleanSubject,
          cleanBody,
          cleanBodyHtml,
          cleanAttachments,
          confidential,
          rawHeaders,
          id,
          sender,
        ]
      );
      if (updateResult.rows.length > 0) {
        savedDraft = updateResult.rows[0];
      }
    }

    if (!savedDraft) {
      const insertResult = await query(
        `INSERT INTO messages (
           sender, recipient, cc, bcc, subject, body, body_html, attachments,
           is_confidential, raw_headers, status, is_draft,
           recipient_trash, sender_trash, recipient_deleted, sender_deleted
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, 'draft', TRUE, FALSE, FALSE, FALSE, FALSE)
         RETURNING *`,
        [
          sender,
          cleanRecipient,
          cleanCc,
          cleanBcc,
          cleanSubject,
          cleanBody,
          cleanBodyHtml,
          cleanAttachments,
          confidential,
          rawHeaders,
        ]
      );
      savedDraft = insertResult.rows[0];
    }

    return res.status(200).json({
      message: 'Draft saved',
      draft: formatMessageForUser(savedDraft, sender),
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/emails/drafts/:id
// Discards draft
// ---------------------------------------------------------------------------
async function discardDraft(req, res, next) {
  try {
    const sender = req.user.email.toLowerCase();
    await query(
      `DELETE FROM messages WHERE id = $1 AND LOWER(sender) = $2 AND is_draft = TRUE`,
      [req.params.id, sender]
    );
    return res.status(200).json({ message: 'Draft discarded' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/emails/:id/read
// ---------------------------------------------------------------------------
async function markAsRead(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const message = await findAuthorizedMessage(req.params.id, userEmail);
    if (!message) return res.status(404).json({ error: 'Email not found' });

    const result = await query(
      `UPDATE messages SET status = 'read' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    return res.status(200).json({ message: formatMessageForUser(result.rows[0], userEmail) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/emails/:id/unread
// ---------------------------------------------------------------------------
async function markAsUnread(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const message = await findAuthorizedMessage(req.params.id, userEmail);
    if (!message) return res.status(404).json({ error: 'Email not found' });

    const result = await query(
      `UPDATE messages SET status = 'unread' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    return res.status(200).json({ message: formatMessageForUser(result.rows[0], userEmail) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/emails/:id/star
// Toggles star status for current user
// ---------------------------------------------------------------------------
async function toggleStar(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const message = await findAuthorizedMessage(req.params.id, userEmail);
    if (!message) return res.status(404).json({ error: 'Email not found' });

    const isSender = message.sender && message.sender.toLowerCase() === userEmail;
    let result;
    if (isSender) {
      result = await query(
        `UPDATE messages SET sender_starred = NOT COALESCE(sender_starred, FALSE) WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
    } else {
      result = await query(
        `UPDATE messages SET recipient_starred = NOT COALESCE(recipient_starred, FALSE) WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
    }

    return res.status(200).json({ message: formatMessageForUser(result.rows[0], userEmail) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/emails/:id/important
// Toggles important status for current user
// ---------------------------------------------------------------------------
async function toggleImportant(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const message = await findAuthorizedMessage(req.params.id, userEmail);
    if (!message) return res.status(404).json({ error: 'Email not found' });

    const isSender = message.sender && message.sender.toLowerCase() === userEmail;
    let result;
    if (isSender) {
      result = await query(
        `UPDATE messages SET sender_important = NOT COALESCE(sender_important, FALSE) WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
    } else {
      result = await query(
        `UPDATE messages SET recipient_important = NOT COALESCE(recipient_important, FALSE) WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
    }

    return res.status(200).json({ message: formatMessageForUser(result.rows[0], userEmail) });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/emails/:id/archive
// Moves email out of inbox into archive
// ---------------------------------------------------------------------------
async function archiveEmail(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const message = await findAuthorizedMessage(req.params.id, userEmail);
    if (!message) return res.status(404).json({ error: 'Email not found' });

    const isSender = message.sender && message.sender.toLowerCase() === userEmail;
    if (isSender) {
      await query(`UPDATE messages SET sender_archived = TRUE WHERE id = $1`, [req.params.id]);
    } else {
      await query(`UPDATE messages SET recipient_archived = TRUE WHERE id = $1`, [req.params.id]);
    }

    return res.status(200).json({ message: 'Email archived' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/emails/:id/unarchive
// Returns archived email back to inbox
// ---------------------------------------------------------------------------
async function unarchiveEmail(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const message = await findAuthorizedMessage(req.params.id, userEmail);
    if (!message) return res.status(404).json({ error: 'Email not found' });

    const isSender = message.sender && message.sender.toLowerCase() === userEmail;
    if (isSender) {
      await query(`UPDATE messages SET sender_archived = FALSE WHERE id = $1`, [req.params.id]);
    } else {
      await query(`UPDATE messages SET recipient_archived = FALSE WHERE id = $1`, [req.params.id]);
    }

    return res.status(200).json({ message: 'Email moved to inbox' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/emails/:id/spam
// Moves email to spam folder
// ---------------------------------------------------------------------------
async function reportSpam(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const message = await findAuthorizedMessage(req.params.id, userEmail);
    if (!message) return res.status(404).json({ error: 'Email not found' });

    await query(`UPDATE messages SET recipient_spam = TRUE WHERE id = $1`, [req.params.id]);
    return res.status(200).json({ message: 'Reported as spam' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/emails/:id/unspam
// Removes from spam folder back to inbox
// ---------------------------------------------------------------------------
async function unmarkSpam(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const message = await findAuthorizedMessage(req.params.id, userEmail);
    if (!message) return res.status(404).json({ error: 'Email not found' });

    await query(`UPDATE messages SET recipient_spam = FALSE WHERE id = $1`, [req.params.id]);
    return res.status(200).json({ message: 'Removed from spam' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/emails/:id/snooze
// Snoozes email until timestamp
// ---------------------------------------------------------------------------
async function snoozeEmail(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const { until } = req.body;
    const message = await findAuthorizedMessage(req.params.id, userEmail);
    if (!message) return res.status(404).json({ error: 'Email not found' });

    await query(`UPDATE messages SET snoozed_until = $1 WHERE id = $2`, [until, req.params.id]);
    return res.status(200).json({ message: 'Email snoozed' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/emails/bulk
// Handles batch operations on array of email IDs
// ---------------------------------------------------------------------------
async function handleBulkAction(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const { ids, action, value } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No email IDs specified' });
    }

    switch (action) {
      case 'read':
        await query(`UPDATE messages SET status = 'read' WHERE id = ANY($1::uuid[])`, [ids]);
        break;
      case 'unread':
        await query(`UPDATE messages SET status = 'unread' WHERE id = ANY($1::uuid[])`, [ids]);
        break;
      case 'star':
        await query(
          `UPDATE messages
           SET recipient_starred = CASE WHEN LOWER(recipient::text) LIKE '%' || $2 || '%' THEN TRUE ELSE recipient_starred END,
               sender_starred    = CASE WHEN LOWER(sender) = $2 THEN TRUE ELSE sender_starred END
           WHERE id = ANY($1::uuid[])`,
          [ids, userEmail]
        );
        break;
      case 'unstar':
        await query(
          `UPDATE messages
           SET recipient_starred = CASE WHEN LOWER(recipient::text) LIKE '%' || $2 || '%' THEN FALSE ELSE recipient_starred END,
               sender_starred    = CASE WHEN LOWER(sender) = $2 THEN FALSE ELSE sender_starred END
           WHERE id = ANY($1::uuid[])`,
          [ids, userEmail]
        );
        break;
      case 'archive':
        await query(
          `UPDATE messages
           SET recipient_archived = CASE WHEN LOWER(recipient::text) LIKE '%' || $2 || '%' THEN TRUE ELSE recipient_archived END,
               sender_archived    = CASE WHEN LOWER(sender) = $2 THEN TRUE ELSE sender_archived END
           WHERE id = ANY($1::uuid[])`,
          [ids, userEmail]
        );
        break;
      case 'unarchive':
        await query(
          `UPDATE messages
           SET recipient_archived = CASE WHEN LOWER(recipient::text) LIKE '%' || $2 || '%' THEN FALSE ELSE recipient_archived END,
               sender_archived    = CASE WHEN LOWER(sender) = $2 THEN FALSE ELSE sender_archived END
           WHERE id = ANY($1::uuid[])`,
          [ids, userEmail]
        );
        break;
      case 'spam':
        await query(
          `UPDATE messages
           SET recipient_spam = TRUE
           WHERE id = ANY($1::uuid[]) AND LOWER(recipient::text) LIKE '%' || $2 || '%'`,
          [ids, userEmail]
        );
        break;
      case 'unspam':
        await query(
          `UPDATE messages
           SET recipient_spam = FALSE
           WHERE id = ANY($1::uuid[]) AND LOWER(recipient::text) LIKE '%' || $2 || '%'`,
          [ids, userEmail]
        );
        break;
      case 'trash':
        await query(
          `UPDATE messages
           SET recipient_trash = CASE WHEN LOWER(recipient::text) LIKE '%' || $2 || '%' THEN TRUE ELSE recipient_trash END,
               sender_trash    = CASE WHEN LOWER(sender) = $2 THEN TRUE ELSE sender_trash END
           WHERE id = ANY($1::uuid[])`,
          [ids, userEmail]
        );
        break;
      case 'restore':
        await query(
          `UPDATE messages
           SET recipient_trash = CASE WHEN LOWER(recipient::text) LIKE '%' || $2 || '%' THEN FALSE ELSE recipient_trash END,
               sender_trash    = CASE WHEN LOWER(sender) = $2 THEN FALSE ELSE sender_trash END
           WHERE id = ANY($1::uuid[])`,
          [ids, userEmail]
        );
        break;
      case 'delete_permanent':
        await query(
          `UPDATE messages
           SET recipient_deleted = CASE WHEN LOWER(recipient::text) LIKE '%' || $2 || '%' THEN TRUE ELSE recipient_deleted END,
               sender_deleted    = CASE WHEN LOWER(sender) = $2 THEN TRUE ELSE sender_deleted END
           WHERE id = ANY($1::uuid[])`,
          [ids, userEmail]
        );
        break;
      case 'add_label':
        if (value) {
          await query(
            `UPDATE messages
             SET labels = array_append(array_remove(labels, $2), $2)
             WHERE id = ANY($1::uuid[])`,
            [ids, value]
          );
        }
        break;
      case 'remove_label':
        if (value) {
          await query(
            `UPDATE messages
             SET labels = array_remove(labels, $2)
             WHERE id = ANY($1::uuid[])`,
            [ids, value]
          );
        }
        break;
      case 'category':
        if (value) {
          await query(
            `UPDATE messages
             SET category = $2
             WHERE id = ANY($1::uuid[])`,
            [ids, value]
          );
        }
        break;
      default:
        return res.status(400).json({ error: `Unknown bulk action: ${action}` });
    }

    return res.status(200).json({ message: `Bulk action '${action}' applied successfully` });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/emails/:id
// Soft deletes message to Trash
// ---------------------------------------------------------------------------
async function deleteEmail(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const message = await findAuthorizedMessage(req.params.id, userEmail);

    if (!message) {
      return res.status(404).json({ error: 'Email not found or access denied' });
    }

    const isRecipient = message.recipient && message.recipient.toLowerCase().includes(userEmail);
    const isSender = message.sender && message.sender.toLowerCase() === userEmail;
    const requestedFolder = (req.query.folder || req.body.folder || '').toLowerCase();

    if (requestedFolder === 'sent' && isSender) {
      await query(`UPDATE messages SET sender_trash = TRUE WHERE id = $1`, [req.params.id]);
    } else if (requestedFolder === 'inbox' && isRecipient) {
      await query(`UPDATE messages SET recipient_trash = TRUE WHERE id = $1`, [req.params.id]);
    } else {
      if (isRecipient) {
        await query(`UPDATE messages SET recipient_trash = TRUE WHERE id = $1`, [req.params.id]);
      }
      if (isSender) {
        await query(`UPDATE messages SET sender_trash = TRUE WHERE id = $1`, [req.params.id]);
      }
    }

    return res.status(200).json({ message: 'Email moved to trash' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/emails/:id/restore
// Restores an email from Trash
// ---------------------------------------------------------------------------
async function restoreEmail(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const message = await findAuthorizedMessage(req.params.id, userEmail);

    if (!message) {
      return res.status(404).json({ error: 'Email not found or access denied' });
    }

    const isRecipient = message.recipient && message.recipient.toLowerCase().includes(userEmail);
    const isSender = message.sender && message.sender.toLowerCase() === userEmail;

    if (isRecipient && message.recipient_trash) {
      await query(`UPDATE messages SET recipient_trash = FALSE WHERE id = $1`, [req.params.id]);
    }
    if (isSender && message.sender_trash) {
      await query(`UPDATE messages SET sender_trash = FALSE WHERE id = $1`, [req.params.id]);
    }

    return res.status(200).json({ message: 'Email restored successfully' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/emails/:id/permanent
// ---------------------------------------------------------------------------
async function deleteEmailPermanently(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();
    const message = await findAuthorizedMessage(req.params.id, userEmail);

    if (!message) {
      return res.status(404).json({ error: 'Email not found or access denied' });
    }

    const isRecipient = message.recipient && message.recipient.toLowerCase().includes(userEmail);
    const isSender = message.sender && message.sender.toLowerCase() === userEmail;

    if (isRecipient) {
      await query(`UPDATE messages SET recipient_deleted = TRUE WHERE id = $1`, [req.params.id]);
    }
    if (isSender) {
      await query(`UPDATE messages SET sender_deleted = TRUE WHERE id = $1`, [req.params.id]);
    }

    return res.status(200).json({ message: 'Email permanently deleted' });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/emails/trash/empty
// ---------------------------------------------------------------------------
async function emptyTrash(req, res, next) {
  try {
    const userEmail = req.user.email.toLowerCase();

    await query(
      `UPDATE messages
       SET recipient_deleted = TRUE
       WHERE LOWER(recipient::text) LIKE '%' || $1 || '%'
         AND recipient_trash = TRUE`,
      [userEmail]
    );

    await query(
      `UPDATE messages
       SET sender_deleted = TRUE
       WHERE LOWER(sender) = $1
         AND sender_trash = TRUE`,
      [userEmail]
    );

    return res.status(200).json({ message: 'Trash emptied successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
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
};
