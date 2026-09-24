import axios from 'axios';

const getApiBaseUrl = () => {
  // In development, target the local backend unless configured otherwise
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
  }
  // In deployed production, use same-origin '/api' to route through the Netlify reverse proxy,
  // making authentication cookies first-party in all browsers.
  if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL !== 'https://smartattend-backend-64np.onrender.com/api') {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // Crucial for Spring Security HTTP session cookies (JSESSIONID)
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 75000 // 75 seconds to safely accommodate Render Free cold starts (30-50s)
});

// Authentication APIs (Spring Security Session)
export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
  const payload = { currentPassword, newPassword };
  if (confirmPassword !== undefined) {
    payload.confirmPassword = confirmPassword;
  }
  const response = await api.post('/auth/change-password', payload);
  return response.data;
};

export const resetPassword = async (username) => {
  const response = await api.post('/auth/reset-password', { username });
  return response.data;
};

export const createFaculty = async (facultyData) => {
  const response = await api.post('/auth/faculty', facultyData);
  return response.data;
};

export const getFacultyList = async () => {
  const response = await api.get('/auth/faculty');
  return response.data;
};

export const getHealthStatus = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Dynamic QR APIs
export const generateQrToken = async (courseId, sessionCode = null) => {
  const params = {};
  if (courseId) {
    params.courseId = courseId;
  }
  if (sessionCode) {
    params.sessionCode = sessionCode;
  }
  const response = await api.post('/attendance/qr/generate', null, { params });
  return response.data;
};

export const scanQrAttendance = async ({
  qrToken,
  courseId,
  sessionCode,
  deviceFingerprint,
  studentId // optional: for test tampering verification
}) => {
  const payload = {
    qrToken,
    courseId,
    sessionCode,
    deviceFingerprint
  };
  if (studentId) {
    payload.studentId = studentId;
  }
  const response = await api.post('/attendance/qr/scan', payload);
  return response.data;
};

// Course and Student APIs
export const getAllAttendance = async () => {
  const response = await api.get('/attendance');
  return response.data;
};

export const getCourseAttendance = async (courseId) => {
  const response = await api.get(`/attendance/course/${encodeURIComponent(courseId)}`);
  return response.data;
};

export const getCourseAttendanceSummary = async (courseId) => {
  const response = await api.get(`/attendance/course/${encodeURIComponent(courseId)}/summary`);
  return response.data;
};

export const getStudentAttendance = async (studentId) => {
  const response = await api.get(`/attendance/student/${encodeURIComponent(studentId)}`);
  return response.data;
};

export const getStudentAttendanceSummary = async (studentId) => {
  const response = await api.get(`/attendance/student/${encodeURIComponent(studentId)}/summary`);
  return response.data;
};

export const getStudentByStudentId = async (studentId) => {
  const response = await api.get(`/students/search/${encodeURIComponent(studentId)}`);
  return response.data;
};

export const getStudents = async () => {
  const response = await api.get('/students');
  return response.data;
};

export const createStudent = async (studentData) => {
  const response = await api.post('/students', studentData);
  return response.data;
};

export const getCourses = async () => {
  const response = await api.get('/courses');
  return response.data;
};

export const createCourse = async (courseData) => {
  const response = await api.post('/courses', courseData);
  return response.data;
};

// Admin APIs
export const getAdminOverview = async () => {
  const response = await api.get('/attendance/admin/overview');
  return response.data;
};

export const deleteStudent = async (id) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};

export const deleteCourse = async (id) => {
  const response = await api.delete(`/courses/${id}`);
  return response.data;
};

export const assignFacultyToCourse = async (courseId, facultyId, facultyName) => {
  const response = await api.post(`/courses/${encodeURIComponent(courseId)}/assign-faculty`, {
    facultyId,
    facultyName
  });
  return response.data;
};

export const removeFacultyFromCourse = async (courseId) => {
  const response = await api.delete(`/courses/${encodeURIComponent(courseId)}/assign-faculty`);
  return response.data;
};

// HOD APIs
export const getHodOverview = async () => {
  const response = await api.get('/attendance/hod/overview');
  return response.data;
};

