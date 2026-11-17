// test/gmail_features.test.js — Tests for Gmail-Style Features in Encrypto
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('Gmail Feature Suite — Encrypto', () => {
  describe('Bulk Action Validation Logic', () => {
    function validateBulkAction({ ids, action, value }) {
      if (!Array.isArray(ids) || ids.length === 0) {
        return { valid: false, error: 'Array of message IDs is required' };
      }
      const allowedActions = [
        'read',
        'unread',
        'star',
        'unstar',
        'important',
        'unimportant',
        'archive',
        'unarchive',
        'spam',
        'unspam',
        'trash',
        'restore',
        'delete_permanent',
        'add_label',
        'remove_label',
        'category',
      ];
      if (!allowedActions.includes(action)) {
        return { valid: false, error: `Unknown bulk action: ${action}` };
      }
      if ((action === 'add_label' || action === 'remove_label') && (!value || typeof value !== 'string')) {
        return { valid: false, error: 'Label name value is required' };
      }
      if (action === 'category' && !['primary', 'social', 'promotions', 'updates', 'forums'].includes(value)) {
        return { valid: false, error: 'Invalid category value' };
      }
      return { valid: true };
    }

    it('rejects empty IDs array', () => {
      const res = validateBulkAction({ ids: [], action: 'read' });
      assert.equal(res.valid, false);
      assert.equal(res.error, 'Array of message IDs is required');
    });

    it('rejects non-array IDs', () => {
      const res = validateBulkAction({ ids: 'not-an-array', action: 'read' });
      assert.equal(res.valid, false);
    });

    it('rejects unknown bulk action', () => {
      const res = validateBulkAction({ ids: ['uuid-1'], action: 'explode' });
      assert.equal(res.valid, false);
      assert.ok(res.error.includes('Unknown bulk action'));
    });

    it('requires label name for add_label action', () => {
      const res = validateBulkAction({ ids: ['uuid-1'], action: 'add_label', value: '' });
      assert.equal(res.valid, false);
      assert.equal(res.error, 'Label name value is required');
    });

    it('accepts valid category bulk action', () => {
      const res = validateBulkAction({ ids: ['uuid-1'], action: 'category', value: 'social' });
      assert.equal(res.valid, true);
    });

    it('accepts valid archive and trash actions', () => {
      assert.equal(validateBulkAction({ ids: ['uuid-1', 'uuid-2'], action: 'archive' }).valid, true);
      assert.equal(validateBulkAction({ ids: ['uuid-1'], action: 'trash' }).valid, true);
      assert.equal(validateBulkAction({ ids: ['uuid-1'], action: 'star' }).valid, true);
    });
  });

  describe('Draft Autosave Validation Logic', () => {
    function validateDraft({ recipient, subject, body }) {
      // Drafts can be partial (only recipient, or only subject, or only body)
      const cleanRecipient = recipient ? recipient.trim().toLowerCase() : '';
      const cleanSubject = subject ? subject.trim() : 'Draft';
      const cleanBody = body ? body.trim() : '';

      const hasContent = cleanRecipient || cleanSubject !== 'Draft' || cleanBody;
      return {
        valid: true,
        hasContent: Boolean(hasContent),
        draft: {
          recipient: cleanRecipient,
          subject: cleanSubject,
          body: cleanBody,
          is_draft: true,
        },
      };
    }

    it('allows partial draft with only recipient', () => {
      const res = validateDraft({ recipient: 'alice@encrypto.local', subject: '', body: '' });
      assert.equal(res.valid, true);
      assert.equal(res.hasContent, true);
      assert.equal(res.draft.recipient, 'alice@encrypto.local');
      assert.equal(res.draft.is_draft, true);
    });

    it('allows partial draft with only subject and body', () => {
      const res = validateDraft({ recipient: '', subject: 'Quarterly Report', body: 'Here are the numbers...' });
      assert.equal(res.valid, true);
      assert.equal(res.hasContent, true);
      assert.equal(res.draft.subject, 'Quarterly Report');
    });
  });

  describe('User Preferences & Density Validation', () => {
    function sanitizeSettings(input = {}) {
      const allowedDensities = ['comfortable', 'cozy', 'compact'];
      const allowedThemes = ['dark', 'midnight', 'high-contrast'];

      return {
        density: allowedDensities.includes(input.density) ? input.density : 'comfortable',
        theme: allowedThemes.includes(input.theme) ? input.theme : 'dark',
        signature: typeof input.signature === 'string' ? input.signature : '',
        keyboard_shortcuts: typeof input.keyboard_shortcuts === 'boolean' ? input.keyboard_shortcuts : true,
      };
    }

    it('sets default values for empty settings input', () => {
      const s = sanitizeSettings({});
      assert.equal(s.density, 'comfortable');
      assert.equal(s.theme, 'dark');
      assert.equal(s.signature, '');
      assert.equal(s.keyboard_shortcuts, true);
    });

    it('falls back to default if invalid density provided', () => {
      const s = sanitizeSettings({ density: 'super-wide' });
      assert.equal(s.density, 'comfortable');
    });

    it('accepts valid compact density and signature', () => {
      const s = sanitizeSettings({
        density: 'compact',
        theme: 'midnight',
        signature: 'Sent securely from Encrypto',
        keyboard_shortcuts: false,
      });
      assert.equal(s.density, 'compact');
      assert.equal(s.theme, 'midnight');
      assert.equal(s.signature, 'Sent securely from Encrypto');
      assert.equal(s.keyboard_shortcuts, false);
    });
  });

  describe('Gmail Compose & Rich Text Payload Normalization', () => {
    function normalizeComposePayload({
      recipient,
      cc,
      bcc,
      subject,
      body,
      bodyHtml,
      attachments,
      isConfidential,
    }) {
      const cleanRecipient = Array.isArray(recipient)
        ? recipient.map((r) => r.trim().toLowerCase()).filter(Boolean).join(', ')
        : (recipient || '').toLowerCase().trim();

      const cleanCc = Array.isArray(cc)
        ? cc.map((c) => c.trim().toLowerCase()).filter(Boolean).join(', ')
        : (cc || '').toLowerCase().trim();

      const cleanBcc = Array.isArray(bcc)
        ? bcc.map((b) => b.trim().toLowerCase()).filter(Boolean).join(', ')
        : (bcc || '').toLowerCase().trim();

      const cleanSubject = subject ? subject.trim() : '(No Subject)';
      const cleanBody = body ? body.trim() : '';
      const cleanBodyHtml = bodyHtml || '';
      const confidential = Boolean(isConfidential);
      const cleanAttachments = Array.isArray(attachments) ? attachments : [];

      return {
        recipient: cleanRecipient,
        cc: cleanCc,
        bcc: cleanBcc,
        subject: cleanSubject,
        body: cleanBody,
        body_html: cleanBodyHtml,
        attachments: cleanAttachments,
        is_confidential: confidential,
      };
    }

    it('normalizes recipient arrays into comma-separated strings', () => {
      const res = normalizeComposePayload({
        recipient: ['alice@encrypto.local', 'bob@encrypto.local  '],
        subject: 'Hello Team',
        body: 'Meeting at 3',
      });
      assert.equal(res.recipient, 'alice@encrypto.local, bob@encrypto.local');
      assert.equal(res.subject, 'Hello Team');
    });

    it('correctly handles CC and BCC lists', () => {
      const res = normalizeComposePayload({
        recipient: 'alice@encrypto.local',
        cc: ['carol@encrypto.local', 'dave@encrypto.local'],
        bcc: 'eve@encrypto.local',
        subject: 'Project Update',
      });
      assert.equal(res.cc, 'carol@encrypto.local, dave@encrypto.local');
      assert.equal(res.bcc, 'eve@encrypto.local');
    });

    it('preserves rich text HTML and attachments', () => {
      const att = [{ id: 'att-1', filename: 'report.pdf', size: 1024, data: 'data:application/pdf;base64,abc' }];
      const res = normalizeComposePayload({
        recipient: 'alice@encrypto.local',
        subject: 'Report',
        body: 'Please see attached report',
        bodyHtml: '<p>Please see <strong>attached report</strong></p>',
        attachments: att,
        isConfidential: true,
      });
      assert.equal(res.body_html, '<p>Please see <strong>attached report</strong></p>');
      assert.equal(res.attachments.length, 1);
      assert.equal(res.attachments[0].filename, 'report.pdf');
      assert.equal(res.is_confidential, true);
    });
  });
});
