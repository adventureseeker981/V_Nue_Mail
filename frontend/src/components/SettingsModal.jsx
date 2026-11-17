// src/components/SettingsModal.jsx — Gmail-style Settings & Preferences Modal for Encrypto
import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Sliders, Palette, FileText, Keyboard } from 'lucide-react';
import { fetchSettings, updateSettings } from '../services/api';

export default function SettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  const [density, setDensity] = useState('comfortable');
  const [theme, setTheme] = useState('dark');
  const [signature, setSignature] = useState('');
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await fetchSettings();
        if (res) {
          if (res.density) setDensity(res.density);
          if (res.theme) setTheme(res.theme);
          if (res.signature !== undefined) setSignature(res.signature || '');
          if (res.keyboard_shortcuts !== undefined) setKeyboardShortcuts(Boolean(res.keyboard_shortcuts));
        }
      } catch (err) {
        setError(err.message || 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const updated = await updateSettings({
        density,
        theme,
        signature,
        keyboard_shortcuts: keyboardShortcuts,
      });

      setSaveSuccess(true);
      if (onSettingsUpdated) onSettingsUpdated(updated);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      setError(err.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account-modal-overlay">
      <div className="account-modal-card" ref={modalRef} role="dialog" aria-modal="true" style={{ maxWidth: '580px' }}>
        {/* Header */}
        <div className="account-modal-header">
          <div className="account-modal-header-left">
            <Sliders size={20} className="account-modal-icon" color="#299EFF" />
            <h3>Settings & Preferences</h3>
          </div>
          <button
            type="button"
            className="account-modal-close"
            onClick={onClose}
            title="Close Settings"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave}>
          <div className="account-modal-body" style={{ gap: '22px' }}>
            {error && <div className="error-banner">{error}</div>}
            {saveSuccess && (
              <div className="success-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} strokeWidth={2.5} />
                <span>Preferences saved successfully!</span>
              </div>
            )}

            {/* Display Density */}
            <div className="settings-section">
              <div className="settings-section-title">
                <Sliders size={16} strokeWidth={2} color="#299EFF" />
                <span>Display Density</span>
              </div>
              <div className="density-picker-grid">
                {[
                  { id: 'comfortable', label: 'Comfortable', desc: 'Standard Gmail spacing with badges' },
                  { id: 'cozy', label: 'Cozy', desc: 'Balanced view with compact padding' },
                  { id: 'compact', label: 'Compact', desc: 'Dense rows for high-volume inboxes' },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`density-card ${density === item.id ? 'active' : ''}`}
                    onClick={() => setDensity(item.id)}
                  >
                    <div className="density-card-radio">
                      {density === item.id && <div className="density-radio-inner" />}
                    </div>
                    <div className="density-card-text">
                      <span className="density-card-title">{item.label}</span>
                      <span className="density-card-desc">{item.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div className="settings-section">
              <div className="settings-section-title">
                <Palette size={16} strokeWidth={2} color="#299EFF" />
                <span>Theme</span>
              </div>
              <div className="theme-picker-row">
                {[
                  { id: 'dark', label: 'Dark Navy (Default)', color: '#299EFF' },
                  { id: 'midnight', label: 'Midnight Obsidian', color: '#6554F0' },
                  { id: 'high-contrast', label: 'High Contrast', color: '#00E676' },
                ].map((th) => (
                  <button
                    type="button"
                    key={th.id}
                    className={`theme-pill ${theme === th.id ? 'active' : ''}`}
                    onClick={() => setTheme(th.id)}
                  >
                    <span className="theme-color-preview" style={{ backgroundColor: th.color }} />
                    <span>{th.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Email Signature */}
            <div className="settings-section">
              <div className="settings-section-title">
                <FileText size={16} strokeWidth={2} color="#299EFF" />
                <span>Outgoing Email Signature</span>
              </div>
              <textarea
                className="settings-signature-textarea"
                rows={3}
                placeholder="Automatically append to outgoing emails (e.g. Best regards, Yash Malik)"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
            </div>

            {/* Keyboard Shortcuts */}
            <div className="settings-section">
              <div className="settings-section-title">
                <Keyboard size={16} strokeWidth={2} color="#299EFF" />
                <span>Keyboard Shortcuts</span>
              </div>
              <label className="checkbox-container" style={{ marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={keyboardShortcuts}
                  onChange={(e) => setKeyboardShortcuts(e.target.checked)}
                />
                <span className="checkbox-custom" />
                <span className="checkbox-label" style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                  Enable shortcuts: <strong>C</strong> (Compose), <strong>E</strong> (Archive), <strong>#</strong> (Delete), <strong>/</strong> (Search)
                </span>
              </label>
            </div>
          </div>

          <div className="account-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