// Moodle Integration APIs
export const getMoodleStatus = async () => {
  const response = await api.get('/moodle/status');
  return response.data;
};

export const getMoodleCourses = async () => {
  const response = await api.get('/moodle/courses');
  return response.data;
};

export const getMoodleRoster = async (courseId) => {
  const params = {};
  if (courseId) params.courseId = courseId;
  const response = await api.get('/moodle/roster', { params });
  return response.data;
};

export const importMoodleStudents = async (courseId) => {
  const params = {};
  if (courseId) params.courseId = courseId;
  const response = await api.post('/moodle/roster/import', null, { params });
  return response.data;
};

export const syncMoodleAttendance = async (courseId) => {
  if (!courseId) return { success: false, message: 'Course ID required' };
  const response = await api.post(`/moodle/sync/${encodeURIComponent(courseId)}`);
  return response.data;
};

// Moodle Assignment & Deadlines APIs
export const getMoodleAssignments = async (courseId, studentId) => {
  const response = await api.get('/moodle/assignments', {
    params: { courseId, studentId }
  });
  return response.data;
};

export const refreshMoodleAssignments = async (courseId, assignmentId, daysToExtend) => {
  const response = await api.post('/moodle/assignments/refresh', null, {
    params: { courseId, assignmentId, daysToExtend }
  });
  return response.data;
};

// Academic Peer Directory & Messaging APIs
export const getClassmates = async (studentId, courseId, batch) => {
  const response = await api.get('/students/classmates', {
    params: { studentId, courseId, batch }
  });
  return response.data;
};

export const getClassmateProfile = async (targetStudentId, studentId) => {
  const response = await api.get(`/students/classmates/${encodeURIComponent(targetStudentId)}/profile`, {
    params: { studentId }
  });
  return response.data;
};

export const sendClassmateMessage = async ({ senderStudentId, recipientStudentId, messageText, courseId }) => {
  const response = await api.post('/moodle/messages', {
    senderStudentId,
    recipientStudentId,
    messageText,
    courseId
  });
  return response.data;
};

export const getConversations = async (studentId) => {
  const response = await api.get('/moodle/conversations', {
    params: { studentId }
  });
  return response.data;
};

// Course update and queries
export const updateCourse = async (id, courseData) => {
  const response = await api.put(`/courses/${id}`, courseData);
  return response.data;
};

export const getCoursesForFaculty = async (facultyId) => {
  const response = await api.get(`/courses/faculty/${encodeURIComponent(facultyId)}`);
  return response.data;
};

export const getCoursesForStudent = async (studentId) => {
  const response = await api.get(`/courses/student/${encodeURIComponent(studentId)}`);
  return response.data;
};

// Student and Faculty Management
export const updateStudent = async (id, studentData) => {
  const response = await api.put(`/students/${id}`, studentData);
  return response.data;
};

export const updateFaculty = async (facultyId, facultyData) => {
  const response = await api.put(`/admin/users/faculty/${encodeURIComponent(facultyId)}`, facultyData);
  return response.data;
};

export const deleteFaculty = async (facultyId) => {
  const response = await api.delete(`/admin/users/faculty/${encodeURIComponent(facultyId)}`);
  return response.data;
};

export const deactivateUser = async (userId) => {
  const response = await api.delete(`/admin/users/${encodeURIComponent(userId)}`);
  return response.data;
};

// LMS APIs
export const getCourseResources = async (courseId) => {
  const response = await api.get(`/lms/resources/course/${encodeURIComponent(courseId)}`);
  return response.data;
};

export const createCourseResource = async (resourceData) => {
  const response = await api.post('/lms/resources', resourceData);
  return response.data;
};

export const deleteCourseResource = async (id) => {
  const response = await api.delete(`/lms/resources/${id}`);
  return response.data;
};

export const getCourseAssignments = async (courseId) => {
  const response = await api.get(`/lms/assignments/course/${encodeURIComponent(courseId)}`);
  return response.data;
};

export const createCourseAssignment = async (assignmentData) => {
  const response = await api.post('/lms/assignments', assignmentData);
  return response.data;
};

