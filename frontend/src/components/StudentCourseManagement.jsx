import React, { useState, useEffect, useCallback } from 'react';
import {
  getStudents,
  createStudent,
  getCourses,
  createCourse,
  getAllAttendance
} from '../services/api.js';

const StudentCourseManagement = () => {
  const [subTab, setSubTab] = useState('attendance'); // 'attendance' | 'students' | 'courses'
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states for creating student
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');

  // Form states for creating course
  const [newCourseId, setNewCourseId] = useState('');
  const [newCourseName, setNewCourseName] = useState('');

  // Filter state for attendance records
  const [filterQuery, setFilterQuery] = useState('');

  // Load all students
  const loadStudents = useCallback(async () => {
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  }, []);

  // Load all courses
  const loadCourses = useCallback(async () => {
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, []);

  // Load all attendance records
  const loadAttendance = useCallback(async () => {
    try {
      const data = await getAllAttendance();
      setAttendanceRecords(data);
    } catch (err) {
      console.error('Failed to load attendance records:', err);
    }
  }, []);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await Promise.all([loadStudents(), loadCourses(), loadAttendance()]);
    } catch (err) {
      setErrorMsg('Could not fetch data from backend. Check if backend server is running.');
    } finally {
      setLoading(false);
    }
  }, [loadStudents, loadCourses, loadAttendance]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Create Student Handler
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newStudentId.trim() || !newStudentName.trim() || !newStudentEmail.trim()) {
      setErrorMsg('Please fill in all student fields.');
      return;
    }

    try {
      setLoading(true);
      await createStudent({
        studentId: newStudentId.trim().toUpperCase(),
        studentName: newStudentName.trim(),
        email: newStudentEmail.trim()
      });
      setSuccessMsg(`Student '${newStudentName}' added successfully.`);
      setNewStudentId('');
      setNewStudentName('');
      setNewStudentEmail('');
      await loadStudents();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to create student.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Create Course Handler
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newCourseId.trim() || !newCourseName.trim()) {
      setErrorMsg('Please fill in all course fields.');
      return;
    }

    try {
      setLoading(true);
      await createCourse({
        courseId: newCourseId.trim().toUpperCase(),
        courseName: newCourseName.trim()
      });
      setSuccessMsg(`Course '${newCourseName}' added successfully.`);
      setNewCourseId('');
      setNewCourseName('');
      await loadCourses();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to create course.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Filtered attendance records
  const filteredAttendance = attendanceRecords.filter((rec) => {
    if (!filterQuery.trim()) {
      return true;
    }
    const q = filterQuery.toLowerCase();
    const sId = rec.student?.studentId?.toLowerCase() || '';
    const sName = rec.student?.studentName?.toLowerCase() || '';
    const cId = rec.course?.courseId?.toLowerCase() || '';
    const cName = rec.course?.courseName?.toLowerCase() || '';
    const status = rec.attendanceStatus?.toLowerCase() || '';
    return (
      sId.includes(q) ||
      sName.includes(q) ||
      cId.includes(q) ||
      cName.includes(q) ||
      status.includes(q)
    );
  });

  return (
    <div className="card records-card">
      <div className="card-header">
        <div>
          <span className="eyebrow">Database Records & Management</span>
          <h2>Students, Classes & Attendance Records</h2>
        </div>
        <button
          type="button"
          className="btn secondary-btn"
          onClick={refreshAllData}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Records'}
        </button>
      </div>

      {successMsg && (
        <div className="alert success-alert">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="alert error-alert">
          {errorMsg}
        </div>
      )}

      {/* Sub Navigation */}
      <div className="tab-container" style={{ marginBottom: '20px' }}>
        <button
          type="button"
          className={`tab-button ${subTab === 'attendance' ? 'tab-active' : ''}`}
          onClick={() => {
            setSubTab('attendance');
            setErrorMsg('');
            setSuccessMsg('');
          }}
        >
          Attendance Logs ({attendanceRecords.length})
        </button>
        <button
          type="button"
          className={`tab-button ${subTab === 'students' ? 'tab-active' : ''}`}
          onClick={() => {
            setSubTab('students');
            setErrorMsg('');
            setSuccessMsg('');
          }}
        >
          Students ({students.length})
        </button>
        <button
          type="button"
          className={`tab-button ${subTab === 'courses' ? 'tab-active' : ''}`}
          onClick={() => {
            setSubTab('courses');
            setErrorMsg('');
            setSuccessMsg('');
          }}
        >
          Classes / Courses ({courses.length})
        </button>
      </div>

      {/* SubTab: Attendance Records */}
      {subTab === 'attendance' && (
        <div>
          <div className="form-row" style={{ marginBottom: '16px' }}>
            <label className="field-group" style={{ flex: 1 }}>
              <span className="field-label">Search Attendance Records:</span>
              <input
                type="text"
                className="input-text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search by student ID, name, or course ID..."
              />
            </label>
          </div>

          <div className="table-wrapper">
            <table className="moodle-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Course ID</th>
                  <th>Course Name</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                      No attendance records found. Scan a dynamic QR code to mark attendance.
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((rec) => (
                    <tr key={rec.id}>
                      <td>#{rec.id}</td>
                      <td><strong>{rec.student?.studentId}</strong></td>
                      <td>{rec.student?.studentName}</td>
                      <td>{rec.course?.courseId}</td>
                      <td>{rec.course?.courseName}</td>
                      <td>{rec.attendanceDate}</td>
                      <td>{rec.attendanceTime}</td>
                      <td>
                        <span className="badge-present">{rec.attendanceStatus}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab: Students */}
      {subTab === 'students' && (
        <div>
          <form onSubmit={handleCreateStudent} className="scanner-form" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px', color: 'var(--color-primary)' }}>Register New Student</h3>
            <div className="form-row">
              <label className="field-group">
                <span className="field-label">Student ID:</span>
                <input
                  type="text"
                  className="input-text"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  placeholder="e.g. STU102"
                  required
                />
              </label>
              <label className="field-group">
                <span className="field-label">Student Name:</span>
                <input
                  type="text"
                  className="input-text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </label>
              <label className="field-group">
                <span className="field-label">Email:</span>
                <input
                  type="email"
                  className="input-text"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="e.g. jane@smartattend.edu"
                  required
                />
              </label>
            </div>
            <button type="submit" className="btn primary-btn" disabled={loading}>
              {loading ? 'Adding...' : 'Add Student'}
            </button>
          </form>

          <div className="table-wrapper">
            <table className="moodle-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                      No students registered yet. Add a student using the form above.
                    </td>
                  </tr>
                ) : (
                  students.map((stu) => (
                    <tr key={stu.id}>
                      <td>#{stu.id}</td>
                      <td><strong>{stu.studentId}</strong></td>
                      <td>{stu.studentName}</td>
                      <td>{stu.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab: Classes / Courses */}
      {subTab === 'courses' && (
        <div>
          <form onSubmit={handleCreateCourse} className="scanner-form" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '12px', color: 'var(--color-primary)' }}>Register New Class / Course</h3>
            <div className="form-row">
              <label className="field-group">
                <span className="field-label">Course ID:</span>
                <input
                  type="text"
                  className="input-text"
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  placeholder="e.g. CS102"
                  required
                />
              </label>
              <label className="field-group">
                <span className="field-label">Course Name:</span>
                <input
                  type="text"
                  className="input-text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="e.g. Data Structures and Algorithms"
                  required
                />
              </label>
            </div>
            <button type="submit" className="btn primary-btn" disabled={loading}>
              {loading ? 'Adding...' : 'Add Course'}
            </button>
          </form>

          <div className="table-wrapper">
            <table className="moodle-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Course ID</th>
                  <th>Course Name</th>
                </tr>
              </thead>
              <tbody>
                {courses.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                      No courses registered yet. Add a course using the form above.
                    </td>
                  </tr>
                ) : (
                  courses.map((c) => (
                    <tr key={c.id}>
                      <td>#{c.id}</td>
                      <td><strong>{c.courseId}</strong></td>
                      <td>{c.courseName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCourseManagement;
