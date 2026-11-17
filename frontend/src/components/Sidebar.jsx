// src/components/Sidebar.jsx — Gmail-style Collapsible Sidebar for Encrypto
import React, { useState } from 'react';
import {
  Pencil,
  Inbox,
  Star,
  Clock,
  Send,
  FileText,
  Bookmark,
  Mail,
  AlertOctagon,
  Trash2,
  ChevronDown,
  ChevronUp,
  Tag,
  Plus,
  Users,
  Info,
  MessageSquare,
  ShoppingBag,
} from 'lucide-react';

export default function Sidebar({
  currentFolder,
  currentCategory,
  onSelectFolder,
  onSelectCategory,
  onSelectLabel,
  onOpenCompose,
  counts = {},
  labels = [],
  onOpenLabelModal,
  isCollapsed = false,
}) {
  const [showMore, setShowMore] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // Helper to render folder item
  const renderItem = (id, label, IconComponent, badgeCount = 0) => {
    const isActive = currentFolder === id;

    return (
      <button
        key={id}
        className={`sidebar-item ${isActive ? 'active' : ''}`}
        onClick={() => onSelectFolder(id)}
        title={label}
      >
        <div className="sidebar-item-left">
          <IconComponent
            size={18}
            strokeWidth={isActive ? 2.2 : 1.8}
            className="sidebar-nav-icon"
          />
          {!isCollapsed && <span className="sidebar-item-label">{label}</span>}
        </div>
        {!isCollapsed && badgeCount > 0 && (
          <span className={`badge-count ${id === 'spam' || id === 'trash' ? 'muted' : ''}`}>
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Compose pill button */}
      <div className="compose-btn-wrapper">
        <button
          className="btn-compose"
          onClick={onOpenCompose}
          title="Compose new encrypted email (C)"
        >
          <Pencil size={18} strokeWidth={2.2} color="#FFFFFF" className="compose-icon" />
          {!isCollapsed && <span>Compose</span>}
        </button>
      </div>

      {/* Navigation Folder List */}
      <div className="sidebar-folders-scroll">
        <div className="sidebar-section">
          {renderItem('inbox', 'Inbox', Inbox, counts.inbox)}
          {renderItem('starred', 'Starred', Star, counts.starred)}
          {renderItem('snoozed', 'Snoozed', Clock, counts.snoozed)}
          {renderItem('sent', 'Sent', Send, counts.sent)}
          {renderItem('drafts', 'Drafts', FileText, counts.drafts)}
          {renderItem('important', 'Important', Bookmark, counts.important)}

          {/* Categories Toggle (when expanded) */}
          {!isCollapsed && (
            <div className="sidebar-expandable-group">
              <button
                className="sidebar-toggle-btn"
                onClick={() => setShowCategories((prev) => !prev)}
                title="Toggle Categories"
              >
                <div className="sidebar-item-left">
                  {showCategories ? (
                    <ChevronUp size={16} strokeWidth={2} />
                  ) : (
                    <ChevronDown size={16} strokeWidth={2} />
                  )}
                  <span>Categories</span>
                </div>
              </button>

              {showCategories && (
                <div className="sidebar-sub-items">
                  {[
                    { id: 'primary', label: 'Primary', icon: Inbox },
                    { id: 'social', label: 'Social', icon: Users },
                    { id: 'updates', label: 'Updates', icon: Info },
                    { id: 'forums', label: 'Forums', icon: MessageSquare },
                    { id: 'promotions', label: 'Promotions', icon: ShoppingBag },
                  ].map((cat) => {
                    const CatIcon = cat.icon;
                    const isCatActive = currentFolder === 'inbox' && currentCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        className={`sidebar-sub-item ${isCatActive ? 'active' : ''}`}
                        onClick={() => onSelectCategory(cat.id)}
                      >
                        <CatIcon size={15} strokeWidth={1.8} className="sidebar-nav-icon" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* More / Less Toggle */}
          {!isCollapsed && (
            <button
              className="sidebar-toggle-btn"
              onClick={() => setShowMore((prev) => !prev)}
              title={showMore ? 'Show less' : 'Show more'}
            >
              <div className="sidebar-item-left">
                {showMore ? (
                  <ChevronUp size={16} strokeWidth={2} />
                ) : (
                  <ChevronDown size={16} strokeWidth={2} />
                )}
                <span>{showMore ? 'Less' : 'More'}</span>
              </div>
            </button>
          )}

          {/* Extended folders shown when 'showMore' is true OR when collapsed */}
          {(showMore || isCollapsed) && (
            <>
              {renderItem('all-mail', 'All Mail', Mail, counts.allMail)}
              {renderItem('spam', 'Spam', AlertOctagon, counts.spam)}
              {renderItem('trash', 'Trash', Trash2, counts.trash)}
            </>
          )}
        </div>

        {/* Custom Labels Section */}
        {!isCollapsed && (
          <div className="sidebar-labels-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-title">Labels</span>
              <button
                type="button"
                className="btn-add-label"
                onClick={onOpenLabelModal}
                title="Create new label"
              >
                <Plus size={15} strokeWidth={2} />
              </button>
            </div>

            <div className="sidebar-labels-list">
              {labels.map((lbl) => {
                const isLabelActive = currentFolder === `label:${lbl.name}`;
                return (
                  <button
                    key={lbl.id}
                    className={`sidebar-item label-item ${isLabelActive ? 'active' : ''}`}
                    onClick={() => onSelectLabel(lbl.name)}
                    title={lbl.name}
                  >
                    <div className="sidebar-item-left">
                      <span
                        className="sidebar-label-dot"
                        style={{ backgroundColor: lbl.color || '#299EFF' }}
                      />
                      <span className="sidebar-item-label">{lbl.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Subtle Sidebar Footer Branding */}
      {!isCollapsed && (
        <div className="sidebar-footer">
          <img
            src="/assets/encrypto-icon-transparent.png"
            alt=""
            style={{ width: '20px', height: '20px', objectFit: 'contain', opacity: 0.8 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.4px' }}>
              ENCRYPTO
            </span>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Private & Secure</span>
          </div>
        </div>
      )}
    </aside>
  );
}
