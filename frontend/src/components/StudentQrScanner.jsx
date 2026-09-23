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
  const [cameraError, setCameraError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'locating' | 'ready' | 'denied'
  const [locationCoords, setLocationCoords] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);

  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'qr-camera-viewport';
  const latestLocationRef = useRef(null);
  const locationWatchIdRef = useRef(null);

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

  // Pre-warm and continuously maintain geolocation while scanner workspace is active
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }

    setLocationStatus('locating');

    const handleSuccess = (position) => {
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp || Date.now()
      };
      latestLocationRef.current = coords;
      setLocationCoords(coords);
      setLocationStatus('ready');
    };

    const handleError = (error) => {
      if (!latestLocationRef.current) {
        setLocationStatus(error.code === 1 ? 'denied' : 'idle');
      }
    };

    // 1. Initial quick location query allowing recent cached coordinates (up to 30 seconds)
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 30000
    });

    // 2. Active position watcher while scanner component is open
    let watchId = null;
    try {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000
      });
      locationWatchIdRef.current = watchId;
    } catch (_) {}

    return () => {
      if (locationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, []);

  // Retrieve effective location: 0ms instantaneous if pre-warmed, or short fallback wait
  const getEffectiveLocation = useCallback(() => {
    // 1. If valid, sufficiently recent location (< 45s) is already in memory, return immediately
    if (latestLocationRef.current) {
      const ageMs = Date.now() - (latestLocationRef.current.timestamp || 0);
      if (ageMs < 45000) {
        return Promise.resolve(latestLocationRef.current);
      }
    }

    if (!navigator.geolocation) {
      return Promise.reject(new Error('Geolocation is not supported by your browser.'));
    }

    // 2. If no location yet (e.g. instant scan within first second), briefly wait without blocking indefinitely
    setLocationStatus('locating');
    setErrorMsg('Getting your location. Please keep the scanner open...');

    return new Promise((resolve, reject) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (latestLocationRef.current) {
            resolve(latestLocationRef.current);
          } else {
            reject(new Error('Attendance rejected: Location unavailable or GPS timed out. Please ensure GPS is enabled and retry.'));
          }
        }
      }, 3500);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            const coords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp || Date.now()
            };
            latestLocationRef.current = coords;
            setLocationCoords(coords);
            setLocationStatus('ready');
            resolve(coords);
          }
        },
        (err) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            if (latestLocationRef.current) {
              resolve(latestLocationRef.current);
            } else {
              reject(err);
            }
          }
        },
        { enableHighAccuracy: true, timeout: 3500, maximumAge: 30000 }
      );
    });
  }, []);

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

  // Core attendance submission handler with GPS Geolocation and Device Fingerprinting
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

      // 1. Acquire real GPS coordinates (instantaneous via pre-warmed memory cache)
      let coords;
      try {
        coords = await getEffectiveLocation();
      } catch (geoErr) {
        setLocationStatus('denied');
        setSubmitting(false);
        hasScannedRef.current = false;
        if (geoErr?.code === 1) {
          setErrorMsg('Attendance cannot be marked without location verification. Location permission was denied.');
        } else {
          setErrorMsg(geoErr?.message || 'Attendance rejected: Location unavailable or GPS timed out. Please enable device location.');
        }
        return;
      }

      // 2. Generate stable device fingerprint
      const deviceFingerprint = getDeviceFingerprint();

      try {
        // 3. Dispatch to backend with Spring Security Session authentication
        const result = await scanQrAttendance({
          qrToken: activeToken,
          courseId: activeCourse,
          sessionCode: sessionCode || undefined,
          studentId: studentId || undefined,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
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
            time: attendanceRecord.attendanceTime || new Date().toLocaleTimeString(),
            date: attendanceRecord.attendanceDate || new Date().toISOString().split('T')[0],
            status: attendanceRecord.attendanceStatus || 'PRESENT'
          });
          setQrToken('');
          await stopCamera();
        } else {
          hasScannedRef.current = false;
          setErrorMsg(result?.error || 'Failed to mark attendance. Please verify with instructor.');
        }
      } catch (err) {
        hasScannedRef.current = false;
        const rawErr = err.response?.data?.error || err.message || 'Could not connect to attendance server.';
        
        // Human-friendly security classification
        if (err.response?.status === 401) {
          setErrorMsg('Your session has expired. Please log in again to mark attendance.');
        } else if (rawErr.toLowerCase().includes('outside the allowed classroom area') || rawErr.toLowerCase().includes('geofence')) {
          setErrorMsg('Attendance rejected: you are outside the allowed classroom area.');
        } else if (rawErr.toLowerCase().includes('gps accuracy is insufficient')) {
          setErrorMsg('Attendance rejected: GPS accuracy is insufficient. Please move to an open area and retry.');
        } else if (rawErr.toLowerCase().includes('device has already marked attendance for another student') || rawErr.toLowerCase().includes('proxy attendance rejected')) {
          setErrorMsg('Attendance rejected: This device has already marked attendance for another student in this lecture session.');
        } else if (rawErr.toLowerCase().includes('already been marked') || err.response?.status === 409) {
          setErrorMsg('Attendance has already been marked for this lecture session. Duplicate submissions are prevented.');
        } else if (rawErr.toLowerCase().includes('expired')) {
          setErrorMsg('This QR token has expired! Tokens rotate every 5 seconds for security. Please scan the current code displayed on the teacher\'s screen.');
        } else if (rawErr.toLowerCase().includes('already been used') || rawErr.toLowerCase().includes('consumed')) {
          setErrorMsg('This QR code has already been consumed by another scan. Please scan the newly refreshed live QR code.');
        } else {
          setErrorMsg(rawErr);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [qrToken, studentId, courseId, sessionCode, currentStudentName, currentCourseName, stopCamera, getEffectiveLocation]
  );

  // Start Camera QR Scanner
  const startCamera = async () => {
    setErrorMsg('');
    setCameraError('');
    setSuccessData(null);
    hasScannedRef.current = false;

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
      setCameraError('Camera access was not granted or is unavailable on this device. You can manually enter or paste the 5-second dynamic code below.');
      await stopCamera();
      setIsScanning(false);
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
                <span className="chip-label">Geofence:</span>
                <span>Haversine GPS Verified</span>
              </span>
              <span className="meta-chip">
                <span className="chip-label">Anti-Proxy:</span>
                <span>One-Device-One-Lecture</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. STEP-BY-STEP GUIDANCE RIBBON */}
      <div className="scanner-steps-ribbon">
        <div className="scanner-step-item">
          <div className="scanner-step-number">1</div>
          <div className="scanner-step-text">
            <strong>Check Screen</strong>
            <span>Observe the live 5-second rotating QR code on the classroom projector.</span>
          </div>
        </div>
        <div className="scanner-step-item">
          <div className="scanner-step-number">2</div>
          <div className="scanner-step-text">
            <strong>Location Check</strong>
            <span>Browser automatically verifies your presence inside the classroom geofence.</span>
          </div>
        </div>
        <div className="scanner-step-item">
          <div className="scanner-step-number">3</div>
          <div className="scanner-step-text">
            <strong>Instant Log</strong>
            <span>Attendance is recorded in MySQL and secured against duplicate or proxy scans.</span>
          </div>
        </div>
      </div>

      {/* 4. SUCCESS CELEBRATION CARD */}
      {successData && (
        <div className="card scan-success-card">
          <div className="success-header-row">
            <div className="success-icon-badge">✓</div>
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-success)' }}>Verification Confirmed</span>
              <h2 className="success-title">Attendance Successfully Recorded!</h2>
              <p className="success-subtitle">{successData.message}</p>
            </div>
          </div>

          <div className="success-details-grid">
            <div className="success-detail-box">
              <span className="detail-label">Student Name</span>
              <span className="detail-value">{successData.studentName}</span>
              <span className="detail-subvalue">ID: #{successData.studentId}</span>
            </div>

            <div className="success-detail-box">
              <span className="detail-label">Course Verified</span>
              <span className="detail-value">{successData.courseId}</span>
              <span className="detail-subvalue">{successData.courseName}</span>
            </div>

            <div className="success-detail-box">
              <span className="detail-label">Status Logged</span>
              <span className="detail-value" style={{ color: 'var(--color-success)' }}>
                ● {successData.status}
              </span>
              <span className="detail-subvalue">Verified by Spring Boot</span>
            </div>

            <div className="success-detail-box">
              <span className="detail-label">Timestamp</span>
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
                {isScanning ? '⏹ Stop Camera' : '📷 Open Camera Scanner'}
              </button>
            </div>

            <p className="scanner-section-intro">
              Position the classroom projected QR code inside the reticle box. GPS location and device security will be verified automatically upon scanning.
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
                  <p>Click &quot;Open Camera Scanner&quot; to scan the live 5-second classroom code.</p>
                  <button type="button" className="btn primary-btn" style={{ marginTop: '12px' }}>
                    Activate Camera
                  </button>
                </div>
              )}
            </div>

            <div className="camera-hints-box">
              <span className="hint-pill">💡 Tip</span>
              <span>Ensure browser location permission is enabled when prompted. Point camera directly at the code.</span>
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

              {locationCoords && (
                <div className="location-status-badge">
                  📍 GPS Acquired: {locationCoords.latitude.toFixed(4)}, {locationCoords.longitude.toFixed(4)} (±{Math.round(locationCoords.accuracy)}m)
                </div>
              )}

              <div className="form-action-row">
                <button
                  type="submit"
                  className="btn primary-btn submit-attendance-btn"
                  disabled={submitting || !qrToken.trim()}
                >
                  {submitting ? 'Verifying GPS & Security...' : '✓ Mark Attendance Now'}
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
