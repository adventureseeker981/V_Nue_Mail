// src/components/ComposeModal.jsx — Gmail-Grade Professional Compose Window for Encrypto
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sendEmail, saveDraft, discardDraft, fetchSettings } from '../services/api';
import RecipientInput from './RecipientInput';
import RichTextEditor from './RichTextEditor';
import LinkModal from './LinkModal';
import EmojiPicker from './EmojiPicker';
import {
  Send,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Trash2,
  Paperclip,
  Link2,
  Smile,
  Image as ImageIcon,
  Lock,
  PenTool,
  ChevronDown,
  Clock,
  ShieldCheck,
  File,
  FileText,
  FileArchive,
  Image,
} from 'lucide-react';

// Format bytes into readable string (e.g. 1.2 MB)
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper to choose file icon
function getFileIcon(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return Image;
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return FileArchive;
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return FileText;
  return File;
}

export default function ComposeModal({
  isOpen,
  onClose,
  onEmailSent,
  initialData,
}) {
  // State
  const [draftId, setDraftId] = useState(null);
  const [toRecipients, setToRecipients] = useState([]);
  const [ccRecipients, setCcRecipients] = useState([]);
  const [bccRecipients, setBccRecipients] = useState([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');

  const [attachments, setAttachments] = useState([]);
  const [isConfidential, setIsConfidential] = useState(false);
  const [scheduledFor, setScheduledFor] = useState(null);

  // UI States
  const [showFormatting, setShowFormatting] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });

  // Progress & Notifications
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftStatusText, setDraftStatusText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Refs
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const userSettingsRef = useRef(null);

  // Fetch settings for default signature
  useEffect(() => {
    async function loadSignatures() {
      try {
        const s = await fetchSettings();
        if (s) userSettingsRef.current = s;
      } catch (_) {}
    }
    loadSignatures();
  }, []);

  // Initialize or reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftId(initialData?.id || null);

      // Parse recipients into arrays
      const parseList = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return String(val)
          .split(/[,;\s]+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
      };

      const parsedTo = parseList(initialData?.recipient);
      const parsedCc = parseList(initialData?.cc);
      const parsedBcc = parseList(initialData?.bcc);

      setToRecipients(parsedTo);
      setCcRecipients(parsedCc);
      setBccRecipients(parsedBcc);
      setShowCc(parsedCc.length > 0);
      setShowBcc(parsedBcc.length > 0);

      setSubject(initialData?.subject || '');
      setBodyHtml(initialData?.body_html || initialData?.body || '');
      setBodyText(initialData?.body || '');

      // Parse attachments
      let initialAtts = [];
      if (initialData?.attachments) {
        if (Array.isArray(initialData.attachments)) {
          initialAtts = initialData.attachments;
        } else if (typeof initialData.attachments === 'string') {
          try {
            initialAtts = JSON.parse(initialData.attachments);
          } catch (_) {}
        }
      }
      setAttachments(initialAtts);
      setIsConfidential(Boolean(initialData?.is_confidential));
      setScheduledFor(initialData?.scheduled_for || null);

      setError('');
      setSuccess('');
      setIsMinimized(false);
      setIsMaximized(false);
      setPosition({ x: 0, y: 0 });
      setDraftStatusText('');
    }
  }, [isOpen, initialData]);

  // Debounced Autosave Draft
  useEffect(() => {
    if (!isOpen) return;

    // Only save if there is some typed content
    const hasContent =
      toRecipients.length > 0 ||
      ccRecipients.length > 0 ||
      bccRecipients.length > 0 ||
      subject.trim() ||
      bodyText.trim() ||
      attachments.length > 0;

    if (!hasContent) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setSavingDraft(true);
        setDraftStatusText('Saving draft...');

        const res = await saveDraft({
          id: draftId,
          recipient: toRecipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject: subject.trim(),
          body: bodyText.trim(),
          body_html: bodyHtml,
          attachments,
          is_confidential: isConfidential,
        });

        if (res?.draft?.id) {
          setDraftId(res.draft.id);
        }
        setDraftStatusText('Saved to Drafts');
      } catch (err) {
        setDraftStatusText('');
      } finally {
        setSavingDraft(false);
      }
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    toRecipients,
    ccRecipients,
    bccRecipients,
    subject,
    bodyText,
    bodyHtml,
    attachments,
    isConfidential,
    isOpen,
    draftId,
  ]);

  // Dragging handlers for header
  const handleMouseDownHeader = (e) => {
    if (isMaximized) return; // Disable dragging when maximized
    // Ignore clicks on control buttons
    if (e.target.closest('button')) return;

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPosition({
        x: dragStartRef.current.startX + dx,
        y: dragStartRef.current.startY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Insert helper into editor
  const insertHTMLAtCursor = (htmlString) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('insertHTML', false, htmlString);
    // trigger input
    setBodyHtml(editorRef.current.innerHTML);
    setBodyText(editorRef.current.innerText);
  };

  // Handle Attachment Selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Read files as base64
    files.forEach((file) => {
      // 25MB total limit check
      if (file.size > 25 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 25MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const newAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          filename: file.name,
          size: file.size,
          contentType: file.type || 'application/octet-stream',
          data: reader.result, // base64 data URL
        };
        setAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Remove attachment
  const handleRemoveAttachment = (attId) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  // Handle Inline Image Selection
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imgHtml = `<img src="${reader.result}" alt="${file.name}" style="max-width: 100%; border-radius: 8px; margin: 8px 0; display: block;" />&nbsp;`;
      insertHTMLAtCursor(imgHtml);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Insert user's saved signature
  const handleInsertSignature = () => {
    const sig = userSettingsRef.current?.signature;
    if (sig) {
      const sigHtml = `<br/><br/><div>--<br/>${sig.replace(/\n/g, '<br/>')}</div>&nbsp;`;
      insertHTMLAtCursor(sigHtml);
    } else {
      const defaultSig = `<br/><br/><div>--<br/>Sent privately with <strong>ENCRYPTO</strong>.</div>&nbsp;`;
      insertHTMLAtCursor(defaultSig);
    }
  };

  // Submit / Send Email
  const handleSend = async (isScheduled = false, scheduledDate = null) => {
    setError('');
    setSuccess('');

    if (toRecipients.length === 0) {
      setError('Please add at least one recipient in the "To" field');
      return;
    }

    try {
      setLoading(true);

      const sendPayload = {
        recipient: toRecipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject: subject.trim() || '(No Subject)',
        body: bodyText.trim(),
        body_html: bodyHtml,
        attachments,
        is_confidential: isConfidential,
        scheduled_for: isScheduled && scheduledDate ? scheduledDate.toISOString() : null,
        draftId,
      };

      await sendEmail(sendPayload);

      // If it was a draft, clean up draft
      if (draftId) {
        try {
          await discardDraft(draftId);
        } catch (_) {}
      }

      setSuccess(
        isScheduled
          ? `Email scheduled for ${scheduledDate?.toLocaleString()}`
          : 'Encrypted email sent successfully!'
      );

      setTimeout(() => {
        onClose();
        if (onEmailSent) onEmailSent();
      }, 700);
    } catch (err) {
      setError(err.message || 'Error sending email');
    } finally {
      setLoading(false);
      setShowScheduleMenu(false);
    }
  };

  // Discard draft completely
  const handleDiscard = async () => {
    if (draftId) {
      try {
        await discardDraft(draftId);
      } catch (_) {}
    }
    onClose();
    if (onEmailSent) onEmailSent();
  };

  // Keyboard shortcut Ctrl/Cmd + Enter to send
  useEffect(() => {
    if (!isOpen) return;

    function handleGlobalKeyDown(e) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmd = isMac ? e.metaKey : e.ctrlKey;

      if (isCmd && e.key === 'Enter') {
        e.preventDefault();
        handleSend(false);
      } else if (e.key === 'Escape' && !isLinkModalOpen && !isEmojiPickerOpen) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, toRecipients, ccRecipients, bccRecipients, subject, bodyText, bodyHtml, isLinkModalOpen, isEmojiPickerOpen]);

  if (!isOpen) return null;

  // Minimized floating pill in bottom right
  if (isMinimized) {
    return (
      <div
        className="compose-minimized-pill"
        onClick={() => setIsMinimized(false)}
        title="Restore Compose Window"
      >
        <span className="minimized-title">
          {subject ? subject : 'New Message'}
        </span>
        <div className="minimized-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="compose-control-btn"
            onClick={() => setIsMinimized(false)}
            title="Expand"
          >
            <Maximize2 size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="compose-control-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  const modalStyle = !isMaximized
    ? {
        transform: `translate(${position.x}px, ${position.y}px)`,
      }
    : {};

  return (
    <div className="compose-modal-backdrop">
      <div
        className={`compose-modal-card ${isMaximized ? 'maximized' : ''}`}
        style={modalStyle}
      >
        {/* ----------------------------------------------------
            1. Modal Header (Draggable)
            ---------------------------------------------------- */}
        <div
          className="compose-header"
          onMouseDown={handleMouseDownHeader}
          style={{ cursor: isMaximized ? 'default' : 'grab' }}
        >
          <div className="compose-header-left">
            <img
              src="/assets/encrypto-icon-transparent.png"
              alt=""
              style={{ width: '16px', height: '16px', objectFit: 'contain' }}
            />
            <span className="compose-title">
              {subject ? subject : 'New Encrypted Message'}
            </span>
          </div>

          <div className="compose-header-controls">
            {/* Minimize */}
            <button
              type="button"
              className="compose-control-btn"
              onClick={() => setIsMinimized(true)}
              title="Minimize"
            >
              <Minus size={14} strokeWidth={2} />
            </button>

            {/* Maximize / Restore */}
            <button
              type="button"
              className="compose-control-btn"
              onClick={() => {
                setIsMaximized((prev) => !prev);
                setPosition({ x: 0, y: 0 });
              }}
              title={isMaximized ? 'Exit full screen' : 'Full screen'}
            >
              {isMaximized ? (
                <Minimize2 size={14} strokeWidth={2} />
              ) : (
                <Maximize2 size={14} strokeWidth={2} />
              )}
            </button>

            {/* Close & Save Draft */}
            <button
              type="button"
              className="compose-control-btn"
              onClick={onClose}
              title="Save draft & close"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Banners */}
        {error && <div className="error-banner compose-banner">{error}</div>}
        {success && <div className="success-banner compose-banner">{success}</div>}

        {/* Confidential Mode Notice */}
        {isConfidential && (
          <div className="confidential-indicator-bar">
            <Lock size={14} color="#00E676" />
            <span>Confidential Mode on • End-to-end encrypted • Forwarding protected</span>
          </div>
        )}

        {/* ----------------------------------------------------
            2. Recipient Fields (To, CC, BCC)
            ---------------------------------------------------- */}
        <div className="compose-recipient-section">
          {/* TO Field */}
          <div className="compose-field-row">
            <span className="compose-field-label">To</span>
            <div className="compose-recipient-input-wrap">
              <RecipientInput
                recipients={toRecipients}
                onChange={setToRecipients}
                placeholder="recipients@encrypto.local"
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="compose-cc-toggles">
              {!showCc && (
                <button
                  type="button"
                  className="cc-toggle-btn"
                  onClick={() => setShowCc(true)}
                  title="Add Cc recipients"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  className="cc-toggle-btn"
                  onClick={() => setShowBcc(true)}
                  title="Add Bcc recipients"
                >
                  Bcc
                </button>
              )}
            </div>
          </div>

          {/* CC Field */}
          {showCc && (
            <div className="compose-field-row">
              <span className="compose-field-label">Cc</span>
              <div className="compose-recipient-input-wrap">
                <RecipientInput
                  recipients={ccRecipients}
                  onChange={setCcRecipients}
                  placeholder="cc@encrypto.local"
                  disabled={loading}
                />
              </div>
              {ccRecipients.length === 0 && (
                <button
                  type="button"
                  className="cc-toggle-btn hide-btn"
                  onClick={() => setShowCc(false)}
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* BCC Field */}
          {showBcc && (
            <div className="compose-field-row">
              <span className="compose-field-label">Bcc</span>
              <div className="compose-recipient-input-wrap">
                <RecipientInput
                  recipients={bccRecipients}
                  onChange={setBccRecipients}
                  placeholder="bcc@encrypto.local"
                  disabled={loading}
                />
              </div>
              {bccRecipients.length === 0 && (
                <button
                  type="button"
                  className="cc-toggle-btn hide-btn"
                  onClick={() => setShowBcc(false)}
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Subject Field */}
          <div className="compose-field-row subject-row">
            <input
              type="text"
              className="compose-field-input subject-input"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* ----------------------------------------------------
            3. Rich Text Editor Body
            ---------------------------------------------------- */}
        <div className="compose-editor-container">
          <RichTextEditor
            editorRef={editorRef}
            initialContent={bodyHtml}
            visibleToolbar={showFormatting}
            onChange={({ html, text }) => {
              setBodyHtml(html);
              setBodyText(text);
            }}
          />
        </div>

        {/* ----------------------------------------------------
            4. File Attachment Cards Preview
            ---------------------------------------------------- */}
        {attachments.length > 0 && (
          <div className="compose-attachments-bar">
            {attachments.map((att) => {
              const FileIconComponent = getFileIcon(att.filename);
              return (
                <div key={att.id} className="attachment-chip">
                  <FileIconComponent size={14} className="attachment-icon" color="#299EFF" />
                  <div className="attachment-meta">
                    <span className="attachment-name" title={att.filename}>
                      {att.filename}
                    </span>
                    <span className="attachment-size">{formatBytes(att.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="attachment-remove-btn"
                    onClick={() => handleRemoveAttachment(att.id)}
                    title="Remove attachment"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />

        {/* ----------------------------------------------------
            5. Gmail-Style Bottom Action Toolbar
            ---------------------------------------------------- */}
        <div className="compose-footer">
          {/* Left Actions: Send Button + Toolbar Options */}
          <div className="compose-footer-left">
            {/* Split Send Button */}
            <div className="btn-send-group">
              <button
                type="button"
                className="btn-compose-send"
                onClick={() => handleSend(false)}
                disabled={loading}
                title="Send (Ctrl+Enter)"
              >
                <span>{loading ? 'Sending...' : 'Send'}</span>
              </button>

              <button
                type="button"
                className="btn-send-dropdown-trigger"
                onClick={() => setShowScheduleMenu((prev) => !prev)}
                disabled={loading}
                title="More send options"
              >
                <ChevronDown size={14} strokeWidth={2.5} />
              </button>

              {/* Schedule Send Popup */}
              {showScheduleMenu && (
                <div className="schedule-send-popup">
                  <span className="schedule-header">Schedule send</span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(8, 0, 0, 0);
                      handleSend(true, d);
                    }}
                  >
                    <Clock size={14} />
                    <span>Tomorrow morning (8:00 AM)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(13, 0, 0, 0);
                      handleSend(true, d);
                    }}
                  >
                    <Clock size={14} />
                    <span>Tomorrow afternoon (1:00 PM)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      // Find next monday
                      d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
                      d.setHours(8, 0, 0, 0);
                      handleSend(true, d);
                    }}
                  >
                    <Clock size={14} />
                    <span>Monday morning (8:00 AM)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Formatting Toggle Button (Aa) */}
            <button
              type="button"
              className={`compose-action-icon-btn ${showFormatting ? 'active' : ''}`}
              onClick={() => setShowFormatting((prev) => !prev)}
              title="Formatting options"
            >
              <span className="formatting-toggle-text">Aa</span>
            </button>

            {/* Attach Files */}
            <button
              type="button"
              className="compose-action-icon-btn"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              title="Attach files"
            >
              <Paperclip size={18} strokeWidth={1.8} />
            </button>

            {/* Insert Link */}
            <button
              type="button"
              className="compose-action-icon-btn"
              onClick={() => setIsLinkModalOpen(true)}
              title="Insert link"
            >
              <Link2 size={18} strokeWidth={1.8} />
            </button>

            {/* Insert Emoji */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`compose-action-icon-btn ${isEmojiPickerOpen ? 'active' : ''}`}
                onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                title="Insert emoji"
              >
                <Smile size={18} strokeWidth={1.8} />
              </button>

              <EmojiPicker
                isOpen={isEmojiPickerOpen}
                onClose={() => setIsEmojiPickerOpen(false)}
                onSelect={(emoji) => {
                  insertHTMLAtCursor(emoji);
                  setIsEmojiPickerOpen(false);
                }}
              />
            </div>

            {/* Insert Images */}
            <button
              type="button"
              className="compose-action-icon-btn"
              onClick={() => imageInputRef.current && imageInputRef.current.click()}
              title="Insert photo"
            >
              <ImageIcon size={18} strokeWidth={1.8} />
            </button>

            {/* Confidential Mode */}
            <button
              type="button"
              className={`compose-action-icon-btn ${isConfidential ? 'active' : ''}`}
              onClick={() => setIsConfidential((prev) => !prev)}
              title={isConfidential ? 'Confidential mode on' : 'Toggle confidential mode'}
            >
              <Lock size={18} strokeWidth={1.8} />
            </button>

            {/* Insert Signature */}
            <button
              type="button"
              className="compose-action-icon-btn"
              onClick={handleInsertSignature}
              title="Insert signature"
            >
              <PenTool size={18} strokeWidth={1.8} />
            </button>

            {/* Live Autosave Status */}
            <span className="compose-autosave-status">
              {savingDraft ? 'Saving draft...' : draftStatusText}
            </span>
          </div>

          {/* Right Action: Discard Draft */}
          <div className="compose-footer-right">
            <button
              type="button"
              className="btn-compose-discard"
              onClick={handleDiscard}
              title="Discard draft"
            >
              <Trash2 size={17} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Link Modal */}
        <LinkModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          onInsert={({ text, url }) => {
            const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #299EFF; text-decoration: underline;">${text}</a>&nbsp;`;
            insertHTMLAtCursor(linkHtml);
          }}
        />
      </div>
    </div>
  );
}
