import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateQrToken, getCourseAttendance } from '../services/api.js';

const REFRESH_SECONDS = 5;

const TeacherQrDashboard = () => {
  const [courseId, setCourseId] = useState('CS101');
  const [qrToken, setQrToken] = useState('');
  const [expiresAtMs, setExpiresAtMs] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  // Clock tick to update the countdown timer every half-second
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => window.clearInterval(timer);
  }, []);

  // Fetch attendees marked present for this course
  const loadAttendees = useCallback(async () => {
    if (!courseId) {
      return;
    }
    try {
      const records = await getCourseAttendance(courseId);
      setAttendees(records);
    } catch (err) {
      // Backend might return 404 if no attendance marked yet
    }
  }, [courseId]);

  // Request a new dynamic QR token that expires in 5 seconds
  const fetchNextQr = useCallback(async () => {
    if (!courseId) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await generateQrToken(courseId);
      setQrToken(data.token);
      setExpiresAtMs(Date.now() + REFRESH_SECONDS * 1000);
      loadAttendees();
    } catch (err) {
      setError(err.message || 'Could not generate dynamic QR code.');
    } finally {
      setLoading(false);
    }
  }, [courseId, loadAttendees]);

  // 5-second automatic refresh interval
  useEffect(() => {
    fetchNextQr();
    const refreshInterval = window.setInterval(fetchNextQr, REFRESH_SECONDS * 1000);

    return () => window.clearInterval(refreshInterval);
  }, [fetchNextQr]);

  // Calculate seconds remaining without floor division
  const secondsLeft = useMemo(() => {
    if (!expiresAtMs) {
      return 0;
    }
    const diff = expiresAtMs - now;
    if (diff <= 0) {
      return 0;
    }
    return Math.ceil(diff / 1000);
  }, [expiresAtMs, now]);

  return (
    <div className="card teacher-qr-card">
      <div className="card-header">
        <div>
          <span className="eyebrow">Teacher / Class Session</span>
          <h2>Dynamic QR Attendance Display</h2>
        </div>
        <div className="countdown-badge">
          Refreshes in: <strong>{secondsLeft}s</strong>
        </div>
      </div>

      <div className="course-input-row">
        <label className="field-group">
          <span className="field-label">Class / Course ID:</span>
          <input
            type="text"
            className="input-text"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            placeholder="e.g. CS101"
          />
        </label>
        <button
          type="button"
          className="btn primary-btn"
          onClick={fetchNextQr}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Generate New QR'}
        </button>
      </div>

      {error && (
        <div className="alert error-alert">
          {error}
        </div>
      )}

      <div className="qr-workspace-grid">
        <div className="qr-container">
          {qrToken ? (
            <>
              <div className="qr-box">
                <QRCodeSVG
                  value={qrToken}
                  size={260}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p className="qr-caption">
                Students scan this QR code now. It expires automatically every 5 seconds.
              </p>
              <div className="token-display">
                <span className="token-caption">Active Token Code:</span>
                <code className="token-val">{qrToken}</code>
              </div>
            </>
          ) : (
            <div className="empty-qr-notice">
              Loading dynamic QR code...
            </div>
          )}
        </div>

        <div className="attendee-panel">
          <div className="panel-title-bar">
            <h3>Present Students ({attendees.length})</h3>
            <button
              type="button"
              className="link-button"
              onClick={loadAttendees}
            >
              Refresh
            </button>
          </div>

          {attendees.length === 0 ? (
            <p className="no-data-text">
              No students have marked attendance for this class yet.
            </p>
          ) : (
            <ul className="attendee-items-list">
              {attendees.map((record) => (
                <li key={record.id} className="attendee-row">
                  <div>
                    <span className="student-name-text">{record.student?.studentName}</span>
                    <span className="student-id-text">ID: {record.student?.studentId}</span>
                  </div>
                  <span className="badge-present">Present</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherQrDashboard;
