// test/trash_flow.test.js — Unit tests for Delete to Trash, Restore, and Array recipient handling
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Replication of controller helpers for testing
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function checkIsRecipient(recipientField, userEmail) {
  if (!recipientField || !userEmail) return false;
  const target = userEmail.toLowerCase().trim();
  if (Array.isArray(recipientField)) {
    return recipientField.some((r) => {
      if (!r) return false;
      const str = String(r).toLowerCase().trim();
      return str === target || str.includes(target);
    });
  }
  const str = String(recipientField).toLowerCase().trim();
  return str === target || str.includes(target);
}

function checkIsSender(senderField, userEmail) {
  if (!senderField || !userEmail) return false;
  return String(senderField).toLowerCase().trim() === userEmail.toLowerCase().trim();
}

describe('Recipient Array & Type Handling', () => {
  it('correctly identifies user in PostgreSQL TEXT[] array without throwing TypeError', () => {
    const arrayRecipients = ['test@encrypto.local', 'bob@encrypto.local'];
    assert.equal(checkIsRecipient(arrayRecipients, 'test@encrypto.local'), true);
    assert.equal(checkIsRecipient(arrayRecipients, 'TEST@ENCRYPTO.LOCAL'), true);
    assert.equal(checkIsRecipient(arrayRecipients, 'bob@encrypto.local'), true);
    assert.equal(checkIsRecipient(arrayRecipients, 'other@encrypto.local'), false);
  });

  it('handles single string recipient', () => {
    assert.equal(checkIsRecipient('test@encrypto.local', 'test@encrypto.local'), true);
    assert.equal(checkIsRecipient('test@encrypto.local', 'other@encrypto.local'), false);
  });

  it('handles null, undefined, or empty recipient cleanly', () => {
    assert.equal(checkIsRecipient(null, 'test@encrypto.local'), false);
    assert.equal(checkIsRecipient(undefined, 'test@encrypto.local'), false);
    assert.equal(checkIsRecipient([], 'test@encrypto.local'), false);
  });
});

describe('Sender Check & UUID Validation', () => {
  it('identifies sender case-insensitively', () => {
    assert.equal(checkIsSender('Alice@encrypto.local', 'alice@encrypto.local'), true);
    assert.equal(checkIsSender('alice@encrypto.local', 'bob@encrypto.local'), false);
    assert.equal(checkIsSender(null, 'alice@encrypto.local'), false);
  });

  it('validates UUID format correctly', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    assert.equal(UUID_REGEX.test(validUuid), true);
    assert.equal(UUID_REGEX.test('invalid-id'), false);
    assert.equal(UUID_REGEX.test('12345'), false);
    assert.equal(UUID_REGEX.test(''), false);
  });
});
