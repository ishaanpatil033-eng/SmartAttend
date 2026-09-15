import React, { useState, useEffect, useCallback } from 'react';
import {
  getHodOverview,
  getCourseAttendanceSummary,
  getStudentAttendanceSummary,
  resetPassword,
  getCourses,
  getClasses,
  toggleClassStatus,
  getClassAttendance,
  deleteClass,
  getFacultyList,
  getDefaulterReport,
  exportDefaulterExcel,
  getAllAnnouncements,
  createCourseAnnouncement,
  deleteAnnouncement
} from '../services/api.js';

const LOW_ATTENDANCE_THRESHOLD = 75.0;

const HodDashboard = ({ currentUser, activeSubTab, onSubTabChange }) => {
  // Active HOD tab: 'overview' | 'defaulters' | 'courses' | 'classes' | 'faculty' | 'announcements' | 'students' | 'records' | 'profile'
  const [internalTab, setInternalTab] = useState(activeSubTab || 'overview');
  const activeHodTab = internalTab;

  useEffect(() => {
    if (activeSubTab && activeSubTab !== internalTab) {
      setInternalTab(activeSubTab);
    }
  }, [activeSubTab]);

  const setActiveHodTab = (tab) => {
    setInternalTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  // Primary HOD data from backend
  const [hodData, setHodData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password reset state
  const [resetTargetId, setResetTargetId] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  // Search/Filter states
  const [defaulterQuery, setDefaulterQuery] = useState('');
  const [courseQuery, setCourseQuery] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');

  // HOD Class / Lecture Sessions State (Authoritative Class = Session + Attendance)
  const [hodClasses, setHodClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [viewingSessionAttendance, setViewingSessionAttendance] = useState(null);
  const [sessionAttendees, setSessionAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  // Multi-criteria report filters for Attendance Records
  const [recordsFilterCourse, setRecordsFilterCourse] = useState('');
  const [recordsFilterSession, setRecordsFilterSession] = useState('');
  const [recordsFilterDateFrom, setRecordsFilterDateFrom] = useState('');
  const [recordsFilterDateTo, setRecordsFilterDateTo] = useState('');

  // Drill-down inspection modals
  const [selectedCourseDetail, setSelectedCourseDetail] = useState(null);
  const [courseDetailLoading, setCourseDetailLoading] = useState(false);

  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);

  // Faculty Section State
  const [facultyList, setFacultyList] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');

  // Announcements State
  const [announcementsList, setAnnouncementsList] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [newHodAnnTitle, setNewHodAnnTitle] = useState('');
  const [newHodAnnContent, setNewHodAnnContent] = useState('');
  const [newHodAnnCourse, setNewHodAnnCourse] = useState('');
  const [newHodAnnDiv, setNewHodAnnDiv] = useState('All');
  const [newHodAnnBatch, setNewHodAnnBatch] = useState('All');
  const [creatingAnn, setCreatingAnn] = useState(false);

  // Real Defaulters State
  const [defaulterCourse, setDefaulterCourse] = useState('');
  const [defaulterDiv, setDefaulterDiv] = useState('All');
  const [defaulterBatch, setDefaulterBatch] = useState('All');
  const [defaulterThreshold, setDefaulterThreshold] = useState(75);
  const [realDefaulterList, setRealDefaulterList] = useState([]);
  const [realDefaulterLoading, setRealDefaulterLoading] = useState(false);
  const [exportingDefaulters, setExportingDefaulters] = useState(false);

  // Fetch department-level overview from Spring Boot backend
  // Load departmental class lecture sessions
  const loadHodClasses = useCallback(async () => {
    try {
      setClassesLoading(true);
      const [classList, courseList] = await Promise.all([
        getClasses({}).catch(() => []),
        getCourses().catch(() => [])
      ]);
      setHodClasses(classList || []);
      setAvailableCourses(courseList || []);
    } catch (err) {
      console.warn('Could not load department classes:', err);
    } finally {
      setClassesLoading(false);
    }
  }, []);

  const loadFaculty = useCallback(async () => {
    try {
      setFacultyLoading(true);
      const data = await getFacultyList();
      setFacultyList(data || []);
    } catch (err) {
      console.warn('Could not load faculty list:', err);
    } finally {
      setFacultyLoading(false);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      setAnnouncementsLoading(true);
      const data = await getAllAnnouncements();
      setAnnouncementsList(data || []);
    } catch (err) {
      console.warn('Could not load announcements:', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  const loadRealDefaulters = useCallback(async () => {
    try {
      setRealDefaulterLoading(true);
      const params = {
        threshold: parseFloat(defaulterThreshold) || 75.0
      };
      if (defaulterCourse && defaulterCourse.trim()) {
        params.courseId = defaulterCourse.trim();
      }
      if (defaulterDiv && defaulterDiv !== 'All') {
        params.division = defaulterDiv;
      }
      if (defaulterBatch && defaulterBatch !== 'All') {
        params.batch = defaulterBatch;
      }
      const data = await getDefaulterReport(params);
      setRealDefaulterList(data || []);
    } catch (err) {
      console.warn('Could not load defaulters report:', err);
      setRealDefaulterList([]);
    } finally {
      setRealDefaulterLoading(false);
    }
  }, [defaulterCourse, defaulterDiv, defaulterBatch, defaulterThreshold]);

  const handleExportDefaultersExcel = async () => {
    try {
      setExportingDefaulters(true);
      const params = {
        threshold: parseFloat(defaulterThreshold) || 75.0
      };
      if (defaulterCourse && defaulterCourse.trim()) {
        params.courseId = defaulterCourse.trim();
      }
      if (defaulterDiv && defaulterDiv !== 'All') {
        params.division = defaulterDiv;
      }
      if (defaulterBatch && defaulterBatch !== 'All') {
        params.batch = defaulterBatch;
      }
      await exportDefaulterExcel(params);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to export Defaulter list Excel.');
    } finally {
      setExportingDefaulters(false);
    }
  };

  const handleCreateHodAnnouncement = async (e) => {
    e.preventDefault();
    if (!newHodAnnTitle.trim() || !newHodAnnContent.trim()) return;
    try {
      setCreatingAnn(true);
      await createCourseAnnouncement({
        courseId: newHodAnnCourse || (availableCourses[0]?.courseId || 'DEPT'),
        title: newHodAnnTitle.trim(),
        content: newHodAnnContent.trim(),
        authorName: 'HOD',
        targetDivision: newHodAnnDiv === 'All' ? null : newHodAnnDiv,
        targetBatch: newHodAnnBatch === 'All' ? null : newHodAnnBatch
      });
      setNewHodAnnTitle('');
      setNewHodAnnContent('');
      await loadAnnouncements();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to post announcement.');
    } finally {
      setCreatingAnn(false);
    }
  };

  const handleDeleteHodAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete announcement.');
    }
  };

  const handleToggleClass = async (cls) => {
    try {
      await toggleClassStatus(cls.id, !cls.active);
      await loadHodClasses();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Could not update session status.');
    }
  };

  const handleDeleteClass = async (id, sessionCode) => {
    if (!window.confirm(`Are you sure you want to delete session ${sessionCode}?`)) {
      return;
    }
    try {
      await deleteClass(id);
      await loadHodClasses();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Could not delete session.');
    }
  };

  const getBatchesForDivision = (div) => {
    if (div === 'B') return ['B1', 'B2', 'B3'];
    if (div === 'C') return ['C1', 'C2', 'C3'];
    return ['A1', 'A2', 'A3'];
  };

  const handleViewSessionAttendance = async (cls) => {
    try {
      setViewingSessionAttendance(cls);
      setAttendeesLoading(true);
      const records = await getClassAttendance(cls.sessionCode);
      setSessionAttendees(records || []);
    } catch (err) {
      setSessionAttendees([]);
    } finally {
      setAttendeesLoading(false);
    }
  };

  const loadHodOverview = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await getHodOverview();
      setHodData(data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load department attendance overview.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHodOverview();
    loadHodClasses();
    loadFaculty();
    loadAnnouncements();
    loadRealDefaulters();
  }, [loadHodOverview, loadHodClasses, loadFaculty, loadAnnouncements, loadRealDefaulters]);

  useEffect(() => {
    if (activeHodTab === 'defaulters') {
      loadRealDefaulters();
    }
  }, [activeHodTab, loadRealDefaulters]);

  // Handle escape key to close open inspection modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedCourseDetail(null);
        setSelectedStudentDetail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Inspect Course drill-down handler
  const handleInspectCourse = async (courseId) => {
    try {
      setCourseDetailLoading(true);
      const detail = await getCourseAttendanceSummary(courseId);
      setSelectedCourseDetail(detail);
    } catch (err) {
      alert(`Could not load details for course ${courseId}: ${err.message}`);
    } finally {
      setCourseDetailLoading(false);
    }
  };

  // Inspect Student drill-down handler
  const handleInspectStudent = async (studentId) => {
    try {
      setStudentDetailLoading(true);
      const detail = await getStudentAttendanceSummary(studentId);
      setSelectedStudentDetail(detail);
    } catch (err) {
      alert(`Could not load details for student ${studentId}: ${err.message}`);
    } finally {
      setStudentDetailLoading(false);
    }
  };

  // Administrative password reset by HOD
  const handleResetPassword = async (targetId, targetName) => {
    const idToReset = (targetId || resetTargetId).trim();
    if (!idToReset) {
      alert('Please enter a Student ID (8 digits) or Faculty ID (6 digits) to reset.');
      return;
    }
    const confirmed = window.confirm(
      `Reset password for ${targetName ? `${targetName} (${idToReset})` : idToReset}?\n\nTheir password will be reset to default institutional pattern.`
    );
    if (!confirmed) return;

    try {
      setResetMsg('');
      const res = await resetPassword(idToReset);
      const msg = `Password for ${targetName || idToReset} reset successfully! Temporary password: ${res.temporaryPassword}`;
      setResetMsg(msg);
      alert(msg);
      setResetTargetId('');
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to reset password.';
      alert(errMsg);
    }
  };

  // Helper to format timestamps and dates
  const formatDateTime = (date, time) => {
    if (!date) return '-';
    const timeStr = time ? ` ${String(time).substring(0, 5)}` : '';
    return `${date}${timeStr}`;
  };

  // Filtered Defaulters
  const filteredDefaulters = (hodData?.defaulters || []).filter((item) => {
    const q = defaulterQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (item.studentId && item.studentId.toLowerCase().includes(q)) ||
      (item.studentName && item.studentName.toLowerCase().includes(q)) ||
      (item.email && item.email.toLowerCase().includes(q))
    );
  });

  // Filtered Courses
  const filteredCourses = (hodData?.courseSummaries || []).filter((c) => {
    const q = courseQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.courseId && c.courseId.toLowerCase().includes(q)) ||
      (c.courseName && c.courseName.toLowerCase().includes(q))
    );
  });

  // Filtered Students
  const filteredStudents = (hodData?.studentAttendanceList || []).filter((s) => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.studentId && s.studentId.toLowerCase().includes(q)) ||
      (s.studentName && s.studentName.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  // Filtered Master History
  const filteredHistory = (hodData?.recentAttendanceHistory || []).filter((rec) => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (rec.student?.studentId && rec.student.studentId.toLowerCase().includes(q)) ||
      (rec.student?.studentName && rec.student.studentName.toLowerCase().includes(q)) ||
      (rec.course?.courseId && rec.course.courseId.toLowerCase().includes(q)) ||
      (rec.course?.courseName && rec.course.courseName.toLowerCase().includes(q)) ||
      (rec.attendanceDate && String(rec.attendanceDate).toLowerCase().includes(q)) ||
      (rec.attendanceStatus && rec.attendanceStatus.toLowerCase().includes(q))
    );
  });

  const overallDeptPct = hodData?.overallDepartmentAttendancePercentage ?? 0;
  const isDeptHealthy = overallDeptPct >= LOW_ATTENDANCE_THRESHOLD;

  const currentDateTimeStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="hod-dashboard-wrapper">
      {/* Error Alert */}
      {errorMsg && (
        <div className="alert error-alert">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* TAB 1: DEPARTMENT OVERVIEW (HOME ONLY) */}
      {activeHodTab === 'overview' && (
        <div className="hod-tab-content">
          {/* 1. HOD PAGE HEADER (HOME ONLY) */}
          <div className="dashboard-page-header">
            <div className="dashboard-page-title-block">
              <h1 className="dashboard-page-title">
                Welcome back, {currentUser?.fullName || sessionStorage.getItem('smartattend_name') || 'Head of Department'}
              </h1>
              <p className="dashboard-page-subtitle">
                {hodData?.departmentName || currentUser?.department || 'Department of Computer Science & Engineering'} &bull; Real-time Academic Oversight
              </p>
            </div>
            <div className="dashboard-page-meta">
              <div className="system-live-clock">
                <span className="live-clock-dot"></span>
                <span>{currentDateTimeStr} &bull; Live Sync Active</span>
              </div>
              <button
                type="button"
                className="btn-refresh-clean"
                onClick={loadHodOverview}
                disabled={loading}
                title="Reload department data from MySQL"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'spin-icon' : ''}>
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
                <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
              </button>
            </div>
          </div>
          {/* 2. STAT CARDS GRID (Reference 4-Card Layout with Pastel Tints) */}
          <div className="dashboard-stats-grid">
            {/* Department Courses */}
            <div className="stat-card stat-card-blue" onClick={() => setActiveHodTab('courses')} role="button" tabIndex="0">
              <div className="stat-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <div className="stat-card-body">
                <span className="stat-card-label">Total Courses</span>
                <div className="stat-card-value">{hodData?.totalCourses ?? 0}</div>
                <span className="stat-card-meta">Active department curriculum</span>
              </div>
            </div>

            {/* Enrolled Students */}
            <div className="stat-card stat-card-green" onClick={() => setActiveHodTab('students')} role="button" tabIndex="0">
              <div className="stat-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="stat-card-body">
                <span className="stat-card-label">Enrolled Students</span>
                <div className="stat-card-value">{hodData?.totalStudents ?? 0}</div>
                <span className="stat-card-meta">Department student cohort</span>
              </div>
            </div>

            {/* Department Faculty */}
            <div className="stat-card stat-card-purple" onClick={() => setActiveHodTab('faculty')} role="button" tabIndex="0">
              <div className="stat-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div className="stat-card-body">
                <span className="stat-card-label">Faculty Teachers</span>
                <div className="stat-card-value">{facultyList.length}</div>
                <span className="stat-card-meta">Department academic staff</span>
              </div>
            </div>

            {/* Total Attendance Records */}
            <div className="stat-card stat-card-orange" onClick={() => setActiveHodTab('records')} role="button" tabIndex="0">
              <div className="stat-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className="stat-card-body">
                <span className="stat-card-label">Attendance Records</span>
                <div className="stat-card-value">{hodData?.totalAttendanceRecords ?? 0}</div>
                <span className="stat-card-meta">Verified dynamic QR logs</span>
              </div>
            </div>
          </div>

          {/* Department Course Attendance Highlights */}
          <div className="card hod-section-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Curriculum Overview</span>
                <h2 className="section-title-clean">Department Course Attendance Highlights</h2>
                <p className="table-caption-clean">
                  Comparative performance and student participation across all active department courses.
                </p>
              </div>
              <span className="pill pill-purple">
                {hodData?.courseSummaries?.length ?? 0} Courses Active
              </span>
            </div>

            {hodData?.courseSummaries && hodData.courseSummaries.length > 0 ? (
              <div className="table-wrapper">
                <table className="hod-data-table">
                  <thead>
                    <tr>
                      <th>Course ID</th>
                      <th>Course Title</th>
                      <th>Assigned Faculty</th>
                      <th>Conducted Sessions</th>
                      <th>Verified Scans</th>
                      <th>Average Attendance</th>
                      <th>Supervisory Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hodData.courseSummaries.map((c) => {
                      const avgPct = c.attendancePercentage ?? 0;
                      const isLow = avgPct < LOW_ATTENDANCE_THRESHOLD && c.totalConductedSessions > 0;
                      return (
                        <tr key={c.courseId}>
                          <td><span className="course-code-badge">{c.courseId}</span></td>
                          <td><span className="course-title-cell">{c.courseName}</span></td>
                          <td>{c.assignedFacultyName || (c.assignedFacultyId ? `ID: ${c.assignedFacultyId}` : 'Unassigned')}</td>
                          <td>{c.totalConductedSessions} sessions</td>
                          <td>{c.totalAttendedRecords} scans</td>
                          <td style={{ minWidth: '160px' }}>
                            <div className="percentage-cell">
                              <span className="percentage-text" style={{
                                color: isLow ? '#b91c1c' : '#047857',
                                fontWeight: '700'
                              }}>
                                {avgPct.toFixed(1)}%
                              </span>
                              <div className="progress-track" style={{ height: '6px' }}>
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${Math.min(avgPct, 100)}%`,
                                    backgroundColor: isLow ? '#ef4444' : '#10b981'
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            {c.totalConductedSessions === 0 ? (
                              <span className="status-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                                No Sessions Yet
                              </span>
                            ) : isLow ? (
                              <span className="badge-low-attendance">
                                Low Attendance (&lt;75%)
                              </span>
                            ) : (
                              <span className="badge-good-attendance">
                                Good Standing
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn secondary-btn hod-table-action-btn"
                              onClick={() => handleInspectCourse(c.courseId)}
                              disabled={courseDetailLoading}
                              title={`Inspect student roster for ${c.courseId}`}
                            >
                              🔍 Inspect Roster
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No department courses registered yet.</p>
                <p className="empty-state-hint">Courses configured by the administration will display here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEFAULTER LIST */}
      {activeHodTab === 'defaulters' && (
        <div className="hod-tab-content">
          <div className="card hod-section-card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span className="eyebrow">Academic Compliance &bull; 75% Requirement</span>
                <h2 className="section-title-clean">Academic Shortage &amp; Defaulter Registry</h2>
                <p className="table-caption-clean">
                  Calculated from authentic session attendance records. Students below {defaulterThreshold}% threshold are listed as Defaulters.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className={`pill ${realDefaulterList.filter(d => d.status === 'Defaulter').length > 0 ? 'pill-danger' : 'pill-success'}`}>
                  {realDefaulterList.filter(d => d.status === 'Defaulter').length} Defaulter(s)
                </span>
                <button
                  type="button"
                  className="btn primary-btn"
                  onClick={handleExportDefaultersExcel}
                  disabled={exportingDefaulters || realDefaulterList.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#15803d', borderColor: '#166534' }}
                >
                  <span>📥</span>
                  <span>{exportingDefaulters ? 'Generating Excel...' : 'Export Defaulter List (Excel .xlsx)'}</span>
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '0 20px 20px 20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Filter by Course</label>
                <select
                  className="input-text"
                  value={defaulterCourse}
                  onChange={(e) => setDefaulterCourse(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="">All Department Courses</option>
                  {availableCourses.map(c => (
                    <option key={c.courseId} value={c.courseId}>{c.courseId} — {c.courseName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Division</label>
                <select
                  className="input-text"
                  value={defaulterDiv}
                  onChange={(e) => {
                    setDefaulterDiv(e.target.value);
                    setDefaulterBatch('All');
                  }}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="All">All Divisions</option>
                  <option value="A">Division A</option>
                  <option value="B">Division B</option>
                  <option value="C">Division C</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Batch</label>
                <select
                  className="input-text"
                  value={defaulterBatch}
                  onChange={(e) => setDefaulterBatch(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="All">All Batches</option>
                  {defaulterDiv === 'A' && ['A1', 'A2', 'A3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {defaulterDiv === 'B' && ['B1', 'B2', 'B3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {defaulterDiv === 'C' && ['C1', 'C2', 'C3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {defaulterDiv === 'All' && ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Threshold Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-text"
                  value={defaulterThreshold}
                  onChange={(e) => setDefaulterThreshold(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="btn secondary-btn"
                  onClick={loadRealDefaulters}
                  disabled={realDefaulterLoading}
                  style={{ width: '100%', padding: '8px' }}
                >
                  {realDefaulterLoading ? 'Computing...' : '↻ Apply Filters'}
                </button>
              </div>
            </div>

            {realDefaulterLoading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '12px', color: '#64748b' }}>Computing attendance records across department...</p>
              </div>
            ) : realDefaulterList.length > 0 ? (
              <div className="table-wrapper">
                <table className="hod-data-table defaulter-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Branch</th>
                      <th>Div / Batch</th>
                      <th>Subject / Course</th>
                      <th>Attended / Total</th>
                      <th>Absent</th>
                      <th>Attendance %</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realDefaulterList.map((d) => (
                      <tr key={`${d.studentId}-${d.courseId}`} style={{ backgroundColor: d.status === 'Defaulter' ? '#fff1f2' : 'transparent' }}>
                        <td>
                          <span className="record-id-chip" style={{ color: d.status === 'Defaulter' ? '#b91c1c' : '#15803d', fontWeight: '700' }}>
                            {d.studentId}
                          </span>
                        </td>
                        <td><strong>{d.studentName}</strong></td>
                        <td>{d.branch || '-'}</td>
                        <td>{d.division || '-'}{d.batch ? ` / ${d.batch}` : ''}</td>
                        <td><strong>{d.courseId}</strong> {d.courseName ? `— ${d.courseName}` : ''}</td>
                        <td>{d.presentClasses} / {d.totalClasses}</td>
                        <td>{d.absentClasses}</td>
                        <td>
                          <span style={{ color: d.status === 'Defaulter' ? '#b91c1c' : '#15803d', fontWeight: '800' }}>
                            {d.attendancePercentage ? d.attendancePercentage.toFixed(1) : '0.0'}%
                          </span>
                        </td>
                        <td>
                          <span className={`pill ${d.status === 'Defaulter' ? 'pill-danger' : 'pill-success'}`}>
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No defaulters found matching the selected filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeHodTab === 'courses' && (
        <div className="hod-tab-content">
          <div className="card hod-section-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Curriculum Analytics</span>
                <h2 className="section-title-clean">Course &amp; Class-Wise Attendance Statistics</h2>
                <p className="table-caption-clean">
                  Comprehensive audit of each academic module conducted by faculty in the department.
                </p>
              </div>
              <span className="pill pill-purple">
                {filteredCourses.length} Courses Tracked
              </span>
            </div>

            <div className="table-filter-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">&#128269;</span>
                <input
                  type="text"
                  placeholder="Filter courses by Code or Name..."
                  value={courseQuery}
                  onChange={(e) => setCourseQuery(e.target.value)}
                  className="input-text hod-search-input"
                />
                {courseQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setCourseQuery('')}
                    title="Clear filter"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {filteredCourses.length > 0 ? (
              <div className="table-wrapper">
                <table className="hod-data-table">
                  <thead>
                    <tr>
                      <th>Course ID</th>
                      <th>Course Name</th>
                      <th>Sessions Conducted</th>
                      <th>Total Verified Scans</th>
                      <th>Attendance Percentage</th>
                      <th>Compliance</th>
                      <th>Detailed Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((c) => {
                      const avgPct = c.attendancePercentage ?? 0;
                      const isLow = avgPct < LOW_ATTENDANCE_THRESHOLD && c.totalConductedSessions > 0;
                      return (
                        <tr key={c.courseId}>
                          <td><span className="course-code-badge">{c.courseId}</span></td>
                          <td><span className="course-title-cell">{c.courseName}</span></td>
                          <td>{c.totalConductedSessions} sessions</td>
                          <td>{c.totalAttendedRecords} scans</td>
                          <td style={{ minWidth: '160px' }}>
                            <div className="percentage-cell">
                              <span className="percentage-text" style={{
                                color: isLow ? '#b91c1c' : '#047857',
                                fontWeight: '700'
                              }}>
                                {avgPct.toFixed(1)}%
                              </span>
                              <div className="progress-track" style={{ height: '6px' }}>
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${Math.min(avgPct, 100)}%`,
                                    backgroundColor: isLow ? '#ef4444' : '#10b981'
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            {c.totalConductedSessions === 0 ? (
                              <span className="status-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                                Not Started
                              </span>
                            ) : isLow ? (
                              <span className="badge-low-attendance">
                                Attention Required
                              </span>
                            ) : (
                              <span className="badge-good-attendance">
                                Compliant
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn primary-btn hod-table-action-btn"
                              onClick={() => handleInspectCourse(c.courseId)}
                              disabled={courseDetailLoading}
                              title={`Inspect roster and attendance for ${c.courseId}`}
                            >
                              🔍 View Class Roster
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No courses match your filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: DEPARTMENT CLASSES / LECTURES */}
      {activeHodTab === 'classes' && (
        <div className="hod-tab-content">
          <div className="card hod-section-card" style={{ marginBottom: '24px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="eyebrow">Academic Delivery</span>
                <h2 className="section-title-clean">Department Lecture &amp; Lab Sessions</h2>
                <p className="table-caption-clean">
                  Authoritative lecture and lab practical sessions for department courses. Attendance is conducted exclusively inside active class sessions.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn secondary-btn"
                  onClick={loadHodClasses}
                  disabled={classesLoading}
                >
                  {classesLoading ? 'Refreshing...' : '↻ Refresh Sessions'}
                </button>
              </div>
            </div>
          </div>

          {classesLoading ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '12px', color: '#64748b' }}>Loading department sessions...</p>
            </div>
          ) : hodClasses.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>📅</span>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No Teaching Sessions Scheduled Yet</h3>
              <p style={{ margin: '0 auto', maxWidth: '520px', color: '#64748b', fontSize: '0.92rem' }}>
                Faculty members create and manage lecture and lab practical sessions for their assigned courses.
              </p>
            </div>
          ) : (
            <div className="lecture-session-grid">
              {hodClasses.map((cls) => {
                const isActive = cls.active;
                return (
                  <div key={cls.id} className="lecture-session-card">
                    <div>
                      <div className="lecture-session-header">
                        <div className="lecture-title-box">
                          <span className="lecture-course-code">{cls.courseId}</span>
                          <h3 className="lecture-course-name">{cls.courseName}</h3>
                        </div>
                        <span className={cls.lectureType === 'LAB' ? 'lecture-type-badge-lab' : 'lecture-type-badge-theory'}>
                          {cls.lectureType === 'LAB' ? '🧪 Lab' : '📖 Theory'}
                        </span>
                      </div>

                      <div className="lecture-meta-grid">
                        <div className="lecture-meta-item">
                          <span className="lecture-meta-label">Session Code</span>
                          <span className="lecture-meta-value">{cls.sessionCode}</span>
                        </div>
                        <div className="lecture-meta-item">
                          <span className="lecture-meta-label">Division / Batch</span>
                          <span className="lecture-meta-value">Div {cls.division || 'All'} • {cls.batch || 'All'}</span>
                        </div>
                        <div className="lecture-meta-item">
                          <span className="lecture-meta-label">Faculty</span>
                          <span className="lecture-meta-value">{cls.facultyName || cls.facultyId || 'Assigned Staff'}</span>
                        </div>
                        <div className="lecture-meta-item">
                          <span className="lecture-meta-label">Date &amp; Time</span>
                          <span className="lecture-meta-value">{cls.sessionDate} • {cls.sessionTime}</span>
                        </div>
                      </div>

                      <div className="lecture-attendance-box">
                        <span>Attendance Marked:</span>
                        <span className="attendance-ratio-badge">
                          {cls.attendanceCount || 0} / {cls.totalStudents || 70} Students
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={`pill ${isActive ? 'pill-success' : 'pill-warning'}`}>
                          {isActive ? '● Active Session' : '○ Concluded'}
                        </span>
                        <button
                          type="button"
                          className={`btn ${isActive ? 'secondary-btn' : 'primary-btn'}`}
                          style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                          onClick={() => handleToggleClass(cls)}
                        >
                          {isActive ? 'Conclude Session' : 'Reactivate'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn secondary-btn"
                          style={{ flex: 1, fontSize: '0.82rem', padding: '7px' }}
                          onClick={() => handleViewSessionAttendance(cls)}
                        >
                          👥 View Attendees
                        </button>
                        <button
                          type="button"
                          className="btn danger-btn"
                          style={{ fontSize: '0.82rem', padding: '7px 12px' }}
                          onClick={() => handleDeleteClass(cls.id, cls.sessionCode)}
                          title="Delete lecture session"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STUDENT ATTENDANCE REGISTRY */}
      {activeHodTab === 'students' && (
        <div className="hod-tab-content">
          <div className="card hod-section-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Cohort Directory</span>
                <h2 className="section-title-clean">Student-Wise Attendance Registry</h2>
                <p className="table-caption-clean">
                  Department cohort attendance records, individual percentages, and academic standing.
                </p>
              </div>
              <span className="pill pill-purple">
                {filteredStudents.length} Students Listed
              </span>
            </div>

            <div className="table-filter-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">&#128269;</span>
                <input
                  type="text"
                  placeholder="Search students by ID, Name or Email..."
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  className="input-text hod-search-input"
                />
                {studentQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setStudentQuery('')}
                    title="Clear filter"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {/* Quick Password Reset for Student or Faculty */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '14px 0', background: 'rgba(99, 102, 241, 0.05)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>🔐 Password Reset Support:</span>
              <input
                type="text"
                placeholder="Enter Student ID (8 digits) or Faculty ID (6 digits)..."
                value={resetTargetId}
                onChange={(e) => setResetTargetId(e.target.value)}
                className="input-text"
                style={{ maxWidth: '340px', fontSize: '0.85rem', padding: '6px 10px' }}
              />
              <button
                type="button"
                className="btn primary-btn"
                onClick={() => handleResetPassword(resetTargetId)}
                style={{ fontSize: '0.85rem', padding: '6px 14px' }}
              >
                Reset Account Password
              </button>
              {resetMsg && <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 500 }}>{resetMsg}</span>}
            </div>

            {filteredStudents.length > 0 ? (
              <div className="table-wrapper">
                <table className="hod-data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Email Address</th>
                      <th>Classes Attended</th>
                      <th>Total Sessions</th>
                      <th>Overall Attendance</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => (
                      <tr key={s.studentId}>
                        <td><span className="record-id-chip">#{s.studentId}</span></td>
                        <td><span className="student-name-cell">{s.studentName}</span></td>
                        <td><span className="email-text">{s.email}</span></td>
                        <td>{s.totalAttended}</td>
                        <td>{s.totalConducted}</td>
                        <td style={{ minWidth: '150px' }}>
                          <div className="percentage-cell">
                            <span className="percentage-text" style={{
                              color: s.lowAttendance ? '#b91c1c' : '#047857',
                              fontWeight: '700'
                            }}>
                              {s.overallPercentage.toFixed(1)}%
                            </span>
                            <div className="progress-track" style={{ height: '6px' }}>
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${Math.min(s.overallPercentage, 100)}%`,
                                  backgroundColor: s.lowAttendance ? '#ef4444' : '#10b981'
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          {s.lowAttendance ? (
                            <span className="badge-low-attendance">
                              &lt; 75% Shortage
                            </span>
                          ) : (
                            <span className="badge-good-attendance">
                              Regular (&ge;75%)
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn secondary-btn hod-table-action-btn"
                            onClick={() => handleInspectStudent(s.studentId)}
                            disabled={studentDetailLoading}
                            title={`Inspect course breakdown for ${s.studentName}`}
                            style={{ marginRight: '6px' }}
                          >
                            📋 Inspect Breakdown
                          </button>
                          <button
                            type="button"
                            className="btn secondary-btn hod-table-action-btn"
                            onClick={() => handleResetPassword(s.studentId, s.studentName)}
                            title={`Reset password for ${s.studentName}`}
                          >
                            🔄 Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No students match your query.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ATTENDANCE HISTORY / AUDIT LOG */}
      {activeHodTab === 'records' && (
        <div className="hod-tab-content">
          <div className="card hod-section-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Department Audit Trail</span>
                <h2 className="section-title-clean">Department Attendance Audit Log</h2>
                <p className="table-caption-clean">
                  Complete real-time log of verified dynamic QR attendance records across all department classes.
                </p>
              </div>
              <span className="pill pill-purple">
                {filteredHistory.length} Scanned Records
              </span>
            </div>

            <div className="table-filter-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">&#128269;</span>
                <input
                  type="text"
                  placeholder="Search logs by student, course, date or status..."
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  className="input-text hod-search-input"
                />
                {historyQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setHistoryQuery('')}
                    title="Clear filter"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {filteredHistory.length > 0 ? (
              <div className="table-wrapper">
                <table className="hod-data-table">
                  <thead>
                    <tr>
                      <th>Record ID</th>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Course</th>
                      <th>Date &amp; Time</th>
                      <th>Status</th>
                      <th>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((rec) => (
                      <tr key={rec.id}>
                        <td><span className="record-id-chip">#{rec.id}</span></td>
                        <td><strong>{rec.student?.studentId || '-'}</strong></td>
                        <td>{rec.student?.studentName || '-'}</td>
                        <td>
                          <span className="course-code-badge">{rec.course?.courseId || '-'}</span>
                          {rec.course?.courseName && (
                            <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '0.84rem' }}>
                              ({rec.course.courseName})
                            </span>
                          )}
                        </td>
                        <td>{formatDateTime(rec.attendanceDate, rec.attendanceTime)}</td>
                        <td>
                          <span className="badge-present">
                            <span className="status-dot"></span>
                            {rec.attendanceStatus || 'PRESENT'}
                          </span>
                        </td>
                        <td>
                          <span className="method-pill">5s Dynamic QR</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No attendance records recorded yet.</p>
                <p className="empty-state-hint">Verified dynamic QR records will appear here as students attend classes.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===============================================================
          INSPECTION MODALS
          =============================================================== */}

      {/* MODAL 1: COURSE ROSTER INSPECTION */}
      {selectedCourseDetail && (
        <div
          className="hod-modal-overlay"
          onClick={() => setSelectedCourseDetail(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="hod-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="hod-modal-header">
              <div className="hod-modal-title-block">
                <span className="eyebrow" style={{ color: '#9333ea' }}>Course Inspection</span>
                <h3 className="hod-modal-heading">
                  Class Roster &amp; Attendance: {selectedCourseDetail.courseId}
                </h3>
                <p className="hod-modal-subheading">
                  {selectedCourseDetail.courseName} &bull; Average: <strong>{selectedCourseDetail.averageAttendancePercentage}%</strong>
                </p>
              </div>
              <button
                type="button"
                className="hod-modal-close-btn"
                onClick={() => setSelectedCourseDetail(null)}
                title="Close modal (Esc)"
              >
                &times;
              </button>
            </div>

            <div className="hod-modal-body">
              {/* Quick Metrics in Modal */}
              <div className="hod-modal-kpi-grid">
                <div className="hod-modal-kpi-card">
                  <span className="modal-kpi-label">Conducted Sessions</span>
                  <span className="modal-kpi-value">{selectedCourseDetail.totalConductedSessions}</span>
                  <span className="modal-kpi-subtext">Total classes held</span>
                </div>
                <div className="hod-modal-kpi-card">
                  <span className="modal-kpi-label">Enrolled Students</span>
                  <span className="modal-kpi-value">{selectedCourseDetail.totalStudentsCount}</span>
                  <span className="modal-kpi-subtext">Course cohort size</span>
                </div>
                <div className="hod-modal-kpi-card" style={{
                  borderLeft: selectedCourseDetail.lowAttendanceStudentsCount > 0 ? '4px solid #ef4444' : '4px solid #10b981'
                }}>
                  <span className="modal-kpi-label">Low Attendance Students</span>
                  <span className="modal-kpi-value" style={{
                    color: selectedCourseDetail.lowAttendanceStudentsCount > 0 ? '#b91c1c' : '#047857'
                  }}>
                    {selectedCourseDetail.lowAttendanceStudentsCount}
                  </span>
                  <span className="modal-kpi-subtext">&lt; 75% requirement</span>
                </div>
              </div>

              <div className="hod-modal-section-title-row">
                <h4 className="hod-modal-section-title">Student-Wise Attendance in this Course</h4>
                <span className="pill pill-purple">
                  {selectedCourseDetail.studentStats?.length || 0} Students Tracked
                </span>
              </div>

              <div className="table-wrapper" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                <table className="hod-data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Attended Sessions</th>
                      <th>Attendance %</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCourseDetail.studentStats && selectedCourseDetail.studentStats.length > 0 ? (
                      selectedCourseDetail.studentStats.map((st) => (
                        <tr key={st.studentId}>
                          <td><span className="record-id-chip">#{st.studentId}</span></td>
                          <td><strong>{st.studentName}</strong></td>
                          <td>{st.attendedSessions} / {st.totalSessions}</td>
                          <td>
                            <strong style={{ color: st.lowAttendance ? '#b91c1c' : '#047857' }}>
                              {st.attendancePercentage}%
                            </strong>
                          </td>
                          <td>
                            {st.lowAttendance ? (
                              <span className="badge-low-attendance">Shortage (&lt;75%)</span>
                            ) : (
                              <span className="badge-good-attendance">On Track</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                          No student attendance statistics recorded for this course yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="hod-modal-footer">
              <button
                type="button"
                className="btn secondary-btn"
                onClick={() => setSelectedCourseDetail(null)}
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: STUDENT PROFILE & COURSE BREAKDOWN INSPECTION */}
      {selectedStudentDetail && (
        <div
          className="hod-modal-overlay"
          onClick={() => setSelectedStudentDetail(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="hod-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="hod-modal-header">
              <div className="hod-modal-title-block">
                <span className="eyebrow" style={{ color: '#9333ea' }}>Student Inspection</span>
                <h3 className="hod-modal-heading">
                  Student Academic Attendance: {selectedStudentDetail.student?.studentName}
                </h3>
                <p className="hod-modal-subheading">
                  Roll No: <strong>{selectedStudentDetail.student?.studentId}</strong> &bull; Email: {selectedStudentDetail.student?.email}
                </p>
              </div>
              <button
                type="button"
                className="hod-modal-close-btn"
                onClick={() => setSelectedStudentDetail(null)}
                title="Close modal (Esc)"
              >
                &times;
              </button>
            </div>

            <div className="hod-modal-body">
              {/* Quick Metrics in Modal */}
              <div className="hod-modal-kpi-grid">
                <div className="hod-modal-kpi-card" style={{
                  borderLeft: (selectedStudentDetail.overallAttendancePercentage ?? 0) >= LOW_ATTENDANCE_THRESHOLD
                    ? '4px solid #10b981'
                    : '4px solid #ef4444'
                }}>
                  <span className="modal-kpi-label">Overall Attendance</span>
                  <span className="modal-kpi-value" style={{
                    color: (selectedStudentDetail.overallAttendancePercentage ?? 0) >= LOW_ATTENDANCE_THRESHOLD
                      ? '#047857'
                      : '#b91c1c'
                  }}>
                    {selectedStudentDetail.overallAttendancePercentage}%
                  </span>
                  <span className="modal-kpi-subtext">Across all enrolled subjects</span>
                </div>
                <div className="hod-modal-kpi-card">
                  <span className="modal-kpi-label">Attended Sessions</span>
                  <span className="modal-kpi-value">{selectedStudentDetail.totalAttendedSessions}</span>
                  <span className="modal-kpi-subtext">Verified present marks</span>
                </div>
                <div className="hod-modal-kpi-card">
                  <span className="modal-kpi-label">Total Conducted Sessions</span>
                  <span className="modal-kpi-value">{selectedStudentDetail.totalConductedSessions}</span>
                  <span className="modal-kpi-subtext">Total sessions held</span>
                </div>
              </div>

              <div className="hod-modal-section-title-row">
                <h4 className="hod-modal-section-title">Course-by-Course Attendance Breakdown</h4>
                <span className="pill pill-purple">
                  {selectedStudentDetail.courseSummaries?.length || 0} Courses Enrolled
                </span>
              </div>

              <div className="table-wrapper" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                <table className="hod-data-table">
                  <thead>
                    <tr>
                      <th>Course ID</th>
                      <th>Course Name</th>
                      <th>Attended / Conducted</th>
                      <th>Attendance %</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudentDetail.courseSummaries && selectedStudentDetail.courseSummaries.length > 0 ? (
                      selectedStudentDetail.courseSummaries.map((c) => (
                        <tr key={c.courseId}>
                          <td><span className="course-code-badge">{c.courseId}</span></td>
                          <td><span className="course-title-cell">{c.courseName}</span></td>
                          <td>{c.totalAttendedRecords} / {c.totalConductedSessions}</td>
                          <td>
                            <strong style={{ color: c.lowAttendance ? '#b91c1c' : '#047857' }}>
                              {c.attendancePercentage}%
                            </strong>
                          </td>
                          <td>
                            {c.lowAttendance ? (
                              <span className="badge-low-attendance">Shortage (&lt;75%)</span>
                            ) : (
                              <span className="badge-good-attendance">On Track</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                          No course enrollment records found for this student.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="hod-modal-footer">
              <button
                type="button"
                className="btn secondary-btn"
                onClick={() => handleResetPassword(selectedStudentDetail.student?.studentId, selectedStudentDetail.student?.studentName)}
                style={{ marginRight: '8px' }}
              >
                🔄 Reset Student Password
              </button>
              <button
                type="button"
                className="btn secondary-btn"
                onClick={() => setSelectedStudentDetail(null)}
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOD CREATE CLASS / LECTURE MODAL */}
      {/* TAB: DEPARTMENT FACULTY MEMBERS */}
      {activeHodTab === 'faculty' && (
        <div className="hod-tab-content">
          <div className="card hod-section-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Academic Staff</span>
                <h2 className="section-title-clean">Department Faculty Directory</h2>
                <p className="table-caption-clean">
                  View assigned courses, classes, and manage academic accounts for departmental instructors.
                </p>
              </div>
              <span className="pill pill-info">{facultyList.length} Instructors</span>
            </div>

            <div className="table-filter-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">&#128269;</span>
                <input
                  type="text"
                  placeholder="Filter faculty by ID, Name or Email..."
                  value={facultySearchQuery}
                  onChange={(e) => setFacultySearchQuery(e.target.value)}
                  className="input-text hod-search-input"
                />
              </div>
            </div>

            {facultyList.length > 0 ? (
              <div className="table-wrapper">
                <table className="hod-data-table">
                  <thead>
                    <tr>
                      <th>Faculty ID / Username</th>
                      <th>Full Name</th>
                      <th>Email Address</th>
                      <th>Assigned Courses</th>
                      <th>Assigned Classes</th>
                      <th>Account Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyList
                      .filter(f => {
                        if (!facultySearchQuery.trim()) return true;
                        const q = facultySearchQuery.toLowerCase();
                        return (f.username && f.username.toLowerCase().includes(q)) ||
                               (f.fullName && f.fullName.toLowerCase().includes(q)) ||
                               (f.email && f.email.toLowerCase().includes(q));
                      })
                      .map((f) => {
                        const assignedCourses = availableCourses.filter(c => c.assignedFacultyId === f.username || c.assignedFacultyName === f.fullName);
                        const assignedClasses = hodClasses.filter(cls => cls.facultyId === f.username || cls.facultyName === f.fullName);
                        return (
                          <tr key={f.id || f.username}>
                            <td><strong>{f.username}</strong></td>
                            <td>{f.fullName}</td>
                            <td><span className="email-text">{f.email || '-'}</span></td>
                            <td>
                              {assignedCourses.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {assignedCourses.map(c => (
                                    <span key={c.courseId} className="pill pill-info" style={{ fontSize: '0.75rem' }}>
                                      {c.courseId}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>None</span>
                              )}
                            </td>
                            <td>
                              <span className="pill pill-purple" style={{ fontSize: '0.78rem' }}>
                                {assignedClasses.length} Sessions
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn secondary-btn"
                                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                onClick={async () => {
                                  if (!window.confirm(`Reset password for faculty ${f.fullName} (${f.username})?`)) return;
                                  try {
                                    const res = await resetPassword(f.username);
                                    alert(res.message || `Password reset successfully for ${f.username}!`);
                                  } catch (err) {
                                    alert(err.response?.data?.error || 'Password reset failed.');
                                  }
                                }}
                              >
                                🔑 Reset Password
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No faculty members found for this department.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: ANNOUNCEMENTS */}
      {activeHodTab === 'announcements' && (
        <div className="hod-tab-content">
          <div className="card admin-form-card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div>
                <span className="eyebrow">Department Notifications</span>
                <h3 className="section-title-clean">Post Departmental Announcement</h3>
                <p className="table-caption-clean">Broadcast notices, exam alerts, or general updates to students and faculty.</p>
              </div>
            </div>
            <form onSubmit={handleCreateHodAnnouncement} className="admin-entity-form">
              <div className="form-field-col">
                <label className="field-label">Headline / Title *</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Mid-Term Examination Schedule"
                  value={newHodAnnTitle}
                  onChange={(e) => setNewHodAnnTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-field-col">
                <label className="field-label">Target Course / Subject</label>
                <select
                  className="input-text"
                  value={newHodAnnCourse}
                  onChange={(e) => setNewHodAnnCourse(e.target.value)}
                >
                  <option value="">All Department Courses</option>
                  {availableCourses.map(c => (
                    <option key={c.courseId} value={c.courseId}>{c.courseId} — {c.courseName}</option>
                  ))}
                </select>
              </div>
              <div className="form-field-col">
                <label className="field-label">Division</label>
                <select
                  className="input-text"
                  value={newHodAnnDiv}
                  onChange={(e) => {
                    setNewHodAnnDiv(e.target.value);
                    setNewHodAnnBatch('All');
                  }}
                >
                  <option value="All">All Divisions</option>
                  <option value="A">Division A</option>
                  <option value="B">Division B</option>
                  <option value="C">Division C</option>
                </select>
              </div>
              <div className="form-field-col">
                <label className="field-label">Batch</label>
                <select
                  className="input-text"
                  value={newHodAnnBatch}
                  onChange={(e) => setNewHodAnnBatch(e.target.value)}
                >
                  <option value="All">All Batches</option>
                  {newHodAnnDiv === 'A' && ['A1', 'A2', 'A3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {newHodAnnDiv === 'B' && ['B1', 'B2', 'B3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {newHodAnnDiv === 'C' && ['C1', 'C2', 'C3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {newHodAnnDiv === 'All' && ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-field-col" style={{ flex: 2 }}>
                <label className="field-label">Announcement Content *</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Detailed announcement message..."
                  value={newHodAnnContent}
                  onChange={(e) => setNewHodAnnContent(e.target.value)}
                  required
                />
              </div>
              <div className="form-field-btn-col">
                <button type="submit" className="btn primary-btn admin-submit-btn" disabled={creatingAnn}>
                  {creatingAnn ? 'Broadcasting...' : '📢 Broadcast'}
                </button>
              </div>
            </form>
          </div>

          <div className="card admin-section-card">
            <div className="card-header">
              <h3 className="section-title-clean">Active Department Announcements</h3>
              <span className="pill pill-info">{announcementsList.length} Messages</span>
            </div>
            {announcementsList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                {announcementsList.map((ann) => (
                  <div key={ann.id} style={{ padding: '16px', borderRadius: '10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="pill pill-info">{ann.courseId || 'DEPT'}</span>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--color-navy)' }}>{ann.title}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : ''}
                        </span>
                        <button
                          type="button"
                          className="btn danger-btn"
                          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleDeleteHodAnnouncement(ann.id)}
                          title="Delete announcement"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: 0, color: 'var(--color-text)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No departmental announcements posted yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeHodTab === 'profile' && (
        <div className="hod-tab-content">
          <div className="card hod-section-card" style={{ padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                  {(currentUser?.fullName || sessionStorage.getItem('smartattend_name') || 'H').charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="eyebrow" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Department Leadership &bull; Academic Oversight</span>
                  <h2 style={{ margin: '4px 0 0 0', color: 'var(--color-navy)', fontSize: '1.4rem' }}>
                    {currentUser?.fullName || sessionStorage.getItem('smartattend_name') || 'Head of Department'}
                  </h2>
                  <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                    {hodData?.departmentName || currentUser?.department || 'Department of Computer Science & Engineering'} &bull; Full Academic Supervision
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="pill pill-purple">Head of Department (HOD)</span>
                <span className="pill pill-success">Live Supervision Active</span>
              </div>
            </div>

            {/* Department Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Department Code</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                  CSE
                </p>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Department Subjects</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                  {hodData?.totalCourses ?? (hodData?.courseSummaries?.length || availableCourses.length || 0)} Courses
                </p>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Enrolled Students</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                  {hodData?.totalStudents ?? 0} Students
                </p>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Teaching Faculty</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                  {facultyList.length} Teachers
                </p>
              </div>
              <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Overall Attendance</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '1.15rem', fontWeight: 700, color: (hodData?.overallDepartmentAttendancePercentage ?? 0) >= 75 ? '#15803d' : '#b91c1c' }}>
                  {hodData?.overallDepartmentAttendancePercentage != null ? `${hodData.overallDepartmentAttendancePercentage.toFixed(1)}%` : 'Active'}
                </p>
              </div>
            </div>

            {/* Department Structure & Policies */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.98rem', color: '#0f172a' }}>Academic Curricular Framework</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                  <strong>Degree Program:</strong> Bachelor of Technology (B.Tech) / Computer Engineering
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                  <strong>Divisions / Batches:</strong> Divisions A, B, C (Batches A1-A3, B1-B3, C1-C3)
                </p>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                  <strong>Curriculum Model:</strong> Autonomous Credit &amp; Outcome-Based Education (OBE)
                </p>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.98rem', color: '#0f172a' }}>Department Attendance Directives</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                  <strong>Mandatory Requirement:</strong> Minimum 75% aggregate attendance per subject
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                  <strong>Verification Engine:</strong> Dynamic QR token rotation with GPS campus bounds
                </p>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                  <strong>Regulatory Action:</strong> Automated generation of Defaulter Lists for term-grant reviews
                </p>
              </div>
            </div>

            {/* Teaching Faculty Roster Overview */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a' }}>Department Teaching Faculty Roster</h4>
              {facultyList.length > 0 ? (
                <div className="table-wrapper">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Faculty ID</th>
                        <th>Instructor Name</th>
                        <th>Email Contact</th>
                        <th>Department</th>
                        <th>Supervisory Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultyList.map(f => (
                        <tr key={f.id || f.facultyId}>
                          <td><strong>{f.facultyId}</strong></td>
                          <td>{f.facultyName}</td>
                          <td>{f.email || '—'}</td>
                          <td>{f.department || 'Computer Engineering'}</td>
                          <td><span className="pill pill-success">Active Faculty</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No department faculty roster available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HOD SESSION ATTENDANCE ATTENDEES ROSTER MODAL */}
      {viewingSessionAttendance && (
        <div className="modal-backdrop" onClick={() => setViewingSessionAttendance(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="eyebrow" style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 700 }}>
                  Attendance Verified by Dynamic QR
                </span>
                <h3 style={{ margin: '4px 0 0 0', color: 'var(--color-navy)', fontSize: '1.25rem' }}>
                  {viewingSessionAttendance.courseName} ({viewingSessionAttendance.sessionCode})
                </h3>
              </div>
              <button
                type="button"
                className="btn secondary-btn"
                onClick={() => setViewingSessionAttendance(null)}
              >
                ✕ Close
              </button>
            </div>

            {attendeesLoading ? (
              <div style={{ textAlign: 'center', padding: '36px' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '10px', color: 'var(--color-text-muted)' }}>Loading attendees...</p>
              </div>
            ) : sessionAttendees.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px 0' }}>
                No students have marked attendance for this session yet.
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Status</th>
                      <th>Marked Time</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionAttendees.map((rec, idx) => (
                      <tr key={idx}>
                        <td><strong>{rec.student?.studentId || rec.studentId}</strong></td>
                        <td>{rec.student?.studentName || '-'}</td>
                        <td>
                          <span className="pill pill-success">PRESENT</span>
                        </td>
                        <td>{rec.attendanceTime || '-'}</td>
                        <td>{rec.attendanceDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HodDashboard;
