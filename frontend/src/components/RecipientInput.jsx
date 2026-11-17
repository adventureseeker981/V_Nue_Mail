// src/components/RecipientInput.jsx — Gmail-Grade Recipient Chips Input for Encrypto
import React, { useState, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';

// Email validation helper (supports standard internet emails and local .local domains)
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Support both standard RFC email format and internal private domains like user@encrypto.local
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(trimmed);
}

export default function RecipientInput({
  recipients = [],
  onChange,
  placeholder = 'Add recipient...',
  disabled = false,
  autoFocus = false,
  id,
}) {
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState('');
  const inputRef = useRef(null);

  // Add a single or multiple email addresses
  const addEmail = (rawText) => {
    if (!rawText || !rawText.trim()) return;

    // Split on commas, semicolons, or whitespace if multiple pasted
    const parts = rawText
      .split(/[,;\s]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const newValidEmails = [];
    let hasInvalid = false;

    parts.forEach((part) => {
      const clean = part.toLowerCase();
      if (isValidEmail(clean)) {
        // Prevent duplicate recipients
        if (!recipients.includes(clean) && !newValidEmails.includes(clean)) {
          newValidEmails.push(clean);
        }
      } else {
        hasInvalid = true;
      }
    });

    if (newValidEmails.length > 0) {
      onChange([...recipients, ...newValidEmails]);
      setInputValue('');
      setValidationError('');
    }

    if (hasInvalid) {
      setValidationError('Please enter a valid email address (e.g. user@encrypto.local)');
    } else {
      setValidationError('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (inputValue.trim()) {
        e.preventDefault();
        addEmail(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
      // Remove last chip when pressing backspace on empty input
      e.preventDefault();
      const updated = [...recipients];
      updated.pop();
      onChange(updated);
      setValidationError('');
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addEmail(inputValue);
    } else {
      setValidationError('');
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      addEmail(pastedText);
    }
  };

  const removeEmail = (indexToRemove, e) => {
    if (e) e.stopPropagation();
    onChange(recipients.filter((_, idx) => idx !== indexToRemove));
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div
      className={`recipient-input-container ${validationError ? 'has-error' : ''}`}
      onClick={() => inputRef.current && inputRef.current.focus()}
    >
      <div className="recipient-chips-list">
        {recipients.map((email, idx) => (
          <div key={`${email}-${idx}`} className="recipient-chip">
            <span className="recipient-chip-text" title={email}>
              {email}
            </span>
            <button
              type="button"
              className="recipient-chip-remove"
              onClick={(e) => removeEmail(idx, e)}
              disabled={disabled}
              title={`Remove ${email}`}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        ))}

        <input
          ref={inputRef}
          id={id}
          type="text"
          className="recipient-text-input"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (validationError) setValidationError('');
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={recipients.length === 0 ? placeholder : ''}
          disabled={disabled}
          autoFocus={autoFocus}
        />
      </div>

      {validationError && (
        <div className="recipient-validation-error">
          <AlertCircle size={13} strokeWidth={2} />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
