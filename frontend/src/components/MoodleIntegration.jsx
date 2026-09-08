import React, { useState, useEffect, useCallback } from 'react';
import { getMoodleStatus, getMoodleRoster, importMoodleStudents, syncMoodleAttendance } from '../services/api.js';

const MoodleIntegration = () => {
  const [courseId, setCourseId] = useState('CS101');
  const [moodleStatus, setMoodleStatus] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load connection status
  const checkStatus = useCallback(async () => {
    try {
      const status = await getMoodleStatus();
      setMoodleStatus(status);
    } catch (err) {
      setMoodleStatus({ configured: false, baseUrl: 'Unavailable' });
    }
  }, []);

  // Fetch course roster from Moodle
  const loadRoster = useCallback(async () => {
    if (!courseId) {
      return;
    }
    try {
      setLoadingRoster(true);
      setErrorMessage('');
      const data = await getMoodleRoster(courseId);
      setRoster(data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch Moodle roster.');
    } finally {
      setLoadingRoster(false);
    }
  }, [courseId]);

  useEffect(() => {
    checkStatus();
    loadRoster();
  }, [checkStatus, loadRoster]);

  // Import Moodle enrolled students into SmartAttend MySQL
  const handleImportStudents = async () => {
    try {
      setImporting(true);
      setSuccessMessage('');
      setErrorMessage('');
      const result = await importMoodleStudents(courseId);
      setSuccessMessage(result.message);
    } catch (err) {
      setErrorMessage(err.message || 'Student import failed.');
    } finally {
      setImporting(false);
    }
  };

  // Sync attendance records for this course with Moodle
  const handleSyncAttendance = async () => {
    try {
      setSyncing(true);
      setSuccessMessage('');
      setErrorMessage('');
      const result = await syncMoodleAttendance(courseId);
      if (result.success) {
        setSuccessMessage(result.message);
      } else {
        setErrorMessage(result.message || 'Moodle sync failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Moodle sync failed.';
      setErrorMessage(msg);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="card moodle-card">
      <div className="card-header">
        <div>
          <span className="eyebrow">Academic LMS Integration</span>
          <h2>Moodle Roster &amp; Attendance Synchronization</h2>
        </div>
        <div className="moodle-status-indicator">
          {moodleStatus?.configured ? (
            <span className="pill pill-success">Moodle Connected</span>
          ) : (
            <span className="pill pill-moodle">Moodle Integration Ready</span>
          )}
        </div>
      </div>

      <p className="card-intro">
        Connect SmartAttend with your institution's Moodle LMS to import student rosters and automatically synchronize daily QR attendance records into Moodle gradebook.
      </p>

      <div className="moodle-control-row">
        <label className="field-group">
          <span className="field-label">Target Course Code:</span>
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
          className="btn secondary-btn"
          onClick={loadRoster}
          disabled={loadingRoster}
        >
          {loadingRoster ? 'Loading...' : 'Refresh Roster'}
        </button>

        <button
          type="button"
          className="btn secondary-btn"
          onClick={handleImportStudents}
          disabled={importing}
        >
          {importing ? 'Importing...' : 'Import Students to MySQL'}
        </button>

        <button
          type="button"
          className="btn moodle-btn"
          onClick={handleSyncAttendance}
          disabled={syncing}
        >
          {syncing ? 'Syncing...' : 'Sync Attendance to Moodle'}
        </button>
      </div>

      {successMessage && (
        <div className="alert success-alert">
          <strong>Moodle Sync:</strong> {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="alert error-alert">
          <strong>Notice:</strong> {errorMessage}
        </div>
      )}

      <div className="moodle-roster-section">
        <div className="roster-header">
          <h3>Enrolled Course Students ({roster.length})</h3>
          <span className="roster-subtext">Source: Moodle Web Service (core_enrol_get_enrolled_users)</span>
        </div>

        {roster.length === 0 ? (
          <p className="empty-roster-msg">No students found for this Moodle course.</p>
        ) : (
          <div className="table-wrapper">
            <table className="moodle-table">
              <thead>
                <tr>
                  <th>Moodle ID</th>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((student) => (
                  <tr key={student.id || student.username}>
                    <td><code>#{student.id}</code></td>
                    <td><strong>{student.username}</strong></td>
                    <td>{student.fullname}</td>
                    <td>{student.email}</td>
                    <td><span className="badge-enrolled">Enrolled</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodleIntegration;
