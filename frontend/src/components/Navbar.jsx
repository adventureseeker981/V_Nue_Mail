// src/components/Navbar.jsx — Gmail-inspired Top Header Bar for Encrypto
import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  SlidersHorizontal,
  X,
  HelpCircle,
  Settings,
  ChevronDown,
} from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';
import AccountSettingsModal from './AccountSettingsModal';
import AdvancedSearchModal from './AdvancedSearchModal';
import { getCurrentUser } from '../services/api';

export default function Navbar({
  user,
  searchQuery,
  onSearchChange,
  onAdvancedSearch,
  onLogout,
  onToggleSidebar,
  onOpenSettings,
  onOpenHelp,
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [profileData, setProfileData] = useState(user);

  useEffect(() => {
    setProfileData(user);

    async function fetchFreshUser() {
      try {
        const res = await getCurrentUser();
        if (res?.user) {
          setProfileData(res.user);
        }
      } catch (err) {
        // Fall back to existing prop/localStorage user
      }
    }

    fetchFreshUser();
  }, [user]);

  const displayName = profileData?.display_name || profileData?.name || profileData?.email || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const toggleProfile = () => {
    setIsProfileOpen((prev) => !prev);
  };

  const handleClearSearch = () => {
    onSearchChange('');
  };

  return (
    <header className="top-navbar">
      {/* Left side: Hamburger toggle + Brand Logo */}
      <div className="navbar-left">
        <button
          className="navbar-icon-btn hamburger-btn"
          onClick={onToggleSidebar}
          title="Main menu (toggle sidebar)"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>

        <div className="navbar-brand">
          <div className="navbar-brand-logo-wrap">
            <img
              src="/assets/encrypto-logo-brand.png"
              alt="ENCRYPTO"
              className="navbar-logo-img"
            />
            <span className="navbar-brand-tagline">Private Mail. Always Secure.</span>
          </div>
        </div>
      </div>

      {/* Center: Gmail-style Search bar with Filter slider */}
      <div className="navbar-search-container">
        <div className="navbar-search">
          <Search size={17} strokeWidth={1.8} className="navbar-search-icon" />
          <input
            id="global-search-input"
            type="text"
            className="search-input with-icon"
            placeholder="Search encrypted mail..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={handleClearSearch}
              title="Clear search"
            >
              <X size={15} strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            className={`search-filter-btn ${isAdvancedSearchOpen ? 'active' : ''}`}
            onClick={() => setIsAdvancedSearchOpen((prev) => !prev)}
            title="Show search options"
          >
            <SlidersHorizontal size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* Floating Advanced Search Popover */}
        <AdvancedSearchModal
          isOpen={isAdvancedSearchOpen}
          onClose={() => setIsAdvancedSearchOpen(false)}
          onSearch={(params) => {
            if (onAdvancedSearch) onAdvancedSearch(params);
          }}
        />
      </div>

      {/* Right side: Help, Settings gear, Profile dropdown */}
      <div className="navbar-right">
        {/* Help icon button */}
        <button
          className="navbar-icon-btn"
          onClick={onOpenHelp}
          title="Support & Shortcuts"
          aria-label="Help"
        >
          <HelpCircle size={19} strokeWidth={1.8} />
        </button>

        {/* Settings gear icon button */}
        <button
          className="navbar-icon-btn"
          onClick={onOpenSettings}
          title="Settings & Preferences"
          aria-label="Settings"
        >
          <Settings size={19} strokeWidth={1.8} />
        </button>

        {/* User profile dropdown trigger */}
        <div className="navbar-user-wrapper">
          <button
            className={`navbar-profile-trigger ${isProfileOpen ? 'active' : ''}`}
            onClick={toggleProfile}
            title="Encrypto Account"
            aria-expanded={isProfileOpen}
            aria-haspopup="dialog"
          >
            <div className="user-avatar">{initial}</div>
            <span className="profile-trigger-name">{displayName}</span>
            <ChevronDown
              size={14}
              strokeWidth={2}
              className={`chevron-indicator ${isProfileOpen ? 'rotated' : ''}`}
            />
          </button>

          {/* Profile Dropdown Card */}
          <ProfileDropdown
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            user={profileData}
            onLogout={onLogout}
            onOpenSettings={() => setIsAccountModalOpen(true)}
          />
        </div>
      </div>

      {/* Manage Encrypto Account Settings Modal */}
      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        user={profileData}
      />
    </header>
  );
}
