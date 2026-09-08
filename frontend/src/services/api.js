import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

export const getHealthStatus = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Dynamic QR APIs
export const generateQrToken = async (courseId = 'CS101') => {
  const response = await api.post('/attendance/qr/generate', null, {
    params: { courseId }
  });
  return response.data;
};

export const scanQrAttendance = async ({ studentId, courseId, qrToken }) => {
  const response = await api.post('/attendance/qr/scan', {
    studentId,
    courseId,
    qrToken
  });
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

// Moodle Integration APIs
export const getMoodleStatus = async () => {
  const response = await api.get('/moodle/status');
  return response.data;
};

export const getMoodleRoster = async (courseId = 'CS101') => {
  const response = await api.get('/moodle/roster', {
    params: { courseId }
  });
  return response.data;
};

export const importMoodleStudents = async (courseId = 'CS101') => {
  const response = await api.post('/moodle/roster/import', null, {
    params: { courseId }
  });
  return response.data;
};

export const syncMoodleAttendance = async (courseId = 'CS101') => {
  const response = await api.post(`/moodle/sync/${encodeURIComponent(courseId)}`);
  return response.data;
};

export default api;
