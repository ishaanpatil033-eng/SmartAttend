import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateQrToken, getCourseAttendance, getCourses, getClassAttendance } from '../services/api.js';

const REFRESH_SECONDS = 5;

const TeacherQrDashboard = ({ initialCourseId = '', initialSessionCode = '', onBackToDashboard }) => {
  const [courseId, setCourseId] = useState(initialCourseId);
  const [sessionCode, setSessionCode] = useState(initialSessionCode);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [qrToken, setQrToken] = useState('');
  const [expiresAtMs, setExpiresAtMs] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [now, setNow] = useState(Date.now());

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

  // Clock tick to update the countdown timer smoothly every 200ms
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 200);

    return () => window.clearInterval(timer);
  }, []);

  // Fetch course catalogue from MySQL to show course titles and enable switching
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const list = await getCourses();
        setAvailableCourses(list || []);
        if ((!courseId || courseId.trim() === '') && list && list.length > 0) {
          setCourseId(list[0].courseId);
        }
      } catch (err) {
        console.warn('Could not fetch course directory:', err);
      }
    };
    loadCourses();
  }, [courseId]);

  // Fetch attendees marked present for this session or course
  const loadAttendees = useCallback(async (targetCourseId) => {
    const idToQuery = targetCourseId || courseId;
    if (!idToQuery) return;
    try {
      let records = [];
      if (sessionCode) {
        records = await getClassAttendance(sessionCode).catch(() => []);
      }
      if (!records || records.length === 0) {
        records = await getCourseAttendance(idToQuery).catch(() => []);
      }
      setAttendees(records || []);
    } catch (err) {
      // Backend returns 404 or empty list if no attendance yet
      setAttendees([]);
    }
  }, [courseId, sessionCode]);

  // Request a new dynamic QR token that expires in 5 seconds
  const fetchNextQr = useCallback(async () => {
    if (!courseId || !isSessionActive) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await generateQrToken(courseId, sessionCode || null);
      setQrToken(data.token);
      setExpiresAtMs(Date.now() + REFRESH_SECONDS * 1000);
      loadAttendees(courseId);
    } catch (err) {
      setError(err.message || 'Could not generate dynamic QR code.');
    } finally {
      setLoading(false);
    }
  }, [courseId, sessionCode, isSessionActive, loadAttendees]);

  // 5-second automatic refresh interval
  useEffect(() => {
    if (!isSessionActive) {
      return;
    }

    fetchNextQr();
    const refreshInterval = window.setInterval(fetchNextQr, REFRESH_SECONDS * 1000);

    return () => window.clearInterval(refreshInterval);
  }, [fetchNextQr, isSessionActive]);

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

  // Progress percentage (100% down to 0% over 5 seconds)
  const progressPercent = useMemo(() => {
    if (!expiresAtMs || !isSessionActive) return 0;
    const diff = expiresAtMs - now;
    if (diff <= 0) return 0;
    const totalMs = REFRESH_SECONDS * 1000;
    return Math.min(100, Math.max(0, (diff / totalMs) * 100));
  }, [expiresAtMs, now, isSessionActive]);

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
  const activeCourseTitle = activeCourseObj?.courseName || 'Classroom Attendance Session';

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
              <h2 className="teacher-qr-role-title">{courseId} &bull; {activeCourseTitle}</h2>
              <span className={`pill ${isSessionActive ? 'pill-success' : 'pill-warning'}`}>
                {isSessionActive ? '● Live Session Active' : 'Session Paused'}
              </span>
            </div>
            <div className="teacher-qr-meta-chips-row">
              <span className="meta-chip">
                <span className="chip-label">Faculty Role:</span>
                <strong>Session Moderator</strong>
              </span>
              <span className="meta-chip">
                <span className="chip-label">Security:</span>
                <span>5s Anti-Proxy Rotation</span>
              </span>
              <span className="meta-chip">
                <span className="chip-label">Present:</span>
                <strong>{attendees.length} Students Scanned</strong>
              </span>
              <span className="meta-chip">
                <span className="chip-label">Backend:</span>
                <span>Spring Boot + MySQL</span>
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

        {/* RIGHT: LIVE ATTENDANCE STREAM */}
        <div className="card teacher-qr-attendees-card">
          <div className="card-header">
            <div>
              <span className="eyebrow">Live Real-Time Stream</span>
              <h3 className="section-title-clean">Verified Attendees</h3>
            </div>
            <span className="pill pill-success">
              {attendees.length} Present
            </span>
          </div>

          <p className="table-caption-clean" style={{ marginBottom: '16px' }}>
            Verified student attendance scans streaming in real-time from MySQL.
          </p>

          {attendees.length === 0 ? (
            <div className="empty-state-box" style={{ padding: '36px 16px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📡</div>
              <p className="no-data-text">Waiting for students to scan...</p>
              <p className="empty-state-hint">
                As students scan the projected QR code, their names and verification timestamps will stream here automatically.
              </p>
            </div>
          ) : (
            <div className="attendees-stream-scroll">
              <ul className="attendee-stream-list">
                {attendees.map((record) => (
                  <li key={record.id} className="attendee-stream-item">
                    <div className="attendee-avatar-initial">
                      {record.student?.studentName
                        ? record.student.studentName.charAt(0).toUpperCase()
                        : 'S'}
                    </div>
                    <div className="attendee-details">
                      <span className="attendee-name">
                        {record.student?.studentName || 'Student'}
                      </span>
                      <div className="attendee-meta-row">
                        <span className="record-id-chip">#{record.student?.studentId}</span>
                        {record.attendanceTime && (
                          <span className="attendee-time">
                            ⏱ {formatTime(record.attendanceTime)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="badge-present">
                      <span className="status-dot"></span>
                      PRESENT
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherQrDashboard;

