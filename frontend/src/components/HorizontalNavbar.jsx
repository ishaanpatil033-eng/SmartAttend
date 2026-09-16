import React, { useState, useEffect, useRef } from 'react';

const HorizontalNavbar = ({
  role,
  activeTab,
  activeSubTab,
  onNavigate
}) => {
  const userRole = (role || '').toLowerCase();
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });
  const navListRef = useRef(null);
  const activeTriggerElRef = useRef(null);
  const activeMenuElRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // Position the floating dropdown menu relative to the triggering button
  const calculatePosition = (triggerEl) => {
    if (triggerEl) {
      const rect = triggerEl.getBoundingClientRect();
      const menuWidth = 300;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 16));
      setDropdownCoords({
        top: Math.round(rect.bottom + 8),
        left: Math.round(left)
      });
    }
  };

  const handleDropdownOpen = (dropdownId, targetEl) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (targetEl) {
      activeTriggerElRef.current = targetEl;
      calculatePosition(targetEl);
      setOpenDropdownId(dropdownId);
    }
  };

  const handleDropdownClose = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setOpenDropdownId(null);
    }, 220);
  };

  const handleDropdownTriggerClick = (dropdownId, e) => {
    e.preventDefault();
    if (openDropdownId === dropdownId) {
      setOpenDropdownId(null);
    } else {
      handleDropdownOpen(dropdownId, e.currentTarget);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const inTrigger = activeTriggerElRef.current && activeTriggerElRef.current.contains(event.target);
      const inMenu = activeMenuElRef.current && activeMenuElRef.current.contains(event.target);
      if (!inTrigger && !inMenu) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Close dropdown smoothly when window or navbar scrolls, or when resized
  useEffect(() => {
    if (!openDropdownId) return;
    const handleScrollOrResize = () => {
      setOpenDropdownId(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openDropdownId]);

  // Enable horizontal mouse wheel scrolling over the navigation list
  useEffect(() => {
    const el = navListRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (el.scrollWidth > el.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [userRole]);

  // Calculate and smoothly scroll navbar container to position the selected item as close to center as possible
  const centerItem = (element, smooth = true) => {
    const container = navListRef.current;
    if (!container || !element) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = element.getBoundingClientRect();

    const containerCenter = containerRect.left + containerRect.width / 2;
    const itemCenter = itemRect.left + itemRect.width / 2;
    const diff = itemCenter - containerCenter;

    // Requirement 8: If the selected item is already near the center (within 20px), do not unnecessarily move
    if (Math.abs(diff) < 20) return;

    const currentScroll = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    // Requirement 9: At extreme beginning/end, center as much as physically possible within boundaries
    const targetScroll = Math.max(0, Math.min(currentScroll + diff, maxScroll));

    if (Math.abs(targetScroll - currentScroll) >= 1) {
      container.scrollTo({
        left: Math.round(targetScroll),
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  // Auto-center active item when tab, subtab, or role changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (navListRef.current) {
        const activeEl = navListRef.current.querySelector('.nav-item-active');
        if (activeEl) {
          centerItem(activeEl, true);
        }
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [activeTab, activeSubTab, userRole]);

  // Click delegation handler to immediately start centering clicked nav item
  const handleNavListClick = (e) => {
    const item = e.target.closest('.horizontal-nav-item');
    if (item && navListRef.current && navListRef.current.contains(item)) {
      if (item.classList.contains('horizontal-dropdown-trigger')) {
        return;
      }
      centerItem(item, true);
    }
  };

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

  // Helper to check if the Subjects & Courses dropdown has an active subitem
  const isSubjectsActive = () => {
    if (userRole === 'admin') {
      return activeTab === 'admin-dashboard' && (activeSubTab === 'courses' || activeSubTab === 'materials' || activeSubTab === 'assignments' || activeSubTab === 'experiments');
    }
    if (userRole === 'teacher' || userRole === 'faculty') {
      return activeTab === 'teacher-dashboard' && (activeSubTab === 'materials' || activeSubTab === 'assignments' || activeSubTab === 'experiments' || activeSubTab === 'coursework');
    }
    if (userRole === 'student') {
      return activeTab === 'student-dashboard' && (activeSubTab === 'materials' || activeSubTab === 'assignments' || activeSubTab === 'experiments' || activeSubTab === 'coursework');
    }
    return false;
  };

  const isAttendanceActive = () => {
    return activeTab === 'admin-dashboard' && (activeSubTab === 'records' || activeSubTab === 'defaulters');
  };

  const isQrActive = () => {
    return activeTab === 'teacher-qr' || activeTab === 'student-scan';
  };

  const isUsersActive = () => {
    return activeTab === 'admin-dashboard' && (activeSubTab === 'students' || activeSubTab === 'faculty');
  };

  const isAcademicActive = () => {
    return activeTab === 'hod-dashboard' && (activeSubTab === 'students' || activeSubTab === 'faculty' || activeSubTab === 'overview');
  };

  const handleItemClick = (tabKey, subTabKey = null) => {
    onNavigate(tabKey, subTabKey);
    setOpenDropdownId(null);
    if (onCloseMobile) onCloseMobile();
  };

  // Render the Subjects & Courses Dropdown for non-admin roles (Teacher & Student)
  const renderSubjectsDropdown = () => {
    let parentTabKey = 'student-dashboard';
    if (userRole === 'admin') parentTabKey = 'admin-dashboard';
    else if (userRole === 'teacher' || userRole === 'faculty') parentTabKey = 'teacher-dashboard';

    const isActive = isSubjectsActive();
    const isOpen = openDropdownId === 'subjects';

    return (
      <div
        className={`horizontal-dropdown-wrapper ${isOpen ? 'dropdown-open' : ''}`}
        onMouseEnter={(e) => handleDropdownOpen('subjects', e.currentTarget.querySelector('.horizontal-dropdown-trigger'))}
        onMouseLeave={handleDropdownClose}
      >
        <button
          type="button"
          className={`horizontal-nav-item horizontal-dropdown-trigger ${isActive ? 'nav-item-active' : ''}`}
          onClick={(e) => handleDropdownTriggerClick('subjects', e)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          title="Subjects &amp; Academic Coursework"
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <span className="nav-item-text">Subjects &amp; Courses</span>
          <svg className={`dropdown-caret ${isOpen ? 'caret-rotated' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {isOpen && (
          <div
            ref={activeMenuElRef}
            className="horizontal-dropdown-menu"
            role="menu"
            style={{ top: `${dropdownCoords.top}px`, left: `${dropdownCoords.left}px` }}
            onMouseEnter={() => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); }}
            onMouseLeave={handleDropdownClose}
          >
            <button
              type="button"
              role="menuitem"
              className={`horizontal-dropdown-item ${isItemActive(parentTabKey, 'materials') ? 'dropdown-item-active' : ''}`}
              onClick={() => handleItemClick(parentTabKey, 'materials')}
            >
              <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <div className="dropdown-item-info">
                <span className="dropdown-item-title">Learning Materials</span>
                <span className="dropdown-item-desc">Lecture notes, syllabus &amp; study resources</span>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              className={`horizontal-dropdown-item ${isItemActive(parentTabKey, 'assignments') ? 'dropdown-item-active' : ''}`}
              onClick={() => handleItemClick(parentTabKey, 'assignments')}
            >
              <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <div className="dropdown-item-info">
                <span className="dropdown-item-title">Assignments</span>
                <span className="dropdown-item-desc">Course problem sets &amp; submissions</span>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              className={`horizontal-dropdown-item ${isItemActive(parentTabKey, 'experiments') ? 'dropdown-item-active' : ''}`}
              onClick={() => handleItemClick(parentTabKey, 'experiments')}
            >
              <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2v7.31M14 2v7.31M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0"></path>
              </svg>
              <div className="dropdown-item-info">
                <span className="dropdown-item-title">Experiments</span>
                <span className="dropdown-item-desc">Laboratory practicals &amp; lab manuals</span>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile drawer backdrop */}
      {isMobileOpen && (
        <div
          className="horizontal-nav-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <nav className={`horizontal-navbar ${isMobileOpen ? 'navbar-mobile-open' : ''}`} aria-label="Main horizontal navigation">
        <div className="horizontal-nav-inner">
          <div className="horizontal-nav-list" ref={navListRef} onClick={handleNavListClick}>

            {/* ============================================================ */}
            {/* 1. ADMIN ROLE HORIZONTAL NAVBAR                              */}
            {/* ============================================================ */}
            {userRole === 'admin' && (
              <>
                {/* 1. Home */}
                <button
                  type="button"
                  className={`horizontal-nav-item ${isItemActive('admin-dashboard', 'overview') ? 'nav-item-active' : ''}`}
                  onClick={() => handleItemClick('admin-dashboard', 'overview')}
                >
                  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <span className="nav-item-text">Home</span>
                </button>

                {/* 2. Subjects & Courses (Dropdown) */}
                <div
                  className={`horizontal-dropdown-wrapper ${openDropdownId === 'subjects' ? 'dropdown-open' : ''}`}
                  onMouseEnter={(e) => handleDropdownOpen('subjects', e.currentTarget.querySelector('.horizontal-dropdown-trigger'))}
                  onMouseLeave={handleDropdownClose}
                >
                  <button
                    type="button"
                    className={`horizontal-nav-item horizontal-dropdown-trigger ${isSubjectsActive() ? 'nav-item-active' : ''}`}
                    onClick={(e) => handleDropdownTriggerClick('subjects', e)}
                    aria-haspopup="true"
                    aria-expanded={openDropdownId === 'subjects'}
                    title="Subjects &amp; Academic Coursework"
                  >
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    <span className="nav-item-text">Subjects &amp; Courses</span>
                    <svg className={`dropdown-caret ${openDropdownId === 'subjects' ? 'caret-rotated' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>

                  {openDropdownId === 'subjects' && (
                    <div
                      ref={activeMenuElRef}
                      className="horizontal-dropdown-menu"
                      role="menu"
                      style={{ top: `${dropdownCoords.top}px`, left: `${dropdownCoords.left}px` }}
                      onMouseEnter={() => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); }}
                      onMouseLeave={handleDropdownClose}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('admin-dashboard', 'materials') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('admin-dashboard', 'materials')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Learning Materials</span>
                          <span className="dropdown-item-desc">Lecture notes, syllabus &amp; study resources</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('admin-dashboard', 'assignments') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('admin-dashboard', 'assignments')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Assignments</span>
                          <span className="dropdown-item-desc">Course problem sets &amp; submissions</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('admin-dashboard', 'experiments') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('admin-dashboard', 'experiments')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 2v7.31M14 2v7.31M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Experiments</span>
                          <span className="dropdown-item-desc">Laboratory practicals &amp; lab manuals</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('admin-dashboard', 'courses') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('admin-dashboard', 'courses')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Manage Courses</span>
                          <span className="dropdown-item-desc">Create, edit &amp; manage all institutional courses</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Classes / Sessions */}
                <button
                  type="button"
                  className={`horizontal-nav-item ${isItemActive('admin-dashboard', 'classes') ? 'nav-item-active' : ''}`}
                  onClick={() => handleItemClick('admin-dashboard', 'classes')}
                >
                  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span className="nav-item-text">Classes / Sessions</span>
                </button>

                {/* 4. Attendance (Dropdown: Attendance Records, Defaulter Lists) */}
                <div
                  className={`horizontal-dropdown-wrapper ${openDropdownId === 'attendance' ? 'dropdown-open' : ''}`}
                  onMouseEnter={(e) => handleDropdownOpen('attendance', e.currentTarget.querySelector('.horizontal-dropdown-trigger'))}
                  onMouseLeave={handleDropdownClose}
                >
                  <button
                    type="button"
                    className={`horizontal-nav-item horizontal-dropdown-trigger ${isAttendanceActive() ? 'nav-item-active' : ''}`}
                    onClick={(e) => handleDropdownTriggerClick('attendance', e)}
                    aria-haspopup="true"
                    aria-expanded={openDropdownId === 'attendance'}
                    title="Attendance Reports &amp; Defaulter Lists"
                  >
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4"></path>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    <span className="nav-item-text">Attendance</span>
                    <svg className={`dropdown-caret ${openDropdownId === 'attendance' ? 'caret-rotated' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>

                  {openDropdownId === 'attendance' && (
                    <div
                      ref={activeMenuElRef}
                      className="horizontal-dropdown-menu"
                      role="menu"
                      style={{ top: `${dropdownCoords.top}px`, left: `${dropdownCoords.left}px` }}
                      onMouseEnter={() => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); }}
                      onMouseLeave={handleDropdownClose}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('admin-dashboard', 'records') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('admin-dashboard', 'records')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <polyline points="9 15 11 17 15 13"></polyline>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Attendance Records</span>
                          <span className="dropdown-item-desc">Comprehensive verified scan reports &amp; history</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('admin-dashboard', 'defaulters') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('admin-dashboard', 'defaulters')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                          <line x1="12" y1="9" x2="12" y2="13"></line>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Defaulter Lists</span>
                          <span className="dropdown-item-desc">Students below 75% attendance &amp; Excel export</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. QR Attendance (Dropdown: Launch Dynamic QR, Scan QR Attendance) */}
                <div
                  className={`horizontal-dropdown-wrapper ${openDropdownId === 'qr' ? 'dropdown-open' : ''}`}
                  onMouseEnter={(e) => handleDropdownOpen('qr', e.currentTarget.querySelector('.horizontal-dropdown-trigger'))}
                  onMouseLeave={handleDropdownClose}
                >
                  <button
                    type="button"
                    className={`horizontal-nav-item horizontal-dropdown-trigger ${isQrActive() ? 'nav-item-active' : ''}`}
                    onClick={(e) => handleDropdownTriggerClick('qr', e)}
                    aria-haspopup="true"
                    aria-expanded={openDropdownId === 'qr'}
                    title="Dynamic QR Generation &amp; Mobile Scanning"
                  >
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                      <path d="M14 14h3v3h-3z"></path>
                      <path d="M17 17h4v4h-4z"></path>
                    </svg>
                    <span className="nav-item-text">QR Attendance</span>
                    <svg className={`dropdown-caret ${openDropdownId === 'qr' ? 'caret-rotated' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>

                  {openDropdownId === 'qr' && (
                    <div
                      ref={activeMenuElRef}
                      className="horizontal-dropdown-menu"
                      role="menu"
                      style={{ top: `${dropdownCoords.top}px`, left: `${dropdownCoords.left}px` }}
                      onMouseEnter={() => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); }}
                      onMouseLeave={handleDropdownClose}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('teacher-qr') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('teacher-qr')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                          <path d="M14 14h3v3h-3z"></path>
                          <path d="M17 17h4v4h-4z"></path>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Launch Dynamic QR</span>
                          <span className="dropdown-item-desc">Live 5-second rotating classroom projector session</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('student-scan') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('student-scan')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                          <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                          <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                          <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                          <line x1="7" y1="12" x2="17" y2="12"></line>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Scan QR Attendance</span>
                          <span className="dropdown-item-desc">Test mobile camera QR scanner &amp; GPS geofence</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* 6. Users (Dropdown: Students, Faculty, Faculty Assignment) */}
                <div
                  className={`horizontal-dropdown-wrapper ${openDropdownId === 'users' ? 'dropdown-open' : ''}`}
                  onMouseEnter={(e) => handleDropdownOpen('users', e.currentTarget.querySelector('.horizontal-dropdown-trigger'))}
                  onMouseLeave={handleDropdownClose}
                >
                  <button
                    type="button"
                    className={`horizontal-nav-item horizontal-dropdown-trigger ${isUsersActive() ? 'nav-item-active' : ''}`}
                    onClick={(e) => handleDropdownTriggerClick('users', e)}
                    aria-haspopup="true"
                    aria-expanded={openDropdownId === 'users'}
                    title="Students &amp; Faculty Administration"
                  >
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span className="nav-item-text">Users</span>
                    <svg className={`dropdown-caret ${openDropdownId === 'users' ? 'caret-rotated' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>

                  {openDropdownId === 'users' && (
                    <div
                      ref={activeMenuElRef}
                      className="horizontal-dropdown-menu"
                      role="menu"
                      style={{ top: `${dropdownCoords.top}px`, left: `${dropdownCoords.left}px` }}
                      onMouseEnter={() => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); }}
                      onMouseLeave={handleDropdownClose}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('admin-dashboard', 'students') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('admin-dashboard', 'students')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Students</span>
                          <span className="dropdown-item-desc">Register, edit &amp; manage student profiles</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('admin-dashboard', 'faculty') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('admin-dashboard', 'faculty')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Faculty</span>
                          <span className="dropdown-item-desc">Register, edit &amp; manage faculty accounts</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('admin-dashboard', 'faculty') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('admin-dashboard', 'faculty')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="8.5" cy="7" r="4"></circle>
                          <line x1="20" y1="8" x2="20" y2="14"></line>
                          <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Faculty Assignment</span>
                          <span className="dropdown-item-desc">Assign faculty members to institutional courses</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* 7. Academic Management (Dropdown: Student Roster, Faculty Roster) */}
                <div
                  className={`horizontal-dropdown-wrapper ${openDropdownId === 'academic' ? 'dropdown-open' : ''}`}
                  onMouseEnter={(e) => handleDropdownOpen('academic', e.currentTarget.querySelector('.horizontal-dropdown-trigger'))}
                  onMouseLeave={handleDropdownClose}
                >
                  <button
                    type="button"
                    className={`horizontal-nav-item horizontal-dropdown-trigger ${isAcademicActive() ? 'nav-item-active' : ''}`}
                    onClick={(e) => handleDropdownTriggerClick('academic', e)}
                    aria-haspopup="true"
                    aria-expanded={openDropdownId === 'academic'}
                    title="Department Rosters &amp; Academic Oversight"
                  >
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                      <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                    </svg>
                    <span className="nav-item-text">Academic Management</span>
                    <svg className={`dropdown-caret ${openDropdownId === 'academic' ? 'caret-rotated' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>

                  {openDropdownId === 'academic' && (
                    <div
                      ref={activeMenuElRef}
                      className="horizontal-dropdown-menu"
                      role="menu"
                      style={{ top: `${dropdownCoords.top}px`, left: `${dropdownCoords.left}px` }}
                      onMouseEnter={() => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); }}
                      onMouseLeave={handleDropdownClose}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('hod-dashboard', 'students') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('hod-dashboard', 'students')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Student Roster</span>
                          <span className="dropdown-item-desc">Cohort rosters &amp; live attendance drill-downs</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className={`horizontal-dropdown-item ${isItemActive('hod-dashboard', 'faculty') ? 'dropdown-item-active' : ''}`}
                        onClick={() => handleItemClick('hod-dashboard', 'faculty')}
                      >
                        <svg className="dropdown-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <div className="dropdown-item-info">
                          <span className="dropdown-item-title">Faculty Roster</span>
                          <span className="dropdown-item-desc">Department faculty directory &amp; teaching loads</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* 8. Announcements */}
                <button
                  type="button"
                  className={`horizontal-nav-item ${isItemActive('admin-dashboard', 'announcements') ? 'nav-item-active' : ''}`}
                  onClick={() => handleItemClick('admin-dashboard', 'announcements')}
                >
                  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <span className="nav-item-text">Announcements</span>
                </button>

                {/* 9. Peer Chat & Directory */}
                <button
                  type="button"
                  className={`horizontal-nav-item ${isItemActive('student-dashboard', 'classmates') || isItemActive('student-dashboard', 'messages') ? 'nav-item-active' : ''}`}
                  onClick={() => handleItemClick('student-dashboard', 'classmates')}
                >
                  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span className="nav-item-text">Peer Chat &amp; Directory</span>
                </button>

                {/* 10. Moodle LMS */}
                <button
                  type="button"
                  className={`horizontal-nav-item ${isItemActive('moodle') ? 'nav-item-active' : ''}`}
                  onClick={() => handleItemClick('moodle')}
                >
                  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  <span className="nav-item-text">Moodle LMS</span>
                </button>

                {/* 11. System Settings */}
                <button
                  type="button"
                  className={`horizontal-nav-item ${isItemActive('admin-dashboard', 'profile') ? 'nav-item-active' : ''}`}
                  onClick={() => handleItemClick('admin-dashboard', 'profile')}
                >
                  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  <span className="nav-item-text">System Settings</span>
                </button>
              </>
            )}

          {/* ============================================================ */}
          {/* 2. HOD ROLE HORIZONTAL NAVBAR                                */}
          {/* ============================================================ */}
          {userRole === 'hod' && (
            <>
              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('hod-dashboard', 'overview') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'overview')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className="nav-item-text">Home</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('hod-dashboard', 'courses') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'courses')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span className="nav-item-text">Department Subjects</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('hod-dashboard', 'classes') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'classes')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="nav-item-text">Conducted Classes</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('hod-dashboard', 'records') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'records')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <polyline points="9 15 11 17 15 13"></polyline>
                </svg>
                <span className="nav-item-text">Attendance Records</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('hod-dashboard', 'defaulters') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'defaulters')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span className="nav-item-text">Defaulter Lists</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('hod-dashboard', 'students') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'students')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <span className="nav-item-text">Student Roster</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('hod-dashboard', 'faculty') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'faculty')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span className="nav-item-text">Faculty Roster</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('hod-dashboard', 'announcements') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'announcements')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span className="nav-item-text">Announcements</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('moodle') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('moodle')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span className="nav-item-text">Moodle LMS</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('hod-dashboard', 'profile') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('hod-dashboard', 'profile')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span className="nav-item-text">Department Profile</span>
              </button>
            </>
          )}

          {/* ============================================================ */}
          {/* 3. FACULTY / TEACHER ROLE HORIZONTAL NAVBAR                  */}
          {/* ============================================================ */}
          {(userRole === 'teacher' || userRole === 'faculty') && (
            <>
              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('teacher-dashboard', 'overview') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'overview')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className="nav-item-text">Home</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('teacher-qr') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-qr')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                  <path d="M14 14h3v3h-3z"></path>
                  <path d="M17 17h4v4h-4z"></path>
                </svg>
                <span className="nav-item-text">Launch Dynamic QR</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('teacher-dashboard', 'classes') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'classes')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="nav-item-text">My Classes / Sessions</span>
              </button>

              {/* Subjects & Courses Dropdown (Learning Materials, Assignments, Experiments) */}
              {renderSubjectsDropdown()}

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('teacher-dashboard', 'attendance') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'attendance')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <polyline points="9 15 11 17 15 13"></polyline>
                </svg>
                <span className="nav-item-text">Attendance Records</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('teacher-dashboard', 'defaulters') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'defaulters')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span className="nav-item-text">Defaulter Lists</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('teacher-dashboard', 'announcements') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'announcements')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span className="nav-item-text">Announcements</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('moodle') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('moodle')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span className="nav-item-text">Moodle LMS</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('teacher-dashboard', 'profile') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('teacher-dashboard', 'profile')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span className="nav-item-text">Faculty Profile</span>
              </button>
            </>
          )}

          {/* ============================================================ */}
          {/* 4. STUDENT ROLE HORIZONTAL NAVBAR                            */}
          {/* ============================================================ */}
          {userRole === 'student' && (
            <>
              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('student-dashboard', 'overview') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'overview')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className="nav-item-text">Home</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('student-scan') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('student-scan')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                  <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                  <line x1="7" y1="12" x2="17" y2="12"></line>
                </svg>
                <span className="nav-item-text">Scan QR Attendance</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('student-dashboard', 'classes') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'classes')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="nav-item-text">My Classes / Lectures</span>
              </button>

              {/* Subjects & Courses Dropdown (Learning Materials, Assignments, Experiments) */}
              {renderSubjectsDropdown()}

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('student-dashboard', 'deadlines') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'deadlines')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span className="nav-item-text">Assignment Deadlines</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('student-dashboard', 'announcements') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'announcements')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span className="nav-item-text">Announcements</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('student-dashboard', 'classmates') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'classmates')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span className="nav-item-text">Peer Chat &amp; Directory</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('moodle') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('moodle')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span className="nav-item-text">Moodle LMS</span>
              </button>

              <button
                type="button"
                className={`horizontal-nav-item ${isItemActive('student-dashboard', 'profile') ? 'nav-item-active' : ''}`}
                onClick={() => handleItemClick('student-dashboard', 'profile')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span className="nav-item-text">Student Profile</span>
              </button>
            </>
          )}

          </div>
        </div>
      </nav>
    </>
  );
};

export default HorizontalNavbar;
