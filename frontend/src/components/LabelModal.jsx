// src/components/LabelModal.jsx — Gmail-style Custom Labels Manager Modal
import React, { useState } from 'react';
import { X, Tag, Plus, Trash2 } from 'lucide-react';
import { createLabel, deleteLabel } from '../services/api';

const LABEL_COLORS = [
  '#299EFF', // Electric Blue
  '#6554F0', // Violet
  '#00E676', // Emerald
  '#FFB300', // Amber
  '#FF5252', // Red
  '#00E5FF', // Cyan
  '#E040FB', // Purple
  '#FF9100', // Orange
  '#90A4AE', // Slate
];

export default function LabelModal({ isOpen, onClose, labels = [], onLabelsUpdated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#299EFF');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a label name');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await createLabel(name.trim(), color);
      setName('');
      setColor('#299EFF');
      if (onLabelsUpdated) onLabelsUpdated();
    } catch (err) {
      setError(err.message || 'Failed to create label');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (labelId) => {
    if (window.confirm('Delete this label? Messages with this label will not be deleted.')) {
      try {
        await deleteLabel(labelId);
        if (onLabelsUpdated) onLabelsUpdated();
      } catch (err) {
        setError(err.message || 'Failed to delete label');
      }
    }
  };

  return (
    <div className="account-modal-overlay">
      <div className="account-modal-card" style={{ maxWidth: '480px' }}>
        <div className="account-modal-header">
          <div className="account-modal-header-left">
            <Tag size={20} className="account-modal-icon" color="#299EFF" />
            <h3>Manage Labels</h3>
          </div>
          <button className="account-modal-close" onClick={onClose} title="Close">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="account-modal-body" style={{ gap: '18px' }}>
          {error && <div className="error-banner">{error}</div>}

          {/* Create new label section */}
          <form onSubmit={handleCreate} className="create-label-form">
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Create New Label
            </span>
            <div className="create-label-inputs" style={{ marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Label name (e.g. Finance, Work, Project)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Color picker */}
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Choose label color:</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                {LABEL_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: color === c ? '2px solid #FFFFFF' : '2px solid transparent',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: color === c ? '0 0 8px ' + c : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving || !name.trim()}
              style={{ marginTop: '12px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} strokeWidth={2} />
              <span>{saving ? 'Creating...' : 'Create Label'}</span>
            </button>
          </form>

          {/* Existing labels */}
          <div className="existing-labels-section" style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Existing Labels ({labels.length})
            </span>

            {labels.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                No custom labels created yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {labels.map((lbl) => (
                  <div
                    key={lbl.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: lbl.color || '#299EFF',
                        }}
                      />
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {lbl.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(lbl.id)}
                      title="Delete label"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger-color)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="account-modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
