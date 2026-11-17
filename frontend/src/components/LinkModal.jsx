// src/components/LinkModal.jsx — Gmail-style Insert Link Dialog
import React, { useState, useEffect } from 'react';
import { X, Link2 } from 'lucide-react';

export default function LinkModal({ isOpen, onClose, onInsert, initialText = '' }) {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setText(initialText || '');
      setUrl('');
      setError('');
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please provide a URL address');
      return;
    }

    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('mailto:')) {
      finalUrl = 'https://' + finalUrl;
    }

    onInsert({
      text: text.trim() || finalUrl,
      url: finalUrl,
    });
    onClose();
  };

  return (
    <div className="account-modal-overlay link-modal-overlay">
      <div className="account-modal-card" style={{ maxWidth: '440px' }}>
        <div className="account-modal-header">
          <div className="account-modal-header-left">
            <Link2 size={18} color="#299EFF" />
            <h3>Insert Link</h3>
          </div>
          <button className="account-modal-close" onClick={onClose} title="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="account-modal-body" style={{ gap: '14px' }}>
            {error && <div className="error-banner">{error}</div>}

            <div className="modal-input-field">
              <label>Text to display</label>
              <input
                type="text"
                placeholder="Link text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
            </div>

            <div className="modal-input-field">
              <label>To what URL should this link go?</label>
              <input
                type="text"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
          </div>

          <div className="account-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
