import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateQrToken, getCourseAttendance, getCourses, getClassAttendance, getStudents } from '../services/api.js';

const REFRESH_SECONDS = 5;

const TeacherQrDashboard = ({ initialCourseId = '', initialSessionCode = '', onBackToDashboard }) => {
  const [courseId, setCourseId] = useState(initialCourseId);
  const [sessionCode, setSessionCode] = useState(initialSessionCode);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [qrToken, setQrToken] = useState('');
  const [expiresAtMs, setExpiresAtMs] = useState(null);
  const [tokenDurationMs, setTokenDurationMs] = useState(REFRESH_SECONDS * 1000);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [now, setNow] = useState(Date.now());

  const isFetchingRef = useRef(false);
  const isWaitingForNextTokenRef = useRef(false);
  const stagedTokenRef = useRef(null);
  const prefetchTimerRef = useRef(null);
  const rotateTimerRef = useRef(null);
  const retryTimerRef = useRef(null);

  const activeCourseRef = useRef(courseId);
  const activeSessionRef = useRef(sessionCode);
  const isSessionActiveRef = useRef(isSessionActive);

  // Synchronize if initialCourseId changes
  useEffect(() => {
    if (initialCourseId) {
      setCourseId(initialCourseId);
    }
  }, [initialCourseId]);

  useEffect(() => {
    if (initialSessionCode !== undefined) {
      setSessionCode(initialSessionCode);
    }
  }, [initialSessionCode]);

  useEffect(() => {
    activeCourseRef.current = courseId;
  }, [courseId]);

  useEffect(() => {
    activeSessionRef.current = sessionCode;
  }, [sessionCode]);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  // Clock tick to update the countdown timer smoothly every 200ms
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 200);

    return () => window.clearInterval(timer);
  }, []);

  // Fetch course catalogue and enrolled students from MySQL
  useEffect(() => {
    const loadCoursesAndStudents = async () => {
      try {
        const [list, studentsList] = await Promise.all([
          getCourses().catch(() => []),
          getStudents().catch(() => [])
        ]);
        setAvailableCourses(list || []);
        if ((!courseId || courseId.trim() === '') && list && list.length > 0) {
          setCourseId(list[0].courseId);
        }
        if (studentsList && studentsList.length > 0) {
          setEnrolledStudents(studentsList);
        } else {
          setEnrolledStudents([{ studentId: '12345678', studentName: 'Akash Patil' }]);
        }
      } catch (err) {
        console.warn('Could not fetch course or student directory:', err);
      }
    };
    loadCoursesAndStudents();
  }, [courseId]);

  // Live polling for attendees every 2.5 seconds while session is active
  useEffect(() => {
    if (!isSessionActive || !courseId) return;

    const pollInterval = window.setInterval(() => {
      loadAttendees(activeCourseRef.current);
    }, 2500);

    return () => window.clearInterval(pollInterval);
  }, [isSessionActive, courseId, loadAttendees]);

  // Fetch attendees marked present for this session or course
  const loadAttendees = useCallback(async (targetCourseId) => {
    const idToQuery = targetCourseId || activeCourseRef.current;
    if (!idToQuery) return;
    try {
      let records = [];
      const currentSession = activeSessionRef.current;
      if (currentSession) {
        records = await getClassAttendance(currentSession).catch(() => []);
      }
      if (!records || records.length === 0) {
        records = await getCourseAttendance(idToQuery).catch(() => []);
      }
      setAttendees(records || []);
    } catch (err) {
      setAttendees([]);
    }
  }, []);

  // Clear all pending scheduled timeouts
  const clearAllTimers = useCallback(() => {
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
    if (rotateTimerRef.current) {
      clearTimeout(rotateTimerRef.current);
      rotateTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // Pre-fetch the next dynamic QR token ~800ms before current token expires
  const prefetchNextToken = useCallback(async () => {
    if (!isSessionActiveRef.current || !activeCourseRef.current) return;
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      const fetchStart = Date.now();
      const currentCourse = activeCourseRef.current;
      const currentSession = activeSessionRef.current;

      const data = await generateQrToken(currentCourse, currentSession || null);
      if (!isSessionActiveRef.current || activeCourseRef.current !== currentCourse) {
        return;
      }

      const elapsed = Date.now() - fetchStart;
      const remainingServerLifetime = Math.max(3500, 5000 - elapsed);

      if (isWaitingForNextTokenRef.current) {
        isWaitingForNextTokenRef.current = false;
        stagedTokenRef.current = null;
        activateToken({ token: data.token }, remainingServerLifetime);
      } else {
        stagedTokenRef.current = {
          token: data.token,
          durationMs: remainingServerLifetime
        };
      }
    } catch (err) {
      console.warn('Pre-fetch dynamic QR token warning:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Activate a token on screen and schedule the next prefetch and rotation
  const activateToken = useCallback((tokenData, durationMs) => {
    if (!isSessionActiveRef.current) return;

    clearAllTimers();
    isWaitingForNextTokenRef.current = false;
    setQrToken(tokenData.token);
    const effectiveDuration = Math.max(3000, durationMs || (REFRESH_SECONDS * 1000));
    setTokenDurationMs(effectiveDuration);
    setExpiresAtMs(Date.now() + effectiveDuration);

    loadAttendees(activeCourseRef.current);

    // Schedule prefetch of the next token ahead of expiration (~800ms before)
    const prefetchDelay = Math.max(200, effectiveDuration - 800);
    prefetchTimerRef.current = setTimeout(() => {
      prefetchNextToken();
    }, prefetchDelay);

    // Schedule instant switch to staged token at exact expiration
    rotateTimerRef.current = setTimeout(() => {
      handleRotationTransition();
    }, effectiveDuration);
  }, [clearAllTimers, loadAttendees, prefetchNextToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Perform smooth rotation transition
  const handleRotationTransition = useCallback(() => {
    if (!isSessionActiveRef.current) return;

    if (stagedTokenRef.current) {
      // 0ms seamless switch to pre-fetched valid token
      const next = stagedTokenRef.current;
      stagedTokenRef.current = null;
      activateToken(next, next.durationMs);
    } else {
      // If staged token is not ready yet, clear old token so student cannot scan expired code
      setQrToken('');
      if (isFetchingRef.current) {
        isWaitingForNextTokenRef.current = true;
      } else {
        fetchAndActivateImmediately();
      }
    }
  }, [activateToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch immediately and activate on screen (for init, manual regenerate, or recovery)
  const fetchAndActivateImmediately = useCallback(async () => {
    if (!isSessionActiveRef.current || !activeCourseRef.current) return;
    if (isFetchingRef.current) return;

    clearAllTimers();
    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError('');
      const fetchStart = Date.now();
      const currentCourse = activeCourseRef.current;
      const currentSession = activeSessionRef.current;

      const data = await generateQrToken(currentCourse, currentSession || null);
      if (!isSessionActiveRef.current || activeCourseRef.current !== currentCourse) {
        return;
      }

      const elapsed = Date.now() - fetchStart;
      const duration = Math.max(3500, 5000 - elapsed);
      stagedTokenRef.current = null;
      activateToken({ token: data.token }, duration);
    } catch (err) {
      setError(err.message || 'Could not generate dynamic QR code.');
      if (isSessionActiveRef.current) {
        retryTimerRef.current = setTimeout(() => {
          fetchAndActivateImmediately();
        }, 1200);
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [activateToken, clearAllTimers]);

  // Manual regenerate button handler
  const fetchNextQr = useCallback(() => {
    stagedTokenRef.current = null;
    clearAllTimers();
    fetchAndActivateImmediately();
  }, [clearAllTimers, fetchAndActivateImmediately]);

  // Automatic rotation management whenever course or active session status changes
  useEffect(() => {
    if (!isSessionActive || !courseId) {
      clearAllTimers();
      setQrToken('');
      setExpiresAtMs(null);
      stagedTokenRef.current = null;
      return;
    }

    fetchAndActivateImmediately();

    return () => {
      clearAllTimers();
    };
  }, [courseId, sessionCode, isSessionActive, fetchAndActivateImmediately, clearAllTimers]);

  // Calculate seconds remaining without floor division
  const secondsLeft = useMemo(() => {
    if (!expiresAtMs || !isSessionActive) {
      return 0;
    }
    const diff = expiresAtMs - now;
    if (diff <= 0) {
      return 0;
    }
    return Math.ceil(diff / 1000);
  }, [expiresAtMs, now, isSessionActive]);

  // Progress percentage (100% down to 0% over token duration)
  const progressPercent = useMemo(() => {
    if (!expiresAtMs || !isSessionActive) return 0;
    const diff = expiresAtMs - now;
    if (diff <= 0) return 0;
    const totalMs = tokenDurationMs || (REFRESH_SECONDS * 1000);
    return Math.min(100, Math.max(0, (diff / totalMs) * 100));
  }, [expiresAtMs, now, isSessionActive, tokenDurationMs]);

  // Copy active token to clipboard
  const handleCopyToken = () => {
    if (!qrToken) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(qrToken);
      setCopiedNotice(true);
      window.setTimeout(() => setCopiedNotice(false), 2000);
    }
  };

  // Toggle active session state (Pause / Resume)
  const handleToggleSession = () => {
    if (isSessionActive) {
      setIsSessionActive(false);
      clearAllTimers();
      stagedTokenRef.current = null;
      setQrToken('');
      setExpiresAtMs(null);
    } else {
      setIsSessionActive(true);
    }
  };

  // Format attendance time for live display
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return String(timeStr).substring(0, 5);
  };

  // Active course title
  const activeCourseObj = availableCourses.find(
    (c) => c.courseId?.toUpperCase() === courseId?.toUpperCase()
  );
  const activeCourseTitle = activeCourseObj?.courseName || 'Java';

  // Present students set
  const presentStudentIds = useMemo(() => {
    const set = new Set();
    attendees.forEach((record) => {
      if (record.student?.studentId) {
        set.add(record.student.studentId.trim().toUpperCase());
      }
    });
    return set;
  }, [attendees]);

  // Enrolled roster list (guarantee student 12345678 is present for demo test if empty)
  const rosterList = useMemo(() => {
    if (enrolledStudents.length > 0) {
      return enrolledStudents;
    }
    return [{ studentId: '12345678', studentName: 'Akash Patil' }];
  }, [enrolledStudents]);

  const totalStudentsCount = rosterList.length;
  const presentStudentsCount = rosterList.filter(s => presentStudentIds.has(s.studentId.toUpperCase())).length;

  return (
    <div className="teacher-qr-page-wrapper">
      {/* 1. TEACHER DYNAMIC QR WELCOME HEADER */}
      <div className="card teacher-qr-welcome-header">
        <div className="teacher-qr-header-top">
          <div className="teacher-qr-header-title-block">
            <span className="eyebrow">Teacher Portal &bull; Classroom Dynamic QR Session</span>
            <h1 className="teacher-qr-heading">
              Dynamic QR Attendance Session
              {sessionCode && (
                <span className="badge badge-info" style={{ marginLeft: '12px', fontSize: '0.85rem', verticalAlign: 'middle', background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px' }}>
                  Session: {sessionCode}
                </span>
              )}
            </h1>
            <p className="teacher-qr-subheading">
              Project this screen in class. Students scan the live dynamic QR code to verify their attendance instantly.
            </p>
          </div>

          <div className="teacher-qr-header-actions">
            {onBackToDashboard && (
              <button
                type="button"
                className="btn secondary-btn"
                onClick={onBackToDashboard}
                title="Return to Teacher Dashboard workspace"
              >
                &larr; Teacher Dashboard
              </button>
            )}
            <button
              type="button"
              className="btn secondary-btn"
              onClick={() => loadAttendees(courseId)}
              title="Refresh attendee list"
            >
              ↻ Refresh Attendees
            </button>
          </div>
        </div>

        {/* Identity & Session Metadata Strip */}
        <div className="teacher-qr-info-strip">
          <div className="teacher-qr-avatar-badge">
            <span className="teacher-qr-avatar-initial">QR</span>
          </div>
          <div className="teacher-qr-profile-details">
            <div className="teacher-qr-name-row">
              <h2 className="teacher-qr-role-title">{activeCourseTitle} &bull; <span style={{ color: '#2563eb' }}>{courseId || 'FSJP'}</span></h2>
              <span className={`pill ${isSessionActive ? 'pill-success' : 'pill-warning'}`}>
                {isSessionActive ? '● Live Session Active' : 'Session Paused'}
              </span>
            </div>
            <div className="teacher-qr-meta-chips-row">
              <span className="meta-chip">
                <span className="chip-label">Course:</span>
                <strong>{activeCourseTitle} ({courseId || 'FSJP'})</strong>
              </span>
              <span className="meta-chip">
                <span className="chip-label">Session:</span>
                <strong>{sessionCode || 'General Class'}</strong>
              </span>
              <span className="meta-chip">
                <span className="chip-label">QR Status:</span>
                <strong style={{ color: isSessionActive ? '#16a34a' : '#d97706' }}>
                  {isSessionActive ? 'ACTIVE' : 'PAUSED'}
                </strong>
              </span>
              <span className="meta-chip">
                <span className="chip-label">QR Refresh:</span>
                <span>Every 5 seconds</span>
              </span>
              <span className="meta-chip">
                <span className="chip-label">Students Present:</span>
                <strong style={{ color: '#2563eb' }}>{presentStudentsCount} / {totalStudentsCount}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SESSION CONTROLS BAR */}
      <div className="card teacher-qr-controls-bar">
        <div className="teacher-qr-course-select-wrap">
          <label htmlFor="teacher-qr-course-select" className="controls-label">
            Active Class / Course:
          </label>
          <div className="course-input-cluster">
            {availableCourses.length > 0 ? (
              <select
                id="teacher-qr-course-select"
                className="input-select teacher-qr-course-select"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                {availableCourses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.courseId} — {c.courseName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id="teacher-qr-course-select"
                className="input-text"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="Enter Course ID"
              />
            )}
          </div>
        </div>

        <div className="teacher-qr-control-buttons">
          <button
            type="button"
            className={`btn ${isSessionActive ? 'danger-btn' : 'primary-btn'} session-toggle-btn`}
            onClick={handleToggleSession}
          >
            {isSessionActive ? '⏹ End / Pause Session' : '▶ Resume Dynamic QR Session'}
          </button>
          <button
            type="button"
            className="btn secondary-btn"
            onClick={fetchNextQr}
            disabled={loading || !isSessionActive}
            title="Generate a new token immediately"
          >
            {loading ? 'Refreshing...' : '↻ Regenerate Token Now'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert error-alert">
          <strong>Notice:</strong> {error}
        </div>
      )}

      {/* 3. MAIN WORKSPACE GRID: PROJECTOR QR STAGE + LIVE ATTENDANCE STREAM */}
      <div className="teacher-qr-grid">
        {/* LEFT / CENTER: PROJECTOR QR STAGE */}
        <div className="card teacher-qr-stage-card">
          <div className="qr-stage-header">
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-accent)' }}>Classroom Projection View</span>
              <h3 className="qr-stage-title">Scan Dynamic Attendance QR</h3>
              <p className="qr-stage-subtitle">
                Point mobile camera at this code. Code automatically rotates every 5 seconds.
              </p>
            </div>

            {/* High-visibility 5-Second Countdown Badge */}
            <div className="qr-countdown-box">
              <span className="countdown-label">ROTATES IN</span>
              <div className="countdown-number-row">
                <span className={`countdown-digits ${secondsLeft <= 2 ? 'countdown-urgent' : ''}`}>
                  0{secondsLeft}s
                </span>
              </div>
              <div className="countdown-progress-track">
                <div
                  className={`countdown-progress-fill ${secondsLeft <= 2 ? 'countdown-fill-urgent' : ''}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* QR Display Frame */}
          <div className="qr-frame-wrapper">
            {isSessionActive ? (
              qrToken ? (
                <div className="qr-code-display-box">
                  <div className="qr-laser-scanner-line" />
                  <QRCodeSVG
                    value={qrToken}
                    size={280}
                    level="H"
                    includeMargin={true}
                    className="qr-svg-rendered"
                  />
                </div>
              ) : (
                <div className="qr-placeholder-box">
                  <div className="loading-spinner" />
                  <p>Generating dynamic 5s QR token...</p>
                </div>
              )
            ) : (
              <div className="qr-paused-box">
                <div className="paused-icon">⏸️</div>
                <h3>Attendance Session Paused</h3>
                <p>Click &quot;Resume Dynamic QR Session&quot; above to re-enable student scanning.</p>
              </div>
            )}
          </div>

          {/* Fallback Token Display */}
          {isSessionActive && qrToken && (
            <div className="token-fallback-panel">
              <div className="token-info-left">
                <span className="token-tag">Manual Fallback Code:</span>
                <code className="token-code-text">{qrToken}</code>
              </div>
              <button
                type="button"
                className="btn secondary-btn copy-token-btn"
                onClick={handleCopyToken}
                title="Copy token to clipboard"
              >
                {copiedNotice ? '✓ Copied!' : '📋 Copy Code'}
              </button>
            </div>
          )}

          <p className="qr-projector-footer-hint">
            💡 <strong>Projector Tip:</strong> Maximize browser window (F11) for full classroom visibility.
          </p>
        </div>

        {/* RIGHT: LIVE ATTENDANCE STREAM & ROSTER */}
        <div className="card teacher-qr-attendees-card">
          <div className="card-header">
            <div>
              <span className="eyebrow">Class Roster &bull; Live Stream</span>
              <h3 className="section-title-clean">Verified Attendees</h3>
            </div>
            <span className="pill pill-success" style={{ fontWeight: 800 }}>
              Students Present: {presentStudentsCount} / {totalStudentsCount}
            </span>
          </div>

          <p className="table-caption-clean" style={{ marginBottom: '16px' }}>
            Course: <strong>{activeCourseTitle} ({courseId || 'FSJP'})</strong> &bull; Status: <strong>{isSessionActive ? 'ACTIVE' : 'PAUSED'}</strong> &bull; Refresh: <strong>Every 5s</strong>
          </p>

          <div className="attendees-stream-scroll">
            <ul className="attendee-stream-list">
              {rosterList.map((student) => {
                const isPresent = presentStudentIds.has(student.studentId.toUpperCase());
                const matchingRecord = attendees.find(
                  (a) => a.student?.studentId?.toUpperCase() === student.studentId.toUpperCase()
                );

                return (
                  <li
                    key={student.studentId}
                    className="attendee-stream-item"
                    style={{
                      borderLeft: isPresent ? '4px solid #16a34a' : '4px solid #cbd5e1',
                      padding: '12px 14px',
                      background: isPresent ? '#f0fdf4' : '#ffffff'
                    }}
                  >
                    <div
                      className="attendee-avatar-initial"
                      style={{
                        background: isPresent ? '#dcfce7' : '#f1f5f9',
                        color: isPresent ? '#15803d' : '#64748b'
                      }}
                    >
                      {student.studentName ? student.studentName.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div className="attendee-details">
                      <span className="attendee-name" style={{ fontWeight: 700 }}>
                        {student.studentName || `Student ${student.studentId}`}
                      </span>
                      <div className="attendee-meta-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="record-id-chip">Student #{student.studentId}</span>
                        {isPresent && matchingRecord?.attendanceTime && (
                          <span className="attendee-time" style={{ color: '#15803d', fontWeight: 600, fontSize: '0.8rem' }}>
                            ⏱ {formatTime(matchingRecord.attendanceTime)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isPresent ? (
                      <span
                        className="badge-present"
                        style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}
                      >
                        <span
                          className="status-dot"
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#16a34a',
                            display: 'inline-block',
                            marginRight: '6px'
                          }}
                        />
                        PRESENT
                      </span>
                    ) : (
                      <span
                        className="badge-not-marked"
                        style={{
                          background: '#f8fafc',
                          color: '#64748b',
                          border: '1px solid #e2e8f0',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.8rem'
                        }}
                      >
                        NOT MARKED
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherQrDashboard;