export const deleteCourseAssignment = async (id) => {
  const response = await api.delete(`/lms/assignments/${id}`);
  return response.data;
};

export const submitAssignment = async (submissionData) => {
  const response = await api.post('/lms/submissions', submissionData);
  return response.data;
};

export const getAssignmentSubmissions = async (assignmentId) => {
  const response = await api.get(`/lms/submissions/assignment/${assignmentId}`);
  return response.data;
};

export const getMySubmissions = async (studentId) => {
  const response = await api.get(`/lms/submissions/student/${encodeURIComponent(studentId)}`);
  return response.data;
};

export const getCourseAnnouncements = async (courseId) => {
  const response = await api.get(`/lms/announcements/course/${encodeURIComponent(courseId)}`);
  return response.data;
};

export const createCourseAnnouncement = async (announcementData) => {
  const response = await api.post('/lms/announcements', announcementData);
  return response.data;
};

// Class / Lecture Session APIs
export const getClasses = async (params) => {
  const response = await api.get('/classes', { params });
  return response.data;
};

export const createClass = async (classData) => {
  const response = await api.post('/classes', classData);
  return response.data;
};

export const getFacultyClasses = async (facultyId) => {
  const response = await api.get(`/classes/faculty/${encodeURIComponent(facultyId)}`);
  return response.data;
};

export const getStudentClasses = async (studentId) => {
  const response = await api.get(`/classes/student/${encodeURIComponent(studentId)}`);
  return response.data;
};

export const getClassByCode = async (sessionCode) => {
  const response = await api.get(`/classes/code/${encodeURIComponent(sessionCode)}`);
  return response.data;
};

export const toggleClassStatus = async (id, active) => {
  const response = await api.post(`/classes/${id}/status?active=${active}`);
  return response.data;
};

export const getClassAttendance = async (sessionCode) => {
  const response = await api.get(`/classes/${encodeURIComponent(sessionCode)}/attendance`);
  return response.data;
};

export const deleteClass = async (id) => {
  const response = await api.delete(`/classes/${id}`);
  return response.data;
};

// Peer Chat Thread
export const getMessageThread = async (studentId, peerId) => {
  const response = await api.get('/moodle/messages/thread', {
    params: { studentId, peerId }
  });
  return response.data;
};

// Defaulter List & Excel Export APIs
export const getDefaulterReport = async (params = {}) => {
  const response = await api.get('/attendance/defaulters', { params });
  return response.data;
};

export const exportDefaulterExcel = async (params = {}) => {
  const response = await api.get('/attendance/defaulters/export', {
    params,
    responseType: 'blob'
  });
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const courseStr = params.courseId ? params.courseId : 'All_Courses';
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `SmartAttend_Defaulter_List_${courseStr}_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  return true;
};

// Academic File Upload API (Multipart)
export const uploadLmsFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/lms/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// Global & Course Announcements
export const getAllAnnouncements = async (courseId = null) => {
  const params = {};
  if (courseId) params.courseId = courseId;
  const response = await api.get('/lms/announcements', { params });
  return response.data;
};

export const deleteAnnouncement = async (id) => {
  const response = await api.delete(`/lms/announcements/${id}`);
  return response.data;
};

// Authentic Binary File Download Helper (Requirement 2 & 14)
export const downloadLmsFile = async (fileUrl, preferredName) => {
  if (!fileUrl) throw new Error('File URL is required');
  const endpoint = fileUrl.startsWith('/api') ? fileUrl.substring(4) : (fileUrl.startsWith('http') ? fileUrl : `/lms/files/${fileUrl}`);
  const response = await api.get(endpoint, {
    responseType: 'blob'
  });
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/octet-stream'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  let downloadFilename = preferredName;
  if (!downloadFilename) {
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.indexOf('filename=') !== -1) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) downloadFilename = match[1];
    }
  }
  if (!downloadFilename) {
    downloadFilename = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
  }
  a.download = downloadFilename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  return true;
};

// Remove Student Submission (Requirement 3)
export const removeStudentSubmission = async (assignmentId) => {
  const response = await api.delete(`/lms/assignments/${assignmentId}/submission`);
  return response.data;
};

export default api;
