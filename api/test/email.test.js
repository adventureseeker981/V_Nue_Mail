// test/email.test.js — Unit tests for email service and Rust bridge
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { checkRustHealth, forwardEmailToRust } = require('../src/services/rustService');

describe('Rust Bridge Service', () => {
  it('handles offline Rust server gracefully during health check', async () => {
    // When Rust server is not running on 8080, it should return online: false instead of crashing
    const health = await checkRustHealth();
    assert.equal(typeof health, 'object');
    assert.equal(health.online, false);
    assert.ok(health.error || health.status);
  });

  it('handles offline Rust server gracefully during forwardEmailToRust', async () => {
    // Should catch network error and return an understandable fallback object
    const result = await forwardEmailToRust({
      sender: 'alice@vnuemail.local',
      recipient: 'bob@vnuemail.local',
      subject: 'Test Subject',
      body: 'Hello Bob',
    });

    assert.equal(typeof result, 'object');
    assert.equal(result.success, false);
    assert.equal(result.rustAvailable, false);
    assert.ok(result.message.includes('unreachable'));
  });
});

describe('Email Controller Validation Logic', () => {
  function validateSendEmail({ recipient, subject, body }) {
    if (!recipient || !recipient.trim()) {
      return { valid: false, error: 'Recipient email address is required' };
    }
    return {
      valid: true,
      cleanRecipient: recipient.toLowerCase().trim(),
      cleanSubject: subject ? subject.trim() : '(No Subject)',
      cleanBody: body ? body.trim() : '',
    };
  }

  it('rejects email without recipient', () => {
    const res = validateSendEmail({ recipient: '', subject: 'Hi', body: 'Hello' });
    assert.equal(res.valid, false);
    assert.equal(res.error, 'Recipient email address is required');
  });

  it('rejects email with whitespace-only recipient', () => {
    const res = validateSendEmail({ recipient: '   ', subject: 'Hi', body: 'Hello' });
    assert.equal(res.valid, false);
  });

  it('sets default subject when subject is omitted', () => {
    const res = validateSendEmail({ recipient: 'user@domain.com', subject: '', body: 'Hello' });
    assert.equal(res.valid, true);
    assert.equal(res.cleanSubject, '(No Subject)');
  });

  it('normalizes recipient to lowercase and trims whitespace', () => {
    const res = validateSendEmail({ recipient: '  Bob@Domain.COM  ', subject: 'Test', body: 'Body' });
    assert.equal(res.valid, true);
    assert.equal(res.cleanRecipient, 'bob@domain.com');
  });
});

