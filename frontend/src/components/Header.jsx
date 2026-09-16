import React, { useState } from 'react';
import ChangePasswordModal from './ChangePasswordModal.jsx';

const Header = ({
  onSwitchRole,
  onLogout,
  currentRole,
  currentUser,
  onToggleMobileSidebar,
  onToggleMobileNav
}) => {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const userRoleStr = ((currentUser && currentUser.role) || currentRole || '').toUpperCase();
  const toggleMobileNav = onToggleMobileNav || onToggleMobileSidebar;

  const getRoleDisplayName = (r) => {
    const raw = (r || '').toLowerCase();
    if (raw === 'admin') return 'Admin';
    if (raw === 'teacher' || raw === 'faculty') return 'Teacher';
    if (raw === 'hod') return 'Hod';
    if (raw === 'student') return 'Student';
    return r ? r.charAt(0).toUpperCase() + r.slice(1).toLowerCase() : 'User';
  };

  return (
    <header className="topbar header-compact">
      <div className="header-brand-group">
        {/* Mobile/Tablet Horizontal Navbar Toggle */}
        {currentUser && toggleMobileNav && (
          <button
            type="button"
            className="mobile-sidebar-toggle-btn topbar-sidebar-toggle"
            onClick={toggleMobileNav}
            aria-label="Toggle navigation menu"
            title="Toggle Navigation Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}

        <div className="brand-identity-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="brand-mark">SA</span>
          <div className="header-brand-text">
            <span className="brand-name">
              Smart<span className="brand-accent">Attend</span>
            </span>
            <span className="header-subtitle">Attendance Management System</span>
          </div>
        </div>
      </div>

      <div className="header-right-actions">
        {currentUser && (
          <div className="header-user-profile" title={`Signed in as ${currentUser.username || currentUser.fullName || 'User'}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="header-user-name">
              {userRoleStr.includes('ADMIN') ? 'System Administrator' : (currentUser.fullName || currentUser.username)}
              {currentUser.studentId ? ` (${currentUser.studentId})` : ''}
            </span>
          </div>
        )}

        {currentRole && (
          <div className={`header-role-badge badge-${(currentRole || '').toLowerCase()}`}>
            Role: <span className="header-role-name">{getRoleDisplayName(currentRole)}</span>
          </div>
        )}

        {currentUser && (
          <button
            type="button"
            className="header-btn-pwd"
            onClick={() => setIsChangePasswordOpen(true)}
            title="Change your account password"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-1.5 1.5L10 13l-4 4-2-2 4-4 7.5-7.5z"></path>
              <circle cx="7.5" cy="16.5" r="4.5"></circle>
            </svg>
            <span>Change Password</span>
          </button>
        )}

        {currentUser ? (
          <button
            type="button"
            className="header-btn-signout"
            onClick={onLogout}
            title="Sign out of SmartAttend session"
          >
            Sign Out
          </button>
        ) : (
          onSwitchRole && (
            <button
              type="button"
              className="btn secondary-btn topbar-nav-btn"
              onClick={onSwitchRole}
              title="Return to role selection"
            >
              Sign In
            </button>
          )
        )}

        <div className="header-status-pill">
          <span className="status-dot-pulse"></span>
          <span>System Online</span>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </header>
  );
};

export default Header;
