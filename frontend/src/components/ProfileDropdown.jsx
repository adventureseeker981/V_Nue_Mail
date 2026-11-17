// src/components/ProfileDropdown.jsx - Gmail-style Profile Dropdown for ENCRYPTO
import React, { useEffect, useRef } from 'react';
import { X, LogOut, Settings, ShieldCheck, Calendar, CheckCircle2 } from 'lucide-react';

export default function ProfileDropdown({ isOpen, onClose, user, onLogout, onOpenSettings }) {
  const dropdownRef = useRef(null);

  // Handle click outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    }

    // Handle Escape key to close the dropdown
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

  // Format initials from user's display name or email
  const displayName = user?.display_name || user?.name || 'Encrypto User';
  const email = user?.email || 'user@encrypto.local';
  const initial = displayName.charAt(0).toUpperCase();

  // Format account creation date
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active Member';

  return (
    <div className="profile-dropdown-container" ref={dropdownRef} role="dialog" aria-modal="true">
      {/* Top Header Section */}
      <div className="profile-dropdown-header">
        <span className="profile-header-email">{email}</span>
        <button
          className="profile-close-btn"
          onClick={onClose}
          title="Close profile menu"
          aria-label="Close"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Main Avatar & User Information */}
      <div className="profile-user-summary">
        <div className="profile-large-avatar">
          {initial}
        </div>
        <h3 className="profile-display-name">{displayName}</h3>
        <p className="profile-email-text">{email}</p>

        {/* Manage Encrypto Account Pill Button */}
        <button
          className="btn-manage-account"
          onClick={() => {
            onClose();
            if (onOpenSettings) onOpenSettings();
          }}
        >
          <Settings size={14} strokeWidth={1.8} />
          <span>Manage Encrypto Account</span>
        </button>
      </div>

      {/* Account Details / Meta Information Section */}
      <div className="profile-details-section">
        <div className="profile-detail-row">
          <div className="profile-detail-label">
            <ShieldCheck size={15} strokeWidth={1.8} className="detail-icon-blue" />
            <span>Account Security</span>
          </div>
          <span className="profile-status-badge">
            <CheckCircle2 size={12} strokeWidth={2} />
            Active & Encrypted
          </span>
        </div>

        <div className="profile-detail-row">
          <div className="profile-detail-label">
            <Calendar size={15} strokeWidth={1.8} className="detail-icon-violet" />
            <span>Member Since</span>
          </div>
          <span className="profile-detail-value">{memberSince}</span>
        </div>
      </div>

      {/* Action Footer: Sign Out */}
      <div className="profile-dropdown-footer">
        <button
          className="btn-signout"
          onClick={() => {
            onClose();
            if (onLogout) onLogout();
          }}
          title="Sign out of your Encrypto account"
        >
          <LogOut size={16} strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </div>

      {/* Subtle branding footer */}
      <div className="profile-privacy-note">
        <span>Encrypto Private Mail • Privacy by Design</span>
      </div>
    </div>
  );
}
