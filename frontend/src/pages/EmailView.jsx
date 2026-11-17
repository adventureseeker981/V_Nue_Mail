// src/pages/EmailView.jsx - Gmail-grade Professional Email Reader for ENCRYPTO
import React, { useEffect, useState } from 'react';
import {
  fetchEmailById,
  markEmailAsRead,
  markEmailAsUnread,
  deleteEmail,
  restoreEmail,
  deleteEmailPermanently,
  toggleStar,
  toggleImportant,
  archiveEmail,
  reportSpam,
} from '../services/api';
import {
  ArrowLeft,
  Mail,
  Trash2,
  RotateCcw,
  Star,
  Bookmark,
  Archive,
  AlertOctagon,
  Reply,
  Forward,
  Printer,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Download,
  Paperclip,
  Lock,
  File,
  FileText,
  FileArchive,
  Image,
} from 'lucide-react';

// Helpers for attachments
function getFileIcon(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return Image;
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return FileArchive;
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return FileText;
  return File;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function EmailView({
  emailId,
  folder = 'inbox',
  onBack,
  onEmailUpdated,
  onReply,
  onForward,
  onPrevEmail,
  onNextEmail,
  hasPrev = false,
  hasNext = false,
}) {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isImportant, setIsImportant] = useState(false);

  const isTrashFolder = folder === 'trash';
  const folderName = folder.charAt(0).toUpperCase() + folder.slice(1);

  // Fetch full email by ID on mount
  useEffect(() => {
    async function loadEmail() {
      try {
        setLoading(true);
        const data = await fetchEmailById(emailId);
        setEmail(data);
        setIsStarred(Boolean(data.is_starred));
        setIsImportant(Boolean(data.is_important));

        // If it was unread and not in trash, automatically mark it as read
        if (data.status === 'unread' && !isTrashFolder) {
          await markEmailAsRead(emailId);
          if (onEmailUpdated) onEmailUpdated();
        }
      } catch (err) {
        setError(err.message || 'Failed to load email');
      } finally {
        setLoading(false);
      }
    }

    if (emailId) {
      loadEmail();
    }
  }, [emailId, isTrashFolder]);

  // Handle Mark as Unread
  const handleMarkUnread = async () => {
    try {
      await markEmailAsUnread(emailId);
      if (onEmailUpdated) onEmailUpdated();
      onBack();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  // Handle Star toggle
  const handleToggleStar = async () => {
    try {
      const res = await toggleStar(emailId);
      setIsStarred(Boolean(res.is_starred));
      if (onEmailUpdated) onEmailUpdated();
    } catch (err) {
      alert('Error updating star: ' + err.message);
    }
  };

  // Handle Important toggle
  const handleToggleImportant = async () => {
    try {
      const res = await toggleImportant(emailId);
      setIsImportant(Boolean(res.is_important));
      if (onEmailUpdated) onEmailUpdated();
    } catch (err) {
      alert('Error updating importance: ' + err.message);
    }
  };

  // Handle Archive
  const handleArchive = async () => {
    try {
      await archiveEmail(emailId);
      if (onEmailUpdated) onEmailUpdated();
      onBack();
    } catch (err) {
      alert('Error archiving email: ' + err.message);
    }
  };

  // Handle Report Spam
  const handleReportSpam = async () => {
    try {
      await reportSpam(emailId);
      if (onEmailUpdated) onEmailUpdated();
      onBack();
    } catch (err) {
      alert('Error reporting spam: ' + err.message);
    }
  };

  // Handle Soft Delete (Move to Trash)
  const handleDelete = async () => {
    try {
      await deleteEmail(emailId, folder);
      if (onEmailUpdated) onEmailUpdated();
      onBack();
    } catch (err) {
      alert('Error moving email to trash: ' + err.message);
    }
  };

  // Handle Restore from Trash
  const handleRestore = async () => {
    try {
      await restoreEmail(emailId);
      if (onEmailUpdated) onEmailUpdated();
      onBack();
    } catch (err) {
      alert('Error restoring email: ' + err.message);
    }
  };

  // Handle Permanent Deletion from Trash
  const handleDeletePermanently = async () => {
    if (window.confirm('Permanently delete this email? This cannot be undone.')) {
      try {
        await deleteEmailPermanently(emailId);
        if (onEmailUpdated) onEmailUpdated();
        onBack();
      } catch (err) {
        alert('Error deleting email permanently: ' + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p>Loading email details...</p>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="empty-state">
        <p style={{ color: 'var(--danger-color)' }}>{error || 'Email not found'}</p>
        <button className="btn-back" onClick={onBack} style={{ marginTop: '16px' }}>
          <ArrowLeft size={14} strokeWidth={1.8} />
          <span>Back to {folderName}</span>
        </button>
      </div>
    );
  }

  // Format creation timestamp
  const dateObj = email.created_at ? new Date(email.created_at) : null;
  const formattedDate = dateObj
    ? dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    : 'Unknown date';

  const fullDateStr = dateObj ? dateObj.toUTCString() : 'Unknown date';

  // Compute clean sender display name and initial
  const senderEmail = email.sender || 'unknown@encrypto.local';
  const namePart = senderEmail.split('@')[0];
  const senderDisplayName = namePart
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const senderInitial = senderDisplayName.charAt(0).toUpperCase();

  const recipientString = Array.isArray(email.recipient)
    ? email.recipient.join(', ')
    : email.recipient || '';

  return (
    <div className="email-reader-container">
      {/* -----------------------------------------------------------
          1. Action Toolbar (Gmail-style Top Actions)
          ----------------------------------------------------------- */}
      <div className="email-reader-toolbar">
        {/* Left Action Group */}
        <div className="reader-toolbar-group">
          <button
            className="reader-toolbar-btn"
            onClick={onBack}
            title={`Back to ${folderName}`}
            aria-label={`Back to ${folderName}`}
          >
            <ArrowLeft size={18} strokeWidth={1.8} />
          </button>

          <div className="reader-toolbar-divider" />

          {isTrashFolder ? (
            /* Trash Actions */
            <>
              <button
                className="reader-toolbar-btn text-icon-btn"
                onClick={handleRestore}
                title="Restore to original folder"
              >
                <RotateCcw size={16} strokeWidth={1.8} color="#299EFF" />
                <span>Restore to {email.original_folder === 'sent' ? 'Sent' : 'Inbox'}</span>
              </button>

              <button
                className="reader-toolbar-btn text-icon-btn danger-hover"
                onClick={handleDeletePermanently}
                title="Delete forever"
              >
                <Trash2 size={16} strokeWidth={1.8} />
                <span>Delete forever</span>
              </button>
            </>
          ) : (
            /* Standard Folder Actions */
            <>
              {folder !== 'sent' && (
                <button
                  className="reader-toolbar-btn"
                  onClick={handleArchive}
                  title="Archive (E)"
                  aria-label="Archive"
                >
                  <Archive size={18} strokeWidth={1.8} />
                </button>
              )}

              {folder !== 'spam' && (
                <button
                  className="reader-toolbar-btn"
                  onClick={handleReportSpam}
                  title="Report spam"
                  aria-label="Report spam"
                >
                  <AlertOctagon size={18} strokeWidth={1.8} />
                </button>
              )}

              <button
                className="reader-toolbar-btn"
                onClick={handleDelete}
                title="Delete / Move to Trash (#)"
                aria-label="Delete"
              >
                <Trash2 size={18} strokeWidth={1.8} />
              </button>

              <div className="reader-toolbar-divider" />

              <button
                className="reader-toolbar-btn"
                onClick={handleMarkUnread}
                title="Mark as unread"
                aria-label="Mark as unread"
              >
                <Mail size={18} strokeWidth={1.8} />
              </button>

              <button
                className={`reader-toolbar-btn ${isStarred ? 'is-starred' : ''}`}
                onClick={handleToggleStar}
                title={isStarred ? 'Starred' : 'Not starred'}
                aria-label="Star"
              >
                <Star
                  size={18}
                  strokeWidth={1.8}
                  fill={isStarred ? '#F4B400' : 'none'}
                  color={isStarred ? '#F4B400' : 'currentColor'}
                />
              </button>

              <button
                className={`reader-toolbar-btn ${isImportant ? 'is-important' : ''}`}
                onClick={handleToggleImportant}
                title={isImportant ? 'Important' : 'Not important'}
                aria-label="Important"
              >
                <Bookmark
                  size={18}
                  strokeWidth={1.8}
                  fill={isImportant ? '#FFB300' : 'none'}
                  color={isImportant ? '#FFB300' : 'currentColor'}
                />
              </button>

              <div className="reader-toolbar-divider" />

              <button
                className="reader-toolbar-btn"
                onClick={() => onReply && onReply(email)}
                title="Reply (R)"
                aria-label="Reply"
              >
                <Reply size={18} strokeWidth={1.8} />
              </button>

              <button
                className="reader-toolbar-btn"
                onClick={() => onForward && onForward(email)}
                title="Forward (F)"
                aria-label="Forward"
              >
                <Forward size={18} strokeWidth={1.8} />
              </button>
            </>
          )}
        </div>

        {/* Right Action Group: Pagination & Print */}
        <div className="reader-toolbar-group">
          {onPrevEmail && (
            <button
              className="reader-toolbar-btn"
              onClick={onPrevEmail}
              disabled={!hasPrev}
              title="Previous email"
              aria-label="Previous email"
            >
              <ChevronLeft size={18} strokeWidth={1.8} />
            </button>
          )}

          {onNextEmail && (
            <button
              className="reader-toolbar-btn"
              onClick={onNextEmail}
              disabled={!hasNext}
              title="Next email"
              aria-label="Next email"
            >
              <ChevronRight size={18} strokeWidth={1.8} />
            </button>
          )}

          <div className="reader-toolbar-divider" />

          <button
            className="reader-toolbar-btn"
            onClick={() => window.print()}
            title="Print email"
            aria-label="Print"
          >
            <Printer size={17} strokeWidth={1.8} />
          </button>

          <button
            className="reader-toolbar-btn"
            onClick={() => {
              const printWin = window.open('', '_blank');
              if (printWin) {
                printWin.document.write(`
                  <html>
                    <head><title>${email.subject || 'Encrypto Mail'}</title></head>
                    <body style="font-family: sans-serif; padding: 24px; color: #111;">
                      <h2>${email.subject || '(No Subject)'}</h2>
                      <p><strong>From:</strong> ${email.sender}</p>
                      <p><strong>To:</strong> ${recipientString}</p>
                      <p><strong>Date:</strong> ${formattedDate}</p>
                      <hr/>
                      <pre style="white-space: pre-wrap; font-family: inherit;">${email.body || ''}</pre>
                    </body>
                  </html>
                `);
                printWin.document.close();
              }
            }}
            title="Open in new window"
            aria-label="New window"
          >
            <ExternalLink size={17} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* -----------------------------------------------------------
          2. Email Header & Subject Row
          ----------------------------------------------------------- */}
      <div className="email-reader-scrollable">
        <div className="email-reader-subject-section">
          <div className="subject-title-wrapper">
            <h1 className="email-reader-subject">{email.subject || '(No Subject)'}</h1>
            <span className="email-folder-tag">{folderName}</span>
            {email.labels && email.labels.map((lbl, idx) => (
              <span key={idx} className="email-row-label-pill reader-label-pill">
                {lbl}
              </span>
            ))}
          </div>
        </div>

        {/* -----------------------------------------------------------
          3. Sender & Recipient Information
          ----------------------------------------------------------- */}
        <div className="email-reader-sender-row">
          {/* Avatar */}
          <div className="reader-avatar">{senderInitial}</div>

          {/* Details */}
          <div className="reader-sender-details">
            <div className="reader-sender-top-line">
              <div className="sender-identity">
                <span className="reader-sender-name">{senderDisplayName}</span>
                <span className="reader-sender-email">&lt;{senderEmail}&gt;</span>
              </div>
              <div className="reader-date-actions">
                <span className="reader-timestamp">{formattedDate}</span>
                {!isTrashFolder && (
                  <div className="reader-inline-actions">
                    <button
                      className={`btn-round-mini ${isStarred ? 'is-starred' : ''}`}
                      onClick={handleToggleStar}
                      title={isStarred ? 'Starred' : 'Star message'}
                    >
                      <Star
                        size={15}
                        strokeWidth={1.8}
                        fill={isStarred ? '#F4B400' : 'none'}
                        color={isStarred ? '#F4B400' : 'currentColor'}
                      />
                    </button>
                    <button
                      className="btn-round-mini"
                      onClick={() => onReply && onReply(email)}
                      title="Reply"
                    >
                      <Reply size={15} strokeWidth={1.8} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Recipient summary line with details toggle */}
            <div className="reader-recipient-summary">
              <span className="reader-recipient-text">to {recipientString}</span>
              <button
                className="btn-details-dropdown"
                onClick={() => setShowDetails((prev) => !prev)}
                title="Toggle email details"
              >
                <ChevronDown size={13} className={`chevron-icon ${showDetails ? 'rotated' : ''}`} />
              </button>
            </div>

            {/* Expanded Email Details Popover */}
            {showDetails && (
              <div className="reader-details-popover">
                <div className="details-row">
                  <span className="details-label">from:</span>
                  <span className="details-value">
                    <strong>{senderDisplayName}</strong> &lt;{senderEmail}&gt;
                  </span>
                </div>
                <div className="details-row">
                  <span className="details-label">to:</span>
                  <span className="details-value">{recipientString}</span>
                </div>
                {email.cc && (
                  <div className="details-row">
                    <span className="details-label">cc:</span>
                    <span className="details-value">{email.cc}</span>
                  </div>
                )}
                {email.bcc && (
                  <div className="details-row">
                    <span className="details-label">bcc:</span>
                    <span className="details-value">{email.bcc}</span>
                  </div>
                )}
                <div className="details-row">
                  <span className="details-label">date:</span>
                  <span className="details-value">{fullDateStr}</span>
                </div>
                <div className="details-row">
                  <span className="details-label">subject:</span>
                  <span className="details-value">{email.subject || '(No Subject)'}</span>
                </div>
                <div className="details-row security-highlight">
                  <span className="details-label">security:</span>
                  <span className="details-value security-badge">
                    <ShieldCheck size={14} color="#00E676" />
                    Encrypto End-to-End Encryption • Relayed via Rust SMTP
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* -----------------------------------------------------------
          4. Email Message Body
          ----------------------------------------------------------- */}
        <div className="email-reader-body-wrapper">
          {email.is_confidential && (
            <div className="confidential-indicator-bar in-reader">
              <Lock size={14} color="#00E676" />
              <span>Confidential Mode on • Protected by Encrypto End-to-End Encryption</span>
            </div>
          )}

          {email.body_html ? (
            <div
              className="email-reader-content rich-html-content"
              dangerouslySetInnerHTML={{ __html: email.body_html }}
            />
          ) : (
            <div className="email-reader-content">
              {email.body || '(This message has no content)'}
            </div>
          )}

          {/* Attachments Section */}
          {(() => {
            let atts = [];
            if (email.attachments) {
              if (Array.isArray(email.attachments)) atts = email.attachments;
              else if (typeof email.attachments === 'string') {
                try {
                  atts = JSON.parse(email.attachments);
                } catch (_) {}
              }
            }
            if (atts.length === 0) return null;
            return (
              <div className="email-reader-attachments-section">
                <div className="attachments-header">
                  <Paperclip size={15} color="#299EFF" />
                  <span>
                    {atts.length} Attachment{atts.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="attachments-grid">
                  {atts.map((att) => {
                    const FileIconComp = getFileIcon(att.filename);
                    return (
                      <div key={att.id} className="reader-attachment-card">
                        <div className="reader-att-icon-wrap">
                          <FileIconComp size={20} color="#299EFF" />
                        </div>
                        <div className="reader-att-info">
                          <span className="reader-att-name" title={att.filename}>
                            {att.filename}
                          </span>
                          <span className="reader-att-size">{formatBytes(att.size)}</span>
                        </div>
                        <a
                          href={att.data}
                          download={att.filename}
                          className="reader-att-download-btn"
                          title={`Download ${att.filename}`}
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* -----------------------------------------------------------
          5. Bottom Quick Action Buttons (Reply / Forward)
          ----------------------------------------------------------- */}
        {!isTrashFolder && (
          <div className="email-reader-footer-actions">
            <button
              className="btn-quick-pill"
              onClick={() => onReply && onReply(email)}
              title="Reply to sender (R)"
            >
              <Reply size={15} strokeWidth={1.8} />
              <span>Reply</span>
            </button>

            <button
              className="btn-quick-pill"
              onClick={() => onForward && onForward(email)}
              title="Forward message (F)"
            >
              <Forward size={15} strokeWidth={1.8} />
              <span>Forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
