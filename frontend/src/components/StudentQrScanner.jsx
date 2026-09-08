import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { scanQrAttendance } from '../services/api.js';

const StudentQrScanner = () => {
  const [studentId, setStudentId] = useState('STU101');
  const [courseId, setCourseId] = useState('CS101');
  const [qrToken, setQrToken] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'qr-camera-viewport';

  // Start Camera QR Scanner
  const startCamera = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const scanner = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setQrToken(decodedText);
          stopCamera();
        },
        () => {
          // Scanning frame callback
        }
      );
      setIsScanning(true);
    } catch (err) {
      setErrorMsg('Camera access was not granted or is unavailable. You can enter or paste the 5-second token below.');
      setIsScanning(false);
    }
  };

  // Stop Camera QR Scanner
  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        // Scanner stopped
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Submit attendance with the 5-second dynamic QR token
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!studentId.trim() || !courseId.trim() || !qrToken.trim()) {
      setErrorMsg('Please enter Student ID, Course ID, and the active QR token.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await scanQrAttendance({
        studentId: studentId.trim(),
        courseId: courseId.trim(),
        qrToken: qrToken.trim()
      });

      if (result.success) {
        setSuccessMsg(result.message);
        setQrToken('');
      } else {
        setErrorMsg(result.error || 'Failed to mark attendance.');
      }
    } catch (err) {
      const serverMessage = err.response?.data?.error || err.message || 'Could not connect to backend.';
      setErrorMsg(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card student-scanner-card">
      <div className="card-header">
        <div>
          <span className="eyebrow">Student Portal</span>
          <h2>Scan Dynamic QR Attendance</h2>
        </div>
        <span className="pill pill-info">Live Scanner</span>
      </div>

      <p className="card-intro">
        Scan the live teacher QR code or enter the 5-second active token to mark your attendance for the class.
      </p>

      {successMsg && (
        <div className="alert success-alert">
          <strong>Marked Present:</strong> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert error-alert">
          <strong>Notice:</strong> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="scanner-form">
        <div className="form-row">
          <label className="field-group">
            <span className="field-label">Student ID:</span>
            <input
              type="text"
              className="input-text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. STU101"
              required
            />
          </label>

          <label className="field-group">
            <span className="field-label">Class / Course ID:</span>
            <input
              type="text"
              className="input-text"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="e.g. CS101"
              required
            />
          </label>
        </div>

        <div className="camera-box">
          <div className="camera-header-row">
            <span className="camera-label">Camera Scanner:</span>
            <button
              type="button"
              className="btn secondary-btn camera-toggle-btn"
              onClick={isScanning ? stopCamera : startCamera}
            >
              {isScanning ? 'Stop Camera' : 'Open Camera Scanner'}
            </button>
          </div>

          <div
            id={scannerContainerId}
            className={`scanner-view ${isScanning ? 'scanner-active' : 'scanner-collapsed'}`}
          />
        </div>

        <label className="field-group">
          <span className="field-label">Scanned Token Code (or enter active 5s code):</span>
          <input
            type="text"
            className="input-text"
            value={qrToken}
            onChange={(e) => setQrToken(e.target.value)}
            placeholder="Scan via camera or paste 5-second dynamic code"
            required
          />
        </label>

        <button
          type="submit"
          className="btn primary-btn"
          disabled={submitting || !qrToken}
        >
          {submitting ? 'Submitting...' : 'Mark Attendance Now'}
        </button>
      </form>
    </div>
  );
};

export default StudentQrScanner;
