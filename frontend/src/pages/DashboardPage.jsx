// src/pages/DashboardPage.jsx — Comprehensive Gmail-Grade Dashboard for Encrypto
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import EmailItem from '../components/EmailItem';
import ComposeModal from '../components/ComposeModal';
import EmailView from './EmailView';
import SettingsModal from '../components/SettingsModal';
import LabelModal from '../components/LabelModal';
import HelpModal from '../components/HelpModal';

import {
  fetchInbox,
  fetchStarred,
  fetchSnoozed,
  fetchSent,
  fetchDrafts,
  fetchImportant,
  fetchAllMail,
  fetchSpam,
  fetchTrash,
  fetchCounts,
  searchEmails,
  toggleStar,
  toggleImportant,
  archiveEmail,
  deleteEmail,
  emptyTrash,
  markEmailAsRead,
  markEmailAsUnread,
  snoozeEmail,
  bulkAction,
  fetchLabels,
  fetchSettings,
  logoutUser,
} from '../services/api';

import {
  RefreshCw,
  Trash2,
  Archive,
  AlertOctagon,
  Mail,
  MailOpen,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Inbox,
  Users,
  ShoppingBag,
  Info,
  MessageSquare,
  Tag,
  FolderInput,
} from 'lucide-react';

const PAGE_SIZE = 25;

