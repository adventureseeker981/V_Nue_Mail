// src/components/EmailItem.jsx — Gmail-grade Interactive Email Row for Encrypto
import React from 'react';
import {
  Star,
  Bookmark,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  Clock,
  Paperclip,
  RotateCcw,
} from 'lucide-react';

export default function EmailItem({
  email,
  isSentFolder,
  folder = 'inbox',
  isSelected = false,
  onSelect,
  onToggleSelect,
  onToggleStar,
  onToggleImportant,
  onArchive,
  onDelete,
  onRestore,
  onToggleRead,
  onSnooze,
}) {
  const isUnread = email.status === 'unread';
  const isStarred = Boolean(email.is_starred);
  const isImportant = Boolean(email.is_important);
  const hasAttachments = Boolean(
    email.attachments &&
      (Array.isArray(email.attachments) ? email.attachments.length > 0 : email.attachments !== '[]')
  );

  // Format date nicely (time if today, month+day if within year, full date otherwise)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const isThisYear = date.getFullYear() === now.getFullYear();
    if (isThisYear) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Preview snippet
  const snippet = email.body ? email.body.slice(0, 90).replace(/\s+/g, ' ') : '(No content)';

  // Determine sender vs recipient label
  const showAsSent = isSentFolder || folder === 'drafts' || (folder === 'trash' && email.original_folder === 'sent');
  const contactLabel = showAsSent
    ? `To: ${Array.isArray(email.recipient) ? email.recipient.join(', ') : email.recipient || '(No recipient)'}`
    : email.sender;

  return (
    <div
      className={`email-row ${isUnread ? 'unread' : 'read'} ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(email)}
    >
      {/* 1. Selection Checkbox */}
      <div
        className="email-row-cell email-checkbox-cell"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="checkbox-container">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggleSelect(email.id, e)}
          />
          <span className="checkbox-custom" />
        </label>
      </div>

      {/* 2. Star Icon */}
      <div
        className="email-row-cell email-star-cell"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar(email.id);
        }}
        title={isStarred ? 'Starred' : 'Not starred'}
      >
        <Star
          size={17}
          strokeWidth={1.8}
          className={`email-star-icon ${isStarred ? 'starred' : ''}`}
          fill={isStarred ? '#F4B400' : 'none'}
          color={isStarred ? '#F4B400' : 'var(--text-muted)'}
        />
      </div>

      {/* 3. Important Flag Marker */}
      <div
        className="email-row-cell email-important-cell"
        onClick={(e) => {
          e.stopPropagation();
          onToggleImportant(email.id);
        }}
        title={isImportant ? 'Important' : 'Mark as important'}
      >
        <Bookmark
          size={16}
          strokeWidth={1.8}
          className={`email-important-icon ${isImportant ? 'important' : ''}`}
          fill={isImportant ? '#FFB300' : 'none'}
          color={isImportant ? '#FFB300' : 'var(--text-muted)'}
        />
      </div>

      {/* 4. Sender / Recipient */}
      <div className="email-row-cell email-sender-cell">
        <span className={`email-sender-text ${isUnread ? 'bold' : ''}`}>
          {contactLabel}
        </span>
      </div>

      {/* 5. Subject & Preview Snippet */}
      <div className="email-row-cell email-content-cell">
        <span className={`email-subject-text ${isUnread ? 'bold' : ''}`}>
          {email.subject || '(No Subject)'}
        </span>
        <span className="email-snippet-separator"> — </span>
        <span className="email-snippet-text">{snippet}</span>

        {/* Labels badges if present */}
        {email.labels && email.labels.length > 0 && (
          <div className="email-row-labels">
            {email.labels.map((lbl, idx) => (
              <span key={idx} className="email-row-label-pill">
                {lbl}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 6. Date or Hover Quick Actions */}
      <div className="email-row-cell email-trailing-cell">
        {hasAttachments && (
          <Paperclip
            size={13}
            className="row-attachment-icon"
            color="var(--text-muted)"
            style={{ marginRight: '6px', flexShrink: 0 }}
            title="Has attachment"
          />
        )}
        {/* Date string shown by default */}
        <span className="email-date-display">{formatDate(email.created_at)}</span>

        {/* Quick action buttons shown on row hover */}
        <div className="email-quick-actions" onClick={(e) => e.stopPropagation()}>
          {folder !== 'trash' && (
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => onArchive(email.id)}
              title="Archive"
            >
              <Archive size={15} strokeWidth={1.8} />
            </button>
          )}

          {folder === 'trash' && onRestore && (
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => onRestore(email.id)}
              title="Restore to Inbox / Sent"
            >
              <RotateCcw size={15} strokeWidth={1.8} color="#299EFF" />
            </button>
          )}

          <button
            type="button"
            className="quick-action-btn danger-hover"
            onClick={() => onDelete(email.id)}
            title={folder === 'trash' ? 'Delete permanently' : 'Delete / Trash'}
          >
            <Trash2 size={15} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            className="quick-action-btn"
            onClick={() => onToggleRead(email.id, isUnread)}
            title={isUnread ? 'Mark as read' : 'Mark as unread'}
          >
            {isUnread ? (
              <MailOpen size={15} strokeWidth={1.8} />
            ) : (
              <Mail size={15} strokeWidth={1.8} />
            )}
          </button>

          {folder !== 'trash' && (
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => onSnooze(email.id)}
              title="Snooze"
            >
              <Clock size={15} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
