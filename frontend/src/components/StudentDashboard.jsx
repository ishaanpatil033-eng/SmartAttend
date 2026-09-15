import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getStudentAttendanceSummary,
  getStudents,
  getMoodleAssignments,
  refreshMoodleAssignments,
  getClassmates,
  getClassmateProfile,
  sendClassmateMessage,
  getConversations,
  getCoursesForStudent,
  getCourseResources,
  getCourseAssignments,
  submitAssignment,
  getMySubmissions,
  getCourseAnnouncements,
  getStudentClasses,
  uploadLmsFile,
  downloadLmsFile,
  removeStudentSubmission,
  getMessageThread
} from '../services/api.js';

const LOW_ATTENDANCE_THRESHOLD = 75.0;

const StudentDashboard = ({ onOpenScanner, currentStudentId = 'STU101', onStudentChange, currentUser, activeSubTab, onSubTabChange }) => {
  const [selectedStudentId, setSelectedStudentId] = useState(currentUser?.studentId || currentStudentId);
  const [studentInput, setStudentInput] = useState(currentUser?.studentId || currentStudentId);
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Academic Workspace Tab Navigation ('overview' | 'classes' | 'coursework' | 'deadlines' | 'announcements' | 'classmates' | 'messages' | 'profile')
  const [internalWorkspaceTab, setInternalWorkspaceTab] = useState(
    (activeSubTab === 'materials' || activeSubTab === 'assignments' || activeSubTab === 'experiments')
      ? 'coursework'
      : (activeSubTab || 'overview')
  );
  const workspaceTab = internalWorkspaceTab;

  // Unified Learning & Coursework internal subtab ('materials' | 'assignments' | 'experiments')
  const [studentLearningSubtab, setStudentLearningSubtab] = useState(
    (activeSubTab === 'materials' || activeSubTab === 'assignments' || activeSubTab === 'experiments')
      ? activeSubTab
      : 'materials'
  );

  useEffect(() => {
    if (activeSubTab) {
      if (activeSubTab === 'materials' || activeSubTab === 'assignments' || activeSubTab === 'experiments') {
        setInternalWorkspaceTab('coursework');
        setStudentLearningSubtab(activeSubTab);
      } else if (activeSubTab !== internalWorkspaceTab) {
        setInternalWorkspaceTab(activeSubTab);
      }
    }
  }, [activeSubTab]);

  const setWorkspaceTab = (tab) => {
    setInternalWorkspaceTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  // Moodle Assignments & Deadlines State
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [refreshingDeadlines, setRefreshingDeadlines] = useState(false);
  const [deadlineFilter, setDeadlineFilter] = useState('all');
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set());
  const [notificationBannerDismissed, setNotificationBannerDismissed] = useState(false);

  // My Class / Batch Directory State
  const [classmates, setClassmates] = useState([]);
  const [classmatesLoading, setClassmatesLoading] = useState(false);
  const [batchFilter, setBatchFilter] = useState('');
  const [classmateSearchQuery, setClassmateSearchQuery] = useState('');
  const [selectedPeerProfile, setSelectedPeerProfile] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Peer Messaging State
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSuccessMsg, setMessageSuccessMsg] = useState('');

  // Peer Chat Box Thread State
  const [chatThread, setChatThread] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Student Lecture Sessions State (Class = Actual Lecture/Lab Session + Attendance)
  const [studentClasses, setStudentClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);

  // LMS State for Student
  const [lmsCourses, setLmsCourses] = useState([]);
  const [lmsResources, setLmsResources] = useState([]);
  const [lmsAssignments, setLmsAssignments] = useState([]);
  const [lmsSubmissions, setLmsSubmissions] = useState([]);
  const [lmsAnnouncements, setLmsAnnouncements] = useState([]);
  const [lmsLoading, setLmsLoading] = useState(false);

  // Submitting coursework state
  const [submittingAssignId, setSubmittingAssignId] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submittingInProgress, setSubmittingInProgress] = useState(false);
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState('');

  // Synchronize state if parent passes a different studentId or authenticated user changes
  useEffect(() => {
    if (currentUser?.role === 'ROLE_STUDENT' && currentUser.studentId) {
      setSelectedStudentId(currentUser.studentId);
      setStudentInput(currentUser.studentId);
    } else if (currentStudentId && currentStudentId !== selectedStudentId) {
      setSelectedStudentId(currentStudentId);
      setStudentInput(currentStudentId);
    }
  }, [currentStudentId, currentUser]);

  // Fetch list of registered students for easy dropdown switching (dev/admin testing only)
  const loadRegisteredStudents = useCallback(async () => {
    if (currentUser?.role === 'STUDENT' || currentUser?.roles?.includes('ROLE_STUDENT')) {
      return;
    }
    try {
      const list = await getStudents();
      setRegisteredStudents(list);
    } catch (err) {
      console.warn('Could not fetch student directory:', err);
    }
  }, [currentUser]);

  // If Admin views student perspective and default STU101 is absent, switch to first registered student
  useEffect(() => {
    if (!currentUser?.studentId && registeredStudents && registeredStudents.length > 0) {
      const exists = registeredStudents.some(s => s.studentId === selectedStudentId);
      if (!exists) {
        setSelectedStudentId(registeredStudents[0].studentId);
        setStudentInput(registeredStudents[0].studentId);
      }
    }
  }, [registeredStudents, currentUser, selectedStudentId]);

  // Fetch student summary, profile, per-course stats, and history from backend
  const loadStudentData = useCallback(async (idToFetch) => {
    if (!idToFetch || !idToFetch.trim()) {
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const data = await getStudentAttendanceSummary(idToFetch.trim());
      setSummaryData(data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Could not load student profile and attendance records.';
      setErrorMsg(msg);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Moodle Assignments
  const loadAssignments = useCallback(async (courseId = null) => {
    try {
      setAssignmentsLoading(true);
      const list = await getMoodleAssignments(courseId, selectedStudentId);
      setAssignments(list);
    } catch (err) {
      console.warn('Could not load Moodle assignments:', err);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [selectedStudentId]);

  // Handle Dynamic Moodle Due-Date Refresh
  const handleRefreshDeadlines = async (assignmentIdToExtend = null, daysToExtend = null) => {
    try {
      setRefreshingDeadlines(true);
      const updated = await refreshMoodleAssignments(null, assignmentIdToExtend, daysToExtend);
      setAssignments(updated);
    } catch (err) {
      console.warn('Could not refresh deadlines from Moodle:', err);
    } finally {
      setRefreshingDeadlines(false);
    }
  };

  // Load Authorized Classmates
  const loadClassmates = useCallback(async () => {
    try {
      setClassmatesLoading(true);
      const list = await getClassmates(selectedStudentId, null, batchFilter || null);
      setClassmates(list);
    } catch (err) {
      console.warn('Could not load authorized classmates:', err);
    } finally {
      setClassmatesLoading(false);
    }
  }, [selectedStudentId, batchFilter]);

  // Load Conversations
  // Load student's enrolled courses and LMS items (materials, assignments, submissions, announcements)
  const loadLmsStudentData = useCallback(async (stuId) => {
    if (!stuId) return;
    try {
      setLmsLoading(true);
      const studentCourses = await getCoursesForStudent(stuId).catch(() => []);
      setLmsCourses(studentCourses || []);

      const courseIds = (studentCourses && studentCourses.length > 0)
        ? studentCourses.map(c => c.courseId)
        : [];

      // Fetch resources, assignments, announcements for all enrolled courses
      const [resNested, assignNested, annNested, subs] = await Promise.all([
        Promise.all(courseIds.map(cId => getCourseResources(cId).catch(() => []))),
        Promise.all(courseIds.map(cId => getCourseAssignments(cId).catch(() => []))),
        Promise.all(courseIds.map(cId => getCourseAnnouncements(cId).catch(() => []))),
        getMySubmissions(stuId).catch(() => [])
      ]);

      setLmsResources(resNested.flat());
      setLmsAssignments(assignNested.flat());
      setLmsAnnouncements(annNested.flat());
      setLmsSubmissions(subs || []);
    } catch (err) {
      console.warn('LMS student data error:', err);
    } finally {
      setLmsLoading(false);
    }
  }, []);

  const handleSubmitCoursework = async (e) => {
    e.preventDefault();
    if (!submittingAssignId) return;
    let fileUrl = submissionUrl.trim();
    let fileName = null;

    if (!submissionFile && !fileUrl && !submissionText.trim()) {
      alert('Please select a file from your device, enter a solution URL, or write your answer notes.');
      return;
    }

    try {
      setSubmittingInProgress(true);
      if (submissionFile) {
        const uploadRes = await uploadLmsFile(submissionFile);
        fileUrl = uploadRes.fileUrl;
        fileName = uploadRes.originalName || uploadRes.fileName;
      }
      await submitAssignment({
        assignmentId: submittingAssignId,
        studentId: selectedStudentId,
        submissionText: submissionText.trim() || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null
      });
      setSubmissionSuccessMsg('Coursework submitted successfully!');
      setSubmittingAssignId(null);
      setSubmissionFile(null);
      setSubmissionText('');
      setSubmissionUrl('');
      await loadLmsStudentData(selectedStudentId);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Submission failed.');
    } finally {
      setSubmittingInProgress(false);
    }
  };

  const handleRemoveSubmission = async (assignmentId) => {
    if (!assignmentId) return;
    if (!window.confirm('Are you sure you want to remove your submission? You will be able to upload a new one afterwards.')) {
      return;
    }
    try {
      setSubmittingInProgress(true);
      await removeStudentSubmission(assignmentId);
      setSubmissionFile(null);
      setSubmissionText('');
      setSubmissionUrl('');
      setSubmissionSuccessMsg('Submission removed successfully. You can now submit new work.');
      await loadLmsStudentData(selectedStudentId);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to remove submission.');
    } finally {
      setSubmittingInProgress(false);
    }
  };

  // Scroll to bottom of chat
  const scrollToChatBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (messageModalOpen) {
      scrollToChatBottom();
    }
  }, [chatThread, messageModalOpen]);

  // Load chronological message thread for the chat box
  const loadChatThread = useCallback(async (peer) => {
    if (!peer || !selectedStudentId) return;
    const peerId = peer.studentId || peer.peerStudentId;
    if (!peerId) return;
    try {
      setChatLoading(true);
      const thread = await getMessageThread(selectedStudentId, peerId);
      setChatThread(thread || []);
    } catch (err) {
      console.warn('Could not load chat thread:', err);
      setChatThread([]);
    } finally {
      setChatLoading(false);
    }
  }, [selectedStudentId]);

  // Load scheduled lecture and lab sessions for the student
  const loadStudentClasses = useCallback(async (stuId) => {
    if (!stuId) return;
    try {
      setClassesLoading(true);
      const classes = await getStudentClasses(stuId);
      setStudentClasses(classes || []);
    } catch (err) {
      console.warn('Could not load student classes:', err);
      setStudentClasses([]);
    } finally {
      setClassesLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      setConversationsLoading(true);
      const list = await getConversations(selectedStudentId);
      setConversations(list);
    } catch (err) {
      console.warn('Could not load conversations:', err);
    } finally {
      setConversationsLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    loadRegisteredStudents();
  }, [loadRegisteredStudents]);

  useEffect(() => {
    loadStudentData(selectedStudentId);
    loadAssignments();
    loadClassmates();
    loadConversations();
    loadLmsStudentData(selectedStudentId);
    loadStudentClasses(selectedStudentId);
  }, [selectedStudentId, loadStudentData, loadAssignments, loadClassmates, loadConversations, loadLmsStudentData, loadStudentClasses]);

  // Handle student change from dropdown or input form
  const handleStudentSwitch = (e) => {
    e.preventDefault();
    if (studentInput.trim()) {
      const newId = studentInput.trim();
      setSelectedStudentId(newId);
      if (onStudentChange) {
        onStudentChange(newId);
      }
    }
  };

  const handleDropdownSelect = (e) => {
    const nextId = e.target.value;
    setStudentInput(nextId);
    setSelectedStudentId(nextId);
    if (onStudentChange) {
      onStudentChange(nextId);
    }
  };

  // View Peer Profile with privacy verification
  const handleViewProfile = async (peerStudentId) => {
    try {
      setProfileLoading(true);
      const profile = await getClassmateProfile(peerStudentId, selectedStudentId);
      setSelectedPeerProfile(profile);
      setProfileModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not load classmate profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Open Messaging Chat Box for Classmate
  const handleOpenMessageModal = (peer) => {
    setMessageTarget(peer);
    setMessageText('');
    setMessageSuccessMsg('');
    setMessageModalOpen(true);
    loadChatThread(peer);
  };

  // Send Peer Message in Chat Box
  const handleSendMessage = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!messageTarget || !messageText.trim() || sendingMessage) {
      return;
    }

    const textToSend = messageText.trim();
    const recipientId = messageTarget.studentId || messageTarget.peerStudentId;

    try {
      setSendingMessage(true);
      setMessageSuccessMsg('');
      await sendClassmateMessage({
        senderStudentId: selectedStudentId,
        recipientStudentId: recipientId,
        messageText: textToSend,
        courseId: lmsCourses?.[0]?.courseId || ''
      });
      setMessageText('');
      setChatThread((prev) => [
        ...prev,
        {
          senderStudentId: selectedStudentId,
          recipientStudentId: recipientId,
          text: textToSend,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      loadConversations();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Dismiss a notification
  const handleDismissNotification = (id) => {
    setDismissedNotifications((prev) => new Set([...prev, id]));
  };

  // Filter attendance history based on search query
  const filteredHistory = (summaryData?.attendanceHistory || []).filter((rec) => {
    if (!historySearchQuery.trim()) {
      return true;
    }
    const q = historySearchQuery.toLowerCase();
    const cId = rec.course?.courseId?.toLowerCase() || '';
    const cName = rec.course?.courseName?.toLowerCase() || '';
    const date = rec.attendanceDate?.toLowerCase() || '';
    const status = rec.attendanceStatus?.toLowerCase() || '';
    return cId.includes(q) || cName.includes(q) || date.includes(q) || status.includes(q);
  });

  const lowAttendanceCourses = (summaryData?.courseSummaries || []).filter(
    (c) => c.lowAttendance
  );

  const defaultCourseForScanner = summaryData?.courseSummaries?.[0]?.courseId || '';

  // Urgent notifications (Priority 1: Due Today, Priority 2: Due Tomorrow)
  const urgentNotifications = assignments.filter((a) => {
    if (dismissedNotifications.has(a.id)) return false;
    return a.urgencyPriority === 1 || a.urgencyPriority === 2;
  });

  // Filter assignments based on category
  const filteredAssignments = assignments.filter((a) => {
    if (deadlineFilter === 'all') return true;
    return a.deadlineStatus === deadlineFilter;
  });

  // Filter classmates based on search
  const filteredClassmates = classmates.filter((c) => {
    if (!classmateSearchQuery.trim()) return true;
    const q = classmateSearchQuery.toLowerCase();
    return (
      (c.studentName && c.studentName.toLowerCase().includes(q)) ||
      (c.studentId && c.studentId.toLowerCase().includes(q)) ||
      (c.batch && c.batch.toLowerCase().includes(q))
    );
  });

  const currentDateTimeStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="student-dashboard-wrapper">
      {/* TAB: OVERVIEW / HOME (HOME ONLY) */}
      {workspaceTab === 'overview' && (
        <div className="student-overview-workspace">
          {/* 1. STUDENT PAGE HEADER (HOME ONLY) */}
          <div className="dashboard-page-header">
        <div className="dashboard-page-title-block">
          <h1 className="dashboard-page-title">
            Welcome back, {currentUser?.fullName || summaryData?.student?.studentName || 'Student'}
          </h1>
          <p className="dashboard-page-subtitle">
            Student Academic Workspace &bull; Attendance, Timetable &amp; Learning Hub
          </p>
        </div>
        <div className="dashboard-page-meta">
          <div className="system-live-clock">
            <span className="live-clock-dot"></span>
            <span>{currentDateTimeStr} &bull; Live Sync Active</span>
          </div>
          <div className="student-header-controls">
            {currentUser?.role === 'ROLE_STUDENT' ? (
              <div className="authenticated-student-pill">
                <span className="auth-lock-icon">🔒</span>
                <span className="auth-student-id">{currentUser.studentId}</span>
              </div>
            ) : (
              <div className="student-switch-inline">
                {registeredStudents.length > 0 ? (
                  <select
                    id="student-id-select"
                    className="input-select student-profile-select"
                    value={selectedStudentId}
                    onChange={handleDropdownSelect}
                    title="Select registered student profile"
                  >
                    {registeredStudents.map((s) => (
                      <option key={s.id} value={s.studentId}>
                        {s.studentId} - {s.studentName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="student-id-input"
                    type="text"
                    className="input-text student-profile-input"
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value)}
                    placeholder="STU101"
                  />
                )}
              </div>
            )}
            <button
              type="button"
              className="btn-refresh-clean"
              onClick={() => {
                loadStudentData(selectedStudentId);
                loadAssignments();
                loadClassmates();
                loadConversations();
              }}
              disabled={loading || assignmentsLoading}
              title="Reload student attendance and academic records"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'spin-icon' : ''}>
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

        {/* Student Profile Info Bar */}
        <div className="student-profile-info-strip">
          <div className="student-avatar-badge">
            <span className="student-avatar-initial">
              {summaryData?.student?.studentName
                ? summaryData.student.studentName.charAt(0).toUpperCase()
                : 'S'}
            </span>
          </div>
          <div className="student-profile-details">
            <div className="student-name-row">
              <h2 className="student-full-name">
                {summaryData?.student?.studentName || `Student (${selectedStudentId})`}
              </h2>
              <span className="pill pill-success">Enrolled Student</span>
            </div>
            <div className="student-meta-chips-row">
              <span className="meta-chip">
                <span className="chip-label">Student ID:</span>
                <strong>{summaryData?.student?.studentId || selectedStudentId}</strong>
              </span>
              <span className="meta-chip">
                <span className="chip-label">Cohort:</span>
                <strong>
                  {summaryData?.student?.academicYear || 'FE'} • Sem {summaryData?.student?.semester || 1} • Batch {summaryData?.student?.batch || 'E1'}
                </strong>
              </span>
              {summaryData?.student?.email && (
                <span className="meta-chip">
                  <span className="chip-label">Email:</span>
                  <span>{summaryData.student.email}</span>
                </span>
              )}
              <span className="meta-chip">
                <span className="chip-label">Moodle LMS:</span>
                <span style={{ color: 'var(--color-moodle)', fontWeight: 600 }}>Active Connection</span>
              </span>
            </div>
          </div>
        </div>



      {/* 3. URGENT DEADLINES NOTIFICATION BANNER (Priority 1: Today, Priority 2: Tomorrow) */}
      {!notificationBannerDismissed && urgentNotifications.length > 0 && (
        <div className="urgent-deadlines-banner">
          <div className="urgent-banner-content">
            <div className="urgent-banner-icon-wrap">&#128276;</div>
            <div className="urgent-banner-text-block">
              <div className="urgent-banner-title">
                Immediate Action Required: {urgentNotifications.length} Moodle Assignment Deadline(s) Due Soon!
              </div>
              <div className="urgent-pills-row">
                {urgentNotifications.map((notif) => (
                  <div key={notif.id} className="urgent-notif-pill">
                    <span className={`urgent-pill-status ${notif.urgencyPriority === 1 ? 'pill-due-today' : 'pill-due-tomorrow'}`}>
                      {notif.urgencyPriority === 1 ? 'Due Today' : 'Due Tomorrow'}
                    </span>
                    <span className="urgent-pill-course">{notif.courseId}:</span>
                    <span className="urgent-pill-title">{notif.title}</span>
                    <span className="urgent-pill-time">({notif.formattedDue})</span>
                    <button
                      type="button"
                      className="urgent-pill-dismiss"
                      onClick={() => handleDismissNotification(notif.id)}
                      title="Dismiss notification"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-dismiss-all-urgent"
            onClick={() => setNotificationBannerDismissed(true)}
            title="Dismiss notification banner"
          >
            Dismiss All &times;
          </button>
        </div>
      )}

          {/* PRIMARY QUICK ACTION: SCAN DYNAMIC QR CODE */}
          {onOpenScanner && (
            <div className="card student-quick-scan-banner">
          <div className="quick-scan-left">
            <div className="quick-scan-icon-box">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </div>
            <div>
              <div className="quick-scan-badge">Primary Student Action</div>
              <h2 className="quick-scan-title">Scan Dynamic QR Code</h2>
              <p className="quick-scan-desc">
                Mark your attendance for ongoing classroom sessions using your device camera or by entering the 5-second dynamic rotation token.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn primary-btn quick-scan-cta-btn"
            onClick={() => onOpenScanner(selectedStudentId, defaultCourseForScanner)}
          >
            <span>Open QR Scanner</span>
            <span className="btn-arrow">&rarr;</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="alert error-alert">
          <strong>Notice:</strong> {errorMsg}
        </div>
      )}

      {/* 3. LOW ATTENDANCE ALERT (Triggered below 75%) */}
      {lowAttendanceCourses.length > 0 && (
        <div className="alert student-low-attendance-alert">
          <div className="alert-header-row">
            <div className="alert-icon-wrap">&#9888;</div>
            <div>
              <h3 className="alert-warning-title">
                Low Attendance Warning: {lowAttendanceCourses.length} Course(s) Below {LOW_ATTENDANCE_THRESHOLD}%
              </h3>
              <p className="alert-warning-text">
                Your attendance is below the mandatory institutional minimum of {LOW_ATTENDANCE_THRESHOLD}%. Immediate attendance is required to regain good academic standing.
              </p>
            </div>
          </div>
          <div className="low-courses-chip-list">
            {lowAttendanceCourses.map((c) => (
              <span key={c.courseId} className="low-course-pill">
                <strong>{c.courseId}:</strong> {c.courseName} &bull; {c.attendancePercentage}% ({c.attendedSessions}/{c.totalSessions} sessions)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4. ATTENDANCE OVERVIEW KPI CARDS */}
      <div className="student-kpi-grid">
        {/* KPI 1: Overall Attendance */}
        <div className="student-kpi-card kpi-card-overall">
          <div className="kpi-top-row">
            <span className="kpi-label">Overall Attendance</span>
            <span
              className={`pill ${
                (summaryData?.overallAttendancePercentage || 0) >= LOW_ATTENDANCE_THRESHOLD
                  ? 'pill-success'
                  : 'pill-warning'
              }`}
            >
              {(summaryData?.overallAttendancePercentage || 0) >= LOW_ATTENDANCE_THRESHOLD
                ? 'Good Standing'
                : 'Attention Required'}
            </span>
          </div>

          <div className="kpi-value-row">
            <span className="kpi-primary-number">
              {summaryData ? `${summaryData.overallAttendancePercentage}%` : '0%'}
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
                  (summaryData?.overallAttendancePercentage || 0) >= LOW_ATTENDANCE_THRESHOLD
                    ? 'progress-fill-success'
                    : 'progress-fill-warning'
                }`}
                style={{
                  width: `${Math.min(100, summaryData?.overallAttendancePercentage || 0)}%`
                }}
              />
            </div>
          </div>

          <div className="kpi-subtext">
            Total attended: <strong>{summaryData?.totalAttendedSessions || 0}</strong> of{' '}
            <strong>{summaryData?.totalConductedSessions || 0}</strong> conducted sessions
          </div>
        </div>

        {/* KPI 2: Attended Classes */}
        <div className="student-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Attended Classes</span>
            <div className="kpi-icon-pill icon-attended">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          </div>

          <div className="kpi-value-row">
            <span className="kpi-primary-number">
              {summaryData?.totalAttendedSessions || 0}
            </span>
          </div>

          <div className="kpi-subtext">
            Verified dynamic QR & manual attendance sessions marked present
          </div>
        </div>

        {/* KPI 3: Enrolled Courses */}
        <div className="student-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Enrolled Courses</span>
            <div className="kpi-icon-pill icon-courses">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
          </div>

          <div className="kpi-value-row">
            <span className="kpi-primary-number">
              {summaryData?.courseSummaries?.length || 0}
            </span>
          </div>

          <div className="kpi-subtext">
            Active curriculum subjects with recorded class attendance
          </div>
        </div>

        {/* KPI 4: Low Attendance Count */}
        <div className="student-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Low Attendance Count</span>
            <div className={`kpi-icon-pill ${lowAttendanceCourses.length > 0 ? 'icon-warning' : 'icon-good'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
          </div>

          <div className="kpi-value-row">
            <span className={`kpi-primary-number ${lowAttendanceCourses.length > 0 ? 'text-warning' : 'text-success'}`}>
              {lowAttendanceCourses.length}
            </span>
          </div>

          <div className="kpi-subtext">
            Threshold: Courses falling below {LOW_ATTENDANCE_THRESHOLD}% attendance
          </div>
        </div>
      </div>

      {/* 5. COURSE ATTENDANCE BREAKDOWN */}
      <div className="card student-courses-card">
        <div className="card-header">
          <div>
            <span className="eyebrow">Subject-Wise Analytics</span>
            <h2 className="section-title-clean">Course Attendance Breakdown</h2>
          </div>
          <span className="pill pill-info">
            {summaryData?.courseSummaries?.length || 0} Active Course(s)
          </span>
        </div>

        {!summaryData || summaryData.courseSummaries.length === 0 ? (
          <div className="empty-state-box">
            <p className="no-data-text">
              No attendance records found for student <strong>{selectedStudentId}</strong> yet.
            </p>
            <p className="empty-state-hint">
              When a teacher generates a 5-second dynamic QR code and you scan it, your attendance percentage will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="student-course-grid">
            {summaryData.courseSummaries.map((course) => (
              <div
                key={course.courseId}
                className={`student-course-item-card ${course.lowAttendance ? 'card-status-warning' : 'card-status-normal'}`}
              >
                <div className="course-item-header">
                  <div>
                    <span className="course-code-badge">{course.courseId}</span>
                    <h3 className="course-title-text">{course.courseName}</h3>
                  </div>
                  {course.lowAttendance ? (
                    <span className="badge-low-attendance">Low Attendance</span>
                  ) : (
                    <span className="badge-good-attendance">On Track</span>
                  )}
                </div>

                <div className="course-metric-row">
                  <span className="course-percent-value">{course.attendancePercentage}%</span>
                  <span className="course-sessions-badge">
                    {course.attendedSessions} / {course.totalSessions} sessions
                  </span>
                </div>

                <div className="progress-track">
                  <div
                    className={`progress-fill ${course.lowAttendance ? 'progress-fill-warning' : 'progress-fill-success'}`}
                    style={{ width: `${Math.min(100, course.attendancePercentage)}%` }}
                  />
                </div>

                <div className="course-item-footer">
                  <div className="course-status-note">
                    {course.lowAttendance ? (
                      <span className="footer-warning-text">
                        &bull; Attendance below {LOW_ATTENDANCE_THRESHOLD}% requirement
                      </span>
                    ) : (
                      <span className="footer-ok-text">&bull; Meets 75% attendance criteria</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn secondary-btn course-scan-btn"
                    onClick={() => setWorkspaceTab('classes')}
                    title={`View class sessions for ${course.courseId}`}
                  >
                    View Lecture Sessions &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. SEARCHABLE ATTENDANCE HISTORY LOG */}
      <div className="card student-history-card">
        <div className="card-header">
          <div>
            <span className="eyebrow">Chronological Records</span>
            <h2 className="section-title-clean">Attendance History Log</h2>
          </div>
          <span className="pill pill-info">
            {filteredHistory.length} Record(s) Found
          </span>
        </div>

        <div className="table-filter-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">&#128269;</span>
            <input
              type="text"
              className="input-text student-history-search"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="Search history by course code, title, date, or status..."
            />
            {historySearchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setHistorySearchQuery('')}
                title="Clear filter"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="student-history-table">
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Course</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty-row">
                    {summaryData?.attendanceHistory?.length === 0
                      ? 'No attendance records logged for this student yet.'
                      : 'No records match your search filter.'}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((rec) => (
                  <tr key={rec.id}>
                    <td>
                      <span className="record-id-chip">#{rec.id}</span>
                    </td>
                    <td>
                      <div className="table-course-cell">
                        <span className="table-course-code">{rec.course?.courseId}</span>
                        <span className="table-course-name">{rec.course?.courseName}</span>
                      </div>
                    </td>
                    <td>{rec.attendanceDate}</td>
                    <td>{rec.attendanceTime}</td>
                    <td>
                      <span className="badge-present">
                        <span className="status-dot"></span>
                        {rec.attendanceStatus}
                      </span>
                    </td>
                    <td>
                      <span className="method-pill">Dynamic QR</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      )}

      {/* TAB: MY CLASSES / LECTURES (Authoritative Session Attendance) */}
      {workspaceTab === 'classes' && (
        <div className="card" style={{ padding: '24px', marginTop: '16px' }}>
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <div>
              <span className="eyebrow">Academic Schedule</span>
              <h2 className="section-title-clean">My Scheduled Classes &amp; Lab Sessions</h2>
              <p className="table-caption-clean">
                Live sessions scheduled for your academic cohort (Division {currentUser?.division || summaryData?.division || 'A'}, Batch {currentUser?.batch || summaryData?.batch || 'All'}).
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="pill pill-info">{studentClasses.length} Sessions Found</span>
              <button
                type="button"
                className="btn secondary-btn"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => loadStudentClasses(selectedStudentId)}
                disabled={classesLoading}
              >
                {classesLoading ? 'Refreshing...' : '↻ Refresh'}
              </button>
            </div>
          </div>

          {classesLoading ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '12px', color: '#64748b' }}>Loading your scheduled classes...</p>
            </div>
          ) : studentClasses.length === 0 ? (
            <div className="empty-state-box" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>📅</span>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No Teaching Sessions Scheduled Today</h3>
              <p style={{ margin: '0 auto', maxWidth: '480px', color: '#64748b', fontSize: '0.92rem' }}>
                No active theory lectures or lab practicals are currently scheduled for your division and batch.
              </p>
            </div>
          ) : (
            <div className="lecture-session-grid">
              {studentClasses.map((cls) => {
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
                          <span className="lecture-meta-value">Div {cls.division || 'All'} • Batch {cls.batch || 'All'}</span>
                        </div>
                        <div className="lecture-meta-item">
                          <span className="lecture-meta-label">Date &amp; Time</span>
                          <span className="lecture-meta-value">{cls.sessionDate} • {cls.sessionTime}</span>
                        </div>
                        <div className="lecture-meta-item">
                          <span className="lecture-meta-label">Faculty</span>
                          <span className="lecture-meta-value">{cls.facultyName || cls.facultyId || 'Assigned Faculty'}</span>
                        </div>
                      </div>

                      <div className="lecture-attendance-box">
                        <span>Attendance Status:</span>
                        <span className={`pill ${isActive ? 'pill-success' : 'pill-warning'}`}>
                          {isActive ? '● Live Session Active' : 'Concluded'}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      {isActive ? (
                        <button
                          type="button"
                          className="btn primary-btn"
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
                          onClick={() => onOpenScanner && onOpenScanner(selectedStudentId, cls.courseId, cls.sessionCode)}
                        >
                          <span>📱</span>
                          <span>Scan Attendance QR</span>
                        </button>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          Session attendance concluded
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UPCOMING DEADLINES & MOODLE ASSIGNMENTS */}
      {/* ========================================================================= */}
      {workspaceTab === 'deadlines' && (
        <div className="academic-deadlines-section">
          <div className="card deadlines-header-card">
            <div className="deadlines-header-row">
              <div>
                <span className="eyebrow" style={{ color: 'var(--color-moodle)' }}>
                  Moodle REST Integration &bull; mod_assign_get_assignments
                </span>
                <h2 className="section-title-clean">Upcoming Moodle Assignments & Deadlines</h2>
                <p className="deadlines-intro-text">
                  Synchronized live from Moodle LMS. Displays real-time due dates, cut-off dates, submission status, and dynamic urgency priorities.
                </p>
              </div>
              <div className="deadlines-actions-row">
                <button
                  type="button"
                  className="btn secondary-btn"
                  onClick={() => handleRefreshDeadlines()}
                  disabled={refreshingDeadlines}
                  title="Query Moodle server for updated deadline times"
                >
                  {refreshingDeadlines ? 'Checking Moodle...' : '↻ Check Moodle for Updates'}
                </button>
                <button
                  type="button"
                  className="btn primary-btn"
                  style={{ backgroundColor: 'var(--color-moodle)' }}
                  onClick={() => handleRefreshDeadlines(101, 3)}
                  disabled={refreshingDeadlines}
                  title="Simulate teacher extending assignment deadline by +3 days in Moodle"
                >
                  ⚡ Simulate Teacher Date Extension (+3 Days)
                </button>
              </div>
            </div>

            {/* Filter pills */}
            <div className="deadline-filters-bar">
              <button
                type="button"
                className={`filter-pill ${deadlineFilter === 'all' ? 'filter-pill-active' : ''}`}
                onClick={() => setDeadlineFilter('all')}
              >
                All Assignments ({assignments.length})
              </button>
              <button
                type="button"
                className={`filter-pill pill-filter-today ${deadlineFilter === 'due_today' ? 'filter-pill-active' : ''}`}
                onClick={() => setDeadlineFilter('due_today')}
              >
                Due Today ({assignments.filter(a => a.deadlineStatus === 'due_today').length})
              </button>
              <button
                type="button"
                className={`filter-pill pill-filter-tomorrow ${deadlineFilter === 'due_tomorrow' ? 'filter-pill-active' : ''}`}
                onClick={() => setDeadlineFilter('due_tomorrow')}
              >
                Due Tomorrow ({assignments.filter(a => a.deadlineStatus === 'due_tomorrow').length})
              </button>
              <button
                type="button"
                className={`filter-pill ${deadlineFilter === 'due_soon' ? 'filter-pill-active' : ''}`}
                onClick={() => setDeadlineFilter('due_soon')}
              >
                Due in 3 Days ({assignments.filter(a => a.deadlineStatus === 'due_soon').length})
              </button>
              <button
                type="button"
                className={`filter-pill ${deadlineFilter === 'upcoming' ? 'filter-pill-active' : ''}`}
                onClick={() => setDeadlineFilter('upcoming')}
              >
                Upcoming ({assignments.filter(a => a.deadlineStatus === 'upcoming').length})
              </button>
              <button
                type="button"
                className={`filter-pill pill-filter-overdue ${deadlineFilter === 'overdue' ? 'filter-pill-active' : ''}`}
                onClick={() => setDeadlineFilter('overdue')}
              >
                Overdue ({assignments.filter(a => a.deadlineStatus === 'overdue').length})
              </button>
              <button
                type="button"
                className={`filter-pill pill-filter-submitted ${deadlineFilter === 'submitted' ? 'filter-pill-active' : ''}`}
                onClick={() => setDeadlineFilter('submitted')}
              >
                Submitted ({assignments.filter(a => a.deadlineStatus === 'submitted').length})
              </button>
            </div>
          </div>

          {/* Assignments Grid */}
          {assignmentsLoading ? (
            <div className="card empty-state-box">
              <p className="no-data-text">Loading assignments from Moodle REST endpoint...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="card empty-state-box">
              <p className="no-data-text">No assignments match the selected deadline filter.</p>
            </div>
          ) : (
            <div className="assignments-cards-grid">
              {filteredAssignments.map((assign) => (
                <div key={assign.id} className={`card assignment-card card-urgency-${assign.deadlineStatus}`}>
                  <div className="assignment-card-header">
                    <div className="assignment-meta-left">
                      <span className="course-code-badge">{assign.courseId}</span>
                      <span className="course-name-muted">{assign.courseName}</span>
                    </div>
                    <span className={`urgency-badge badge-${assign.deadlineStatus}`}>
                      {assign.deadlineStatus === 'due_today' && '🚨 Due Today'}
                      {assign.deadlineStatus === 'due_tomorrow' && '⚠️ Due Tomorrow'}
                      {assign.deadlineStatus === 'due_soon' && '⏳ Due in 3 Days'}
                      {assign.deadlineStatus === 'upcoming' && '📅 Upcoming'}
                      {assign.deadlineStatus === 'overdue' && '❌ Overdue'}
                      {assign.deadlineStatus === 'submitted' && '✅ Submitted'}
                    </span>
                  </div>

                  <h3 className="assignment-title">{assign.title}</h3>
                  <p className="assignment-desc">{assign.description}</p>

                  <div className="assignment-details-box">
                    <div className="detail-row">
                      <span className="detail-label">Due Date:</span>
                      <strong className="detail-value-highlight">{assign.formattedDue}</strong>
                    </div>
                    {assign.cutoffDate && (
                      <div className="detail-row">
                        <span className="detail-label">Cut-off Date:</span>
                        <span className="detail-value">{new Date(assign.cutoffDate).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">Submission Status:</span>
                      <span className={`status-pill ${assign.submissionStatus === 'submitted' ? 'pill-success' : 'pill-warning'}`}>
                        {assign.submissionStatus === 'submitted' ? 'Submitted for Grading' : 'Not Submitted'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Grading Status:</span>
                      <span className="detail-value">{assign.gradingStatus === 'graded' ? 'Graded • Points Recorded' : 'Not Graded Yet'}</span>
                    </div>
                  </div>

                  <div className="assignment-card-footer">
                    <span className="assignment-source-tag">
                      Source: Moodle REST API &bull; Activity ID #{assign.id}
                    </span>
                    <button
                      type="button"
                      className="btn secondary-btn btn-sm"
                      onClick={() => setWorkspaceTab('classmates')}
                    >
                      Discuss with Peers &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MY CLASS / BATCH DIRECTORY */}
      {/* ========================================================================= */}
      {workspaceTab === 'classmates' && (
        <div className="academic-classmates-section">
          <div className="card classmates-header-card">
            <div className="classmates-header-row">
              <div>
                <span className="eyebrow">Academic Cohort &bull; Peer Discovery</span>
                <h2 className="section-title-clean">My Class & Batch Directory</h2>
                <p className="classmates-intro-text">
                  Connect with classmates authorized in your academic cohort ({summaryData?.student?.academicYear || 'FE'} • Batch {summaryData?.student?.batch || 'E1'}).
                  Backend security strictly isolates cohorts and hides sensitive authentication secrets.
                </p>
              </div>
              <div className="classmates-filters-row">
                <div className="search-input-wrapper" style={{ maxWidth: '280px' }}>
                  <span className="search-icon">&#128269;</span>
                  <input
                    type="text"
                    className="input-text"
                    value={classmateSearchQuery}
                    onChange={(e) => setClassmateSearchQuery(e.target.value)}
                    placeholder="Search peers by name or ID..."
                  />
                </div>
                <div className="batch-filter-pills">
                  <button
                    type="button"
                    className={`filter-pill ${batchFilter === '' ? 'filter-pill-active' : ''}`}
                    onClick={() => setBatchFilter('')}
                  >
                    All Cohort
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${batchFilter === 'E1' ? 'filter-pill-active' : ''}`}
                    onClick={() => setBatchFilter('E1')}
                  >
                    Batch E1
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${batchFilter === 'E2' ? 'filter-pill-active' : ''}`}
                    onClick={() => setBatchFilter('E2')}
                  >
                    Batch E2
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Classmates Grid */}
          {classmatesLoading ? (
            <div className="card empty-state-box">
              <p className="no-data-text">Loading authorized peers from database...</p>
            </div>
          ) : filteredClassmates.length === 0 ? (
            <div className="card empty-state-box">
              <p className="no-data-text">No classmates found matching your filter.</p>
            </div>
          ) : (
            <div className="classmates-grid">
              {filteredClassmates.map((peer) => (
                <div key={peer.studentId} className="card classmate-card">
                  <div className="classmate-card-top">
                    <div className="classmate-avatar">
                      {peer.studentName ? peer.studentName.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div className="classmate-header-text">
                      <h3 className="classmate-name">{peer.studentName}</h3>
                      <span className="classmate-id-badge">{peer.studentId}</span>
                    </div>
                  </div>

                  <div className="classmate-cohort-tag">
                    {peer.academicYear || 'FE'} &bull; Semester {peer.semester || 1} &bull; Batch {peer.batch || 'E1'}
                  </div>

                  <div className="classmate-courses-wrap">
                    <span className="courses-label">Shared Subjects:</span>
                    <div className="course-chips-list">
                      {(peer.enrolledCourses || []).map((c) => (
                        <span key={c} className="peer-course-chip">{c}</span>
                      ))}
                    </div>
                  </div>

                  <div className="classmate-card-actions">
                    <button
                      type="button"
                      className="btn secondary-btn btn-sm"
                      onClick={() => handleViewProfile(peer.studentId)}
                      disabled={profileLoading}
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      className="btn primary-btn btn-sm"
                      onClick={() => handleOpenMessageModal(peer)}
                    >
                      Message &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PEER MESSAGING & CONVERSATIONS */}
      {/* ========================================================================= */}
      {workspaceTab === 'messages' && (
        <div className="academic-messages-section">
          <div className="card messages-header-card">
            <div className="messages-header-row">
              <div>
                <span className="eyebrow" style={{ color: 'var(--color-moodle)' }}>
                  Moodle Messaging Web Service &bull; core_message_send_instant_messages
                </span>
                <h2 className="section-title-clean">Peer Academic Messaging</h2>
                <p className="messages-intro-text">
                  Collaborate on assignments and lecture notes with your classmates. All messages are dispatched securely via Spring Boot backend mediation without exposing Moodle tokens to the browser.
                </p>
              </div>
              <button
                type="button"
                className="btn secondary-btn"
                onClick={loadConversations}
                disabled={conversationsLoading}
              >
                {conversationsLoading ? 'Refreshing...' : '↻ Refresh Threads'}
              </button>
            </div>
          </div>

          <div className="conversations-layout">
            <div className="card conversations-list-card">
              <div className="card-header">
                <h3 className="section-title-clean">Recent Conversations</h3>
                <span className="pill pill-info">{conversations.length} Active Thread(s)</span>
              </div>

              {conversationsLoading ? (
                <div className="empty-state-box">
                  <p className="no-data-text">Loading conversation threads...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="empty-state-box">
                  <p className="no-data-text">No active peer conversations yet.</p>
                  <p className="empty-state-hint">Go to "My Class Directory" and click "Message" on any classmate to start a chat.</p>
                </div>
              ) : (
                <div className="conversations-items-list">
                  {conversations.map((convo) => (
                    <div
                      key={convo.id}
                      className="convo-item-card"
                      onClick={() => handleOpenMessageModal({
                        studentId: convo.peerStudentId,
                        studentName: convo.peerStudentName
                      })}
                    >
                      <div className="convo-avatar">
                        {convo.peerStudentName ? convo.peerStudentName.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div className="convo-content">
                        <div className="convo-header-line">
                          <strong className="convo-peer-name">{convo.peerStudentName}</strong>
                          <span className="convo-time">
                            {convo.lastMessageTime ? new Date(convo.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="convo-snippet">{convo.lastMessage}</p>
                      </div>
                      <button
                        type="button"
                        className="btn secondary-btn btn-sm"
                        style={{ marginLeft: 'auto' }}
                      >
                        Reply
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CLASSMATE PROFILE MODAL (PRIVACY AUDITED) */}
      {/* ========================================================================= */}
      {profileModalOpen && selectedPeerProfile && (
        <div className="peer-modal-overlay" onClick={() => setProfileModalOpen(false)}>
          <div className="peer-modal-card card" onClick={(e) => e.stopPropagation()}>
            <div className="peer-modal-header">
              <div className="peer-modal-title-row">
                <div className="classmate-avatar avatar-large">
                  {selectedPeerProfile.studentName ? selectedPeerProfile.studentName.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <h3 className="modal-student-name">{selectedPeerProfile.studentName}</h3>
                  <span className="pill pill-info">{selectedPeerProfile.studentId}</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setProfileModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="peer-modal-body">
              <div className="profile-detail-grid">
                <div className="profile-field">
                  <span className="field-title">Academic Cohort:</span>
                  <strong>{selectedPeerProfile.academicYear || 'FE'}</strong>
                </div>
                <div className="profile-field">
                  <span className="field-title">Semester:</span>
                  <strong>Semester {selectedPeerProfile.semester || 1}</strong>
                </div>
                <div className="profile-field">
                  <span className="field-title">Batch:</span>
                  <strong>Batch {selectedPeerProfile.batch || 'E1'}</strong>
                </div>
                <div className="profile-field">
                  <span className="field-title">Institutional Email:</span>
                  <span>{selectedPeerProfile.email || 'student@smartattend.edu'}</span>
                </div>
              </div>

              <div className="profile-courses-section">
                <span className="field-title">Enrolled Courses:</span>
                <div className="course-chips-list" style={{ marginTop: '6px' }}>
                  {(selectedPeerProfile.enrolledCourses || []).map((c) => (
                    <span key={c} className="peer-course-chip">{c}</span>
                  ))}
                </div>
              </div>

              <div className="privacy-audit-callout">
                <div className="privacy-icon">&#128274;</div>
                <div className="privacy-text">
                  <strong>Privacy Protected:</strong> Student password hash, active session tokens, GPS coordinates, and device fingerprint identities are strictly omitted from peer directories.
                </div>
              </div>
            </div>

            <div className="peer-modal-footer">
              <button
                type="button"
                className="btn secondary-btn"
                onClick={() => setProfileModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn primary-btn"
                onClick={() => {
                  setProfileModalOpen(false);
                  handleOpenMessageModal(selectedPeerProfile);
                }}
              >
                Send Message &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PEER MESSAGING CHAT BOX UI */}
      {messageModalOpen && messageTarget && (
        <div className="peer-modal-overlay" onClick={() => setMessageModalOpen(false)}>
          <div className="peer-chat-card card" onClick={(e) => e.stopPropagation()}>
            {/* Chat Box Header */}
            <div className="peer-chat-header">
              <div className="peer-chat-header-info">
                <div className="peer-chat-avatar">
                  {(messageTarget.studentName || messageTarget.peerStudentName || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="peer-chat-name">
                    {messageTarget.studentName || messageTarget.peerStudentName}
                  </h3>
                  <div className="peer-chat-status">
                    <span className="online-indicator"></span>
                    <span>Student ID: {messageTarget.studentId || messageTarget.peerStudentId}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setMessageModalOpen(false)}
                title="Close chat box"
              >
                &times;
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="peer-chat-body">
              {chatLoading ? (
                <div className="chat-empty-state">
                  <div className="spinner"></div>
                  <p style={{ marginTop: '10px' }}>Loading conversation...</p>
                </div>
              ) : chatThread.length === 0 ? (
                <div className="chat-empty-state">
                  <div className="chat-empty-icon">&#128172;</div>
                  <div className="chat-empty-title">No messages yet</div>
                  <div className="chat-empty-hint">Send a message to start chatting!</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  {chatThread.map((msg, index) => {
                    const isSent = msg.senderStudentId === selectedStudentId;
                    return (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          justifyContent: isSent ? 'flex-end' : 'flex-start',
                          width: '100%'
                        }}
                      >
                        <div className={`chat-bubble ${isSent ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                          <div className="chat-bubble-content">{msg.text || msg.messageText}</div>
                          <div className="chat-bubble-time">{msg.timestamp || 'Just now'}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input Footer */}
            <form onSubmit={handleSendMessage} className="peer-chat-footer">
              <textarea
                className="chat-input-field"
                rows="1"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type your message... (Press Enter to send)"
                required
              />
              <button
                type="submit"
                className="btn primary-btn chat-send-btn"
                disabled={sendingMessage || !messageText.trim()}
                title="Send message"
              >
                {sendingMessage ? 'Sending...' : 'Send ➤'}
              </button>
            </form>
          </div>
        </div>
      )}
            {/* UNIFIED TAB: LEARNING & COURSEWORK */}
      {workspaceTab === 'coursework' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          {/* Internal Subtabs for Learning & Coursework */}
          <div className="admin-subtab-bar" style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <button
              type="button"
              className={`academic-nav-btn ${studentLearningSubtab === 'materials' ? 'academic-nav-btn-active' : ''}`}
              onClick={() => setStudentLearningSubtab('materials')}
            >
              📂 Learning &amp; Study Material ({lmsResources.filter(r => r.resourceType !== 'EXPERIMENT').length})
            </button>
            <button
              type="button"
              className={`academic-nav-btn ${studentLearningSubtab === 'assignments' ? 'academic-nav-btn-active' : ''}`}
              onClick={() => setStudentLearningSubtab('assignments')}
            >
              📝 Assignments ({lmsAssignments.filter(a => a.activityType !== 'PRACTICAL').length})
            </button>
            <button
              type="button"
              className={`academic-nav-btn ${studentLearningSubtab === 'experiments' ? 'academic-nav-btn-active' : ''}`}
              onClick={() => setStudentLearningSubtab('experiments')}
            >
              🧪 Experiments / Practicals ({lmsResources.filter(r => r.resourceType === 'EXPERIMENT').length + lmsAssignments.filter(a => a.activityType === 'PRACTICAL').length})
            </button>
          </div>

          {/* SECTION 1: LEARNING & STUDY MATERIAL */}
          {studentLearningSubtab === 'materials' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Notes & Study Material */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div>
                <span className="eyebrow">Academic Courseware</span>
                <h2 className="section-title-clean">Notes &amp; Study Material</h2>
                <p className="table-caption-clean">Lecture notes, presentations, and syllabus documents uploaded by your instructors.</p>
              </div>
              <span className="pill pill-info">{lmsResources.filter(r => r.resourceType !== 'EXPERIMENT').length} Materials</span>
            </div>

            {lmsResources.filter(r => r.resourceType !== 'EXPERIMENT').length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Download / Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lmsResources.filter(r => r.resourceType !== 'EXPERIMENT').map((res) => (
                      <tr key={res.id}>
                        <td><strong>{res.courseId}</strong></td>
                        <td><strong>{res.title}</strong></td>
                        <td>
                          <span className={`pill ${res.resourceType === 'VIDEO' ? 'pill-purple' : 'pill-info'}`}>
                            {res.resourceType === 'VIDEO' ? '🎥 Video' : '📄 Notes'}
                          </span>
                        </td>
                        <td><span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>{res.description || '-'}</span></td>
                        <td>
                          {res.fileUrl ? (
                            <button
                              type="button"
                              className="btn secondary-btn"
                              onClick={() => downloadLmsFile(res.fileUrl, res.fileName || `${res.title}.pdf`)}
                              style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                            >
                              📥 Download / View
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No study notes or reading materials uploaded for your courses yet.</p>
              </div>
            )}
          </div>
            </div>
          )}

          {/* SECTION 2: ASSIGNMENTS */}
          {studentLearningSubtab === 'assignments' && (
            <div style={{ marginTop: '20px' }}>
              {submittingAssignId ? (
            (() => {
              const currentTask = lmsAssignments.find(a => a.id === submittingAssignId);
              const previousSub = lmsSubmissions.find(s => s.assignmentId === submittingAssignId);
              return (
                <div className="card" style={{ padding: '28px', maxWidth: '800px', margin: '0 auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                    <div>
                      <span className="eyebrow" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                        {currentTask?.type === 'PRACTICAL' ? '🧪 Lab Practical Submission' : '📝 Assignment Submission'}
                      </span>
                      <h2 style={{ margin: '4px 0 0 0', color: 'var(--color-navy)', fontSize: '1.4rem' }}>
                        {currentTask?.title || 'Submit Coursework'}
                      </h2>
                      <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                        Course: <strong>{currentTask?.courseId}</strong> &bull; Due Date: <strong>{currentTask?.deadline || 'No deadline specified'}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn secondary-btn"
                      onClick={() => {
                        setSubmittingAssignId(null);
                        setSubmissionFile(null);
                        setSubmissionText('');
                        setSubmissionUrl('');
                      }}
                    >
                      &larr; Back to List
                    </button>
                  </div>

                  {currentTask?.description && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                        Task Guidelines &amp; Instructions:
                      </span>
                      <p style={{ margin: 0, color: '#334155', fontSize: '0.92rem', lineHeight: 1.5 }}>
                        {currentTask.description}
                      </p>
                    </div>
                  )}

                  {currentTask?.fileUrl && (
                    <div style={{ marginBottom: '16px' }}>
                      <button
                        type="button"
                        className="btn secondary-btn"
                        onClick={() => downloadLmsFile(currentTask.fileUrl, currentTask.fileName || `${currentTask.title}.pdf`)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                      >
                        <span>⬇️ Download Task File</span>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>({currentTask.fileName || 'Attachment'})</span>
                      </button>
                    </div>
                  )}

                  {previousSub && (
                    <div className="alert success-alert" style={{ marginBottom: '20px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <strong>✓ Previously Submitted:</strong> {previousSub.submittedAt ? new Date(previousSub.submittedAt).toLocaleString() : 'Yes'}
                          {previousSub.fileName && (
                            <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                              <span>File: </span>
                              <button
                                type="button"
                                className="btn secondary-btn"
                                onClick={() => downloadLmsFile(previousSub.fileUrl, previousSub.fileName)}
                                style={{ padding: '2px 8px', fontSize: '0.8rem', marginLeft: '4px' }}
                              >
                                📥 {previousSub.fileName}
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="pill pill-success">Submitted</span>
                          <button
                            type="button"
                            className="btn danger-btn"
                            onClick={() => handleRemoveSubmission(currentTask.id)}
                            style={{ padding: '5px 12px', fontSize: '0.82rem' }}
                            disabled={submittingInProgress}
                          >
                            🗑️ Remove / Resubmit
                          </button>
                        </div>
                      </div>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#065f46' }}>
                        You can remove your submission or upload a new file below to replace it.
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSubmitCoursework}>
                    {/* Device File Picker */}
                    <div style={{ marginBottom: '20px', padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '10px', background: '#fafbfc', textAlign: 'center' }}>
                      <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>📁</span>
                      <label style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '6px' }}>
                        Choose File from Your Device
                      </label>
                      <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '0.82rem' }}>
                        Accepted formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, ZIP, PNG, JPG (Max 50MB)
                      </p>
                      <input
                        type="file"
                        id="student-submission-file"
                        style={{ display: 'none' }}
                        onChange={(e) => setSubmissionFile(e.target.files ? e.target.files[0] : null)}
                      />
                      <label
                        htmlFor="student-submission-file"
                        className="btn secondary-btn"
                        style={{ cursor: 'pointer', display: 'inline-block', padding: '8px 20px', fontSize: '0.9rem' }}
                      >
                        📂 Browse Device Files
                      </label>
                      {submissionFile && (
                        <div style={{ marginTop: '12px', padding: '8px 14px', background: '#ecfdf5', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid #6ee7b7' }}>
                          <span style={{ color: '#047857', fontWeight: 700, fontSize: '0.88rem' }}>
                            📎 Selected: {submissionFile.name} ({(submissionFile.size / 1024).toFixed(1)} KB)
                          </span>
                          <button
                            type="button"
                            onClick={() => setSubmissionFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
                            title="Remove file"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Direct URL Input */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>
                        Or Direct Solution / Drive / GitHub URL (Optional)
                      </label>
                      <input
                        type="url"
                        className="input-text"
                        placeholder="https://github.com/... or Google Drive link"
                        value={submissionUrl}
                        onChange={(e) => setSubmissionUrl(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px' }}
                      />
                    </div>

                    {/* Notes Textarea */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>
                        Submission Notes / Answer Text (Optional)
                      </label>
                      <textarea
                        className="input-text"
                        rows={4}
                        placeholder="Add any comments, run instructions, or summary for your teacher..."
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button
                        type="button"
                        className="btn secondary-btn"
                        onClick={() => {
                          setSubmittingAssignId(null);
                          setSubmissionFile(null);
                          setSubmissionText('');
                          setSubmissionUrl('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn primary-btn"
                        disabled={submittingInProgress}
                        style={{ padding: '10px 24px', fontWeight: 700 }}
                      >
                        {submittingInProgress ? 'Uploading & Submitting...' : '📤 Submit Work'}
                      </button>
                    </div>
                  </form>
                </div>
              );
            })()
          ) : (
            <div className="card" style={{ padding: '24px' }}>
              <div className="card-header" style={{ marginBottom: '16px' }}>
                <div>
                  <span className="eyebrow">Continuous Evaluation</span>
                  <h2 className="section-title-clean">Course Assignments &amp; Practicals</h2>
                  <p className="table-caption-clean">Submit course assignments and practical lab experiment write-ups directly.</p>
                </div>
                <span className="pill pill-info">{lmsAssignments.length} Tasks Listed</span>
              </div>

              {submissionSuccessMsg && (
                <div className="alert success-alert" style={{ marginBottom: '16px' }}>
                  <strong>Success:</strong> {submissionSuccessMsg}
                </div>
              )}

              {lmsAssignments.length > 0 ? (
                <div className="table-wrapper">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Course</th>
                        <th>Task Title</th>
                        <th>Attachment</th>
                        <th>Instructions</th>
                        <th>Deadline</th>
                        <th>Your Submission</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lmsAssignments.map((task) => {
                        const mySub = lmsSubmissions.find(s => s.assignmentId === task.id);
                        return (
                          <tr key={task.id}>
                            <td>
                              <span className={`pill ${task.type === 'PRACTICAL' ? 'pill-purple' : 'pill-info'}`}>
                                {task.type || 'ASSIGNMENT'}
                              </span>
                            </td>
                            <td><strong>{task.courseId}</strong></td>
                            <td><strong>{task.title}</strong></td>
                            <td>
                              {task.fileUrl ? (
                                <button
                                  type="button"
                                  className="btn secondary-btn"
                                  onClick={() => downloadLmsFile(task.fileUrl, task.fileName || `${task.title}.pdf`)}
                                  style={{ padding: '3px 8px', fontSize: '0.78rem' }}
                                >
                                  📥 {task.fileName || 'Download'}
                                </button>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>-</span>
                              )}
                            </td>
                            <td><span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>{task.description || '-'}</span></td>
                            <td>{task.deadline || 'No deadline'}</td>
                            <td>
                              {mySub ? (
                                <span className="pill pill-success" title={`Submitted at ${mySub.submittedAt}`}>
                                  ✓ Submitted
                                </span>
                              ) : (
                                <span className="pill pill-warning">Pending</span>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn primary-btn"
                                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                onClick={() => {
                                  setSubmittingAssignId(task.id);
                                  setSubmissionSuccessMsg('');
                                  if (mySub) {
                                    setSubmissionUrl(mySub.fileUrl || '');
                                    setSubmissionText(mySub.submissionText || '');
                                  } else {
                                    setSubmissionUrl('');
                                    setSubmissionText('');
                                  }
                                  setSubmissionFile(null);
                                }}
                              >
                                {mySub ? '🔄 Resubmit' : '📤 Submit Work'}
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
                  <p className="no-data-text">No active assignments or practicals found for your courses.</p>
                </div>
              )}
            </div>
          )}
            </div>
          )}

          {/* SECTION 3: EXPERIMENTS / PRACTICALS */}
          {studentLearningSubtab === 'experiments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Experiments & Practicals */}
          <div className="card" style={{ padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div>
                <span className="eyebrow">Laboratory Courseware</span>
                <h2 className="section-title-clean">Experiments &amp; Practicals</h2>
                <p className="table-caption-clean">Lab manuals, problem statements, and experiment guides published by faculty.</p>
              </div>
              <span className="pill pill-purple">{lmsResources.filter(r => r.resourceType === 'EXPERIMENT').length} Experiments</span>
            </div>

            {lmsResources.filter(r => r.resourceType === 'EXPERIMENT').length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Exp #</th>
                      <th>Course</th>
                      <th>Title</th>
                      <th>Description &amp; Date</th>
                      <th>Lab File</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lmsResources.filter(r => r.resourceType === 'EXPERIMENT').map((exp) => (
                      <tr key={exp.id}>
                        <td><span className="pill pill-purple"><strong>{exp.experimentNumber || 'Exp'}</strong></span></td>
                        <td><strong>{exp.courseId}</strong></td>
                        <td><strong>{exp.title}</strong></td>
                        <td><span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>{exp.description || '-'}</span></td>
                        <td>
                          {exp.fileUrl ? (
                            <button
                              type="button"
                              className="btn primary-btn"
                              onClick={() => downloadLmsFile(exp.fileUrl, exp.fileName || `${exp.title}.pdf`)}
                              style={{ padding: '4px 12px', fontSize: '0.82rem' }}
                            >
                              📥 Download ({exp.fileName || 'File'})
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No file attached</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn primary-btn"
                            onClick={() => {
                              const matchingAssign = lmsAssignments.find(a =>
                                (a.activityType === 'PRACTICAL' || a.title?.toLowerCase().includes('exp') || a.title?.toLowerCase().includes('practical')) &&
                                a.courseId === exp.courseId
                              ) || lmsAssignments.find(a => a.courseId === exp.courseId);

                              if (matchingAssign) {
                                setSubmittingAssignId(matchingAssign.id);
                              }
                              setStudentLearningSubtab('assignments');
                            }}
                            style={{ padding: '4px 12px', fontSize: '0.82rem', background: '#059669', borderColor: '#059669' }}
                          >
                            📤 Submit Work
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No laboratory experiments published for your courses yet.</p>
              </div>
            )}
          </div>
            </div>
          )}
        </div>
      )}

{/* TAB: ANNOUNCEMENTS */}
      {workspaceTab === 'announcements' && (
        <div className="card" style={{ padding: '24px', marginTop: '20px' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div>
              <span className="eyebrow">Faculty Bulletins</span>
              <h2 className="section-title-clean">Course Announcements</h2>
              <p className="table-caption-clean">Important updates and classroom notifications broadcasted by your teachers.</p>
            </div>
            <span className="pill pill-info">{lmsAnnouncements.length} Announcements</span>
          </div>

          {lmsAnnouncements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {lmsAnnouncements.map((ann) => (
                <div key={ann.id} style={{ padding: '18px', borderRadius: '10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pill pill-info">{ann.courseId}</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--color-navy)' }}>{ann.title}</strong>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-text)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-box">
              <p className="no-data-text">No announcements posted for your enrolled courses yet.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB: STUDENT PROFILE */}
      {workspaceTab === 'profile' && (
        <div className="card" style={{ padding: '28px', marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                {(currentUser?.fullName || summaryData?.studentName || selectedStudentId).charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="eyebrow" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Student Academic Identity</span>
                <h2 style={{ margin: '4px 0 0 0', color: 'var(--color-navy)', fontSize: '1.4rem' }}>
                  {currentUser?.fullName || summaryData?.studentName || selectedStudentId}
                </h2>
                <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                  SmartAttend Student Portal • Verified Student Profile
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn secondary-btn"
              onClick={() => setWorkspaceTab('overview')}
            >
              &larr; Back to Overview
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>PRN / Student ID</span>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                {selectedStudentId}
              </p>
            </div>
            <div className="card" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Department / Branch</span>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                {currentUser?.department || currentUser?.branch || summaryData?.branch || 'Computer Engineering'}
              </p>
            </div>
            <div className="card" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Academic Cohort</span>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                {currentUser?.academicYear || 'FE'} &bull; Sem {currentUser?.semester || '1'}
              </p>
            </div>
            <div className="card" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Division &amp; Batch</span>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                Div {currentUser?.division || summaryData?.division || 'A'} &bull; Batch {currentUser?.batch || summaryData?.batch || 'A1'}
              </p>
            </div>
            <div className="card" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Overall Attendance</span>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: (summaryData?.overallPercentage || 0) >= 75 ? '#16a34a' : '#dc2626' }}>
                {summaryData?.overallPercentage != null ? `${summaryData.overallPercentage}%` : 'N/A'}
              </p>
            </div>
            <div className="card" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Device Binding Security</span>
              <p style={{ margin: '6px 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                <span className="pill pill-success">✓ Single Device Bound</span>
              </p>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--color-navy)', marginBottom: '12px' }}>Enrolled Courses &amp; Subjects</h3>
            {lmsCourses.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {lmsCourses.map((c) => (
                  <div key={c.courseId} style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--color-primary)' }}>{c.courseId}</strong>
                      <span className="pill pill-info" style={{ fontSize: '0.72rem' }}>{c.branch || 'General'}</span>
                    </div>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.92rem' }}>{c.courseName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                      Div {c.division || 'All'} &bull; Sem {c.semester || '-'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No enrolled course subjects found.</p>
            )}
          </div>
        </div>
      )}


    </div>
  );
};

export default StudentDashboard;