export default function DashboardPage({ user, onLogout }) {
  // Navigation & Folder states
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [currentCategory, setCurrentCategory] = useState('primary');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Email data & Live badges
  const [emails, setEmails] = useState([]);
  const [counts, setCounts] = useState({});
  const [labels, setLabels] = useState([]);
  const [settings, setSettings] = useState({ density: 'comfortable', theme: 'dark', keyboard_shortcuts: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedSearchParams, setAdvancedSearchParams] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showSelectDropdown, setShowSelectDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Detail View & Compose
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // -------------------------------------------------------------------------
  // 1. Data Fetching
  // -------------------------------------------------------------------------

  // Load Folder Counts for Sidebar Badges
  const loadCounts = useCallback(async () => {
    try {
      const data = await fetchCounts();
      setCounts(data);
    } catch (_) {
      // Ignore background badge errors
    }
  }, []);

  // Load User Custom Labels
  const loadLabels = useCallback(async () => {
    try {
      const list = await fetchLabels();
      setLabels(list);
    } catch (_) {
      // Ignore background label errors
    }
  }, []);

  // Load User Preferences
  const loadUserSettings = useCallback(async () => {
    try {
      const s = await fetchSettings();
      if (s) setSettings(s);
    } catch (_) {
      // Ignore background settings errors
    }
  }, []);

  // Load Emails for current folder / category
  const loadEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSelectedIds(new Set());

      let data = [];

      // If advanced search params active
      if (advancedSearchParams) {
        data = await searchEmails(advancedSearchParams);
      } else if (currentFolder.startsWith('label:')) {
        const labelName = currentFolder.replace('label:', '');
        data = await searchEmails({ label: labelName });
      } else {
        switch (currentFolder) {
          case 'inbox':
            data = await fetchInbox(currentCategory);
            break;
          case 'starred':
            data = await fetchStarred();
            break;
          case 'snoozed':
            data = await fetchSnoozed();
            break;
          case 'sent':
            data = await fetchSent();
            break;
          case 'drafts':
            data = await fetchDrafts();
            break;
          case 'important':
            data = await fetchImportant();
            break;
          case 'all-mail':
            data = await fetchAllMail();
            break;
          case 'spam':
            data = await fetchSpam();
            break;
          case 'trash':
            data = await fetchTrash();
            break;
          default:
            data = await fetchInbox();
            break;
        }
      }

      setEmails(data || []);
      loadCounts();
    } catch (err) {
      setError(err.message || 'Error fetching messages');
    } finally {
      setLoading(false);
    }
  }, [currentFolder, currentCategory, advancedSearchParams, loadCounts]);

  // Initial load
  useEffect(() => {
    loadUserSettings();
    loadLabels();
  }, [loadUserSettings, loadLabels]);

  // Reload when folder or category or advanced search changes
  useEffect(() => {
    loadEmails();
    setSelectedEmailId(null);
    setCurrentPage(1);
  }, [loadEmails]);

  // -------------------------------------------------------------------------
  // 2. Search & Filtering
  // -------------------------------------------------------------------------

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails;
    const q = searchQuery.toLowerCase();
    return emails.filter((m) => {
      const sender = (m.sender || '').toLowerCase();
      const subject = (m.subject || '').toLowerCase();
      const body = (m.body || '').toLowerCase();
      return sender.includes(q) || subject.includes(q) || body.includes(q);
    });
  }, [emails, searchQuery]);

  // Pagination slice
  const totalPages = Math.ceil(filteredEmails.length / PAGE_SIZE) || 1;
  const paginatedEmails = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmails.slice(start, start + PAGE_SIZE);
  }, [filteredEmails, currentPage]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredEmails.length);

  // -------------------------------------------------------------------------
  // 3. Selection Handlers
  // -------------------------------------------------------------------------

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(paginatedEmails.map((m) => m.id));
    setSelectedIds(allIds);
    setShowSelectDropdown(false);
  };

  const handleSelectNone = () => {
    setSelectedIds(new Set());
    setShowSelectDropdown(false);
  };

  const handleSelectRead = () => {
    const ids = new Set(paginatedEmails.filter((m) => m.status === 'read').map((m) => m.id));
    setSelectedIds(ids);
    setShowSelectDropdown(false);
  };

  const handleSelectUnread = () => {
    const ids = new Set(paginatedEmails.filter((m) => m.status === 'unread').map((m) => m.id));
    setSelectedIds(ids);
    setShowSelectDropdown(false);
  };

  const handleSelectStarred = () => {
    const ids = new Set(paginatedEmails.filter((m) => m.is_starred).map((m) => m.id));
    setSelectedIds(ids);
    setShowSelectDropdown(false);
  };

  const handleSelectUnstarred = () => {
    const ids = new Set(paginatedEmails.filter((m) => !m.is_starred).map((m) => m.id));
    setSelectedIds(ids);
    setShowSelectDropdown(false);
  };

  const isMasterChecked = paginatedEmails.length > 0 && selectedIds.size === paginatedEmails.length;
  const isMasterIndeterminate = selectedIds.size > 0 && selectedIds.size < paginatedEmails.length;

  const handleMasterCheckboxClick = () => {
    if (selectedIds.size > 0) {
      handleSelectNone();
    } else {
      handleSelectAll();
    }
  };

  // -------------------------------------------------------------------------
  // 4. Bulk Actions Execution
  // -------------------------------------------------------------------------

  const executeBulk = async (action, value = null) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      await bulkAction(ids, action, value);
      setSelectedIds(new Set());
      loadEmails();
    } catch (err) {
      alert(`Bulk action '${action}' failed: ` + err.message);
    }
  };

  // -------------------------------------------------------------------------
  // 5. Individual Row Actions
  // -------------------------------------------------------------------------

  const handleToggleStar = async (id) => {
    try {
      const res = await toggleStar(id);
      setEmails((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_starred: res.is_starred } : m))
      );
      loadCounts();
    } catch (err) {
      alert('Error toggling star: ' + err.message);
    }
  };

  const handleToggleImportant = async (id) => {
    try {
      const res = await toggleImportant(id);
      setEmails((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_important: res.is_important } : m))
      );
      loadCounts();
    } catch (err) {
      alert('Error updating importance: ' + err.message);
    }
  };

  const handleArchive = async (id) => {
    try {
      await archiveEmail(id);
      setEmails((prev) => prev.filter((m) => m.id !== id));
      loadCounts();
    } catch (err) {
      alert('Error archiving: ' + err.message);
    }
  };

  const handleDeleteRow = async (id) => {
    try {
      await deleteEmail(id, currentFolder);
      setEmails((prev) => prev.filter((m) => m.id !== id));
      loadCounts();
    } catch (err) {
      alert('Error moving to trash: ' + err.message);
    }
  };

  const handleToggleRead = async (id, isCurrentlyUnread) => {
    try {
      if (isCurrentlyUnread) {
        await markEmailAsRead(id);
      } else {
        await markEmailAsUnread(id);
      }
      setEmails((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, status: isCurrentlyUnread ? 'read' : 'unread' } : m
        )
      );
      loadCounts();
    } catch (err) {
      alert('Error updating read status: ' + err.message);
    }
  };

  const handleSnooze = async (id) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    try {
      await snoozeEmail(id, tomorrow.toISOString());
      setEmails((prev) => prev.filter((m) => m.id !== id));
      loadCounts();
    } catch (err) {
      alert('Error snoozing email: ' + err.message);
    }
  };

  // -------------------------------------------------------------------------
  // 6. Navigation & Compose Handlers
  // -------------------------------------------------------------------------

  const handleOpenCompose = (data = null) => {
    // If settings has a signature, auto-append to new message body
    let initialData = data;
    if (!data && settings.signature) {
      initialData = { body: `\n\n--\n${settings.signature}` };
    }
    setComposeData(initialData);
    setIsComposeOpen(true);
  };

  const handleReply = (email) => {
    handleOpenCompose({
      recipient: email.sender,
      subject: email.subject?.startsWith('Re: ') ? email.subject : `Re: ${email.subject || ''}`,
      body: `\n\n${settings.signature ? `--\n${settings.signature}\n\n` : ''}--- On ${new Date(
        email.created_at
      ).toLocaleString()}, ${email.sender} wrote: ---\n${email.body || ''}`,
    });
  };

  const handleForward = (email) => {
    handleOpenCompose({
      recipient: '',
      subject: email.subject?.startsWith('Fwd: ') ? email.subject : `Fwd: ${email.subject || ''}`,
      body: `\n\n${settings.signature ? `--\n${settings.signature}\n\n` : ''}---------- Forwarded message ---------\nFrom: ${
        email.sender
      }\nDate: ${new Date(email.created_at).toLocaleString()}\nSubject: ${
        email.subject || ''
      }\nTo: ${
        Array.isArray(email.recipient) ? email.recipient.join(', ') : email.recipient
      }\n\n${email.body || ''}`,
    });
  };

  const handleSelectEmail = (email) => {
    // If in drafts, open Compose directly
    if (currentFolder === 'drafts' || email.is_draft) {
      handleOpenCompose({
        id: email.id,
        recipient: email.recipient,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        body: email.body,
        body_html: email.body_html,
        attachments: email.attachments,
        is_confidential: email.is_confidential,
      });
      return;
    }
    setSelectedEmailId(email.id);
  };

  // Empty trash permanently
  const handleEmptyTrash = async () => {
    if (window.confirm('Permanently delete all emails in Trash? This cannot be undone.')) {
      try {
        await emptyTrash();
        loadEmails();
      } catch (err) {
        alert('Error emptying trash: ' + err.message);
      }
    }
  };

  // Next / Prev email in detail reader view
  const currentEmailIndex = emails.findIndex((m) => m.id === selectedEmailId);
  const hasPrevEmail = currentEmailIndex > 0;
  const hasNextEmail = currentEmailIndex >= 0 && currentEmailIndex < emails.length - 1;

  const handlePrevEmail = () => {
    if (hasPrevEmail) {
      setSelectedEmailId(emails[currentEmailIndex - 1].id);
    }
  };

  const handleNextEmail = () => {
    if (hasNextEmail) {
      setSelectedEmailId(emails[currentEmailIndex + 1].id);
    }
  };

  // -------------------------------------------------------------------------
  // 7. Keyboard Shortcuts Listener
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!settings.keyboard_shortcuts) return;

    function handleKeyDown(e) {
      // Ignore if user is typing in input or textarea
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) {
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleOpenCompose(null);
      } else if (e.key === 'e' || e.key === 'E') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          executeBulk('archive');
        }
      } else if (e.key === '#') {
        if (selectedIds.size > 0) {
          e.preventDefault();
          executeBulk('trash');
        }
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) searchInput.focus();
      } else if (e.key === '?') {
        e.preventDefault();
        setIsHelpOpen(true);
      } else if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setShowSelectDropdown(false);
        setShowLabelDropdown(false);
        setShowCategoryDropdown(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboard_shortcuts, selectedIds]);

  // -------------------------------------------------------------------------
  // 8. Render
  // -------------------------------------------------------------------------

  const folderTitle = currentFolder.startsWith('label:')
    ? `Label: ${currentFolder.replace('label:', '')}`
    : currentFolder.replace('-', ' ').toUpperCase();

  return (
    <div className={`app-container theme-${settings.theme || 'dark'} density-${settings.density || 'comfortable'}`}>
      {/* Top Navbar */}
      <Navbar
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdvancedSearch={(params) => {
          setAdvancedSearchParams(params);
        }}
        onLogout={() => {
          logoutUser();
          if (onLogout) onLogout();
        }}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      <div className="main-layout">
        {/* Collapsible Left Sidebar */}
        <Sidebar
          currentFolder={currentFolder}
          currentCategory={currentCategory}
          onSelectFolder={(folderId) => {
            setAdvancedSearchParams(null);
            setCurrentFolder(folderId);
          }}
          onSelectCategory={(catId) => {
            setAdvancedSearchParams(null);
            setCurrentFolder('inbox');
            setCurrentCategory(catId);
          }}
          onSelectLabel={(lbl) => {
            setAdvancedSearchParams(null);
            setCurrentFolder(`label:${lbl}`);
          }}
          onOpenCompose={() => handleOpenCompose(null)}
          counts={counts}
          labels={labels}
          onOpenLabelModal={() => setIsLabelModalOpen(true)}
          isCollapsed={isSidebarCollapsed}
        />

        {/* Main Content Area */}
        <main className="content-area">
          {selectedEmailId ? (
            /* Gmail-grade Email Reader */
            <EmailView
              emailId={selectedEmailId}
              folder={currentFolder}
              onBack={() => {
                setSelectedEmailId(null);
                loadEmails();
              }}
              onEmailUpdated={loadEmails}
              onReply={handleReply}
              onForward={handleForward}
              onPrevEmail={handlePrevEmail}
              onNextEmail={handleNextEmail}
              hasPrev={hasPrevEmail}
              hasNext={hasNextEmail}
            />
          ) : (
            /* Inbox & List Interface */
            <div className="email-inbox-view">
              {/* Header Toolbar: Checkbox dropdown, Bulk actions, Refresh, Pagination */}
              <div className="content-toolbar">
                {/* Left side: Master Checkbox + Bulk Actions OR Folder Title */}
                <div className="toolbar-left-group">
                  {/* Master Checkbox Dropdown */}
                  <div className="toolbar-checkbox-wrap">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={isMasterChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = isMasterIndeterminate;
                        }}
                        onChange={handleMasterCheckboxClick}
                      />
                      <span className="checkbox-custom" />
                    </label>

                    <button
                      type="button"
                      className="checkbox-dropdown-trigger"
                      onClick={() => setShowSelectDropdown((prev) => !prev)}
                      title="Select options"
                    >
                      <ChevronDown size={12} strokeWidth={2} />
                    </button>

                    {showSelectDropdown && (
                      <div className="toolbar-dropdown-menu">
                        <button type="button" onClick={handleSelectAll}>All</button>
                        <button type="button" onClick={handleSelectNone}>None</button>
                        <button type="button" onClick={handleSelectRead}>Read</button>
                        <button type="button" onClick={handleSelectUnread}>Unread</button>
                        <button type="button" onClick={handleSelectStarred}>Starred</button>
                        <button type="button" onClick={handleSelectUnstarred}>Unstarred</button>
                      </div>
                    )}
                  </div>

                  {/* If items selected -> Show Bulk Action Toolbar */}
                  {selectedIds.size > 0 ? (
                    <div className="bulk-actions-bar">
                      <span className="bulk-selection-count">
                        {selectedIds.size} selected
                      </span>

                      {currentFolder !== 'sent' && (
                        <button
                          type="button"
                          className="toolbar-btn"
                          onClick={() => executeBulk('archive')}
                          title="Archive (E)"
                        >
                          <Archive size={16} strokeWidth={1.8} />
                        </button>
                      )}

                      {currentFolder !== 'spam' && (
                        <button
                          type="button"
                          className="toolbar-btn"
                          onClick={() => executeBulk('spam')}
                          title="Report spam"
                        >
                          <AlertOctagon size={16} strokeWidth={1.8} />
                        </button>
                      )}

                      <button
                        type="button"
                        className="toolbar-btn danger-hover"
                        onClick={() => executeBulk('trash')}
                        title="Delete (#)"
                      >
                        <Trash2 size={16} strokeWidth={1.8} />
                      </button>

                      <div className="toolbar-divider" />

                      <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => executeBulk('read')}
                        title="Mark as read"
                      >
                        <MailOpen size={16} strokeWidth={1.8} />
                      </button>

                      <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => executeBulk('unread')}
                        title="Mark as unread"
                      >
                        <Mail size={16} strokeWidth={1.8} />
                      </button>

                      <button
                        type="button"
                        className="toolbar-btn"
                        onClick={() => executeBulk('star')}
                        title="Star"
                      >
                        <Star size={16} strokeWidth={1.8} />
                      </button>

                      {/* Apply Label Dropdown */}
                      <div className="toolbar-dropdown-wrap">
                        <button
                          type="button"
                          className="toolbar-btn"
                          onClick={() => setShowLabelDropdown((prev) => !prev)}
                          title="Apply label"
                        >
                          <Tag size={16} strokeWidth={1.8} />
                        </button>

                        {showLabelDropdown && (
                          <div className="toolbar-dropdown-menu">
                            <span className="dropdown-menu-header">Apply Label:</span>
                            {labels.map((lbl) => (
                              <button
                                key={lbl.id}
                                type="button"
                                onClick={() => {
                                  executeBulk('add_label', lbl.name);
                                  setShowLabelDropdown(false);
                                }}
                              >
                                <span
                                  className="dropdown-color-dot"
                                  style={{ backgroundColor: lbl.color || '#299EFF' }}
                                />
                                <span>{lbl.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Move to Category Dropdown */}
                      <div className="toolbar-dropdown-wrap">
                        <button
                          type="button"
                          className="toolbar-btn"
                          onClick={() => setShowCategoryDropdown((prev) => !prev)}
                          title="Move to category"
                        >
                          <FolderInput size={16} strokeWidth={1.8} />
                        </button>

                        {showCategoryDropdown && (
                          <div className="toolbar-dropdown-menu">
                            <span className="dropdown-menu-header">Categorize as:</span>
                            {['primary', 'social', 'promotions', 'updates', 'forums'].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  executeBulk('category', c);
                                  setShowCategoryDropdown(false);
                                }}
                              >
                                {c.charAt(0).toUpperCase() + c.slice(1)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Default: Refresh & Empty Trash buttons */
                    <div className="toolbar-default-actions">
                      <button
                        type="button"
                        className="toolbar-btn"
                        onClick={loadEmails}
                        title="Refresh"
                      >
                        <RefreshCw size={15} strokeWidth={1.8} className={loading ? 'spinning' : ''} />
                      </button>

                      {currentFolder === 'trash' && emails.length > 0 && (
                        <button
                          type="button"
                          className="btn-empty-trash"
                          onClick={handleEmptyTrash}
                          title="Empty Trash now"
                        >
                          <Trash2 size={13} strokeWidth={1.8} />
                          <span>Empty Trash</span>
                        </button>
                      )}

                      <span className="toolbar-folder-title">
                        {folderTitle}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right side: Pagination (1–25 of 142) */}
                <div className="toolbar-right-group">
                  <span className="pagination-info">
                    {filteredEmails.length === 0
                      ? '0 of 0'
                      : `${startIndex + 1}–${endIndex} of ${filteredEmails.length}`}
                  </span>

                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    title="Newer"
                  >
                    <ChevronLeft size={16} strokeWidth={2} />
                  </button>

                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    title="Older"
                  >
                    <ChevronRight size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Category Tabs (Primary, Social, Promotions, Updates, Forums) — Only in Inbox */}
              {currentFolder === 'inbox' && !advancedSearchParams && (
                <div className="category-tabs-container">
                  {[
                    { id: 'primary', label: 'Primary', icon: Inbox, color: '#299EFF' },
                    { id: 'social', label: 'Social', icon: Users, color: '#6554F0' },
                    { id: 'promotions', label: 'Promotions', icon: ShoppingBag, color: '#00E676' },
                    { id: 'updates', label: 'Updates', icon: Info, color: '#FFB300' },
                    { id: 'forums', label: 'Forums', icon: MessageSquare, color: '#E040FB' },
                  ].map((cat) => {
                    const CatIcon = cat.icon;
                    const isActive = currentCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`category-tab ${isActive ? 'active' : ''}`}
                        onClick={() => setCurrentCategory(cat.id)}
                      >
                        <CatIcon
                          size={16}
                          strokeWidth={isActive ? 2.2 : 1.8}
                          color={isActive ? cat.color : 'var(--text-muted)'}
                          className="category-tab-icon"
                        />
                        <span className="category-tab-label">{cat.label}</span>
                        {isActive && (
                          <div
                            className="category-tab-indicator"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Error Banner */}
              {error && <div className="error-banner" style={{ margin: '12px 16px 0' }}>{error}</div>}

              {/* Message List or Empty State */}
              {loading ? (
                <div className="empty-state">
                  <RefreshCw size={24} className="spinning" color="#299EFF" />
                  <p style={{ marginTop: '12px' }}>Loading your encrypted messages...</p>
                </div>
              ) : paginatedEmails.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <img
                      src="/assets/encrypto-icon-transparent.png"
                      alt=""
                      style={{ width: '48px', height: '48px', opacity: 0.5 }}
                    />
                  </div>
                  <h3>Your {folderTitle} is empty</h3>
                  <p>No messages match this folder or filter.</p>
                </div>
              ) : (
                <div className="email-list">
                  {paginatedEmails.map((email) => (
                    <EmailItem
                      key={email.id}
                      email={email}
                      folder={currentFolder}
                      isSentFolder={currentFolder === 'sent'}
                      isSelected={selectedIds.has(email.id)}
                      onSelect={handleSelectEmail}
                      onToggleSelect={handleToggleSelect}
                      onToggleStar={handleToggleStar}
                      onToggleImportant={handleToggleImportant}
                      onArchive={handleArchive}
                      onDelete={handleDeleteRow}
                      onToggleRead={handleToggleRead}
                      onSnooze={handleSnooze}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating Compose Window */}
      <ComposeModal
        isOpen={isComposeOpen}
        initialData={composeData}
        onClose={() => {
          setIsComposeOpen(false);
          setComposeData(null);
        }}
        onEmailSent={() => {
          loadEmails();
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdated={(newSettings) => {
          setSettings(newSettings);
        }}
      />

      {/* Label Modal */}
      <LabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        labels={labels}
        onLabelsUpdated={loadLabels}
      />

      {/* Help & Shortcuts Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
