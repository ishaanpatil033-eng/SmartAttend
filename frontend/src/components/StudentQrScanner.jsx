import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanQrAttendance, getCourses, getStudents } from '../services/api.js';

const StudentQrScanner = ({
  initialStudentId = '',
  initialCourseId = '',
  initialSessionCode = '',
  onBackToDashboard
}) => {
  const [studentId, setStudentId] = useState(initialStudentId);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [sessionCode, setSessionCode] = useState(initialSessionCode);
  const [qrToken, setQrToken] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scanStage, setScanStage] = useState('idle'); // 'idle' | 'scanning' | 'submitting' | 'success'
  const [cameraError, setCameraError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);

  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'qr-camera-viewport';

  // Synchronize course ID prop
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
    if (initialStudentId) {
      setStudentId(initialStudentId);
    }
  }, [initialStudentId]);



  // Load registered courses from MySQL
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [coursesList, studentsList] = await Promise.all([
          getCourses().catch(() => []),
          getStudents().catch(() => [])
        ]);
        setAvailableCourses(coursesList || []);
        setAvailableStudents(studentsList || []);
        if (!initialStudentId && studentsList && studentsList.length > 0) {
          setStudentId(studentsList[0].studentId);
        }
        if (!courseId && coursesList && coursesList.length > 0) {
          setCourseId(coursesList[0].courseId);
        }
      } catch (err) {
        console.warn('Could not load course or student catalogues:', err);
      }
    };
    fetchMetadata();
  }, [initialStudentId, courseId]);

  // Match student name from loaded directory
  const currentStudentObj = availableStudents.find(
    (s) => s.studentId?.toUpperCase() === studentId?.trim().toUpperCase()
  );
  const currentStudentName = currentStudentObj?.studentName || `Student ${studentId}`;

  // Match course name from loaded directory
  const currentCourseObj = availableCourses.find(
    (c) => c.courseId?.toUpperCase() === courseId?.trim().toUpperCase()
  );
  const currentCourseName = currentCourseObj?.courseName || `Course ${courseId}`;

  // Stable client-side device/browser identifier
  const getDeviceFingerprint = () => {
    let localUuid = localStorage.getItem('smartattend_device_uuid');
    if (!localUuid) {
      localUuid = 'DEV_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('smartattend_device_uuid', localUuid);
    }
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const raw = `${localUuid}::${navigator.userAgent}::${screenInfo}::${tz}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return `FP-${Math.abs(hash).toString(16)}-${localUuid.substring(4, 10)}`;
  };

  const hasScannedRef = useRef(false);

  // Stop camera stream safely
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        // Scanner stopped or already cleared
      }
      html5QrCodeRef.current = null;
    }
    const viewportEl = document.getElementById(scannerContainerId);
    if (viewportEl) {
      viewportEl.style.display = '';
    }
    setIsScanning(false);
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Core attendance submission handler with Device Fingerprinting
  const submitAttendance = useCallback(
    async (tokenToSubmit) => {
      const activeToken = (tokenToSubmit || qrToken || '').trim();
      const activeCourse = courseId.trim();

      setErrorMsg('');
      setCameraError('');

      if (!activeCourse || !activeToken) {
        setErrorMsg('Please select a course and scan or enter an active 5-second dynamic QR code.');
        return;
      }

      setSubmitting(true);
      setScanStage('submitting');

      // Generate stable device fingerprint
      const deviceFingerprint = getDeviceFingerprint();

      try {
        // Dispatch to backend with Spring Security Session authentication
        const result = await scanQrAttendance({
          qrToken: activeToken,
          courseId: activeCourse,
          sessionCode: sessionCode || undefined,
          studentId: studentId || undefined,
          deviceFingerprint: deviceFingerprint
        });

        if (result && result.success) {
          const attendanceRecord = result.attendance || {};
          setSuccessData({
            message: result.message || 'Attendance recorded successfully!',
            studentId: studentId,
            studentName: attendanceRecord.student?.studentName || currentStudentName,
            courseId: activeCourse,
            courseName: attendanceRecord.course?.courseName || currentCourseName,
            sessionCode: attendanceRecord.sessionCode || sessionCode || 'Class Session',
            time: attendanceRecord.attendanceTime || new Date().toLocaleTimeString(),
            date: attendanceRecord.attendanceDate || new Date().toISOString().split('T')[0],
            status: attendanceRecord.attendanceStatus || 'PRESENT'
          });
          setQrToken('');
          setScanStage('success');
          await stopCamera();
        } else {
          hasScannedRef.current = false;
          setScanStage('idle');
          setErrorMsg(result?.error || 'This QR code is not valid for this class session.');
        }
      } catch (err) {
        hasScannedRef.current = false;
        setScanStage('idle');
        const rawErr = err.response?.data?.error || err.message || '';
        const rawLower = rawErr.toLowerCase();

        // Exact human-friendly error mapping
        if (err.response?.status === 401) {
          setErrorMsg('Your session has expired. Please log in again to mark attendance.');
        } else if (rawLower.includes('expired')) {
          setErrorMsg('This QR code has expired. Please scan the latest QR displayed by your faculty.');
        } else if (rawLower.includes('already been marked') || rawLower.includes('already marked') || err.response?.status === 409) {
          setErrorMsg('Your attendance is already marked for this session.');
        } else if (
          rawLower.includes('belongs to course') ||
          rawLower.includes('division') ||
          rawLower.includes('batch') ||
          rawLower.includes('wrong course') ||
          rawLower.includes('not enrolled')
        ) {
          setErrorMsg('This QR code does not belong to your enrolled course.');
        } else if (
          rawLower.includes('invalid qr') ||
          rawLower.includes('not valid') ||
          rawLower.includes('token not found') ||
          rawLower.includes('already been used') ||
          rawLower.includes('consumed')
        ) {
          setErrorMsg('This QR code is not valid for this class session.');
        } else if (
          rawLower.includes('device has already marked') ||
          rawLower.includes('proxy attendance rejected')
        ) {
          setErrorMsg('Attendance rejected: This device has already marked attendance for another student in this lecture session.');
        } else if (!err.response || err.code === 'ECONNABORTED' || rawLower.includes('network error') || rawLower.includes('failed to fetch')) {
          setErrorMsg('SmartAttend is temporarily unable to connect to the server. Please wait a moment and try again.');
        } else {
          setErrorMsg(rawErr || 'SmartAttend is temporarily unable to connect to the server. Please wait a moment and try again.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [qrToken, studentId, courseId, sessionCode, currentStudentName, currentCourseName, stopCamera]
  );

  // Start Camera QR Scanner
  const startCamera = async () => {
    setErrorMsg('');
    setCameraError('');
    setSuccessData(null);
    hasScannedRef.current = false;
    setScanStage('scanning');

    try {
      await stopCamera();

      // Ensure viewport element is visible and active in layout before html5-qrcode measures dimensions
      setIsScanning(true);
      const viewportEl = document.getElementById(scannerContainerId);
      if (viewportEl) {
        viewportEl.classList.remove('scanner-collapsed');
        viewportEl.classList.add('scanner-active');
        viewportEl.style.display = 'block';
      }

      const scanner = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 }
        },
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          setQrToken(decodedText);
          stopCamera().catch(() => {});
          submitAttendance(decodedText);
        },
        () => {
          // Continuous frame scan callback
        }
      );

      // Ensure video element plays inline with proper attributes on mobile browsers
      const videoEl = viewportEl ? viewportEl.querySelector('video') : null;
      if (videoEl) {
        videoEl.setAttribute('playsinline', 'true');
        videoEl.setAttribute('autoplay', 'true');
        videoEl.setAttribute('muted', 'true');
        videoEl.playsInline = true;
        videoEl.muted = true;
      }
    } catch (err) {
      setCameraError('Camera access is required to scan the attendance QR.');
      await stopCamera();
      setIsScanning(false);
      setScanStage('idle');
    }
  };

  // Handle manual form submission
  const handleManualFormSubmit = (e) => {
    e.preventDefault();
    hasScannedRef.current = false;
    submitAttendance();
  };

  // Reset scanner for another session
  const handleResetForAnotherScan = () => {
    setSuccessData(null);
    setQrToken('');
    setErrorMsg('');
    setCameraError('');
    setScanStage('idle');
    hasScannedRef.current = false;
  };

  return (
    <div className="student-scanner-page-wrapper">
      {/* 1. STUDENT SCANNER WELCOME HEADER */}
      <div className="card student-scanner-welcome-header">
        <div className="scanner-header-top">
          <div className="scanner-header-title-block">
            <span className="eyebrow">Student Portal &bull; Verified Attendance Verification</span>
            <h1 className="scanner-heading">
              Scan Dynamic QR Attendance
              {sessionCode && (
                <span className="badge badge-info" style={{ marginLeft: '12px', fontSize: '0.85rem', verticalAlign: 'middle', background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px' }}>
                  Session: {sessionCode}
                </span>
              )}
            </h1>
            <p className="scanner-subheading">
              Point your smartphone camera at the teacher&apos;s live projection screen or enter the active 5-second dynamic code.
            </p>
          </div>

          <div className="scanner-header-actions">
            {onBackToDashboard && (
              <button
                type="button"
                className="btn secondary-btn"
                onClick={onBackToDashboard}
                title="Return to Student Dashboard workspace"
              >
                &larr; Student Dashboard
              </button>
            )}
            <span className="pill pill-info">Live Verification</span>
          </div>
        </div>

        {/* 2. AUTHENTICATED STUDENT IDENTITY & SECURITY SIGNALS */}
        <div className="scanner-context-strip">
          <div className="scanner-avatar-badge">
            <span className="scanner-avatar-initial">
              {currentStudentName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="scanner-student-details">
            <div className="scanner-student-name-row" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <h2 className="scanner-student-title">
                {currentStudentName} &bull; <span className="student-id-highlight">#{studentId}</span>
              </h2>
              {!initialStudentId && availableStudents.length > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                  <label htmlFor="admin-select-student-scan" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Switch Student:</label>
                  <select
                    id="admin-select-student-scan"
                    className="input-select"
                    style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto', borderRadius: '6px' }}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  >
                    {availableStudents.map(s => (
                      <option key={s.studentId} value={s.studentId}>
                        {s.studentId} — {s.studentName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <span className="pill pill-success">Authenticated Server Identity</span>
            </div>
            <div className="scanner-meta-chips-row">
              <span className="meta-chip">
                <span className="chip-label">Target Course:</span>
                <strong>{courseId} &bull; {currentCourseName}</strong>
              </span>
              <span className="meta-chip">
                <span className="chip-label">Dynamic Refresh:</span>
                <span>5-Second Rotation</span>
              </span>
              <span className="meta-chip">
                <span className="chip-label">Anti-Proxy:</span>
                <span>One-Device-One-Lecture</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PRE-SCAN GUIDANCE CHECKLIST (Visible before scanning) */}
      {!isScanning && !successData && (
        <div className="card pre-scan-guidance-card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', border: '1px solid #bfdbfe', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span className="eyebrow" style={{ color: '#1d4ed8' }}>Attendance Verification Checklist</span>
              <h3 style={{ margin: '4px 0 6px 0', fontSize: '1.25rem', color: '#1e3a8a', fontWeight: 800 }}>
                Course: {currentCourseName} ({courseId || 'FSJP'})
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#3b82f6', fontWeight: 600 }}>
                Session: <strong>{sessionCode || 'Active Class Session'}</strong> &bull; Student: <strong>{currentStudentName} (#{studentId})</strong>
              </p>
            </div>
            <button
              type="button"
              className="btn primary-btn"
              onClick={startCamera}
              style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)' }}
            >
              📷 Scan QR &amp; Mark Attendance
            </button>
          </div>

          <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#dbeafe', color: '#1d4ed8', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>1</span>
                Select Course
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>Confirm your enrolled course is selected before scanning.</p>
            </div>

            <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#dbeafe', color: '#1d4ed8', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>2</span>
                Faculty Active Session
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>Ensure the faculty dynamic QR screen is actively running.</p>
            </div>

            <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#dbeafe', color: '#1d4ed8', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>3</span>
                Scan Live QR
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>Aim your camera at the live 5-second QR rotating on the screen.</p>
            </div>

            <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#dbeafe', color: '#1d4ed8', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>4</span>
                Instant Attendance
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>Instant verification and confirmation logged to your records.</p>
            </div>
          </div>
        </div>
      )}

      {/* DISTINCT SCANNING & SUBMISSION STATUS BANNER */}
      {(isScanning || submitting) && (
        <div
          className="scanner-live-status-banner"
          style={{
            padding: '14px 20px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontWeight: 700,
            fontSize: '1rem',
            background: scanStage === 'submitting' ? '#e0e7ff' : '#dbeafe',
            color: scanStage === 'submitting' ? '#3730a3' : '#1e40af',
            border: `1px solid ${scanStage === 'submitting' ? '#c7d2fe' : '#93c5fd'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}
        >
          <div
            className="status-spinner-small"
            style={{
              width: '18px',
              height: '18px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              flexShrink: 0
            }}
          />
          <span>
            {scanStage === 'submitting'
              ? 'QR verified. Marking attendance...'
              : 'Scanning current attendance QR...'}
          </span>
        </div>
      )}

      {/* 4. SUCCESS CELEBRATION CARD */}
      {successData && (
        <div className="card scan-success-card">
          <div className="success-header-row">
            <div className="success-icon-badge">✓</div>
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-success)' }}>Verification Confirmed</span>
              <h2 className="success-title">✓ Attendance Marked Successfully</h2>
              <p className="success-subtitle">{successData.message}</p>
            </div>
          </div>

          <div className="success-details-grid">
            <div className="success-detail-box">
              <span className="detail-label">Course</span>
              <span className="detail-value">{successData.courseName} ({successData.courseId})</span>
              <span className="detail-subvalue">Student: {successData.studentName} (#{successData.studentId})</span>
            </div>

            <div className="success-detail-box">
              <span className="detail-label">Session</span>
              <span className="detail-value">{sessionCode || successData.sessionCode || 'Class Session'}</span>
              <span className="detail-subvalue">Dynamic QR Token Verified</span>
            </div>

            <div className="success-detail-box">
              <span className="detail-label">Status</span>
              <span className="detail-value" style={{ color: '#16a34a', fontWeight: 800 }}>
                ● {successData.status || 'PRESENT'}
              </span>
              <span className="detail-subvalue">Verified by Spring Boot</span>
            </div>

            <div className="success-detail-box">
              <span className="detail-label">Time</span>
              <span className="detail-value">{successData.time}</span>
              <span className="detail-subvalue">Date: {successData.date}</span>
            </div>
          </div>

          <div className="success-actions-row">
            {onBackToDashboard && (
              <button
                type="button"
                className="btn primary-btn"
                onClick={onBackToDashboard}
              >
                &larr; Return to Student Dashboard
              </button>
            )}
            <button
              type="button"
              className="btn secondary-btn"
              onClick={handleResetForAnotherScan}
            >
              Scan Another Class
            </button>
          </div>
        </div>
      )}

      {/* 5. ERROR NOTICES */}
      {errorMsg && (
        <div className="alert error-alert">
          <div className="alert-content-wrap">
            <span className="alert-icon">⚠️</span>
            <div>
              <strong>Attendance Notice:</strong> {errorMsg}
            </div>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="alert alert-warning">
          <div className="alert-content-wrap">
            <span className="alert-icon">📷</span>
            <div>
              <strong>Camera Access:</strong> {cameraError}
            </div>
          </div>
        </div>
      )}

      {/* 6. MAIN SCANNER WORKSPACE (Camera Viewport + Fallback Input Form) */}
      {!successData && (
        <div className="student-scanner-grid">
          {/* CAMERA SCANNER CARD */}
          <div className="card camera-scanner-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Option 1 &bull; Instant Camera Scan</span>
                <h3 className="section-title-clean">Live Camera Reticle</h3>
              </div>
              <button
                type="button"
                className={`btn ${isScanning ? 'danger-btn' : 'primary-btn'} camera-toggle-btn`}
                onClick={isScanning ? stopCamera : startCamera}
              >
                {isScanning ? '⏹ Stop Camera' : '📷 Scan QR & Mark Attendance'}
              </button>
            </div>

            <p className="scanner-section-intro">
              Position the classroom projected QR code inside the reticle box. Token validity and device security will be verified automatically upon scanning.
            </p>

            <div className="camera-viewport-container">
              <div
                id={scannerContainerId}
                className={`scanner-view ${isScanning ? 'scanner-active' : 'scanner-collapsed'}`}
              />

              {!isScanning && (
                <div className="camera-idle-placeholder" onClick={startCamera}>
                  <div className="idle-camera-icon">📷</div>
                  <h4>Camera is currently inactive</h4>
                  <p>Click &quot;Scan QR &amp; Mark Attendance&quot; to scan the live 5-second classroom code.</p>
                  <button type="button" className="btn primary-btn" style={{ marginTop: '12px' }}>
                    📷 Scan QR &amp; Mark Attendance
                  </button>
                </div>
              )}
            </div>

            <div className="camera-hints-box">
              <span className="hint-pill">💡 Tip</span>
              <span>Point camera directly at the live dynamic QR code displayed by your faculty.</span>
            </div>
          </div>

          {/* MANUAL ENTRY / FALLBACK CARD */}
          <div className="card manual-scanner-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Option 2 &bull; Direct Token Verification</span>
                <h3 className="section-title-clean">Manual Attendance Entry</h3>
              </div>
              <span className="pill pill-secondary">Fallback Option</span>
            </div>

            <p className="scanner-section-intro">
              If camera access is restricted or scanning from a laptop, verify your course and enter the active 5-second dynamic code displayed on screen.
            </p>

            <form onSubmit={handleManualFormSubmit} className="student-manual-form">
              {/* Authenticated Student ID - Strictly Locked Display */}
              <div className="form-group-item">
                <span className="field-label">Authenticated Student:</span>
                <div className="authenticated-identity-badge">
                  <strong>#{studentId}</strong> &bull; {currentStudentName}
                  <span className="pill pill-success" style={{ marginLeft: '10px', fontSize: '0.75rem' }}>Locked by Session</span>
                </div>
              </div>

              <div className="form-group-item">
                <label className="field-group" htmlFor="scanner-course-id">
                  <span className="field-label">Target Course / Class:</span>
                  <div className="input-with-hint">
                    {availableCourses.length > 0 ? (
                      <select
                        id="scanner-course-id"
                        className="input-select"
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
                        id="scanner-course-id"
                        className="input-text"
                        value={courseId}
                        onChange={(e) => setCourseId(e.target.value)}
                        placeholder="Enter Course ID"
                        required
                      />
                    )}
                  </div>
                </label>
              </div>

              <div className="form-group-item">
                <label className="field-group" htmlFor="scanner-qr-token">
                  <span className="field-label">Active 5-Second QR Token:</span>
                  <input
                    type="text"
                    id="scanner-qr-token"
                    className="input-text token-input-styled"
                    value={qrToken}
                    onChange={(e) => setQrToken(e.target.value)}
                    placeholder="Enter or paste active 5-second dynamic code"
                    autoComplete="off"
                    required
                  />
                </label>
                <span className="field-subtext">
                  Notice: Dynamic tokens expire every 5 seconds. Submit promptly after copying.
                </span>
              </div>

              <div className="form-action-row">
                <button
                  type="submit"
                  className="btn primary-btn submit-attendance-btn"
                  disabled={submitting || !qrToken.trim()}
                >
                  {submitting ? 'Verifying QR & Security...' : '✓ Mark Attendance Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentQrScanner;
