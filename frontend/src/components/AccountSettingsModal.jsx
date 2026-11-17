// src/components/AccountSettingsModal.jsx - Manage Encrypto Account Modal
import React, { useEffect, useRef } from 'react';
import { X, User, Mail, Shield, Key, Calendar, Server, Database } from 'lucide-react';

export default function AccountSettingsModal({ isOpen, onClose, user }) {
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

  const displayName = user?.display_name || user?.name || 'Encrypto User';
  const email = user?.email || 'user@encrypto.local';
  const userId = user?.id || 'UUID Not Available';
  const initial = displayName.charAt(0).toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active';

  return (
    <div className="account-modal-overlay">
      <div className="account-modal-card" ref={modalRef} role="dialog" aria-modal="true">
        {/* Modal Header */}
        <div className="account-modal-header">
          <div className="account-modal-title-group">
            <Shield size={20} className="detail-icon-blue" strokeWidth={1.8} />
            <h2>Manage Encrypto Account</h2>
          </div>
          <button className="profile-close-btn" onClick={onClose} title="Close settings" aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="account-modal-body">
          {/* User Profile Card */}
          <div className="account-info-box">
            <div className="account-avatar-large">
              {initial}
            </div>
            <div className="account-text-details">
              <h3>{displayName}</h3>
              <p className="account-email-sub">{email}</p>
              <span className="account-active-badge">● Active Account</span>
            </div>
          </div>

          {/* Account Details Grid */}
          <div className="account-details-grid">
            <div className="account-field-card">
              <div className="account-field-icon">
                <User size={16} strokeWidth={1.8} />
              </div>
              <div className="account-field-info">
                <span className="account-field-title">Display Name</span>
                <span className="account-field-val">{displayName}</span>
              </div>
            </div>

            <div className="account-field-card">
              <div className="account-field-icon">
                <Mail size={16} strokeWidth={1.8} />
              </div>
              <div className="account-field-info">
                <span className="account-field-title">Primary Email</span>
                <span className="account-field-val">{email}</span>
              </div>
            </div>

            <div className="account-field-card">
              <div className="account-field-icon">
                <Calendar size={16} strokeWidth={1.8} />
              </div>
              <div className="account-field-info">
                <span className="account-field-title">Account Created</span>
                <span className="account-field-val">{memberSince}</span>
              </div>
            </div>

            <div className="account-field-card">
              <div className="account-field-icon">
                <Key size={16} strokeWidth={1.8} />
              </div>
              <div className="account-field-info">
                <span className="account-field-title">Password Security</span>
                <span className="account-field-val">Salted bcrypt (10 rounds)</span>
              </div>
            </div>

            <div className="account-field-card full-width">
              <div className="account-field-icon">
                <Database size={16} strokeWidth={1.8} />
              </div>
              <div className="account-field-info">
                <span className="account-field-title">User Account Identifier (UUID)</span>
                <span className="account-field-val mono">{userId}</span>
              </div>
            </div>

            <div className="account-field-card full-width">
              <div className="account-field-icon">
                <Server size={16} strokeWidth={1.8} />
              </div>
              <div className="account-field-info">
                <span className="account-field-title">Mail Engine Integration</span>
                <span className="account-field-val">Tokio Async Rust SMTP (Port 2525) & Express REST Gateway</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="account-modal-footer">
          <button className="btn-primary" onClick={onClose} style={{ width: 'auto', padding: '9px 24px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
