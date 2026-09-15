import React from 'react';

const Sidebar = ({
  role,
  activeTab,
  activeSubTab,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile
}) => {
  const userRole = (role || '').toLowerCase();

  // Helper to check if a navigation item is currently active
  const isItemActive = (tabKey, subTabKey = null) => {
    if (tabKey !== activeTab) return false;
    if (subTabKey) {
      if (!activeSubTab) {
        return subTabKey === 'overview';
      }
      return activeSubTab === subTabKey;
    }
    return !activeSubTab || activeTab === 'moodle' || activeTab === 'teacher-qr' || activeTab === 'student-scan';
  };

  const handleItemClick = (tabKey, subTabKey = null) => {
    onNavigate(tabKey, subTabKey);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`workspace-sidebar ${isCollapsed ? 'sidebar-collapsed' : ''} ${
          isOpenMobile ? 'sidebar-mobile-open' : ''
        }`}
      >
        <div className="sidebar-inner">
          {/* Mobile Drawer Close Button */}
          <div className="sidebar-mobile-header">
            <div className="sidebar-mobile-brand">
              <span className="brand-mark-mini">SA</span>
              <span className="sidebar-mobile-title">Menu Navigation</span>
            </div>
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          </div>

          {/* ============================================================ */}
          {/* 1. ADMIN SIDEBAR NAVIGATION                                  */}
          {/* Permissions: Subjects, Classes, Users, Faculty Assignment,   */}
          {/* Materials, Assignments, Experiments, Reports, Moodle, Settings*/}
          {/* ============================================================ */}
          {userRole === 'admin' && (
            <div className="sidebar-flat-list">
              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('admin-dashboard', 'overview') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('admin-dashboard', 'overview')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className="sidebar-item-text">Home</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('admin-dashboard', 'courses') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('admin-dashboard', 'courses')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span className="sidebar-item-text">Subjects</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('admin-dashboard', 'classes') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('admin-dashboard', 'classes')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="sidebar-item-text">Classes / Sessions</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('admin-dashboard', 'students') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('admin-dashboard', 'students')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span className="sidebar-item-text">Users</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('admin-dashboard', 'faculty') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('admin-dashboard', 'faculty')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                <span className="sidebar-item-text">Faculty Assignment</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('admin-dashboard', 'announcements') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('admin-dashboard', 'announcements')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span className="sidebar-item-text">Announcements</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('admin-dashboard', 'assignments') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('admin-dashboard', 'assignments')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span className="sidebar-item-text">Assignments</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('admin-dashboard', 'experiments') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('admin-dashboard', 'experiments')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2v7.31M14 2v7.31M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                </svg>
                <span className="sidebar-item-text">Experiments</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('admin-dashboard', 'records') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('admin-dashboard', 'records')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <polyline points="9 15 11 17 15 13"></polyline>
                </svg>
                <span className="sidebar-item-text">Attendance Reports</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('admin-dashboard', 'defaulters') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('admin-dashboard', 'defaulters')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span className="sidebar-item-text">Defaulter Lists</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('moodle') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('moodle')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span className="sidebar-item-text">Moodle LMS</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('admin-dashboard', 'profile') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('admin-dashboard', 'profile')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span className="sidebar-item-text">System Settings</span>
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* 2. HOD SIDEBAR NAVIGATION                                    */}
          {/* Permissions: Academic oversight & viewing without admin controls*/}
          {/* ============================================================ */}
          {userRole === 'hod' && (
            <div className="sidebar-flat-list">
              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('hod-dashboard', 'overview') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'overview')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className="sidebar-item-text">Home</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('hod-dashboard', 'courses') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'courses')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span className="sidebar-item-text">Department Subjects</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('hod-dashboard', 'classes') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'classes')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="sidebar-item-text">Conducted Classes</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('hod-dashboard', 'records') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'records')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span className="sidebar-item-text">Attendance Records</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('hod-dashboard', 'defaulters') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'defaulters')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span className="sidebar-item-text">Defaulter Lists</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('hod-dashboard', 'students') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'students')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <span className="sidebar-item-text">Student Roster</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('hod-dashboard', 'faculty') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'faculty')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span className="sidebar-item-text">Faculty Roster</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('hod-dashboard', 'announcements') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'announcements')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span className="sidebar-item-text">Announcements</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('moodle') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('moodle')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span className="sidebar-item-text">Moodle LMS</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('hod-dashboard', 'profile') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'profile')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span className="sidebar-item-text">Department Profile</span>
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. FACULTY / TEACHER SIDEBAR NAVIGATION                      */}
          {/* Permissions: Assigned subjects/classes & permitted functions */}
          {/* ============================================================ */}
          {(userRole === 'teacher' || userRole === 'faculty') && (
            <div className="sidebar-flat-list">
              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('teacher-dashboard', 'overview') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'overview')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className="sidebar-item-text">Home</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('teacher-qr') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-qr')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                  <path d="M14 14h3v3h-3z"></path>
                  <path d="M17 17h4v4h-4z"></path>
                </svg>
                <span className="sidebar-item-text">Launch Dynamic QR</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('teacher-dashboard', 'classes') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'classes')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="sidebar-item-text">My Classes &amp; Sessions</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('teacher-dashboard', 'coursework') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'coursework')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span className="sidebar-item-text">Subjects &amp; Coursework</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('teacher-dashboard', 'materials') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'materials')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span className="sidebar-item-text">Learning Materials</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('teacher-dashboard', 'assignments') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'assignments')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span className="sidebar-item-text">Assignments</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('teacher-dashboard', 'experiments') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'experiments')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2v7.31M14 2v7.31M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                </svg>
                <span className="sidebar-item-text">Experiments</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('teacher-dashboard', 'attendance') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'attendance')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <polyline points="9 15 11 17 15 13"></polyline>
                </svg>
                <span className="sidebar-item-text">Attendance Records</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('teacher-dashboard', 'defaulters') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'defaulters')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span className="sidebar-item-text">Defaulter Lists</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('teacher-dashboard', 'announcements') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'announcements')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span className="sidebar-item-text">Announcements</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('moodle') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('moodle')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span className="sidebar-item-text">Moodle LMS</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('teacher-dashboard', 'profile') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'profile')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l-.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span className="sidebar-item-text">Faculty Profile</span>
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* 4. STUDENT SIDEBAR NAVIGATION                                */}
          {/* Permissions: Subjects, Classes, Scan QR, Attendance,         */}
          {/* Materials, Assignments, Experiments, Moodle, Chat, Profile   */}
          {/* ============================================================ */}
          {userRole === 'student' && (
            <div className="sidebar-flat-list">
              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('student-dashboard', 'overview') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'overview')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className="sidebar-item-text">Home / Attendance</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('student-scan') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('student-scan')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                  <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                  <line x1="7" y1="12" x2="17" y2="12"></line>
                </svg>
                <span className="sidebar-item-text">Scan QR Attendance</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('student-dashboard', 'classes') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'classes')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="sidebar-item-text">My Classes / Lectures</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('student-dashboard', 'coursework') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'coursework')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span className="sidebar-item-text">Subjects &amp; Courses</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('student-dashboard', 'materials') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'materials')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span className="sidebar-item-text">Learning Materials</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('student-dashboard', 'assignments') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'assignments')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span className="sidebar-item-text">Assignments</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('student-dashboard', 'experiments') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'experiments')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2v7.31M14 2v7.31M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                </svg>
                <span className="sidebar-item-text">Experiments</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('student-dashboard', 'deadlines') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'deadlines')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span className="sidebar-item-text">Assignment Deadlines</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('student-dashboard', 'announcements') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'announcements')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span className="sidebar-item-text">Announcements</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('student-dashboard', 'classmates') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'classmates')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span className="sidebar-item-text">Peer Chat &amp; Directory</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('moodle') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('moodle')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span className="sidebar-item-text">Moodle LMS</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isItemActive('student-dashboard', 'profile') ? 'sidebar-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'profile')}
              >
                <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span className="sidebar-item-text">Student Profile</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
