import React, { useState, useEffect, useCallback } from 'react';
import {
  getCourseAttendanceSummary,
  getCourses,
  getCourseResources,
  createCourseResource,
  deleteCourseResource,
  getCourseAssignments,
  createCourseAssignment,
  deleteCourseAssignment,
  getAssignmentSubmissions,
  getCourseAnnouncements,
  createCourseAnnouncement,
  createClass,
  getClasses,
  getFacultyClasses,
  toggleClassStatus,
  getClassAttendance,
  uploadLmsFile,
  downloadLmsFile,
  deleteAnnouncement,
  getDefaulterReport,
  exportDefaulterExcel
} from '../services/api.js';

const LOW_ATTENDANCE_THRESHOLD = 75.0;

const TeacherDashboard = ({ onOpenQrSession, onSelectCourse, selectedCourseId, currentUser, activeSubTab, onSubTabChange }) => {
  const [courseId, setCourseId] = useState(selectedCourseId || '');
  const [availableCourses, setAvailableCourses] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');

  // LMS Tab state ('overview' | 'classes' | 'coursework' | 'announcements' | 'defaulters' | 'attendance' | 'profile')
  const [internalFacultyTab, setInternalFacultyTab] = useState(
    (activeSubTab === 'materials' || activeSubTab === 'assignments' || activeSubTab === 'experiments')
      ? 'coursework'
      : (activeSubTab || 'overview')
  );
  const activeFacultyTab = internalFacultyTab;

  // Unified Learning & Coursework internal subtab ('materials' | 'assignments' | 'experiments')
  const [facultyLearningSubtab, setFacultyLearningSubtab] = useState(
    (activeSubTab === 'materials' || activeSubTab === 'assignments' || activeSubTab === 'experiments')
      ? activeSubTab
      : 'materials'
  );

  useEffect(() => {
    if (activeSubTab) {
      if (activeSubTab === 'materials' || activeSubTab === 'assignments' || activeSubTab === 'experiments') {
        setInternalFacultyTab('coursework');
        setFacultyLearningSubtab(activeSubTab);
      } else if (activeSubTab !== internalFacultyTab) {
        setInternalFacultyTab(activeSubTab);
      }
    }
  }, [activeSubTab]);

  const setActiveFacultyTab = (tab) => {
    setInternalFacultyTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  // Classes / Lectures Sessions State (Authoritative Class = Lecture/Lab Session + Attendance)
  const [classesList, setClassesList] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [classForm, setClassForm] = useState({
    courseId: selectedCourseId || '',
    lectureType: 'THEORY',
    academicYear: 'FE',
    division: 'A',
    batch: 'All',
    sessionDate: new Date().toISOString().split('T')[0],
    sessionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    totalStudents: 70
  });
  const [creatingClass, setCreatingClass] = useState(false);
  const [classActionMsg, setClassActionMsg] = useState('');

  const getBatchesForDivision = (div) => {
    if (div === 'B') return ['B1', 'B2', 'B3'];
    if (div === 'C') return ['C1', 'C2', 'C3'];
    return ['A1', 'A2', 'A3'];
  };

  // Session Attendance Attendees Modal
  const [viewingSessionAttendance, setViewingSessionAttendance] = useState(null);
  const [sessionAttendees, setSessionAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  // LMS Data States
  const [resources, setResources] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [lmsLoading, setLmsLoading] = useState(false);

  // New Resource Form
  const [newResTitle, setNewResTitle] = useState('');
  const [newResType, setNewResType] = useState('NOTE_DOC');
  const [newResUrl, setNewResUrl] = useState('');
  const [newResDesc, setNewResDesc] = useState('');

  // New Assignment / Practical Form
  const [newAssignTitle, setNewAssignTitle] = useState('');
  const [newAssignDesc, setNewAssignDesc] = useState('');
  const [newAssignDeadline, setNewAssignDeadline] = useState('');
  const [newAssignType, setNewAssignType] = useState('ASSIGNMENT');
  const [assignFile, setAssignFile] = useState(null);
  const [assignUploading, setAssignUploading] = useState(false);

  // Submissions Modal
  const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);

  // New Announcement Form
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');

  // Defaulter List state
  const [defaulterCourse, setDefaulterCourse] = useState(courseId);
  const [defaulterDiv, setDefaulterDiv] = useState('All');
  const [defaulterBatch, setDefaulterBatch] = useState('All');
  const [defaulterThreshold, setDefaulterThreshold] = useState(75);
  const [defaulterList, setDefaulterList] = useState([]);
  const [defaulterLoading, setDefaulterLoading] = useState(false);
  const [defaulterExporting, setDefaulterExporting] = useState(false);

  // Success state after class creation
  const [lastCreatedClass, setLastCreatedClass] = useState(null);
  const [viewingSessionDetails, setViewingSessionDetails] = useState(null);

  // File upload for Notes / Study Material
  const [resFile, setResFile] = useState(null);
  const [uploadingRes, setUploadingRes] = useState(false);

  // Experiments / Practicals state
  const [expNum, setExpNum] = useState('');
  const [expTitle, setExpTitle] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expFile, setExpFile] = useState(null);
  const [uploadingExp, setUploadingExp] = useState(false);

  // Announcement targeting
  const [annDiv, setAnnDiv] = useState('All');
  const [annBatch, setAnnBatch] = useState('All');

  // Load all registered courses for the dropdown selector
  const loadCourses = useCallback(async () => {
    try {
      const courses = await getCourses();
      const list = courses || [];
      setAvailableCourses(list);
      if (list.length > 0) {
        if (!courseId || !list.some(c => c.courseId === courseId)) {
          const first = list[0].courseId;
          setCourseId(first);
          if (onSelectCourse) onSelectCourse(first);
        }
      } else {
        setCourseId('');
      }
    } catch (err) {
      console.warn('Could not load course list:', err);
      setAvailableCourses([]);
      setCourseId('');
    }
  }, [courseId, onSelectCourse]);

  // Load course attendance summary from Spring Boot backend
  // Load LMS items (resources, assignments, announcements) for selected course
  // Load scheduled lecture and lab sessions for faculty
  const loadClasses = useCallback(async () => {
    try {
      setClassesLoading(true);
      const facultyId = currentUser?.username || currentUser?.facultyId || '123456';
      let list = await getFacultyClasses(facultyId).catch(() => []);
      if (!list || list.length === 0) {
        list = await getClasses({}).catch(() => []);
      }
      setClassesList(list || []);
    } catch (err) {
      console.warn('Could not load classes:', err);
    } finally {
      setClassesLoading(false);
    }
  }, [currentUser]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      setCreatingClass(true);
      setClassActionMsg('');
      const facultyId = currentUser?.username || '123456';
      const facultyName = currentUser?.fullName || 'Prof. Faculty';
      const created = await createClass({
        courseId: classForm.courseId,
        lectureType: classForm.lectureType,
        academicYear: classForm.academicYear,
        division: classForm.division,
        batch: classForm.batch === 'All' ? null : classForm.batch,
        sessionDate: classForm.sessionDate,
        sessionTime: classForm.sessionTime,
        totalStudents: parseInt(classForm.totalStudents, 10) || 70,
        facultyId: facultyId,
        facultyName: facultyName
      });
      setLastCreatedClass(created);
      setClassActionMsg('✓ Class lecture session scheduled successfully!');
      setShowCreateClassModal(false);
      await loadClasses();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to create class session.');
    } finally {
      setCreatingClass(false);
    }
  };

  const handleToggleClass = async (cls) => {
    try {
      await toggleClassStatus(cls.id, !cls.active);
      await loadClasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update session status.');
    }
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

  const loadLmsData = useCallback(async (cId) => {
    if (!cId || !cId.trim()) return;
    try {
      setLmsLoading(true);
      const [resList, assignList, annList] = await Promise.all([
        getCourseResources(cId.trim()).catch(() => []),
        getCourseAssignments(cId.trim()).catch(() => []),
        getCourseAnnouncements(cId.trim()).catch(() => [])
      ]);
      setResources(resList || []);
      setAssignments(assignList || []);
      setAnnouncements(annList || []);
    } catch (err) {
      console.warn('LMS data fetch notice:', err);
    } finally {
      setLmsLoading(false);
    }
  }, []);

  const handleCreateResource = async (e) => {
    e.preventDefault();
    if (!newResTitle.trim()) return;
    try {
      setUploadingRes(true);
      let fileUrl = newResUrl.trim();
      let fileName = null;
      if (resFile) {
        const uploadRes = await uploadLmsFile(resFile);
        fileUrl = uploadRes.fileUrl;
        fileName = uploadRes.originalName || uploadRes.fileName;
      }
      if (!fileUrl) {
        alert('Please upload a file or enter content/URL.');
        return;
      }
      await createCourseResource({
        courseId: courseId.trim(),
        title: newResTitle.trim(),
        resourceType: newResType,
        contentOrUrl: fileUrl,
        fileUrl: fileUrl,
        fileName: fileName,
        description: newResDesc.trim()
      });
      setNewResTitle('');
      setNewResUrl('');
      setNewResDesc('');
      setResFile(null);
      await loadLmsData(courseId);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to create resource.');
    } finally {
      setUploadingRes(false);
    }
  };

  const handleCreateExperiment = async (e) => {
    e.preventDefault();
    if (!expTitle.trim() || !expNum.trim()) {
      alert('Please provide Experiment Number and Title.');
      return;
    }
    try {
      setUploadingExp(true);
      let fileUrl = '';
      let fileName = null;
      if (expFile) {
        const uploadRes = await uploadLmsFile(expFile);
        fileUrl = uploadRes.fileUrl;
        fileName = uploadRes.originalName || uploadRes.fileName;
      }
      await createCourseResource({
        courseId: courseId.trim(),
        title: expTitle.trim(),
        resourceType: 'EXPERIMENT',
        experimentNumber: expNum.trim(),
        fileName: fileName,
        fileUrl: fileUrl,
        contentOrUrl: fileUrl ? fileUrl : ('Experiment ' + expNum.trim()),
        description: `${expDesc.trim()}${expDate ? ' [Lab Date: ' + expDate + ']' : ''}`
      });
      setExpNum('');
      setExpTitle('');
      setExpDesc('');
      setExpFile(null);
      setExpDate('');
      await loadLmsData(courseId);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to upload experiment.');
    } finally {
      setUploadingExp(false);
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteAnnouncement(annId);
      await loadLmsData(courseId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete announcement.');
    }
  };

  const loadDefaulterList = useCallback(async () => {
    try {
      setDefaulterLoading(true);
      const targetCourse = defaulterCourse || courseId;
      const params = {
        courseId: targetCourse,
        threshold: parseFloat(defaulterThreshold) || 75.0
      };
      if (defaulterDiv && defaulterDiv !== 'All') {
        params.division = defaulterDiv;
      }
      if (defaulterBatch && defaulterBatch !== 'All') {
        params.batch = defaulterBatch;
      }
      const data = await getDefaulterReport(params);
      setDefaulterList(data || []);
    } catch (err) {
      console.warn('Could not load defaulter report:', err);
      setDefaulterList([]);
    } finally {
      setDefaulterLoading(false);
    }
  }, [defaulterCourse, courseId, defaulterDiv, defaulterBatch, defaulterThreshold]);

  useEffect(() => {
    if (activeFacultyTab === 'defaulters') {
      loadDefaulterList();
    }
  }, [activeFacultyTab, loadDefaulterList]);

  const handleExportDefaultersExcel = async () => {
    try {
      setDefaulterExporting(true);
      const targetCourse = defaulterCourse || courseId;
      const params = {
        courseId: targetCourse,
        threshold: parseFloat(defaulterThreshold) || 75.0
      };
      if (defaulterDiv && defaulterDiv !== 'All') {
        params.division = defaulterDiv;
      }
      if (defaulterBatch && defaulterBatch !== 'All') {
        params.batch = defaulterBatch;
      }
      await exportDefaulterExcel(params);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to export Excel report.');
    } finally {
      setDefaulterExporting(false);
    }
  };

  const handleDeleteResource = async (resId) => {
    if (!window.confirm('Delete this learning material?')) return;
    try {
      await deleteCourseResource(resId);
      await loadLmsData(courseId);
    } catch (err) {
      alert('Failed to delete resource.');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssignTitle.trim()) return;
    try {
      setAssignUploading(true);
      let uploadedFileUrl = null;
      let uploadedFileName = null;
      if (assignFile) {
        const uploadRes = await uploadLmsFile(assignFile);
        uploadedFileUrl = uploadRes.fileUrl;
        uploadedFileName = uploadRes.fileName;
      }
      await createCourseAssignment({
        courseId: courseId.trim(),
        title: newAssignTitle.trim(),
        description: newAssignDesc.trim(),
        deadline: newAssignDeadline || null,
        type: newAssignType,
        fileUrl: uploadedFileUrl,
        fileName: uploadedFileName
      });
      setNewAssignTitle('');
      setNewAssignDesc('');
      setNewAssignDeadline('');
      setAssignFile(null);
      await loadLmsData(courseId);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to create assignment.');
    } finally {
      setAssignUploading(false);
    }
  };

  const handleDeleteAssignment = async (assignId) => {
    if (!window.confirm('Delete this assignment / practical?')) return;
    try {
      await deleteCourseAssignment(assignId);
      await loadLmsData(courseId);
    } catch (err) {
      alert('Failed to delete assignment.');
    }
  };

  const handleViewSubmissions = async (assignment) => {
    try {
      setViewingSubmissionsFor(assignment);
      const subs = await getAssignmentSubmissions(assignment.id);
      setSubmissionsList(subs || []);
    } catch (err) {
      alert('Could not load student submissions: ' + err.message);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    try {
      await createCourseAnnouncement({
        courseId: courseId.trim(),
        title: newAnnTitle.trim(),
        content: newAnnContent.trim(),
        authorName: 'Instructor'
      });
      setNewAnnTitle('');
      setNewAnnContent('');
      await loadLmsData(courseId);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to post announcement.');
    }
  };

  const loadSummary = useCallback(async (cId) => {
    if (!cId || !cId.trim()) {
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const data = await getCourseAttendanceSummary(cId.trim());
      setSummaryData(data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Could not load course attendance analytics.';
      setErrorMsg(msg);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
    loadClasses();
  }, [loadCourses, loadClasses]);

  useEffect(() => {
    if (selectedCourseId && selectedCourseId !== courseId) {
      setCourseId(selectedCourseId);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    loadSummary(courseId);
    loadLmsData(courseId);
  }, [courseId, loadSummary, loadLmsData]);

  // Handle course selection
  const handleCourseChange = (e) => {
    const newCourse = e.target.value;
    setCourseId(newCourse);
    if (onSelectCourse) {
      onSelectCourse(newCourse);
    }
  };

  // Filter student-wise attendance list
  const filteredStudents = (summaryData?.studentStats || []).filter((s) => {
    if (!searchStudentQuery.trim()) {
      return true;
    }
    const q = searchStudentQuery.toLowerCase();
    const idMatch = s.studentId?.toLowerCase().includes(q);
    const nameMatch = s.studentName?.toLowerCase().includes(q);
    const emailMatch = s.email?.toLowerCase().includes(q);
    return idMatch || nameMatch || emailMatch;
  });

  // Filter low attendance students (< 75%)
  const lowAttendanceStudents = (summaryData?.studentStats || []).filter(
    (s) => s.lowAttendance
  );

  // Filter attendance history
  const filteredHistory = (summaryData?.attendanceHistory || []).filter((h) => {
    if (!searchHistoryQuery.trim()) {
      return true;
    }
    const q = searchHistoryQuery.toLowerCase();
    const idMatch = h.student?.studentId?.toLowerCase().includes(q);
    const nameMatch = h.student?.studentName?.toLowerCase().includes(q);
    const dateMatch = h.attendanceDate?.toLowerCase().includes(q);
    const statusMatch = h.attendanceStatus?.toLowerCase().includes(q);
    return idMatch || nameMatch || dateMatch || statusMatch;
  });

  const currentDateTimeStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="teacher-dashboard-wrapper">
      {/* TAB: HOME / OVERVIEW (HOME ONLY) */}
      {activeFacultyTab === 'overview' && (
        <div className="faculty-overview-workspace">
          {/* 1. TEACHER PAGE HEADER (HOME ONLY) */}
          <div className="dashboard-page-header">
            <div className="dashboard-page-title-block">
              <h1 className="dashboard-page-title">
                Faculty Dashboard
              </h1>
              <p className="dashboard-page-subtitle">
                Welcome back, <strong>{currentUser?.fullName || sessionStorage.getItem('smartattend_name') || currentUser?.username || 'Teacher'}</strong>! Here's your teaching overview.
              </p>
            </div>
            <div className="dashboard-page-meta">
              <div className="system-live-clock">
                <span className="live-clock-dot"></span>
                <span>{currentDateTimeStr} &bull; Live Sync Active</span>
              </div>
              <div className="teacher-header-controls">
                <div className="teacher-course-inline-picker">
                  <label htmlFor="teacher-course-select" className="inline-picker-label">Active Subject:</label>
                  {availableCourses.length > 0 ? (
                    <select
                      id="teacher-course-select"
                      className="input-select teacher-course-select"
                      value={courseId}
                      onChange={handleCourseChange}
                      title="Select active course"
                    >
                      {availableCourses.map((c) => (
                        <option key={c.id} value={c.courseId}>
                          {c.courseId} - {c.courseName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="teacher-course-input"
                      type="text"
                      className="input-text teacher-course-input"
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      placeholder="e.g. CS101"
                    />
                  )}
                </div>
                <button
                  type="button"
                  className="btn-refresh-clean"
                  onClick={() => loadSummary(courseId)}
                  disabled={loading}
                  title="Reload course statistics and student roster"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'spin-icon' : ''}>
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Course Identity Strip */}
          <div className="teacher-profile-info-strip">
            <div className="teacher-avatar-badge">
              <span className="teacher-avatar-initial">T</span>
            </div>
            <div className="teacher-profile-details">
              <div className="teacher-name-row">
                <h2 className="teacher-course-title">
                  {summaryData?.courseName || `Course ${courseId}`}
                </h2>
                <span className="pill pill-success">Faculty Portal</span>
              </div>
              <div className="teacher-meta-chips-row">
                <span className="meta-chip">
                  <span className="chip-label">Course Code:</span>
                  <strong>{courseId}</strong>
                </span>
                <span className="meta-chip">
                  <span className="chip-label">Conducted Sessions:</span>
                  <strong>{summaryData?.totalConductedSessions || 0}</strong>
                </span>
                <span className="meta-chip">
                  <span className="chip-label">Enrolled:</span>
                  <strong>{summaryData?.totalStudentsCount || 0} Students</strong>
                </span>
                <span className="meta-chip">
                  <span className="chip-label">Method:</span>
                  <span>5s Dynamic QR</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2. PRIMARY ACTION: START DYNAMIC QR SESSION */}
          {onOpenQrSession && (
            <div className="card teacher-quick-qr-banner">
              <div className="quick-qr-left">
                <div className="quick-qr-icon-box">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                    <path d="M10 7h1"></path>
                    <path d="M7 10v1"></path>
                    <path d="M14 10h.01"></path>
                    <path d="M10 14v.01"></path>
                  </svg>
                </div>
                <div>
                  <div className="quick-qr-badge">Primary Faculty Action</div>
                  <h2 className="quick-qr-title">Start Dynamic QR Session &bull; {courseId}</h2>
                  <p className="quick-qr-desc">
                    Generate a time-limited QR code for this class. Tokens automatically rotate every 5 seconds to guarantee in-class presence and eliminate proxy attendance.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn primary-btn quick-qr-cta-btn"
                onClick={() => onOpenQrSession(courseId)}
              >
                <span>Launch QR Attendance</span>
                <span className="btn-arrow">&rarr;</span>
              </button>
            </div>
          )}

          {/* ATTENDANCE HEALTH / SHORTAGE ALERT */}
          {lowAttendanceStudents.length > 0 && (
            <div className="alert teacher-shortage-alert" style={{ marginBottom: '20px' }}>
              <div className="alert-header-row">
                <div className="alert-icon-wrap">&#9888;</div>
                <div>
                  <h3 className="alert-warning-title">
                    Attendance Shortage Alert: {lowAttendanceStudents.length} Student(s) Below {LOW_ATTENDANCE_THRESHOLD}% in {courseId}
                  </h3>
                  <p className="alert-warning-text">
                    The following students currently fall short of the institutional 75% attendance requirement and risk academic disbarment:
                  </p>
                </div>
              </div>
              <div className="shortage-students-chip-list">
                {lowAttendanceStudents.map((s) => (
                  <span key={s.studentId} className="shortage-student-pill">
                    <strong>{s.studentName}</strong> ({s.studentId}): {s.attendancePercentage}% &bull; {s.attendedSessions}/{s.totalSessions} sessions
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ATTENDANCE KPI CARDS */}
          <div className="teacher-kpi-grid" style={{ marginBottom: '24px' }}>
            <div className="teacher-kpi-card kpi-card-overall">
              <div className="kpi-top-row">
                <span className="kpi-label">Average Class Attendance</span>
                <span
                  className={`pill ${
                    (summaryData?.averageAttendancePercentage || 0) >= LOW_ATTENDANCE_THRESHOLD
                      ? 'pill-success'
                      : 'pill-warning'
                  }`}
                >
                  {(summaryData?.averageAttendancePercentage || 0) >= LOW_ATTENDANCE_THRESHOLD
                    ? 'Healthy Average'
                    : 'Attention Needed'}
                </span>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-primary-number">
                  {summaryData ? `${summaryData.averageAttendancePercentage}%` : '0%'}
                </span>
                <div className="kpi-icon-pill icon-overall">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
              </div>
              <div className="kpi-progress-bar-wrap">
                <div className="progress-track">
                  <div
                    className={`progress-fill ${
                      (summaryData?.averageAttendancePercentage || 0) >= LOW_ATTENDANCE_THRESHOLD
                        ? 'progress-fill-success'
                        : 'progress-fill-warning'
                    }`}
                    style={{
                      width: `${Math.min(100, summaryData?.averageAttendancePercentage || 0)}%`
                    }}
                  />
                </div>
              </div>
              <div className="kpi-subtext">
                Overall class average across all enrolled students in {courseId}
              </div>
            </div>

            <div className="teacher-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Conducted Sessions</span>
                <div className="kpi-icon-pill icon-attended">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-primary-number">
                  {summaryData?.totalConductedSessions || 0}
                </span>
              </div>
              <div className="kpi-subtext">
                Recorded class lecture &amp; practical sessions
              </div>
            </div>

            <div className="teacher-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Enrolled Students</span>
                <div className="kpi-icon-pill icon-courses">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-primary-number">
                  {summaryData?.totalStudentsCount || 0}
                </span>
              </div>
              <div className="kpi-subtext">
                Active students enrolled in {courseId}
              </div>
            </div>

            <div className="teacher-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Low Attendance Count</span>
                <div className={`kpi-icon-pill ${lowAttendanceStudents.length > 0 ? 'icon-warning' : 'icon-good'}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
              </div>
              <div className="kpi-value-row">
                <span className={`kpi-primary-number ${lowAttendanceStudents.length > 0 ? 'color-danger' : ''}`}>
                  {lowAttendanceStudents.length}
                </span>
              </div>
              <div className="kpi-subtext">
                Students requiring academic attendance counseling
              </div>
            </div>
          </div>
        </div>
      )}



      {/* TAB: MY CLASSES / LECTURES (Authoritative Session Management) */}
      {activeFacultyTab === 'classes' && (
        <div className="faculty-classes-workspace">
          <div className="card" style={{ marginBottom: '20px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span className="eyebrow">Classroom Teaching Sessions</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', color: '#0f172a' }}>My Classes / Lectures</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                  Schedule and launch actual lecture and practical sessions for your assigned courses. Generate dynamic QR attendance exclusively for active classes.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn secondary-btn"
                  onClick={loadClasses}
                  disabled={classesLoading}
                >
                  {classesLoading ? 'Refreshing...' : '↻ Refresh Sessions'}
                </button>
                <button
                  type="button"
                  className="btn primary-btn"
                  onClick={() => setShowCreateClassModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>+</span>
                  <span>Create Class / Lecture</span>
                </button>
              </div>
            </div>
          </div>

          {classActionMsg && (
            <div className="alert success-alert" style={{ marginBottom: '18px' }}>
              {classActionMsg}
            </div>
          )}

          {lastCreatedClass && (
            <div className="card" style={{ background: '#f0fdf4', border: '1.5px solid #86efac', padding: '16px 20px', marginBottom: '20px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>✓ Class / Lecture Scheduled Successfully</span>
                  <h4 style={{ margin: '4px 0 0 0', color: '#14532d', fontSize: '1.15rem' }}>
                    {lastCreatedClass.courseId} — {lastCreatedClass.sessionCode ? `Session ${lastCreatedClass.sessionCode}` : 'New Lecture'} ({lastCreatedClass.lectureType === 'LAB' ? 'Lab' : 'Theory'})
                  </h4>
                  <p style={{ margin: '2px 0 0 0', color: '#15803d', fontSize: '0.88rem' }}>
                    Div {lastCreatedClass.division || 'All'} • Batch {lastCreatedClass.batch || 'All'} • {lastCreatedClass.sessionDate} at {lastCreatedClass.sessionTime}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn secondary-btn"
                    onClick={() => setViewingSessionDetails(lastCreatedClass)}
                  >
                    🔍 Open Details
                  </button>
                  <button
                    type="button"
                    className="btn primary-btn"
                    onClick={() => onOpenQrSession && onOpenQrSession(lastCreatedClass.courseId, lastCreatedClass.sessionCode)}
                  >
                    📱 Start Attendance
                  </button>
                  <button
                    type="button"
                    className="btn secondary-btn"
                    onClick={() => handleViewSessionAttendance(lastCreatedClass)}
                  >
                    👁 View Attendance
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ background: 'transparent', border: 'none', color: '#15803d', cursor: 'pointer', padding: '6px' }}
                    onClick={() => setLastCreatedClass(null)}
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}

          {classesLoading ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '12px', color: '#64748b' }}>Loading scheduled lecture sessions...</p>
            </div>
          ) : classesList.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>📅</span>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No Teaching Sessions Created Yet</h3>
              <p style={{ margin: '0 auto 20px auto', maxWidth: '520px', color: '#64748b', fontSize: '0.92rem' }}>
                Click below to create your first lecture or lab practical session for an assigned course.
              </p>
              <button
                type="button"
                className="btn primary-btn"
                onClick={() => setShowCreateClassModal(true)}
              >
                + Schedule New Class / Lecture
              </button>
            </div>
          ) : (
            <div className="lecture-session-grid">
              {classesList.map((cls) => {
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
                          <span className="lecture-meta-label">Date &amp; Time</span>
                          <span className="lecture-meta-value">{cls.sessionDate} • {cls.sessionTime}</span>
                        </div>
                        <div className="lecture-meta-item">
                          <span className="lecture-meta-label">Cohort Year</span>
                          <span className="lecture-meta-value">{cls.academicYear || 'FE'}</span>
                        </div>
                      </div>

                      <div className="lecture-attendance-box">
                        <span>Attendance Marked:</span>
                        <span className="attendance-ratio-badge">
                          {cls.attendanceCount || 0} / {cls.totalStudents || 70} Students
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      {isActive ? (
                        <button
                          type="button"
                          className="btn primary-btn launch-qr-btn"
                          onClick={() => onOpenQrSession && onOpenQrSession(cls.courseId, cls.sessionCode)}
                          title="Launch dynamic 5-second rotating QR code on projection screen"
                        >
                          <span>📱</span>
                          <span>Launch Dynamic QR</span>
                        </button>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', padding: '6px 0', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          Session attendance concluded
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn secondary-btn"
                          style={{ flex: 1, fontSize: '0.82rem', padding: '7px' }}
                          onClick={() => setViewingSessionDetails(cls)}
                        >
                          🔍 Open
                        </button>
                        <button
                          type="button"
                          className="btn secondary-btn"
                          style={{ flex: 1, fontSize: '0.82rem', padding: '7px' }}
                          onClick={() => handleViewSessionAttendance(cls)}
                        >
                          👁 View Attendance
                        </button>
                        <button
                          type="button"
                          className="btn secondary-btn"
                          style={{ flex: 1, fontSize: '0.82rem', padding: '7px', color: isActive ? '#b91c1c' : '#047857' }}
                          onClick={() => handleToggleClass(cls)}
                        >
                          {isActive ? '⏹ End Session' : '▶ Reopen'}
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

      {activeFacultyTab === 'attendance' && (
        <>
      {/* 2. PRIMARY ACTION: START DYNAMIC QR SESSION */}
      {onOpenQrSession && (
        <div className="card teacher-quick-qr-banner">
          <div className="quick-qr-left">
            <div className="quick-qr-icon-box">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
                <path d="M10 7h1"></path>
                <path d="M7 10v1"></path>
                <path d="M14 10h.01"></path>
                <path d="M10 14v.01"></path>
              </svg>
            </div>
            <div>
              <div className="quick-qr-badge">Primary Faculty Action</div>
              <h2 className="quick-qr-title">Start Dynamic QR Session &bull; {courseId}</h2>
              <p className="quick-qr-desc">
                Generate a time-limited QR code for this class. Tokens automatically rotate every 5 seconds to guarantee in-class presence and eliminate proxy attendance.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn primary-btn quick-qr-cta-btn"
            onClick={() => onOpenQrSession(courseId)}
          >
            <span>Launch QR Attendance</span>
            <span className="btn-arrow">&rarr;</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="alert error-alert">
          <strong>Notice:</strong> {errorMsg}
        </div>
      )}

      {/* 3. ATTENDANCE HEALTH / SHORTAGE ALERT */}
      {lowAttendanceStudents.length > 0 ? (
        <div className="alert teacher-shortage-alert">
          <div className="alert-header-row">
            <div className="alert-icon-wrap">&#9888;</div>
            <div>
              <h3 className="alert-warning-title">
                Attendance Shortage Alert: {lowAttendanceStudents.length} Student(s) Below {LOW_ATTENDANCE_THRESHOLD}% in {courseId}
              </h3>
              <p className="alert-warning-text">
                The following students currently fall short of the institutional 75% attendance requirement and risk academic disbarment:
              </p>
            </div>
          </div>
          <div className="shortage-students-chip-list">
            {lowAttendanceStudents.map((s) => (
              <span key={s.studentId} className="shortage-student-pill">
                <strong>{s.studentName}</strong> ({s.studentId}): {s.attendancePercentage}% &bull; {s.attendedSessions}/{s.totalSessions} sessions
              </span>
            ))}
          </div>
        </div>
      ) : (
        summaryData && summaryData.totalStudentsCount > 0 && (
          <div className="alert teacher-healthy-alert">
            <div className="alert-header-row" style={{ marginBottom: 0 }}>
              <span className="healthy-icon">&#10003;</span>
              <div>
                <strong style={{ color: '#065f46' }}>Healthy Attendance Standing:</strong>{' '}
                All enrolled students in <strong>{courseId}</strong> currently meet or exceed the institutional {LOW_ATTENDANCE_THRESHOLD}% attendance requirement.
              </div>
            </div>
          </div>
        )
      )}

      {/* 4. ATTENDANCE KPI CARDS */}
      <div className="teacher-kpi-grid">
        {/* KPI 1: Average Class Attendance */}
        <div className="teacher-kpi-card kpi-card-overall">
          <div className="kpi-top-row">
            <span className="kpi-label">Average Class Attendance</span>
            <span
              className={`pill ${
                (summaryData?.averageAttendancePercentage || 0) >= LOW_ATTENDANCE_THRESHOLD
                  ? 'pill-success'
                  : 'pill-warning'
              }`}
            >
              {(summaryData?.averageAttendancePercentage || 0) >= LOW_ATTENDANCE_THRESHOLD
                ? 'Healthy Average'
                : 'Attention Needed'}
            </span>
          </div>

          <div className="kpi-value-row">
            <span className="kpi-primary-number">
              {summaryData ? `${summaryData.averageAttendancePercentage}%` : '0%'}
            </span>
            <div className="kpi-icon-pill icon-overall">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
          </div>

          <div className="kpi-progress-bar-wrap">
            <div className="progress-track">
              <div
                className={`progress-fill ${
                  (summaryData?.averageAttendancePercentage || 0) >= LOW_ATTENDANCE_THRESHOLD
                    ? 'progress-fill-success'
                    : 'progress-fill-warning'
                }`}
                style={{
                  width: `${Math.min(100, summaryData?.averageAttendancePercentage || 0)}%`
                }}
              />
            </div>
          </div>

          <div className="kpi-subtext">
            Overall class average across all enrolled students in {courseId}
          </div>
        </div>

        {/* KPI 2: Total Conducted Sessions */}
        <div className="teacher-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Conducted Sessions</span>
            <div className="kpi-icon-pill icon-attended">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
          </div>

          <div className="kpi-value-row">
            <span className="kpi-primary-number">
              {summaryData?.totalConductedSessions || 0}
            </span>
          </div>

          <div className="kpi-subtext">
            Distinct class session dates recorded in MySQL database
          </div>
        </div>

        {/* KPI 3: Enrolled Students */}
        <div className="teacher-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Enrolled Students</span>
            <div className="kpi-icon-pill icon-courses">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          </div>

          <div className="kpi-value-row">
            <span className="kpi-primary-number">
              {summaryData?.totalStudentsCount || 0}
            </span>
          </div>

          <div className="kpi-subtext">
            Registered students actively tracked for {courseId}
          </div>
        </div>

        {/* KPI 4: Students with Low Attendance */}
        <div className="teacher-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Low Attendance Count</span>
            <div className={`kpi-icon-pill ${lowAttendanceStudents.length > 0 ? 'icon-warning' : 'icon-good'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
          </div>

          <div className="kpi-value-row">
            <span className={`kpi-primary-number ${lowAttendanceStudents.length > 0 ? 'text-warning' : 'text-success'}`}>
              {lowAttendanceStudents.length}
            </span>
          </div>

          <div className="kpi-subtext">
            Attendance strictly below {LOW_ATTENDANCE_THRESHOLD}% threshold
          </div>
        </div>
      </div>

      {/* 5. STUDENT ROSTER & INDIVIDUAL ATTENDANCE */}
      <div className="card teacher-roster-card">
        <div className="card-header">
          <div>
            <span className="eyebrow">Student Roster Analytics</span>
            <h2 className="section-title-clean">Student-Wise Attendance ({courseId})</h2>
          </div>
          <span className="pill pill-info">
            {filteredStudents.length} Students Listed
          </span>
        </div>

        <div className="table-filter-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">&#128269;</span>
            <input
              type="text"
              className="input-text teacher-history-search"
              value={searchStudentQuery}
              onChange={(e) => setSearchStudentQuery(e.target.value)}
              placeholder="Search students by ID, name, or email..."
            />
            {searchStudentQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchStudentQuery('')}
                title="Clear filter"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="teacher-roster-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Email Address</th>
                <th>Sessions Attended</th>
                <th>Attendance %</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty-row">
                    {summaryData?.studentStats?.length === 0
                      ? `No students currently enrolled in ${courseId}.`
                      : 'No students match your search filter.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => (
                  <tr key={stu.studentId}>
                    <td>
                      <span className="record-id-chip">{stu.studentId}</span>
                    </td>
                    <td>
                      <span className="teacher-student-name">{stu.studentName}</span>
                    </td>
                    <td>
                      <span className="teacher-student-email">{stu.email}</span>
                    </td>
                    <td>
                      <span className="teacher-session-count">
                        <strong>{stu.attendedSessions}</strong> / {stu.totalSessions}
                      </span>
                    </td>
                    <td>
                      <strong className="teacher-percent-num">{stu.attendancePercentage}%</strong>
                    </td>
                    <td style={{ minWidth: '130px' }}>
                      <div className="progress-track" style={{ height: '7px' }}>
                        <div
                          className={`progress-fill ${
                            stu.lowAttendance ? 'progress-fill-warning' : 'progress-fill-success'
                          }`}
                          style={{ width: `${Math.min(100, stu.attendancePercentage)}%` }}
                        />
                      </div>
                    </td>
                    <td>
                      {stu.lowAttendance ? (
                        <span className="badge-low-attendance">Low Attendance (&lt;75%)</span>
                      ) : (
                        <span className="badge-good-attendance">On Track</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. COURSE ATTENDANCE HISTORY LOG */}
      <div className="card teacher-history-card">
        <div className="card-header">
          <div>
            <span className="eyebrow">Class Session Records</span>
            <h2 className="section-title-clean">Attendance History Log &bull; {courseId}</h2>
          </div>
          <span className="pill pill-info">
            {filteredHistory.length} Scanned Record(s)
          </span>
        </div>

        <div className="table-filter-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">&#128269;</span>
            <input
              type="text"
              className="input-text teacher-history-search"
              value={searchHistoryQuery}
              onChange={(e) => setSearchHistoryQuery(e.target.value)}
              placeholder="Filter session logs by student ID, name, date..."
            />
            {searchHistoryQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchHistoryQuery('')}
                title="Clear filter"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="teacher-history-table">
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty-row">
                    {summaryData?.attendanceHistory?.length === 0 ? (
                      <div className="empty-history-action-box">
                        <p>No attendance records logged for {courseId} yet.</p>
                        {onOpenQrSession && (
                          <button
                            type="button"
                            className="btn primary-btn empty-start-btn"
                            onClick={() => onOpenQrSession(courseId)}
                          >
                            Start First Dynamic QR Session &rarr;
                          </button>
                        )}
                      </div>
                    ) : (
                      'No session records match your filter criteria.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((rec) => (
                  <tr key={rec.id}>
                    <td>
                      <span className="record-id-chip">#{rec.id}</span>
                    </td>
                    <td>
                      <strong>{rec.student?.studentId}</strong>
                    </td>
                    <td>{rec.student?.studentName}</td>
                    <td>{rec.attendanceDate}</td>
                    <td>{rec.attendanceTime}</td>
                    <td>
                      <span className="badge-present">
                        <span className="status-dot"></span>
                        {rec.attendanceStatus}
                      </span>
                    </td>
                    <td>
                      <span className="method-pill">5s Dynamic QR</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* TAB 2: LEARNING MATERIALS */}
            {/* UNIFIED TAB: LEARNING & COURSEWORK */}
      {activeFacultyTab === 'coursework' && (
        <div className="learning-coursework-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {availableCourses.length === 0 && (
            <div className="card admin-section-card" style={{ padding: '36px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📚</div>
              <h3 style={{ color: '#475569', marginBottom: '8px' }}>No Courses Assigned Yet</h3>
              <p style={{ color: '#94a3b8', maxWidth: '500px', margin: '0 auto' }}>
                You do not currently have any subjects assigned to your faculty account. Please contact the system administrator to assign you to a subject to unlock materials, assignments, and practicals.
              </p>
            </div>
          )}
          {/* Internal Subtabs for Learning & Coursework */}
          <div className="admin-subtab-bar" style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <button
              type="button"
              className={`admin-subtab-btn ${facultyLearningSubtab === 'materials' ? 'admin-subtab-active' : ''}`}
              onClick={() => setFacultyLearningSubtab('materials')}
            >
              📂 Learning &amp; Study Material ({resources.filter(r => r.resourceType !== 'EXPERIMENT').length})
            </button>
            <button
              type="button"
              className={`admin-subtab-btn ${facultyLearningSubtab === 'assignments' ? 'admin-subtab-active' : ''}`}
              onClick={() => setFacultyLearningSubtab('assignments')}
            >
              📝 Assignments ({assignments.length})
            </button>
            <button
              type="button"
              className={`admin-subtab-btn ${facultyLearningSubtab === 'experiments' ? 'admin-subtab-active' : ''}`}
              onClick={() => setFacultyLearningSubtab('experiments')}
            >
              🧪 Experiments / Practicals ({resources.filter(r => r.resourceType === 'EXPERIMENT').length})
            </button>
          </div>

{facultyLearningSubtab === 'materials' && (
        <div className="lms-materials-section">
          <div className="card admin-form-card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div>
                <span className="eyebrow">Digital Courseware</span>
                <h3 className="section-title-clean">Upload Learning Material for {courseId}</h3>
                <p className="table-caption-clean">Share lecture slides, reference documents, or recorded lecture videos with enrolled students.</p>
              </div>
            </div>
            <form onSubmit={handleCreateResource} className="admin-entity-form">
              <div className="form-field-col">
                <label className="field-label">Resource Title *</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Lecture 01 Notes: Introduction"
                  value={newResTitle}
                  onChange={(e) => setNewResTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-field-col">
                <label className="field-label">Category</label>
                <select className="input-text" value={newResType} onChange={(e) => setNewResType(e.target.value)}>
                  <option value="NOTE_DOC">Document / Notes (PDF, Doc)</option>
                  <option value="VIDEO">Video Lecture (URL, Stream)</option>
                  <option value="SYLLABUS">Syllabus / Curriculum</option>
                </select>
              </div>
              <div className="form-field-col">
                <label className="field-label">Upload File (PDF/Doc/Zip)</label>
                <input
                  type="file"
                  className="input-text"
                  onChange={(e) => setResFile(e.target.files ? e.target.files[0] : null)}
                  style={{ padding: '6px' }}
                />
                {resFile && (
                  <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '4px', fontWeight: 600 }}>
                    📎 Selected: {resFile.name} ({(resFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
              <div className="form-field-col" style={{ flex: 1.5 }}>
                <label className="field-label">Or Direct File / Video URL</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="https://drive.google.com/... or https://youtube.com/..."
                  value={newResUrl}
                  onChange={(e) => setNewResUrl(e.target.value)}
                />
              </div>
              <div className="form-field-col" style={{ flex: 2 }}>
                <label className="field-label">Description (Optional)</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Chapter 1 review slides and reading references"
                  value={newResDesc}
                  onChange={(e) => setNewResDesc(e.target.value)}
                />
              </div>
              <div className="form-field-btn-col">
                <button type="submit" className="btn primary-btn admin-submit-btn" disabled={uploadingRes}>
                  {uploadingRes ? 'Uploading...' : '➕ Add Material'}
                </button>
              </div>
            </form>
          </div>

          <div className="card admin-section-card">
            <div className="card-header">
              <h3 className="section-title-clean">Course Materials Library</h3>
              <span className="pill pill-info">{resources.length} Uploaded</span>
            </div>
            {resources.length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Description</th>
                      <th>Access Link</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.filter(r => r.resourceType !== 'EXPERIMENT').map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className={`pill ${r.resourceType === 'VIDEO' ? 'pill-purple' : 'pill-info'}`}>
                            {r.resourceType === 'VIDEO' ? '🎥 Video' : '📄 Document'}
                          </span>
                        </td>
                        <td><strong>{r.title}</strong></td>
                        <td><span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>{r.description || '-'}</span></td>
                        <td>
                          {r.fileUrl ? (
                            <button
                              type="button"
                              className="btn secondary-btn"
                              onClick={() => downloadLmsFile(r.fileUrl, r.fileName || `${r.title}.pdf`)}
                              style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                            >
                              📥 Download / Open ↗
                            </button>
                          ) : '-'}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn danger-btn admin-delete-btn"
                            onClick={() => handleDeleteResource(r.id)}
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No learning materials uploaded for {courseId} yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

{facultyLearningSubtab === 'assignments' && (
        <div className="lms-assignments-section">
          <div className="card admin-form-card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div>
                <span className="eyebrow">Continuous Assessment</span>
                <h3 className="section-title-clean">Create Assignment / Practical Task</h3>
                <p className="table-caption-clean">Publish coursework or lab experiment requirements for student submissions.</p>
              </div>
            </div>
            <form onSubmit={handleCreateAssignment} className="admin-entity-form">
              <div className="form-field-col">
                <label className="field-label">Title *</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Assignment 1: Array Sorting or Lab Experiment 3"
                  value={newAssignTitle}
                  onChange={(e) => setNewAssignTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-field-col">
                <label className="field-label">Activity Type *</label>
                <select className="input-text" value={newAssignType} onChange={(e) => setNewAssignType(e.target.value)}>
                  <option value="ASSIGNMENT">Theory Assignment</option>
                  <option value="PRACTICAL">Lab / Practical Experiment</option>
                </select>
              </div>
              <div className="form-field-col">
                <label className="field-label">Submission Deadline</label>
                <input
                  type="date"
                  className="input-text"
                  value={newAssignDeadline}
                  onChange={(e) => setNewAssignDeadline(e.target.value)}
                />
              </div>
              <div className="form-field-col">
                <label className="field-label">Instructions / Description</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Submit code solution and experiment writeup in PDF format"
                  value={newAssignDesc}
                  onChange={(e) => setNewAssignDesc(e.target.value)}
                />
              </div>
              <div className="form-field-col">
                <label className="field-label">Attach File (PDF, DOCX, ZIP)</label>
                <input
                  type="file"
                  className="input-text"
                  onChange={(e) => setAssignFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="form-field-btn-col">
                <button type="submit" className="btn primary-btn admin-submit-btn" disabled={assignUploading}>
                  {assignUploading ? '⏳ Uploading...' : '➕ Publish Task'}
                </button>
              </div>
            </form>
          </div>

          <div className="card admin-section-card">
            <div className="card-header">
              <h3 className="section-title-clean">Course Assignments &amp; Practicals</h3>
              <span className="pill pill-info">{assignments.length} Tasks Active</span>
            </div>
            {assignments.length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Instructions</th>
                      <th>Task Attachment</th>
                      <th>Deadline</th>
                      <th>Submissions</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <span className={`pill ${a.type === 'PRACTICAL' ? 'pill-purple' : 'pill-info'}`}>
                            {a.type || 'ASSIGNMENT'}
                          </span>
                        </td>
                        <td><strong>{a.title}</strong></td>
                        <td><span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>{a.description || '-'}</span></td>
                        <td>
                          {a.fileUrl ? (
                            <button
                              type="button"
                              className="btn secondary-btn"
                              onClick={() => downloadLmsFile(a.fileUrl, a.fileName || `${a.title}.pdf`)}
                              style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                            >
                              📥 {a.fileName || 'Download'}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>No file</span>
                          )}
                        </td>
                        <td>{a.deadline || 'No deadline'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn secondary-btn"
                            onClick={() => handleViewSubmissions(a)}
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                          >
                            👁️ View Submissions
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn danger-btn admin-delete-btn"
                            onClick={() => handleDeleteAssignment(a.id)}
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No assignments or practical activities created for {courseId} yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

{facultyLearningSubtab === 'experiments' && (
        <div className="faculty-experiments-section">
          <div className="card admin-form-card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div>
                <span className="eyebrow">Laboratory &amp; Practical Work</span>
                <h3 className="section-title-clean">Upload Experiment / Practical</h3>
                <p className="table-caption-clean">Add laboratory experiment details, manuals, problem statements, and reference materials.</p>
              </div>
            </div>
            <form onSubmit={handleCreateExperiment} className="admin-entity-form">
              <div className="form-field-col">
                <label className="field-label">Experiment Number *</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Exp 1 or Practical 02"
                  value={expNum}
                  onChange={(e) => setExpNum(e.target.value)}
                  required
                />
              </div>
              <div className="form-field-col" style={{ flex: 1.5 }}>
                <label className="field-label">Experiment Title *</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Implementation of QuickSort with Complexity Analysis"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-field-col">
                <label className="field-label">Lab Date</label>
                <input
                  type="date"
                  className="input-text"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                />
              </div>
              <div className="form-field-col">
                <label className="field-label">Experiment File (PDF/Doc/Zip)</label>
                <input
                  type="file"
                  className="input-text"
                  onChange={(e) => setExpFile(e.target.files ? e.target.files[0] : null)}
                  style={{ padding: '6px' }}
                />
                {expFile && (
                  <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '4px', fontWeight: 600 }}>
                    📎 Selected: {expFile.name} ({(expFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
              <div className="form-field-col" style={{ flex: 2 }}>
                <label className="field-label">Description / Instructions</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Objectives, test inputs, submission guidelines..."
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                />
              </div>
              <div className="form-field-btn-col">
                <button type="submit" className="btn primary-btn admin-submit-btn" disabled={uploadingExp}>
                  {uploadingExp ? 'Uploading...' : '🧪 Upload Experiment'}
                </button>
              </div>
            </form>
          </div>

          <div className="card admin-section-card">
            <div className="card-header">
              <h3 className="section-title-clean">Experiments &amp; Practicals for {courseId}</h3>
              <span className="pill pill-info">{resources.filter(r => r.resourceType === 'EXPERIMENT').length} Experiments</span>
            </div>
            {resources.filter(r => r.resourceType === 'EXPERIMENT').length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Exp #</th>
                      <th>Title</th>
                      <th>Description</th>
                      <th>File Attachment</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.filter(r => r.resourceType === 'EXPERIMENT').map((exp) => (
                      <tr key={exp.id}>
                        <td><span className="pill pill-purple"><strong>{exp.experimentNumber || 'Exp'}</strong></span></td>
                        <td><strong>{exp.title}</strong></td>
                        <td><span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>{exp.description || '-'}</span></td>
                        <td>
                          {exp.fileUrl ? (
                            <button
                              type="button"
                              className="btn secondary-btn"
                              onClick={() => downloadLmsFile(exp.fileUrl, exp.fileName || `${exp.title}.pdf`)}
                              style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                            >
                              📥 Download File ({exp.fileName || 'View'})
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>No file attached</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn danger-btn admin-delete-btn"
                            onClick={() => handleDeleteResource(exp.id)}
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No experiments uploaded for {courseId} yet. Use the form above to add your first experiment.</p>
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      )}

{activeFacultyTab === 'announcements' && (
        <div className="lms-announcements-section">
          <div className="card admin-form-card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div>
                <span className="eyebrow">Class Communication</span>
                <h3 className="section-title-clean">Post Class Announcement</h3>
                <p className="table-caption-clean">Broadcast alerts, exam schedules, or classroom notices to enrolled students.</p>
              </div>
            </div>
            <form onSubmit={handleCreateAnnouncement} className="admin-entity-form">
              <div className="form-field-col">
                <label className="field-label">Headline / Title *</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Upcoming Lab Evaluation Schedule"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-field-col">
                <label className="field-label">Target Division</label>
                <select className="input-text" value={annDiv} onChange={(e) => setAnnDiv(e.target.value)}>
                  <option value="All">All Divisions</option>
                  <option value="A">Division A</option>
                  <option value="B">Division B</option>
                  <option value="C">Division C</option>
                </select>
              </div>
              <div className="form-field-col">
                <label className="field-label">Target Batch</label>
                <select className="input-text" value={annBatch} onChange={(e) => setAnnBatch(e.target.value)}>
                  <option value="All">All Batches</option>
                  {annDiv === 'A' && ['A1', 'A2', 'A3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {annDiv === 'B' && ['B1', 'B2', 'B3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {annDiv === 'C' && ['C1', 'C2', 'C3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {annDiv === 'All' && ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-field-col" style={{ flex: 2 }}>
                <label className="field-label">Announcement Content *</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Detailed announcement message..."
                  value={newAnnContent}
                  onChange={(e) => setNewAnnContent(e.target.value)}
                  required
                />
              </div>
              <div className="form-field-btn-col">
                <button type="submit" className="btn primary-btn admin-submit-btn">
                  📢 Broadcast
                </button>
              </div>
            </form>
          </div>

          <div className="card admin-section-card">
            <div className="card-header">
              <h3 className="section-title-clean">Broadcasted Announcements</h3>
              <span className="pill pill-info">{announcements.length} Messages</span>
            </div>
            {announcements.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                {announcements.map((ann) => (
                  <div key={ann.id} style={{ padding: '16px', borderRadius: '10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--color-navy)' }}>{ann.title}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : ''}
                        </span>
                        <button
                          type="button"
                          className="btn danger-btn"
                          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleDeleteAnnouncement(ann.id)}
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
                <p className="no-data-text">No announcements posted for {courseId} yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeFacultyTab === 'defaulters' && (
        <div className="faculty-defaulters-section">
          <div className="card" style={{ marginBottom: '20px', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
              <div>
                <span className="eyebrow">Academic Attendance Compliance</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', color: '#0f172a' }}>Defaulter List &amp; Reports</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                  Real-time attendance calculation based on conducted sessions. Students below the threshold percentage are identified as Defaulters.
                </p>
              </div>
              <button
                type="button"
                className="btn primary-btn"
                onClick={handleExportDefaultersExcel}
                disabled={defaulterExporting || defaulterList.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#15803d', borderColor: '#166534' }}
              >
                <span>📥</span>
                <span>{defaulterExporting ? 'Generating Excel...' : 'Export Defaulter List (Excel .xlsx)'}</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Course / Subject</label>
                <select
                  className="input-text"
                  value={defaulterCourse}
                  onChange={(e) => setDefaulterCourse(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value={courseId}>{courseId} (Current Course)</option>
                  {availableCourses.filter(c => c.courseId !== courseId).map(c => (
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
                  onClick={loadDefaulterList}
                  disabled={defaulterLoading}
                  style={{ width: '100%', padding: '8px' }}
                >
                  {defaulterLoading ? 'Computing...' : '↻ Apply Filters'}
                </button>
              </div>
            </div>
          </div>

          <div className="card admin-section-card">
            <div className="card-header">
              <div>
                <h3 className="section-title-clean">Attendance Audit &amp; Defaulter Roster</h3>
                <p className="table-caption-clean">
                  Showing compliance status against &lt; {defaulterThreshold}% requirement.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="pill pill-danger">
                  {defaulterList.filter(d => d.status === 'Defaulter').length} Defaulters
                </span>
                <span className="pill pill-success">
                  {defaulterList.filter(d => d.status !== 'Defaulter').length} Eligible
                </span>
              </div>
            </div>

            {defaulterLoading ? (
              <div style={{ padding: '36px', textAlign: 'center' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '10px', color: '#64748b' }}>Computing attendance records across all sessions...</p>
              </div>
            ) : defaulterList.length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Branch</th>
                      <th>Div / Batch</th>
                      <th>Present / Total Sessions</th>
                      <th>Absent</th>
                      <th>Attendance %</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaulterList.map((st) => (
                      <tr key={st.studentId} style={{ backgroundColor: st.status === 'Defaulter' ? '#fff1f2' : 'transparent' }}>
                        <td><strong>{st.studentId}</strong></td>
                        <td>{st.studentName}</td>
                        <td>{st.branch || '-'}</td>
                        <td>{st.division || '-'}{st.batch ? ` / ${st.batch}` : ''}</td>
                        <td>
                          <strong>{st.presentClasses}</strong> / {st.totalClasses}
                        </td>
                        <td>{st.absentClasses}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: st.status === 'Defaulter' ? '#e11d48' : '#15803d' }}>
                            {st.attendancePercentage ? st.attendancePercentage.toFixed(1) : '0.0'}%
                          </span>
                        </td>
                        <td>
                          <span className={`pill ${st.status === 'Defaulter' ? 'pill-danger' : 'pill-success'}`}>
                            {st.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No student attendance records match the selected course and filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeFacultyTab === 'profile' && (
        <div className="card" style={{ padding: '28px', marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                {(currentUser?.fullName || currentUser?.username || 'F').charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="eyebrow" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Faculty Academic Profile</span>
                <h2 style={{ margin: '4px 0 0 0', color: 'var(--color-navy)', fontSize: '1.4rem' }}>
                  {currentUser?.fullName || currentUser?.username || 'Faculty Member'}
                </h2>
                <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                  SmartAttend Academic Portal • Official Teaching Profile
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn secondary-btn"
              onClick={() => setActiveFacultyTab('classes')}
            >
              ← Back to Classes
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Faculty ID / Username</span>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                {currentUser?.username || 'faculty'}
              </p>
            </div>
            <div className="card" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Department</span>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                {currentUser?.department || 'Computer Engineering'}
              </p>
            </div>
            <div className="card" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Role</span>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                <span className="pill pill-info">Teaching Faculty</span>
              </p>
            </div>
            <div className="card" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Courses</span>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                {availableCourses.length} Subjects
              </p>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-navy)', marginBottom: '12px' }}>Assigned Subject Curriculum</h3>
            {availableCourses.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {availableCourses.map((c) => (
                  <div key={c.courseId} style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--color-primary)' }}>{c.courseId}</strong>
                      <span className="pill pill-purple" style={{ fontSize: '0.72rem' }}>{c.branch || 'General'}</span>
                    </div>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.92rem' }}>{c.courseName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                      Div {c.division || 'All'} • Sem {c.semester || '-'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No course assignments mapped yet.</p>
            )}
          </div>
        </div>
      )}

      {/* SESSION DETAILS INSPECTION MODAL */}
      {viewingSessionDetails && (
        <div className="modal-backdrop" onClick={() => setViewingSessionDetails(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="eyebrow" style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 700 }}>
                  Teaching Session Details
                </span>
                <h3 style={{ margin: '4px 0 0 0', color: 'var(--color-navy)', fontSize: '1.25rem' }}>
                  {viewingSessionDetails.courseName} ({viewingSessionDetails.sessionCode})
                </h3>
              </div>
              <button type="button" className="btn secondary-btn" onClick={() => setViewingSessionDetails(null)}>
                ✕ Close
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Course Code</span>
                <strong>{viewingSessionDetails.courseId}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Lecture Type</span>
                <span className={viewingSessionDetails.lectureType === 'LAB' ? 'lecture-type-badge-lab' : 'lecture-type-badge-theory'}>
                  {viewingSessionDetails.lectureType === 'LAB' ? '🧪 Lab Session' : '📖 Theory Session'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Cohort &amp; Division</span>
                <strong>{viewingSessionDetails.academicYear || 'FE'} • Div {viewingSessionDetails.division || 'All'} (Batch: {viewingSessionDetails.batch || 'All'})</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Date &amp; Time</span>
                <strong>{viewingSessionDetails.sessionDate} at {viewingSessionDetails.sessionTime}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Attendance Marked</span>
                <strong style={{ color: '#15803d' }}>{viewingSessionDetails.attendanceCount || 0} / {viewingSessionDetails.totalStudents || 70} Students</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Session Status</span>
                <span className={`pill ${viewingSessionDetails.active ? 'pill-success' : 'pill-warning'}`}>
                  {viewingSessionDetails.active ? '● Active' : 'Concluded'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {viewingSessionDetails.active && onOpenQrSession && (
                <button
                  type="button"
                  className="btn primary-btn"
                  onClick={() => {
                    const s = viewingSessionDetails;
                    setViewingSessionDetails(null);
                    onOpenQrSession(s.courseId, s.sessionCode);
                  }}
                >
                  📱 Start Dynamic QR
                </button>
              )}
              <button
                type="button"
                className="btn secondary-btn"
                onClick={() => {
                  const s = viewingSessionDetails;
                  setViewingSessionDetails(null);
                  handleViewSessionAttendance(s);
                }}
              >
                👁 View Attendees
              </button>
              <button
                type="button"
                className="btn secondary-btn"
                style={{ color: viewingSessionDetails.active ? '#b91c1c' : '#047857' }}
                onClick={() => {
                  handleToggleClass(viewingSessionDetails);
                  setViewingSessionDetails(null);
                }}
              >
                {viewingSessionDetails.active ? '⏹ End Session' : '▶ Reopen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSIONS MODAL */}
      {viewingSubmissionsFor && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '650px', width: '90%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--color-navy)' }}>
                Submissions: {viewingSubmissionsFor.title}
              </h3>
              <button type="button" className="btn secondary-btn" onClick={() => setViewingSubmissionsFor(null)}>
                ✕ Close
              </button>
            </div>
            {submissionsList.length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Content / URL</th>
                      <th>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionsList.map((s) => (
                      <tr key={s.id}>
                        <td><strong>{s.studentId}</strong></td>
                        <td>
                          {s.fileUrl ? (
                            <button
                              type="button"
                              className="btn secondary-btn"
                              onClick={() => downloadLmsFile(s.fileUrl, s.fileName || `submission_${s.studentId}.pdf`)}
                              style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                            >
                              📥 Download Submission ({s.fileName || 'File'})
                            </button>
                          ) : (
                            <span>{s.submissionText || '-'}</span>
                          )}
                        </td>
                        <td>{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px 0' }}>
                No student submissions received for this assignment yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* CREATE CLASS / LECTURE MODAL */}
      {showCreateClassModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateClassModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span className="eyebrow" style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 700 }}>
                  Teaching Schedule
                </span>
                <h3 style={{ margin: '4px 0 0 0', color: 'var(--color-navy)', fontSize: '1.35rem' }}>
                  Schedule New Class / Lecture
                </h3>
              </div>
              <button
                type="button"
                className="btn secondary-btn"
                onClick={() => setShowCreateClassModal(false)}
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateClass}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: 'var(--color-text)' }}>
                  Assigned Subject / Course
                </label>
                <select
                  className="input-text"
                  value={classForm.courseId}
                  onChange={(e) => setClassForm({ ...classForm, courseId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px' }}
                >
                  <option value="">-- Select Course --</option>
                  {(availableCourses || []).map((c) => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.courseId} — {c.courseName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: 'var(--color-text)' }}>
                    Session Type
                  </label>
                  <select
                    className="input-text"
                    value={classForm.lectureType}
                    onChange={(e) => {
                      const type = e.target.value;
                      setClassForm({
                        ...classForm,
                        lectureType: type
                      });
                    }}
                    style={{ width: '100%', padding: '10px 12px' }}
                  >
                    <option value="THEORY">📖 Theory Session</option>
                    <option value="LAB">🧪 Lab Session</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: 'var(--color-text)' }}>
                    Academic Year
                  </label>
                  <select
                    className="input-text"
                    value={classForm.academicYear}
                    onChange={(e) => setClassForm({ ...classForm, academicYear: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px' }}
                  >
                    <option value="FE">First Year (FE)</option>
                    <option value="SE">Second Year (SE)</option>
                    <option value="TE">Third Year (TE)</option>
                    <option value="BE">Final Year (BE)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: 'var(--color-text)' }}>
                    Division
                  </label>
                  <select
                    className="input-text"
                    value={classForm.division}
                    onChange={(e) => {
                      const div = e.target.value;
                      const validBatches = getBatchesForDivision(div);
                      setClassForm({
                        ...classForm,
                        division: div,
                        batch: classForm.batch === 'All' ? 'All' : validBatches[0]
                      });
                    }}
                    style={{ width: '100%', padding: '10px 12px' }}
                  >
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                    <option value="C">Division C</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: 'var(--color-text)' }}>
                    Batch
                  </label>
                  <select
                    className="input-text"
                    value={classForm.batch}
                    onChange={(e) => setClassForm({ ...classForm, batch: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px' }}
                  >
                    <option value="All">All Batches (Entire Division)</option>
                    {getBatchesForDivision(classForm.division).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: 'var(--color-text)' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    className="input-text"
                    value={classForm.sessionDate}
                    onChange={(e) => setClassForm({ ...classForm, sessionDate: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: 'var(--color-text)' }}>
                    Time
                  </label>
                  <input
                    type="time"
                    className="input-text"
                    value={classForm.sessionTime}
                    onChange={(e) => setClassForm({ ...classForm, sessionTime: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: 'var(--color-text)' }}>
                    Expected Students
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    className="input-text"
                    value={classForm.totalStudents}
                    onChange={(e) => setClassForm({ ...classForm, totalStudents: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn secondary-btn"
                  onClick={() => setShowCreateClassModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary-btn"
                  disabled={creatingClass}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {creatingClass ? (
                    <>
                      <span className="spinner" style={{ width: '14px', height: '14px' }}></span>
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <span>Schedule Class / Lecture</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SESSION ATTENDANCE ATTENDEES ROSTER MODAL */}
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

export default TeacherDashboard;
