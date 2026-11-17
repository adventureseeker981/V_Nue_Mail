// src/components/AdvancedSearchModal.jsx — Gmail-style Advanced Search Popover for Encrypto
import React, { useState, useRef, useEffect } from 'react';
import { Search, RotateCcw, X } from 'lucide-react';

export default function AdvancedSearchModal({ isOpen, onClose, onSearch, initialParams = {} }) {
  const [from, setFrom] = useState(initialParams.from || '');
  const [to, setTo] = useState(initialParams.to || '');
  const [subject, setSubject] = useState(initialParams.subject || '');
  const [hasWords, setHasWords] = useState(initialParams.q || '');
  const [doesntHave, setDoesntHave] = useState(initialParams.doesntHave || '');
  const [folder, setFolder] = useState(initialParams.folder || 'all');
  const [hasAttachment, setHasAttachment] = useState(Boolean(initialParams.hasAttachment));

  const modalRef = useRef(null);

  // Close when pressing Escape or clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleReset = () => {
    setFrom('');
    setTo('');
    setSubject('');
    setHasWords('');
    setDoesntHave('');
    setFolder('all');
    setHasAttachment(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({
      from: from.trim(),
      to: to.trim(),
      subject: subject.trim(),
      q: hasWords.trim(),
      doesntHave: doesntHave.trim(),
      folder,
      hasAttachment,
    });
    onClose();
  };

  return (
    <div className="advanced-search-dropdown" ref={modalRef}>
      <div className="advanced-search-header">
        <span className="advanced-search-title">Advanced Search</span>
        <button
          type="button"
          className="advanced-search-close-btn"
          onClick={onClose}
          title="Close search filter"
        >
          <X size={16} strokeWidth={1.8} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="advanced-search-form">
        <div className="search-field-row">
          <label>From</label>
          <input
            type="text"
            placeholder="e.g. alice@encrypto.local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className="search-field-row">
          <label>To</label>
          <input
            type="text"
            placeholder="e.g. bob@encrypto.local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="search-field-row">
          <label>Subject</label>
          <input
            type="text"
            placeholder="Subject contains..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="search-field-row">
          <label>Has words</label>
          <input
            type="text"
            placeholder="Words in message body or subject"
            value={hasWords}
            onChange={(e) => setHasWords(e.target.value)}
          />
        </div>

        <div className="search-field-row">
          <label>Doesn't have</label>
          <input
            type="text"
            placeholder="Exclude words"
            value={doesntHave}
            onChange={(e) => setDoesntHave(e.target.value)}
          />
        </div>

        <div className="search-field-row">
          <label>Search in</label>
          <select value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option value="all">All Mail</option>
            <option value="inbox">Inbox</option>
            <option value="sent">Sent</option>
            <option value="drafts">Drafts</option>
            <option value="important">Important</option>
            <option value="spam">Spam</option>
            <option value="trash">Trash</option>
          </select>
        </div>

        <div className="search-checkbox-row">
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={hasAttachment}
              onChange={(e) => setHasAttachment(e.target.checked)}
            />
            <span className="checkbox-custom" />
            <span className="checkbox-label">Has attachment</span>
          </label>
        </div>

        <div className="advanced-search-actions">
          <button
            type="button"
            className="btn-search-reset"
            onClick={handleReset}
            title="Clear all fields"
          >
            <RotateCcw size={13} strokeWidth={1.8} />
            <span>Reset</span>
          </button>

          <button type="submit" className="btn-search-submit">
            <Search size={14} strokeWidth={2} />
            <span>Search</span>
          </button>
        </div>
      </form>
    </div>
  );
}
