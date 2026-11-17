// src/components/HelpModal.jsx — Help, Shortcuts & Security Overview Modal for Encrypto
import React, { useEffect, useRef } from 'react';
import { X, HelpCircle, ShieldCheck, Keyboard, Lock } from 'lucide-react';

const SHORTCUTS = [
  { key: 'C', action: 'Compose new email' },
  { key: 'E', action: 'Archive selected' },
  { key: '#', action: 'Move to Trash' },
  { key: '/', action: 'Focus search bar' },
  { key: 'R', action: 'Reply to open email' },
  { key: 'F', action: 'Forward open email' },
  { key: 'Esc', action: 'Deselect / close modal' },
  { key: '?', action: 'Open this help dialog' },
];

export default function HelpModal({ isOpen, onClose }) {
  const modalRef = useRef(null);

  // Close on Escape or click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
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

  return (
    <div className="account-modal-overlay">
      <div className="account-modal-card" ref={modalRef} role="dialog" aria-modal="true" style={{ maxWidth: '560px' }}>
        {/* Header */}
        <div className="account-modal-header">
          <div className="account-modal-header-left">
            <HelpCircle size={20} className="account-modal-icon" color="#299EFF" />
            <h3>Help & Keyboard Shortcuts</h3>
          </div>
          <button
            type="button"
            className="account-modal-close"
            onClick={onClose}
            title="Close Help"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="account-modal-body" style={{ gap: '22px' }}>
          {/* Shortcuts section */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Keyboard size={16} strokeWidth={2} color="#299EFF" />
              <span>Keyboard Shortcuts</span>
            </div>
            <div className="shortcuts-grid">
              {SHORTCUTS.map((s) => (
                <div key={s.key} className="shortcut-card">
                  <span className="shortcut-action">{s.action}</span>
                  <kbd className="shortcut-key">{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Security & Encryption section */}
          <div className="settings-section">
            <div className="settings-section-title">
              <Lock size={16} strokeWidth={2} color="#00E676" />
              <span>Security & Encryption Details</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="security-info-card">
                <ShieldCheck size={18} color="#00E676" style={{ marginTop: '1px', flexShrink: 0 }} />
                <span>
                  <strong>High-Performance Rust SMTP Bridge:</strong> Outgoing mail is relayed via our Rust server (port 8080) ensuring strict protocol compliance.
                </span>
              </div>
              <div className="security-info-card">
                <ShieldCheck size={18} color="#00E676" style={{ marginTop: '1px', flexShrink: 0 }} />
                <span>
                  <strong>Zero Cross-Account Leakage:</strong> All soft deletes, starred flags, categories, and custom tags are isolated per-mailbox in PostgreSQL.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="account-modal-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
