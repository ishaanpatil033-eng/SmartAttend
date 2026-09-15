import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMoodleStatus,
  getMoodleCourses,
  getMoodleRoster
} from '../services/api.js';

const MoodleIntegration = () => {
  const [courseId, setCourseId] = useState('');
  const [availableCourses, setAvailableCourses] = useState([]);
  const [moodleStatus, setMoodleStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');

  // 1. Fetch Moodle connection health & status
  const checkMoodleStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      setErrorMessage('');
      const status = await getMoodleStatus();
      setMoodleStatus(status);
    } catch (err) {
      setMoodleStatus({
        configured: false,
        liveConnection: false,
        message: 'Moodle service unreachable or unconfigured. Verify connection settings in application properties.'
      });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // 2. Discover available Moodle courses
  const discoverCourses = useCallback(async () => {
    try {
      setCoursesLoading(true);
      const courses = await getMoodleCourses();
      setAvailableCourses(courses || []);
      if (courses && courses.length > 0) {
        // If current courseId is not in the list, set to first available
        if (!courses.some((c) => c.shortname?.toUpperCase() === courseId?.toUpperCase())) {
          setCourseId(courses[0].shortname);
        }
      }
    } catch (err) {
      console.warn('Could not discover Moodle courses:', err);
    } finally {
      setCoursesLoading(false);
    }
  }, [courseId]);

  // 3. Fetch enrolled roster for the selected course
  const loadRoster = useCallback(async (targetCourseId) => {
    const courseToFetch = targetCourseId || courseId;
    if (!courseToFetch) return;

    try {
      setLoadingRoster(true);
      setErrorMessage('');
      const data = await getMoodleRoster(courseToFetch);
      setRoster(data || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch Moodle roster.';
      setErrorMessage(msg);
      setRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  }, [courseId]);

  // Initial load: check status and discover courses only
  useEffect(() => {
    checkMoodleStatus();
    discoverCourses();
  }, [checkMoodleStatus, discoverCourses]);



  // Active course title
  const activeCourseObj = availableCourses.find(
    (c) => c.shortname?.toUpperCase() === courseId?.toUpperCase()
  );
  const activeCourseName = activeCourseObj?.fullname || `Course ${courseId}`;

  // Filter roster by search term
  const filteredRoster = useMemo(() => {
    if (!rosterSearch.trim()) return roster;
    const q = rosterSearch.trim().toLowerCase();
    return roster.filter(
      (s) =>
        s.fullname?.toLowerCase().includes(q) ||
        s.username?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        String(s.id).includes(q)
    );
  }, [roster, rosterSearch]);

  return (
    <div className="moodle-page-wrapper">
      {/* 1. MOODLE WORKSPACE HEADER */}
      <div className="card moodle-welcome-header">
        <div className="moodle-header-top">
          <div className="moodle-header-title-block">
            <span className="eyebrow">Academic Portal &bull; LMS Integration</span>
            <h1 className="moodle-heading">Moodle LMS</h1>
            <p className="moodle-subheading">
              Connect SmartAttend with Moodle to discover courses, import student rosters, and synchronize attendance.
            </p>
          </div>

          <div className="moodle-header-actions">
            <button
              type="button"
              className="btn secondary-btn"
              onClick={() => {
                checkMoodleStatus();
                discoverCourses();
                loadRoster(courseId);
              }}
              disabled={statusLoading || coursesLoading}
              title="Refresh connection status and data"
            >
              {statusLoading ? 'Checking...' : '↻ Refresh Status'}
            </button>
            <div className="moodle-status-indicator">
              {statusLoading ? (
                <span className="pill pill-info">⏳ Checking Connection...</span>
              ) : moodleStatus?.liveConnection ? (
                <span className="pill pill-success">
                  🟢 Moodle Connected ({moodleStatus.sitename || 'LMS'})
                </span>
              ) : moodleStatus?.configured ? (
                <span className="pill pill-danger">🔴 Moodle Server Unreachable</span>
              ) : (
                <span className="pill pill-moodle">
                  ⚪ Moodle Configuration Pending
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Moodle Identity & Architecture Strip */}
        <div className="moodle-info-strip">
          <div className="moodle-avatar-badge">
            <span className="moodle-avatar-initial">M</span>
          </div>
          <div className="moodle-profile-details">
            <div className="moodle-name-row">
              <h2 className="moodle-role-title">Moodle 5.2.2+ REST Core Web Services</h2>
              <span className="pill pill-secondary">Official Protocol</span>
            </div>
            <div className="moodle-meta-chips-row">
              <span className="meta-chip">
                <span className="chip-label">Architecture:</span>
                <strong>React &rarr; Spring Boot &rarr; Moodle REST API</strong>
              </span>
              <span className="meta-chip">
                <span className="chip-label">Active Course:</span>
                <span>{courseId} &bull; {activeCourseName}</span>
              </span>
              <span className="meta-chip">
                <span className="chip-label">Roster:</span>
                <strong>{roster.length} Enrolled Students</strong>
              </span>
              <span className="meta-chip">
                <span className="chip-label">Gradebook Target:</span>
                <span>mod_attendance</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONNECTION DIAGNOSTICS BANNER */}
      {moodleStatus && (
        <div
          className={`moodle-status-callout ${
            moodleStatus.liveConnection ? 'status-callout-success' : 'status-callout-fallback'
          }`}
        >
          <div className="callout-icon-box">
            {moodleStatus.liveConnection ? '🌐' : '🛡️'}
          </div>
          <div className="callout-content">
            <div className="callout-title-row">
              <h4>
                {moodleStatus.liveConnection
                  ? `Live Moodle Instance Connected: ${moodleStatus.sitename || 'Institution LMS'}`
                  : moodleStatus.configured
                  ? 'Moodle Server Unreachable'
                  : 'Moodle Configuration Pending'}
              </h4>
              <span className="callout-badge">
                {moodleStatus.liveConnection ? 'Live Production API' : 'Moodle Integration Service'}
              </span>
            </div>
            <p className="callout-description">
              {moodleStatus.liveConnection
                ? `SmartAttend is securely communicating with ${moodleStatus.baseUrl || 'the Moodle server'} (Release: ${moodleStatus.version || '5.2.2+'}). Course discovery, student cohort imports, and Gradebook attendance sync are routed live.`
                : 'Moodle service integration is initialized. To discover courses and synchronize attendance with your institution LMS, verify that Moodle is running and configure valid credentials in application properties.'}
            </p>
            {moodleStatus.message && (
              <div className="callout-server-msg">
                <strong>Server Status:</strong> {moodleStatus.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. QUICK ACTIONS GRID (4 Actions) */}
      <div className="moodle-quick-actions-grid">
        {/* Action 1: Discover Courses */}
        <div className="card moodle-action-card">
          <div className="action-card-header">
            <div className="action-icon-circle">📚</div>
            <span className="pill pill-secondary">{availableCourses.length} Courses</span>
          </div>
          <h3 className="action-card-title">Discover Moodle Courses</h3>
          <p className="action-card-description">
            Query all curriculum modules and courses published on the Moodle learning management system.
          </p>
          <div className="action-card-footer">
            <button
              type="button"
              className="btn secondary-btn action-execute-btn"
              onClick={discoverCourses}
              disabled={coursesLoading}
            >
              {coursesLoading ? 'Querying...' : '🔍 Discover Courses'}
            </button>
          </div>
        </div>

        {/* Action 2: View Roster */}
        <div className="card moodle-action-card">
          <div className="action-card-header">
            <div className="action-icon-circle">👥</div>
            <span className="pill pill-info">{roster.length} Enrolled</span>
          </div>
          <h3 className="action-card-title">View Course Roster</h3>
          <p className="action-card-description">
            Fetch real-time enrolled student accounts and usernames for active course <strong>{courseId}</strong>.
          </p>
          <div className="action-card-footer">
            <button
              type="button"
              className="btn secondary-btn action-execute-btn"
              onClick={() => loadRoster(courseId)}
              disabled={loadingRoster}
            >
              {loadingRoster ? 'Loading...' : '🔄 Fetch Roster'}
            </button>
          </div>
        </div>

      </div>

      {/* 4. NOTIFICATION / FEEDBACK BANNERS */}
      {errorMessage && (
        <div className="alert info-alert moodle-feedback-banner">
          <div className="feedback-icon">ℹ️</div>
          <div className="feedback-body">
            <strong>Notice:</strong>{' '}
            {errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('offline') || errorMessage.toLowerCase().includes('database')
              ? 'Moodle course is not currently connected. Moodle learning content will appear here when a course is available.'
              : errorMessage}
          </div>
          <button
            type="button"
            className="btn-dismiss"
            onClick={() => setErrorMessage('')}
            title="Dismiss notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* 5. COURSE DISCOVERY & SELECTION SECTION */}
      <div className="card moodle-section-card">
        <div className="card-header">
          <div>
            <span className="eyebrow">Course Discovery</span>
            <h3 className="section-title-clean">Published Moodle Courses ({availableCourses.length})</h3>
          </div>
          <span className="pill pill-secondary">Source: core_course_get_courses</span>
        </div>

        <p className="section-instruction-text">
          Select a Moodle course to inspect its enrolled roster, import student profiles into SmartAttend MySQL, or push dynamic attendance records into its gradebook.
        </p>

        {coursesLoading ? (
          <div className="moodle-loading-placeholder">
            <div className="loading-spinner" />
            <p>Querying published courses from Moodle...</p>
          </div>
        ) : availableCourses.length === 0 ? (
          <div className="empty-state-box">
            <p>No courses discovered from Moodle.</p>
          </div>
        ) : (
          <div className="moodle-courses-grid">
            {availableCourses.map((c) => {
              const isSelected = c.shortname?.toUpperCase() === courseId?.toUpperCase();
              return (
                <div
                  key={c.id || c.shortname}
                  className={`moodle-course-card ${isSelected ? 'course-card-active' : ''}`}
                  onClick={() => setCourseId(c.shortname)}
                >
                  <div className="course-card-top">
                    <span className="course-id-chip">ID #{c.id || c.shortname}</span>
                    {isSelected ? (
                      <span className="pill pill-success">✓ Active Selection</span>
                    ) : (
                      <span className="pill pill-secondary">Select Course</span>
                    )}
                  </div>
                  <h4 className="course-card-name">{c.fullname || c.shortname}</h4>
                  <div className="course-card-meta">
                    <span className="meta-badge-code">Code: {c.shortname}</span>
                    {c.idnumber && (
                      <span className="meta-badge-id">ID Number: {c.idnumber}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. ENROLLED ROSTER VIEW SECTION */}
      <div className="card moodle-section-card">
        <div className="moodle-roster-header-row">
          <div>
            <span className="eyebrow">Student Roster</span>
            <h3 className="section-title-clean">
              Enrolled Students for {courseId} &bull; {activeCourseName} ({filteredRoster.length})
            </h3>
          </div>

          <div className="roster-search-bar">
            <input
              type="text"
              className="input-text moodle-roster-search-input"
              placeholder="Search by student name, ID, or email..."
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
            />
            {rosterSearch && (
              <button
                type="button"
                className="btn secondary-btn btn-sm"
                onClick={() => setRosterSearch('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <p className="section-instruction-text">
          Live student directory queried via <code>core_enrol_get_enrolled_users</code>. Click &quot;Import Cohort to MySQL&quot; to register new students in SmartAttend.
        </p>

        {loadingRoster ? (
          <div className="moodle-loading-placeholder">
            <div className="loading-spinner" />
            <p>Fetching enrolled student roster from Moodle...</p>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="empty-state-box">
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👥</div>
            <p className="no-data-text">
              {rosterSearch ? 'No enrolled students match your search filter.' : 'No enrolled students found for this Moodle course.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Moodle ID</th>
                  <th>Student ID</th>
                  <th>Student Full Name</th>
                  <th>Institutional Email</th>
                  <th>Enrolment Standing</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((student) => (
                  <tr key={student.id || student.username}>
                    <td>
                      <code className="moodle-id-code">#{student.id}</code>
                    </td>
                    <td>
                      <span className="student-username-tag">{student.username}</span>
                    </td>
                    <td>
                      <div className="student-profile-cell">
                        <div className="student-avatar-tiny">
                          {student.fullname ? student.fullname.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <span className="student-full-name">{student.fullname}</span>
                      </div>
                    </td>
                    <td>
                      <span className="student-email-link">{student.email}</span>
                    </td>
                    <td>
                      <span className="status-badge status-badge-success">
                        <span className="status-dot" /> Enrolled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. ARCHITECTURAL PIPELINE EXPLAINER */}
      <div className="card moodle-architecture-card">
        <div className="card-header">
          <div>
            <span className="eyebrow">Enterprise LMS Integration</span>
            <h3 className="section-title-clean">Secure Architecture &amp; Data Pipeline</h3>
          </div>
          <span className="pill pill-info">Security Verified</span>
        </div>

        <div className="architecture-pipeline-grid">
          <div className="pipeline-node">
            <div className="pipeline-node-number">01</div>
            <h4>React UI</h4>
            <p>Sends authenticated requests exclusively to local Spring Boot API endpoints. Never exposes Moodle tokens in the client browser.</p>
          </div>

          <div className="pipeline-arrow">&rarr;</div>

          <div className="pipeline-node">
            <div className="pipeline-node-number">02</div>
            <h4>Spring Boot Service</h4>
            <p>Manages backend REST communication, executes JPA database transactions, and safeguards institutional Moodle web service credentials.</p>
          </div>

          <div className="pipeline-arrow">&rarr;</div>

          <div className="pipeline-node">
            <div className="pipeline-node-number">03</div>
            <h4>Moodle 5.2.2+ Core</h4>
            <p>Processes official REST endpoints for site diagnostics, course catalogues, student rosters, and gradebook attendance records.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoodleIntegration;
