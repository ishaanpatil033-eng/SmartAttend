import React, { useState, useEffect, useCallback } from 'react';
import {
  getAdminOverview,
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  assignFacultyToCourse,
  removeFacultyFromCourse,
  resetPassword,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getFacultyList,
  createClass,
  getClasses,
  toggleClassStatus,
  getClassAttendance,
  deleteClass,
  getDefaulterReport,
  exportDefaulterExcel,
  getAllAnnouncements,
  createCourseAnnouncement,
  deleteAnnouncement,
  getCourseAssignments,
  createCourseAssignment,
  deleteCourseAssignment,
  getCourseResources,
  createCourseResource,
  deleteCourseResource
} from '../services/api.js';

const LOW_ATTENDANCE_THRESHOLD = 75.0;

const AdminDashboard = ({ currentUser, activeSubTab, onSubTabChange }) => {
  // Active administrative view: 'overview' | 'defaulters' | 'students' | 'courses' | 'classes' | 'records' | 'announcements' | 'faculty' | 'assignments' | 'experiments' | 'profile'
  const [internalTab, setInternalTab] = useState(activeSubTab || 'overview');
  const activeAdminTab = internalTab;

  useEffect(() => {
    if (activeSubTab && activeSubTab !== internalTab) {
      setInternalTab(activeSubTab);
    }
  }, [activeSubTab]);

  const setActiveAdminTab = (tab) => {
    setInternalTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  // Overview data from backend
  const [overviewData, setOverviewData] = useState(null);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Class / Lecture Sessions State (Authoritative Class = Session + Attendance)
  const [adminClasses, setAdminClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);
  const [newClassForm, setNewClassForm] = useState({
    courseId: '',
    lectureType: 'THEORY',
    academicYear: 'FE',
    division: 'A',
    batch: 'All',
    sessionDate: new Date().toISOString().split('T')[0],
    sessionTime: '09:00 AM',
    facultyId: '',
    totalStudents: 70
  });

  // Defaulter List state
  const [defaulterCourse, setDefaulterCourse] = useState('');
  const [defaulterDiv, setDefaulterDiv] = useState('All');
  const [defaulterBatch, setDefaulterBatch] = useState('All');
  const [defaulterThreshold, setDefaulterThreshold] = useState(75);
  const [realDefaulterList, setRealDefaulterList] = useState([]);
  const [realDefaulterLoading, setRealDefaulterLoading] = useState(false);
  const [exportingDefaulters, setExportingDefaulters] = useState(false);

  // Announcements state
  const [announcementsList, setAnnouncementsList] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnCourse, setNewAnnCourse] = useState('');
  const [newAnnDiv, setNewAnnDiv] = useState('All');
  const [newAnnBatch, setNewAnnBatch] = useState('All');
  const [creatingAnn, setCreatingAnn] = useState(false);

  // Session Attendance Attendees State
  const [viewingSessionAttendance, setViewingSessionAttendance] = useState(null);
  const [sessionAttendees, setSessionAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  // Multi-criteria report filters for Attendance Records
  const [recordsFilterCourse, setRecordsFilterCourse] = useState('');
  const [recordsFilterSession, setRecordsFilterSession] = useState('');
  const [recordsFilterDateFrom, setRecordsFilterDateFrom] = useState('');
  const [recordsFilterDateTo, setRecordsFilterDateTo] = useState('');

  // Form states for creating student
  const [newStudentId, setNewStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');

  // Form states for creating course
  const [newCourseId, setNewCourseId] = useState('');
  const [newCourseName, setNewCourseName] = useState('');

  // Academic structure states for student creation
  const [newStudentBranch, setNewStudentBranch] = useState('CS');
  const [newStudentDivision, setNewStudentDivision] = useState('A');
  const [newStudentBatch, setNewStudentBatch] = useState('A1');
  const [newStudentYear, setNewStudentYear] = useState('FE');
  const [newStudentSemester, setNewStudentSemester] = useState(1);

  // Academic structure states for course creation
  const [newCourseBranch, setNewCourseBranch] = useState('CS');
  const [newCourseDivision, setNewCourseDivision] = useState('A');
  const [newCourseBatch, setNewCourseBatch] = useState('A1');
  const [newCourseYear, setNewCourseYear] = useState('FE');
  const [newCourseSemester, setNewCourseSemester] = useState(1);
  const [newCourseType, setNewCourseType] = useState('THEORY');
  const [newCourseFacultyId, setNewCourseFacultyId] = useState('');

  // Course & Faculty Assignment State
  const [assignmentCourseId, setAssignmentCourseId] = useState('');
  const [assignmentFacultyId, setAssignmentFacultyId] = useState('');
  const [facultyAssigning, setFacultyAssigning] = useState(false);

  // Edit modal states
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);

  const getBatchesForDivision = (div) => {
    if (div === 'B') return ['B1', 'B2', 'B3'];
    if (div === 'C') return ['C1', 'C2', 'C3'];
    return ['A1', 'A2', 'A3'];
  };

  // Faculty state
  const [facultyList, setFacultyList] = useState([]);
  const [newFacultyId, setNewFacultyId] = useState('');
  const [newFacultyName, setNewFacultyName] = useState('');
  const [newFacultyEmail, setNewFacultyEmail] = useState('');
  const [facultySearchQuery, setFacultySearchQuery] = useState('');

  // Search/Filter states
  const [defaulterQuery, setDefaulterQuery] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const loadAdminClasses = useCallback(async () => {
    try {
      setClassesLoading(true);
      const list = await getClasses();
      setAdminClasses(list || []);
    } catch (err) {
      console.warn('Could not load classes:', err);
    } finally {
      setClassesLoading(false);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      setAnnouncementsLoading(true);
      const data = await getAllAnnouncements();
      setAnnouncementsList(data || []);
    } catch (err) {
      console.warn('Could not load announcements:', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  // Admin Assignments Management State
  const [adminAssignments, setAdminAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [selectedAssignCourse, setSelectedAssignCourse] = useState('All');
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [showCreateAssignModal, setShowCreateAssignModal] = useState(false);
  const [newAssignCourseId, setNewAssignCourseId] = useState('');
  const [newAssignTitle, setNewAssignTitle] = useState('');
  const [newAssignDesc, setNewAssignDesc] = useState('');
  const [newAssignDeadline, setNewAssignDeadline] = useState('');
  const [newAssignType, setNewAssignType] = useState('ASSIGNMENT');
  const [creatingAssign, setCreatingAssign] = useState(false);

  // Admin Experiments Management State
  const [adminExperiments, setAdminExperiments] = useState([]);
  const [experimentsLoading, setExperimentsLoading] = useState(false);
  const [selectedExpCourse, setSelectedExpCourse] = useState('All');
  const [expSearchQuery, setExpSearchQuery] = useState('');
  const [showCreateExpModal, setShowCreateExpModal] = useState(false);
  const [newExpCourseId, setNewExpCourseId] = useState('');
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpCategory, setNewExpCategory] = useState('EXPERIMENT');
  const [creatingExp, setCreatingExp] = useState(false);

  // Admin Learning Materials State
  const [adminMaterials, setAdminMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [selectedMatCourse, setSelectedMatCourse] = useState('All');
  const [matSearchQuery, setMatSearchQuery] = useState('');
  const [showCreateMatModal, setShowCreateMatModal] = useState(false);
  const [newMatCourseId, setNewMatCourseId] = useState('');
  const [newMatTitle, setNewMatTitle] = useState('');
  const [newMatDesc, setNewMatDesc] = useState('');
  const [newMatCategory, setNewMatCategory] = useState('LECTURE_NOTES');
  const [newMatLink, setNewMatLink] = useState('');
  const [creatingMat, setCreatingMat] = useState(false);

  // System Settings State
  const [settingsSavedMsg, setSettingsSavedMsg] = useState('');
  const [systemSettings, setSystemSettings] = useState({
    institutionName: 'SmartAttend Academic Institute',
    academicYear: '2025-2026',
    activeSemester: 'Semester 1 (Odd Term)',
    attendanceThreshold: 75,
    warningThreshold: 80,
    lateMarkToleranceMinutes: 10,
    dynamicQrCycleSeconds: 5,
    gpsGeofenceEnabled: true,
    gpsGeofenceRadiusMeters: 100,
    gpsToleranceMeters: 50,
    deviceBindingEnforced: true,
    autoDefaulterCalculation: true,
    moodleSyncIntervalHours: 6
  });

  const loadAdminAssignments = useCallback(async () => {
    try {
      setAssignmentsLoading(true);
      const activeCourses = courses && courses.length > 0 ? courses : await getCourses();
      if (!activeCourses || activeCourses.length === 0) {
        setAdminAssignments([]);
        return;
      }
      const allResults = await Promise.all(
        activeCourses.map(async (c) => {
          try {
            const list = await getCourseAssignments(c.courseId);
            return (list || []).map(item => ({ ...item, courseName: c.courseName }));
          } catch {
            return [];
          }
        })
      );
      setAdminAssignments(allResults.flat());
    } catch (err) {
      console.warn('Could not load assignments:', err);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [courses]);

  const loadAdminExperiments = useCallback(async () => {
    try {
      setExperimentsLoading(true);
      const activeCourses = courses && courses.length > 0 ? courses : await getCourses();
      if (!activeCourses || activeCourses.length === 0) {
        setAdminExperiments([]);
        return;
      }
      const allResults = await Promise.all(
        activeCourses.map(async (c) => {
          try {
            const list = await getCourseResources(c.courseId);
            return (list || [])
              .filter(item => item.category === 'EXPERIMENT' || item.category === 'LAB_MANUAL' || (item.title && item.title.toLowerCase().includes('exp')))
              .map(item => ({ ...item, courseName: c.courseName }));
          } catch {
            return [];
          }
        })
      );
      setAdminExperiments(allResults.flat());
    } catch (err) {
      console.warn('Could not load experiments:', err);
    } finally {
      setExperimentsLoading(false);
    }
  }, [courses]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssignCourseId || !newAssignTitle.trim()) {
      setErrorMsg('Course and assignment title are required.');
      return;
    }
    try {
      setCreatingAssign(true);
      await createCourseAssignment({
        courseId: newAssignCourseId,
        title: newAssignTitle.trim(),
        description: newAssignDesc.trim(),
        deadline: newAssignDeadline || null,
        type: newAssignType
      });
      setSuccessMsg(`Assignment "${newAssignTitle}" created successfully for ${newAssignCourseId}.`);
      setNewAssignTitle('');
      setNewAssignDesc('');
      setNewAssignDeadline('');
      setShowCreateAssignModal(false);
      await loadAdminAssignments();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to create assignment.');
    } finally {
      setCreatingAssign(false);
    }
  };

  const handleDeleteAssignment = async (id, title) => {
    if (!window.confirm(`Delete assignment "${title}"?`)) return;
    try {
      await deleteCourseAssignment(id);
      setSuccessMsg(`Assignment "${title}" deleted successfully.`);
      await loadAdminAssignments();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to delete assignment.');
    }
  };

  const handleCreateExperiment = async (e) => {
    e.preventDefault();
    if (!newExpCourseId || !newExpTitle.trim()) {
      setErrorMsg('Course and experiment title are required.');
      return;
    }
    try {
      setCreatingExp(true);
      await createCourseResource({
        courseId: newExpCourseId,
        title: newExpTitle.trim(),
        description: newExpDesc.trim(),
        category: newExpCategory
      });
      setSuccessMsg(`Experiment "${newExpTitle}" added successfully for ${newExpCourseId}.`);
      setNewExpTitle('');
      setNewExpDesc('');
      setShowCreateExpModal(false);
      await loadAdminExperiments();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to add experiment.');
    } finally {
      setCreatingExp(false);
    }
  };

  const handleDeleteExperiment = async (id, title) => {
    if (!window.confirm(`Delete experiment "${title}"?`)) return;
    try {
      await deleteCourseResource(id);
      setSuccessMsg(`Experiment "${title}" deleted successfully.`);
      await loadAdminExperiments();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to delete experiment.');
    }
  };

  const loadAdminMaterials = useCallback(async () => {
    try {
      setMaterialsLoading(true);
      const activeCourses = courses && courses.length > 0 ? courses : await getCourses();
      if (!activeCourses || activeCourses.length === 0) {
        setAdminMaterials([]);
        return;
      }
      const allResults = await Promise.all(
        activeCourses.map(async (c) => {
          try {
            const list = await getCourseResources(c.courseId);
            return (list || [])
              .filter(item => item.category !== 'EXPERIMENT' && item.category !== 'LAB_MANUAL')
              .map(item => ({ ...item, courseName: c.courseName }));
          } catch {
            return [];
          }
        })
      );
      setAdminMaterials(allResults.flat());
    } catch (err) {
      console.warn('Could not load materials:', err);
    } finally {
      setMaterialsLoading(false);
    }
  }, [courses]);

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    if (!newMatCourseId || !newMatTitle.trim()) {
      setErrorMsg('Course and material title are required.');
      return;
    }
    try {
      setCreatingMat(true);
      await createCourseResource({
        courseId: newMatCourseId,
        title: newMatTitle.trim(),
        description: newMatDesc.trim(),
        category: newMatCategory,
        resourceType: 'URL',
        linkUrl: newMatLink.trim() || 'https://moodle.org'
      });
      setSuccessMsg(`Material "${newMatTitle}" uploaded successfully for ${newMatCourseId}.`);
      setNewMatTitle('');
      setNewMatDesc('');
      setNewMatLink('');
      setShowCreateMatModal(false);
      await loadAdminMaterials();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to add material.');
    } finally {
      setCreatingMat(false);
    }
  };

  const handleDeleteMaterial = async (id, title) => {
    if (!window.confirm(`Delete material "${title}"?`)) return;
    try {
      await deleteCourseResource(id);
      setSuccessMsg(`Material "${title}" deleted successfully.`);
      await loadAdminMaterials();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to delete material.');
    }
  };

  const loadRealDefaulters = useCallback(async () => {
    try {
      setRealDefaulterLoading(true);
      const params = {
        threshold: parseFloat(defaulterThreshold) || 75.0
      };
      if (defaulterCourse && defaulterCourse.trim()) {
        params.courseId = defaulterCourse.trim();
      }
      if (defaulterDiv && defaulterDiv !== 'All') {
        params.division = defaulterDiv;
      }
      if (defaulterBatch && defaulterBatch !== 'All') {
        params.batch = defaulterBatch;
      }
      const data = await getDefaulterReport(params);
      setRealDefaulterList(data || []);
    } catch (err) {
      console.warn('Could not load defaulters report:', err);
      setRealDefaulterList([]);
    } finally {
      setRealDefaulterLoading(false);
    }
  }, [defaulterCourse, defaulterDiv, defaulterBatch, defaulterThreshold]);

  const handleExportDefaultersExcel = async () => {
    try {
      setExportingDefaulters(true);
      const params = {
        threshold: parseFloat(defaulterThreshold) || 75.0
      };
      if (defaulterCourse && defaulterCourse.trim()) {
        params.courseId = defaulterCourse.trim();
      }
      if (defaulterDiv && defaulterDiv !== 'All') {
        params.division = defaulterDiv;
      }
      if (defaulterBatch && defaulterBatch !== 'All') {
        params.batch = defaulterBatch;
      }
      const blob = await exportDefaulterExcel(params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SmartAttend_Defaulters_${defaulterCourse || 'All'}_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg('Could not export defaulter list to Excel.');
    } finally {
      setExportingDefaulters(false);
    }
  };

  const handleAdminCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassForm.courseId) {
      setErrorMsg('Please select a course for the class session.');
      return;
    }
    try {
      setCreatingClass(true);
      setErrorMsg('');
      const selectedCourse = courses.find((c) => c.courseId === newClassForm.courseId);
      const selectedFac = facultyList.find((f) => f.username === newClassForm.facultyId) ||
        (selectedCourse?.assignedFacultyId
          ? { username: selectedCourse.assignedFacultyId, fullName: selectedCourse.assignedFacultyName }
          : null);

      await createClass({
        courseId: newClassForm.courseId,
        lectureType: newClassForm.lectureType,
        academicYear: newClassForm.academicYear,
        division: newClassForm.division,
        batch: newClassForm.batch === 'All' ? null : newClassForm.batch,
        sessionDate: newClassForm.sessionDate,
        sessionTime: newClassForm.sessionTime,
        totalStudents: parseInt(newClassForm.totalStudents, 10) || 70,
        facultyId: selectedFac?.username || newClassForm.facultyId || currentUser?.username || '123456',
        facultyName: selectedFac?.fullName || selectedCourse?.assignedFacultyName || 'Prof. Faculty'
      });
      setSuccessMsg('✓ Class lecture session scheduled successfully!');
      setShowCreateClassModal(false);
      setNewClassForm({
        courseId: '',
        lectureType: 'THEORY',
        academicYear: 'FE',
        division: 'A',
        batch: 'All',
        sessionDate: new Date().toISOString().split('T')[0],
        sessionTime: '09:00 AM',
        facultyId: '',
        totalStudents: 70
      });
      await loadAdminClasses();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to create class session.');
    } finally {
      setCreatingClass(false);
    }
  };

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDateTimeStr(
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' • ' +
        now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateAdminAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    try {
      setCreatingAnn(true);
      await createCourseAnnouncement({
        courseId: newAnnCourse || (courses[0]?.courseId || 'ALL'),
        title: newAnnTitle.trim(),
        content: newAnnContent.trim(),
        authorName: 'Admin',
        targetDivision: newAnnDiv === 'All' ? null : newAnnDiv,
        targetBatch: newAnnBatch === 'All' ? null : newAnnBatch
      });
      setNewAnnTitle('');
      setNewAnnContent('');
      setSuccessMsg('✓ Announcement published successfully.');
      await loadAnnouncements();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to post announcement.');
    } finally {
      setCreatingAnn(false);
    }
  };

  const handleDeleteAdminAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      setSuccessMsg('✓ Announcement deleted.');
      await loadAnnouncements();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to delete announcement.');
    }
  };

  // Load all overview and management data from Spring Boot backend
  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [overview, studentList, courseList, faculties, classList] = await Promise.all([
        getAdminOverview(),
        getStudents(),
        getCourses(),
        getFacultyList().catch(() => []),
        getClasses().catch(() => [])
      ]);

      setOverviewData(overview);
      setStudents(studentList);
      setCourses(courseList);
      setFacultyList(faculties || []);
      setAdminClasses(classList || []);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load administrative overview.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
    loadAnnouncements();
    loadRealDefaulters();
  }, [loadAdminData, loadAnnouncements, loadRealDefaulters]);

  useEffect(() => {
    if (activeAdminTab === 'defaulters') {
      loadRealDefaulters();
    } else if (activeAdminTab === 'assignments') {
      loadAdminAssignments();
    } else if (activeAdminTab === 'experiments') {
      loadAdminExperiments();
    } else if (activeAdminTab === 'materials') {
      loadAdminMaterials();
    } else if (activeAdminTab === 'classes') {
      loadAdminClasses();
    }
  }, [activeAdminTab, loadRealDefaulters, loadAdminAssignments, loadAdminExperiments, loadAdminMaterials, loadAdminClasses]);

  const handleToggleClass = async (cls) => {
    try {
      await toggleClassStatus(cls.id, !cls.active);
      await loadAdminClasses();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Could not update session status.');
    }
  };

  const handleDeleteClass = async (id, sessionCode) => {
    if (!window.confirm(`Are you sure you want to delete session ${sessionCode}?`)) {
      return;
    }
    try {
      await deleteClass(id);
      setSuccessMsg('✓ Session deleted successfully.');
      await loadAdminClasses();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Could not delete session.');
    }
  };

  const handleViewSessionAttendance = async (cls) => {
    try {
      setViewingSessionAttendance(cls);
      setAttendeesLoading(true);
      const records = await getClassAttendance(cls.sessionCode);
      setSessionAttendees(records || []);
    } catch (err) {
      setSessionAttendees([]);
    } finally {
      setAttendeesLoading(false);
    }
  };

  // Handle student creation
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!newStudentId.trim() || !newStudentName.trim() || !newStudentEmail.trim()) {
      setErrorMsg('Please complete all student fields (Student ID, Name, and Email).');
      return;
    }
    if (!/^\d{8}$/.test(newStudentId.trim())) {
      setErrorMsg('Student ID must be exactly 8 numeric digits (e.g. 12345678).');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      await createStudent({
        studentId: newStudentId.trim(),
        studentName: newStudentName.trim(),
        name: newStudentName.trim(),
        email: newStudentEmail.trim(),
        branch: newStudentBranch,
        division: newStudentDivision,
        batch: newStudentBatch,
        academicYear: newStudentYear,
        semester: Number(newStudentSemester)
      });

      setSuccessMsg(`Student ${newStudentName.trim()} (${newStudentId.trim()}) registered successfully. Initial password has been generated.`);
      setNewStudentId('');
      setNewStudentName('');
      setNewStudentEmail('');
      await loadAdminData();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Could not register student.';
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle faculty creation
  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    if (!newFacultyId.trim() || !newFacultyName.trim() || !newFacultyEmail.trim()) {
      setErrorMsg('Please complete all faculty fields (Faculty ID, Full Name, and Email).');
      return;
    }
    if (!/^\d{6}$/.test(newFacultyId.trim())) {
      setErrorMsg('Faculty ID must be exactly 6 numeric digits (e.g. 123456).');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      await createFaculty({
        facultyId: newFacultyId.trim(),
        fullName: newFacultyName.trim(),
        email: newFacultyEmail.trim()
      });

      setSuccessMsg(`Faculty member ${newFacultyName.trim()} (${newFacultyId.trim()}) registered successfully. Initial password: ${newFacultyId.trim()}@edu`);
      setNewFacultyId('');
      setNewFacultyName('');
      setNewFacultyEmail('');
      await loadAdminData();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Could not register faculty.';
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle password reset for student or faculty
  const handleResetPassword = async (targetUsername, displayName) => {
    const confirmed = window.confirm(
      `Reset password for ${displayName || targetUsername}?\n\nTheir password will be reset to their default institutional pattern.`
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await resetPassword(targetUsername);
      setSuccessMsg(`Password for ${displayName || targetUsername} reset successfully! Temporary password: ${res.temporaryPassword}`);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to reset password.';
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle student deletion
  const handleDeleteStudent = async (id, studentName, studentId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this account? This action will remove the user\'s access to SmartAttend.'
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      await deleteStudent(id);
      setSuccessMsg(`Student "${studentName}" and related records were deleted successfully.`);
      await loadAdminData();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to delete student.';
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit student submission
  const handleUpdateStudentSubmit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      await updateStudent(editingStudent.id, {
        studentName: editingStudent.studentName,
        email: editingStudent.email,
        branch: editingStudent.branch,
        division: editingStudent.division,
        batch: editingStudent.batch,
        academicYear: editingStudent.academicYear,
        semester: Number(editingStudent.semester)
      });
      setSuccessMsg(`Student "${editingStudent.studentName}" updated successfully.`);
      setEditingStudent(null);
      await loadAdminData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to update student.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle faculty deletion
  const handleDeleteFaculty = async (facultyId, facultyName) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this account? This action will remove the user\'s access to SmartAttend.'
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      await deleteFaculty(facultyId);
      setSuccessMsg(`Faculty member "${facultyName || facultyId}" has been deleted.`);
      await loadAdminData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to delete faculty account.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit faculty submission
  const handleUpdateFacultySubmit = async (e) => {
    e.preventDefault();
    if (!editingFaculty) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      await updateFaculty(editingFaculty.username, {
        fullName: editingFaculty.fullName,
        email: editingFaculty.email
      });
      setSuccessMsg(`Faculty member "${editingFaculty.fullName}" updated successfully.`);
      setEditingFaculty(null);
      await loadAdminData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to update faculty.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit course submission
  const handleUpdateCourseSubmit = async (e) => {
    e.preventDefault();
    if (!editingCourse) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      const selectedFac = facultyList.find(f => f.username === editingCourse.assignedFacultyId);
      await updateCourse(editingCourse.id, {
        ...editingCourse,
        assignedFacultyName: selectedFac ? (selectedFac.fullName || selectedFac.username) : editingCourse.assignedFacultyName
      });
      setSuccessMsg(`Course "${editingCourse.courseName}" updated successfully.`);
      setEditingCourse(null);
      await loadAdminData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to update course.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle course creation
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourseId.trim() || !newCourseName.trim()) {
      setErrorMsg('Please enter both Course ID and Course Name.');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const selectedFac = facultyList.find(f => f.username === newCourseFacultyId);
      await createCourse({
        courseId: newCourseId.trim().toUpperCase(),
        courseName: newCourseName.trim(),
        branch: newCourseBranch,
        division: newCourseDivision,
        batch: newCourseBatch,
        academicYear: newCourseYear,
        semester: Number(newCourseSemester),
        courseType: newCourseType,
        assignedFacultyId: newCourseFacultyId || null,
        assignedFacultyName: selectedFac ? (selectedFac.fullName || selectedFac.username) : null
      });

      setSuccessMsg(`Course ${newCourseId.trim().toUpperCase()} registered successfully.`);
      setNewCourseId('');
      setNewCourseName('');
      await loadAdminData();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Could not register course.';
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle course deletion
  const handleDeleteCourse = async (id, courseName, courseId) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete course "${courseName}" (${courseId})?\n\nThis will also remove associated attendance records and dynamic QR tokens.`
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      await deleteCourse(id);
      setSuccessMsg(`Course "${courseName}" (${courseId}) and related records deleted successfully.`);
      await loadAdminData();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to delete course.';
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle assign or change faculty assignment
  const handleAssignFaculty = async (courseId, facultyId) => {
    if (!courseId) {
      setErrorMsg('Please select a course to assign.');
      return;
    }
    if (!facultyId) {
      setErrorMsg('Please select a faculty member.');
      return;
    }
    try {
      setFacultyAssigning(true);
      setErrorMsg('');
      setSuccessMsg('');
      const selectedFac = facultyList.find(f => f.username === facultyId);
      const facName = selectedFac ? (selectedFac.fullName || selectedFac.username) : facultyId;
      await assignFacultyToCourse(courseId, { facultyId, facultyName: facName });
      setSuccessMsg(`Faculty ${facName} (${facultyId}) assigned to Course ${courseId} successfully.`);
      setAssignmentCourseId('');
      setAssignmentFacultyId('');
      await loadAdminData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to assign faculty.');
    } finally {
      setFacultyAssigning(false);
    }
  };

  // Handle remove faculty assignment
  const handleRemoveFaculty = async (courseId, courseName) => {
    if (!window.confirm(`Remove assigned faculty from course "${courseName || courseId}"?`)) return;
    try {
      setFacultyAssigning(true);
      setErrorMsg('');
      setSuccessMsg('');
      await removeFacultyFromCourse(courseId);
      setSuccessMsg(`Faculty assignment removed from Course "${courseName || courseId}".`);
      await loadAdminData();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to remove faculty assignment.');
    } finally {
      setFacultyAssigning(false);
    }
  };

  // Helper to format timestamps
  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(ts);
    }
  };

  // Filtered Defaulters
  const filteredDefaulters = (overviewData?.defaulters || []).filter((item) => {
    const q = defaulterQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (item.studentId && item.studentId.toLowerCase().includes(q)) ||
      (item.studentName && item.studentName.toLowerCase().includes(q)) ||
      (item.email && item.email.toLowerCase().includes(q))
    );
  });

  // Filtered Students
  const filteredStudents = students.filter((st) => {
    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) return true;
    const name = st.studentName || st.name || '';
    return (
      (st.studentId && st.studentId.toLowerCase().includes(q)) ||
      name.toLowerCase().includes(q) ||
      (st.email && st.email.toLowerCase().includes(q))
    );
  });

  // Filtered Courses
  const filteredCourses = courses.filter((c) => {
    const q = courseSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.courseId && c.courseId.toLowerCase().includes(q)) ||
      (c.courseName && c.courseName.toLowerCase().includes(q))
    );
  });

  // Filtered Master History
  const filteredHistory = (overviewData?.recentAttendanceHistory || []).filter((rec) => {
    const q = historySearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (rec.studentId && rec.studentId.toLowerCase().includes(q)) ||
      (rec.studentName && rec.studentName.toLowerCase().includes(q)) ||
      (rec.courseId && rec.courseId.toLowerCase().includes(q)) ||
      (rec.courseName && rec.courseName.toLowerCase().includes(q)) ||
      (rec.timestamp && rec.timestamp.toLowerCase().includes(q))
    );
  });

  // Filtered Classes
  const filteredClasses = adminClasses.filter((cls) => {
    const q = classSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (cls.courseId && cls.courseId.toLowerCase().includes(q)) ||
      (cls.courseName && cls.courseName.toLowerCase().includes(q)) ||
      (cls.sessionCode && cls.sessionCode.toLowerCase().includes(q)) ||
      (cls.facultyName && cls.facultyName.toLowerCase().includes(q)) ||
      (cls.facultyId && cls.facultyId.toLowerCase().includes(q)) ||
      (cls.division && cls.division.toLowerCase().includes(q)) ||
      (cls.batch && cls.batch.toLowerCase().includes(q))
    );
  });

  const formatLiveTimestamp = () => {
    const d = new Date();
    const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${datePart} • ${timePart}`;
  };
  const [currentDateTimeStr, setCurrentDateTimeStr] = useState(formatLiveTimestamp());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTimeStr(formatLiveTimestamp());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="admin-dashboard-wrapper">
      {/* Alert Banners */}
      {errorMsg && (
        <div className="alert error-alert">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="alert success-alert">
          <strong>Success:</strong> {successMsg}
        </div>
      )}

      {/* TAB 1: SYSTEM OVERVIEW & KPIS (HOME ONLY) */}
      {activeAdminTab === 'overview' && (
        <div className="admin-tab-content">
          {/* 1. DASHBOARD PAGE HEADER (HOME ONLY) */}
          <div className="dashboard-page-header">
            <div className="dashboard-page-title-block">
              <h1 className="dashboard-page-title">Admin Dashboard</h1>
              <p className="dashboard-page-subtitle">
                Welcome back, <strong>{currentUser?.fullName || (sessionStorage.getItem('smartattend_role') === 'ADMIN' ? 'System Administrator' : (sessionStorage.getItem('smartattend_name') || 'System Administrator'))}</strong>! Here's your system overview.
              </p>
            </div>
            <div className="dashboard-page-meta">
              <div className="system-live-clock">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>{currentDateTimeStr}</span>
              </div>
            </div>
          </div>
          {/* 2. STAT CARDS GRID (Reference 4-Card Layout with Pastel Tints & Solid Color Badges) */}
          <div className="dashboard-stats-grid">
            {/* Total Courses */}
            <div className="stat-card stat-card-blue" onClick={() => setActiveAdminTab('courses')} role="button" tabIndex="0">
              <div className="stat-card-icon solid-blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  <path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"></path>
                </svg>
              </div>
              <div className="stat-card-body">
                <span className="stat-card-label">Total Courses</span>
                <div className="stat-card-value">{overviewData?.totalCourses ?? courses.length}</div>
                <div className="stat-card-meta">
                  <span className="stat-bullet bullet-blue"></span>
                  <span>Active courses in system</span>
                </div>
              </div>
              <div className="stat-card-arrow-right">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>

            {/* Total Students */}
            <div className="stat-card stat-card-green" onClick={() => setActiveAdminTab('students')} role="button" tabIndex="0">
              <div className="stat-card-icon solid-green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="stat-card-body">
                <span className="stat-card-label">Total Students</span>
                <div className="stat-card-value">{overviewData?.totalStudents ?? students.length}</div>
                <div className="stat-card-meta">
                  <span className="stat-bullet bullet-green"></span>
                  <span>Registered students</span>
                </div>
              </div>
              <div className="stat-card-arrow-right">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>

            {/* Total Faculty */}
            <div className="stat-card stat-card-purple" onClick={() => setActiveAdminTab('faculty')} role="button" tabIndex="0">
              <div className="stat-card-icon solid-purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <circle cx="19" cy="11" r="2"></circle>
                  <path d="M19 17v4"></path>
                </svg>
              </div>
              <div className="stat-card-body">
                <span className="stat-card-label">Total Faculty</span>
                <div className="stat-card-value">{facultyList.length}</div>
                <div className="stat-card-meta">
                  <span className="stat-bullet bullet-purple"></span>
                  <span>Assigned faculty members</span>
                </div>
              </div>
              <div className="stat-card-arrow-right">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>

            {/* Total Attendance Records */}
            <div className="stat-card stat-card-orange" onClick={() => setActiveAdminTab('records')} role="button" tabIndex="0">
              <div className="stat-card-icon solid-amber">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div className="stat-card-body">
                <span className="stat-card-label">Total Attendance Records</span>
                <div className="stat-card-value">{overviewData?.totalAttendanceRecords ?? 0}</div>
                <div className="stat-card-meta">
                  <span className="stat-bullet bullet-amber"></span>
                  <span>Today's attendance</span>
                </div>
              </div>
              <div className="stat-card-arrow-right">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>
            </div>
          </div>



          {/* Institutional Course Breakdown Table */}
          <div className="card admin-section-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Institutional Analytics</span>
                <h2 className="section-title-clean">Course Attendance Performance Summary</h2>
              </div>
              <span className="pill pill-info">
                {overviewData?.courseSummaries?.length || 0} Courses Tracked
              </span>
            </div>

            {overviewData?.courseSummaries && overviewData.courseSummaries.length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Course ID</th>
                      <th>Course Name</th>
                      <th>Enrolled Students</th>
                      <th>Conducted Sessions</th>
                      <th>Total Verified Scans</th>
                      <th>Average Attendance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.courseSummaries.map((c) => {
                      const avgPct = c.averageAttendancePercentage ?? 0;
                      const isLow = avgPct < LOW_ATTENDANCE_THRESHOLD && c.totalConductedSessions > 0;
                      return (
                        <tr key={c.courseId}>
                          <td><span className="course-code-badge">{c.courseId}</span></td>
                          <td><span className="course-title-cell">{c.courseName}</span></td>
                          <td>{c.enrolledStudentsCount} students</td>
                          <td>{c.totalConductedSessions} sessions</td>
                          <td>{c.totalAttendedRecords} scans</td>
                          <td style={{ minWidth: '160px' }}>
                            <div className="percentage-cell">
                              <span className="percentage-text" style={{
                                color: isLow ? '#b91c1c' : '#047857',
                                fontWeight: '700'
                              }}>
                                {avgPct.toFixed(1)}%
                              </span>
                              <div className="progress-track" style={{ height: '6px' }}>
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${Math.min(avgPct, 100)}%`,
                                    backgroundColor: isLow ? '#ef4444' : '#10b981'
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            {c.totalConductedSessions === 0 ? (
                              <span className="status-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                                No Sessions Yet
                              </span>
                            ) : isLow ? (
                              <span className="badge-low-attendance">
                                Low Attendance
                              </span>
                            ) : (
                              <span className="badge-good-attendance">
                                On Track
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No subjects created yet.</p>
                <p className="empty-state-hint">Use Course &amp; Faculty Assignment to register your first subject and assign faculty.</p>
                <button
                  type="button"
                  className="btn primary-btn"
                  style={{ marginTop: '12px' }}
                  onClick={() => setActiveAdminTab('courses')}
                >
                  + Add First Course
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEFAULTER LIST */}
      {activeAdminTab === 'defaulters' && (
        <div className="admin-tab-content">
          <div className="card admin-section-card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span className="eyebrow">Academic Compliance &bull; 75% Requirement</span>
                <h2 className="section-title-clean">Institutional Defaulter List</h2>
                <p className="table-caption-clean">
                  Calculated from authentic session attendance records. Students below {defaulterThreshold}% threshold are identified as Defaulters.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className={`pill ${realDefaulterList.filter(d => d.status === 'Defaulter').length > 0 ? 'pill-danger' : 'pill-success'}`}>
                  {realDefaulterList.filter(d => d.status === 'Defaulter').length} Defaulter(s)
                </span>
                <button
                  type="button"
                  className="btn primary-btn"
                  onClick={handleExportDefaultersExcel}
                  disabled={exportingDefaulters || realDefaulterList.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#15803d', borderColor: '#166534' }}
                >
                  <span>📥</span>
                  <span>{exportingDefaulters ? 'Generating Excel...' : 'Export Defaulter List (Excel .xlsx)'}</span>
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '0 20px 20px 20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Filter by Course</label>
                <select
                  className="input-text"
                  value={defaulterCourse}
                  onChange={(e) => setDefaulterCourse(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="">All Institutional Courses</option>
                  {courses.map(c => (
                    <option key={c.courseId} value={c.courseId}>{c.courseId} — {c.courseName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Division</label>
                <select
                  className="input-text"
                  value={defaulterDiv}
                  onChange={(e) => {
                    setDefaulterDiv(e.target.value);
                    setDefaulterBatch('All');
                  }}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="All">All Divisions</option>
                  <option value="A">Division A</option>
                  <option value="B">Division B</option>
                  <option value="C">Division C</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Batch</label>
                <select
                  className="input-text"
                  value={defaulterBatch}
                  onChange={(e) => setDefaulterBatch(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="All">All Batches</option>
                  {defaulterDiv === 'A' && ['A1', 'A2', 'A3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {defaulterDiv === 'B' && ['B1', 'B2', 'B3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {defaulterDiv === 'C' && ['C1', 'C2', 'C3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {defaulterDiv === 'All' && ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Threshold Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-text"
                  value={defaulterThreshold}
                  onChange={(e) => setDefaulterThreshold(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="btn secondary-btn"
                  onClick={loadRealDefaulters}
                  disabled={realDefaulterLoading}
                  style={{ width: '100%', padding: '8px' }}
                >
                  {realDefaulterLoading ? 'Computing...' : '↻ Apply Filters'}
                </button>
              </div>
            </div>

            {realDefaulterLoading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '12px', color: '#64748b' }}>Computing attendance records across all courses...</p>
              </div>
            ) : realDefaulterList.length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table defaulter-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Branch</th>
                      <th>Div / Batch</th>
                      <th>Course</th>
                      <th>Attended / Total</th>
                      <th>Absent</th>
                      <th>Attendance %</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realDefaulterList.map((d) => (
                      <tr key={`${d.studentId}-${d.courseId}`} style={{ backgroundColor: d.status === 'Defaulter' ? '#fff1f2' : 'transparent' }}>
                        <td>
                          <span className="record-id-chip" style={{ color: d.status === 'Defaulter' ? '#b91c1c' : '#15803d', fontWeight: '700' }}>
                            {d.studentId}
                          </span>
                        </td>
                        <td><strong>{d.studentName}</strong></td>
                        <td>{d.branch || '-'}</td>
                        <td>{d.division || '-'}{d.batch ? ` / ${d.batch}` : ''}</td>
                        <td><strong>{d.courseId}</strong> {d.courseName ? `— ${d.courseName}` : ''}</td>
                        <td>{d.presentClasses} / {d.totalClasses}</td>
                        <td>{d.absentClasses}</td>
                        <td>
                          <span style={{ color: d.status === 'Defaulter' ? '#b91c1c' : '#15803d', fontWeight: '800' }}>
                            {d.attendancePercentage ? d.attendancePercentage.toFixed(1) : '0.0'}%
                          </span>
                        </td>
                        <td>
                          <span className={`pill ${d.status === 'Defaulter' ? 'pill-danger' : 'pill-success'}`}>
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No defaulters found matching the selected filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeAdminTab === 'students' && (
        <div className="admin-tab-content">
          {/* Register New Student Form */}
          <div className="card admin-form-card">
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div>
                <span className="eyebrow">Enrollment Management</span>
                <h3 className="section-title-clean">Register New Student</h3>
                <p className="table-caption-clean">
                  Create student profile records in MySQL for dynamic QR attendance verification.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateStudent} className="admin-entity-form">
              <div className="form-field-col">
                <label className="field-label" htmlFor="adm-student-id">Student ID (8 numeric digits) *</label>
                <input
                  id="adm-student-id"
                  type="text"
                  placeholder="e.g. 12345678"
                  maxLength={8}
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                  required
                />
              </div>

              <div className="form-field-col">
                <label className="field-label" htmlFor="adm-student-name">Full Name *</label>
                <input
                  id="adm-student-name"
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                  required
                />
              </div>

              <div className="form-field-col">
                <label className="field-label" htmlFor="adm-student-email">Email Address *</label>
                <input
                  id="adm-student-email"
                  type="email"
                  placeholder="e.g. alex@institution.edu"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                  required
                />
              </div>

              <div className="form-field-col">
                <label className="field-label">Branch *</label>
                <select
                  value={newStudentBranch}
                  onChange={(e) => setNewStudentBranch(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                >
                  <option value="CS">Computer Science (CS)</option>
                  <option value="IT">Information Technology (IT)</option>
                  <option value="AIML">Artificial Intelligence & ML (AIML)</option>
                  <option value="DS">Data Science (DS)</option>
                  <option value="ME">Mechanical Engineering (ME)</option>
                  <option value="CE">Civil Engineering (CE)</option>
                </select>
              </div>

              <div className="form-field-col">
                <label className="field-label">Division *</label>
                <select
                  value={newStudentDivision}
                  onChange={(e) => {
                    const div = e.target.value;
                    setNewStudentDivision(div);
                    setNewStudentBatch(getBatchesForDivision(div)[0]);
                  }}
                  className="input-text"
                  disabled={actionLoading}
                >
                  <option value="A">Division A</option>
                  <option value="B">Division B</option>
                  <option value="C">Division C</option>
                </select>
              </div>

              <div className="form-field-col">
                <label className="field-label">Batch *</label>
                <select
                  value={newStudentBatch}
                  onChange={(e) => setNewStudentBatch(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                >
                  {getBatchesForDivision(newStudentDivision).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-col">
                <label className="field-label">Academic Year *</label>
                <select
                  value={newStudentYear}
                  onChange={(e) => setNewStudentYear(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                >
                  <option value="FE">First Year (FE)</option>
                  <option value="SE">Second Year (SE)</option>
                  <option value="TE">Third Year (TE)</option>
                  <option value="BE">Final Year (BE)</option>
                </select>
              </div>

              <div className="form-field-col">
                <label className="field-label">Semester *</label>
                <select
                  value={newStudentSemester}
                  onChange={(e) => setNewStudentSemester(Number(e.target.value))}
                  className="input-text"
                  disabled={actionLoading}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-btn-col">
                <button
                  type="submit"
                  className="btn primary-btn admin-submit-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : '➕ Register Student'}
                </button>
              </div>
            </form>
          </div>

          {/* Student Directory Table */}
          <div className="card admin-section-card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <div>
                <span className="eyebrow">Database Directory</span>
                <h3 className="section-title-clean">Registered Student Directory</h3>
                <p className="table-caption-clean">
                  Active student accounts registered in the database with record management controls.
                </p>
              </div>
              <span className="pill pill-info">
                {filteredStudents.length} Students Listed
              </span>
            </div>

            <div className="table-filter-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">&#128269;</span>
                <input
                  type="text"
                  placeholder="Search students by ID, Name, or Email..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="input-text admin-search-input"
                />
                {studentSearchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setStudentSearchQuery('')}
                    title="Clear filter"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {filteredStudents.length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Database ID</th>
                      <th>Student ID</th>
                      <th>Full Name</th>
                      <th>Email Address</th>
                      <th>Branch</th>
                      <th>Div / Batch</th>
                      <th>Year / Sem</th>
                      <th>Management Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((st) => {
                      const displayName = st.studentName || st.name || 'Unknown Student';
                      return (
                        <tr key={st.id}>
                          <td><span className="record-id-chip">#{st.id}</span></td>
                          <td><strong>{st.studentId}</strong></td>
                          <td><span className="student-name-cell">{displayName}</span></td>
                          <td><span className="email-text">{st.email}</span></td>
                          <td><span className="pill pill-info">{st.branch || 'CS'}</span></td>
                          <td>{st.division || 'A'} / {st.batch || 'A1'}</td>
                          <td>{st.academicYear || 'FE'} (Sem {st.semester || 1})</td>
                          <td>
                            <button
                              type="button"
                              className="btn secondary-btn"
                              onClick={() => setEditingStudent({
                                id: st.id,
                                studentId: st.studentId,
                                studentName: displayName,
                                email: st.email || '',
                                branch: st.branch || 'CS',
                                division: st.division || 'A',
                                batch: st.batch || 'A1',
                                academicYear: st.academicYear || 'FE',
                                semester: st.semester || 1
                              })}
                              disabled={actionLoading}
                              title={`Edit ${displayName}`}
                              style={{ marginRight: '8px', fontSize: '0.8rem', padding: '6px 12px' }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="btn secondary-btn"
                              onClick={() => handleResetPassword(st.studentId, displayName)}
                              disabled={actionLoading}
                              title={`Reset password for ${displayName}`}
                              style={{ marginRight: '8px', fontSize: '0.8rem', padding: '6px 12px' }}
                            >
                              🔄 Reset Password
                            </button>
                            <button
                              type="button"
                              className="btn danger-btn admin-delete-btn"
                              onClick={() => handleDeleteStudent(st.id, displayName, st.studentId)}
                              disabled={actionLoading}
                              title={`Delete ${displayName}`}
                            >
                              🗑️ Delete Student
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No students found matching your search filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: FACULTY MANAGEMENT */}
      {activeAdminTab === 'faculty' && (
        <div className="admin-tab-content">
          {/* Register New Faculty Form */}
          <div className="card admin-form-card">
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div>
                <span className="eyebrow">Instructor &amp; Faculty Administration</span>
                <h3 className="section-title-clean">Register New Faculty Account</h3>
                <p className="table-caption-clean">
                  Create faculty account in Spring Security &amp; MySQL. Initial password will be <code>&lt;faculty_id&gt;@edu</code>.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateFaculty} className="admin-entity-form">
              <div className="form-field-col">
                <label className="field-label" htmlFor="adm-faculty-id">Faculty ID (6 numeric digits) *</label>
                <input
                  id="adm-faculty-id"
                  type="text"
                  placeholder="e.g. 123456"
                  maxLength={6}
                  value={newFacultyId}
                  onChange={(e) => setNewFacultyId(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                  required
                />
              </div>

              <div className="form-field-col">
                <label className="field-label" htmlFor="adm-faculty-name">Full Name *</label>
                <input
                  id="adm-faculty-name"
                  type="text"
                  placeholder="e.g. Prof. Jane Doe"
                  value={newFacultyName}
                  onChange={(e) => setNewFacultyName(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                  required
                />
              </div>

              <div className="form-field-col">
                <label className="field-label" htmlFor="adm-faculty-email">Email Address *</label>
                <input
                  id="adm-faculty-email"
                  type="email"
                  placeholder="e.g. jane.doe@institution.edu"
                  value={newFacultyEmail}
                  onChange={(e) => setNewFacultyEmail(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                  required
                />
              </div>

              <div className="form-field-btn-col">
                <button
                  type="submit"
                  className="btn primary-btn admin-submit-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : '➕ Register Faculty'}
                </button>
              </div>
            </form>
          </div>

          {/* Faculty Directory Table */}
          <div className="card admin-section-card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <div>
                <span className="eyebrow">Faculty Directory</span>
                <h3 className="section-title-clean">Registered Faculty Directory</h3>
                <p className="table-caption-clean">
                  Faculty members authorized to broadcast attendance QR sessions and sync with Moodle.
                </p>
              </div>
              <span className="pill pill-info">
                {facultyList.length} Faculty Listed
              </span>
            </div>

            <div className="table-filter-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">&#128269;</span>
                <input
                  type="text"
                  placeholder="Search faculty by ID, Name, or Email..."
                  value={facultySearchQuery}
                  onChange={(e) => setFacultySearchQuery(e.target.value)}
                  className="input-text admin-search-input"
                />
                {facultySearchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setFacultySearchQuery('')}
                    title="Clear filter"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {facultyList.filter((f) => {
              const q = facultySearchQuery.trim().toLowerCase();
              if (!q) return true;
              return (
                (f.username || '').toLowerCase().includes(q) ||
                (f.fullName || '').toLowerCase().includes(q) ||
                (f.email || '').toLowerCase().includes(q)
              );
            }).length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Faculty ID</th>
                      <th>Full Name</th>
                      <th>Email Address</th>
                      <th>Role</th>
                      <th>Management Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyList
                      .filter((f) => {
                        const q = facultySearchQuery.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          (f.username || '').toLowerCase().includes(q) ||
                          (f.fullName || '').toLowerCase().includes(q) ||
                          (f.email || '').toLowerCase().includes(q)
                        );
                      })
                      .map((f) => (
                        <tr key={f.id || f.username}>
                          <td><strong>{f.username}</strong></td>
                          <td><span className="student-name-cell">{f.fullName || '-'}</span></td>
                          <td><span className="email-text">{f.email || '-'}</span></td>
                          <td><span className="pill pill-purple">{f.role}</span></td>
                          <td>
                            <button
                              type="button"
                              className="btn secondary-btn"
                              onClick={() => setEditingFaculty({
                                username: f.username,
                                fullName: f.fullName || '',
                                email: f.email || ''
                              })}
                              disabled={actionLoading}
                              title={`Edit ${f.fullName || f.username}`}
                              style={{ marginRight: '8px', fontSize: '0.8rem', padding: '6px 12px' }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              className="btn secondary-btn"
                              onClick={() => handleResetPassword(f.username, f.fullName)}
                              disabled={actionLoading}
                              title={`Reset password for ${f.fullName || f.username}`}
                              style={{ marginRight: '8px', fontSize: '0.8rem', padding: '6px 12px' }}
                            >
                              🔄 Reset Password
                            </button>
                            <button
                              type="button"
                              className="btn danger-btn admin-delete-btn"
                              onClick={() => handleDeleteFaculty(f.username, f.fullName)}
                              disabled={actionLoading}
                              title={`Delete ${f.fullName || f.username}`}
                            >
                              🗑️ Delete Faculty
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No faculty members found matching your search filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: COURSE MANAGEMENT */}
      {activeAdminTab === 'courses' && (
        <div className="admin-tab-content">
          {/* Register New Course Form */}
          <div className="card admin-form-card">
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div>
                <span className="eyebrow">Curriculum Setup</span>
                <h3 className="section-title-clean">Register New Course / Class</h3>
                <p className="table-caption-clean">
                  Add new subjects to enable dynamic QR attendance tracking and teacher session generation.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateCourse} className="admin-entity-form">
              <div className="form-field-col">
                <label className="field-label" htmlFor="adm-course-id">Course Code / ID *</label>
                <input
                  id="adm-course-id"
                  type="text"
                  placeholder="e.g. CS201"
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                  required
                />
              </div>

              <div className="form-field-col" style={{ flex: 2 }}>
                <label className="field-label" htmlFor="adm-course-name">Course Title / Name *</label>
                <input
                  id="adm-course-name"
                  type="text"
                  placeholder="e.g. Data Structures & Algorithms"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                  required
                />
              </div>

              <div className="form-field-col">
                <label className="field-label">Branch *</label>
                <select
                  value={newCourseBranch}
                  onChange={(e) => setNewCourseBranch(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                >
                  <option value="CS">Computer Science (CS)</option>
                  <option value="IT">Information Technology (IT)</option>
                  <option value="AIML">Artificial Intelligence & ML (AIML)</option>
                  <option value="DS">Data Science (DS)</option>
                  <option value="ME">Mechanical Engineering (ME)</option>
                  <option value="CE">Civil Engineering (CE)</option>
                </select>
              </div>

              <div className="form-field-col">
                <label className="field-label">Division *</label>
                <select
                  value={newCourseDivision}
                  onChange={(e) => {
                    const div = e.target.value;
                    setNewCourseDivision(div);
                    setNewCourseBatch(getBatchesForDivision(div)[0]);
                  }}
                  className="input-text"
                  disabled={actionLoading}
                >
                  <option value="A">Division A</option>
                  <option value="B">Division B</option>
                  <option value="C">Division C</option>
                </select>
              </div>

              <div className="form-field-col">
                <label className="field-label">Batch (for Labs) *</label>
                <select
                  value={newCourseBatch}
                  onChange={(e) => setNewCourseBatch(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                >
                  {getBatchesForDivision(newCourseDivision).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-col">
                <label className="field-label">Academic Year *</label>
                <select
                  value={newCourseYear}
                  onChange={(e) => setNewCourseYear(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                >
                  <option value="FE">First Year (FE)</option>
                  <option value="SE">Second Year (SE)</option>
                  <option value="TE">Third Year (TE)</option>
                  <option value="BE">Final Year (BE)</option>
                </select>
              </div>

              <div className="form-field-col">
                <label className="field-label">Semester *</label>
                <select
                  value={newCourseSemester}
                  onChange={(e) => setNewCourseSemester(Number(e.target.value))}
                  className="input-text"
                  disabled={actionLoading}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-col">
                <label className="field-label">Course Type *</label>
                <select
                  value={newCourseType}
                  onChange={(e) => setNewCourseType(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                >
                  <option value="THEORY">THEORY</option>
                  <option value="LAB">LAB / PRACTICAL</option>
                </select>
              </div>

              <div className="form-field-col">
                <label className="field-label">Assign Faculty</label>
                <select
                  value={newCourseFacultyId}
                  onChange={(e) => setNewCourseFacultyId(e.target.value)}
                  className="input-text"
                  disabled={actionLoading}
                >
                  <option value="">-- Unassigned --</option>
                  {facultyList.map(f => (
                    <option key={f.username} value={f.username}>
                      {f.fullName || f.username} ({f.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field-btn-col">
                <button
                  type="submit"
                  className="btn primary-btn admin-submit-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : '➕ Register Course'}
                </button>
              </div>
            </form>
          </div>

          {/* Card: Course & Faculty Assignment */}
          <div className="card admin-section-card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <div>
                <span className="eyebrow">Faculty Workload Allocation</span>
                <h3 className="section-title-clean">Course &amp; Faculty Assignment</h3>
                <p className="table-caption-clean">
                  Assign faculty to academic subjects, change assignments, or remove assignments. Persisted in MySQL.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAssignFaculty(assignmentCourseId, assignmentFacultyId);
              }}
              className="admin-form-row"
              style={{ marginTop: '16px' }}
            >
              <div className="form-field-col">
                <label className="field-label">Select Course / Subject *</label>
                <select
                  value={assignmentCourseId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setAssignmentCourseId(cId);
                    const matched = courses.find(c => c.courseId === cId);
                    if (matched && matched.assignedFacultyId) {
                      setAssignmentFacultyId(matched.assignedFacultyId);
                    }
                  }}
                  className="input-text"
                  disabled={facultyAssigning}
                >
                  <option value="">-- Choose Course / Subject --</option>
                  {courses.map(c => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.courseName} ({c.courseId}) {c.assignedFacultyName ? `— Assigned: ${c.assignedFacultyName}` : '— [Unassigned]'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field-col">
                <label className="field-label">Select Faculty Member *</label>
                <select
                  value={assignmentFacultyId}
                  onChange={(e) => setAssignmentFacultyId(e.target.value)}
                  className="input-text"
                  disabled={facultyAssigning}
                >
                  <option value="">-- Choose Faculty --</option>
                  {facultyList.map(f => (
                    <option key={f.username} value={f.username}>
                      {f.fullName || f.username} ({f.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field-btn-col" style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn primary-btn admin-submit-btn"
                  disabled={facultyAssigning || !assignmentCourseId || !assignmentFacultyId}
                >
                  {facultyAssigning ? 'Saving...' : '👤 Assign / Change Faculty'}
                </button>
                {assignmentCourseId && courses.find(c => c.courseId === assignmentCourseId)?.assignedFacultyId && (
                  <button
                    type="button"
                    className="btn secondary-btn"
                    onClick={() => {
                      const matched = courses.find(c => c.courseId === assignmentCourseId);
                      handleRemoveFaculty(assignmentCourseId, matched?.courseName);
                    }}
                    disabled={facultyAssigning}
                    style={{ backgroundColor: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}
                  >
                    ❌ Remove Assignment
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Course Directory Table */}
          <div className="card admin-section-card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <div>
                <span className="eyebrow">Curriculum Directory</span>
                <h3 className="section-title-clean">Academic Courses Directory</h3>
                <p className="table-caption-clean">
                  Active courses registered in MySQL with institutional deletion controls.
                </p>
              </div>
              <span className="pill pill-info">
                {filteredCourses.length} Courses Registered
              </span>
            </div>

            <div className="table-filter-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">&#128269;</span>
                <input
                  type="text"
                  placeholder="Search courses by Code or Title..."
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  className="input-text admin-search-input"
                />
                {courseSearchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setCourseSearchQuery('')}
                    title="Clear filter"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {filteredCourses.length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Database ID</th>
                      <th>Course Code</th>
                      <th>Course Title</th>
                      <th>Branch</th>
                      <th>Div / Batch</th>
                      <th>Type</th>
                      <th>Assigned Faculty</th>
                      <th>Management Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((c) => (
                      <tr key={c.id}>
                        <td><span className="record-id-chip">#{c.id}</span></td>
                        <td><span className="course-code-badge">{c.courseId}</span></td>
                        <td><span className="course-title-cell">{c.courseName}</span></td>
                        <td><span className="pill pill-info">{c.branch || 'CS'}</span></td>
                        <td>{c.division || 'A'} / {c.batch || 'A1'}</td>
                        <td><span className="pill pill-purple">{c.courseType || 'THEORY'}</span></td>
                        <td>
                          {c.assignedFacultyName ? (
                            <span className="pill pill-success">{c.assignedFacultyName} ({c.assignedFacultyId})</span>
                          ) : (
                            <span className="pill pill-warning" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          {!c.assignedFacultyId ? (
                            <button
                              type="button"
                              className="btn secondary-btn"
                              onClick={() => {
                                setAssignmentCourseId(c.courseId);
                                window.scrollTo({ top: 300, behavior: 'smooth' });
                              }}
                              disabled={actionLoading || facultyAssigning}
                              title={`Assign faculty to ${c.courseName}`}
                              style={{ marginRight: '6px', fontSize: '0.8rem', padding: '6px 10px' }}
                            >
                              👤 Assign Faculty
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn secondary-btn"
                                onClick={() => {
                                  setAssignmentCourseId(c.courseId);
                                  setAssignmentFacultyId(c.assignedFacultyId || '');
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                                disabled={actionLoading || facultyAssigning}
                                title={`Change faculty assignment for ${c.courseName}`}
                                style={{ marginRight: '6px', fontSize: '0.8rem', padding: '6px 10px' }}
                              >
                                🔄 Change
                              </button>
                              <button
                                type="button"
                                className="btn secondary-btn"
                                onClick={() => handleRemoveFaculty(c.courseId, c.courseName)}
                                disabled={actionLoading || facultyAssigning}
                                title={`Remove faculty assignment from ${c.courseName}`}
                                style={{ marginRight: '6px', fontSize: '0.8rem', padding: '6px 10px', color: '#b91c1c' }}
                              >
                                ❌ Remove
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="btn secondary-btn"
                            onClick={() => setEditingCourse({
                              id: c.id,
                              courseId: c.courseId,
                              courseName: c.courseName,
                              branch: c.branch || 'CS',
                              division: c.division || 'A',
                              batch: c.batch || 'A1',
                              academicYear: c.academicYear || 'FE',
                              semester: c.semester || 1,
                              courseType: c.courseType || 'THEORY',
                              assignedFacultyId: c.assignedFacultyId || ''
                            })}
                            disabled={actionLoading}
                            title={`Edit ${c.courseName}`}
                            style={{ marginRight: '6px', fontSize: '0.8rem', padding: '6px 10px' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn danger-btn admin-delete-btn"
                            onClick={() => handleDeleteCourse(c.id, c.courseName, c.courseId)}
                            disabled={actionLoading}
                            title={`Delete ${c.courseName}`}
                            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No courses found matching your search filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: CLASS / LECTURE SESSIONS */}
      {activeAdminTab === 'classes' && (
        <div className="admin-tab-content">
          <div className="card admin-section-card" style={{ marginBottom: '24px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="eyebrow">Academic Operations</span>
                <h2 className="section-title-clean">Class &amp; Lecture Session Management</h2>
                <p className="table-caption-clean">
                  Authoritative lecture and lab practical sessions. Dynamic QR attendance is generated and verified exclusively inside active sessions.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn primary-btn"
                  onClick={() => setShowCreateClassModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>+</span>
                  <span>Schedule Lecture Session</span>
                </button>
                <button
                  type="button"
                  className="btn secondary-btn"
                  onClick={loadAdminClasses}
                  disabled={classesLoading}
                >
                  {classesLoading ? 'Refreshing...' : '↻ Refresh Sessions'}
                </button>
              </div>
            </div>

            <div className="table-filter-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">&#128269;</span>
                <input
                  type="text"
                  placeholder="Search sessions by Course, Code, Faculty, Division..."
                  value={classSearchQuery}
                  onChange={(e) => setClassSearchQuery(e.target.value)}
                />
              </div>
              {classSearchQuery && (
                <button
                  type="button"
                  className="btn secondary-btn"
                  onClick={() => setClassSearchQuery('')}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Clear Filter
                </button>
              )}
            </div>

            {classesLoading ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '12px', color: '#64748b' }}>Loading class sessions...</p>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="empty-state-box">
                <p className="no-data-text">No class or lecture sessions match your query.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Session Code</th>
                      <th>Course</th>
                      <th>Type</th>
                      <th>Cohort</th>
                      <th>Assigned Faculty</th>
                      <th>Date &amp; Time</th>
                      <th>Attendance Marked</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClasses.map((cls) => {
                      const isActive = cls.active;
                      return (
                        <tr key={cls.id}>
                          <td><span className="record-id-chip">{cls.sessionCode}</span></td>
                          <td>
                            <strong>{cls.courseId}</strong>
                            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{cls.courseName}</div>
                          </td>
                          <td>
                            <span className={cls.lectureType === 'LAB' ? 'pill pill-purple' : 'pill pill-info'}>
                              {cls.lectureType === 'LAB' ? '🧪 Lab' : '📖 Theory'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{cls.academicYear || 'FE'}</span> — Div {cls.division || 'All'} • {cls.batch || 'All'}
                          </td>
                          <td>
                            {cls.facultyName || cls.facultyId || 'Unassigned'}
                            {cls.facultyId && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>ID: {cls.facultyId}</div>}
                          </td>
                          <td>
                            <div>{cls.sessionDate}</div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{cls.sessionTime}</div>
                          </td>
                          <td>
                            <span className="attendance-ratio-badge" style={{ display: 'inline-block' }}>
                              {cls.attendanceCount || 0} / {cls.totalStudents || 70}
                            </span>
                          </td>
                          <td>
                            <span className={`pill ${isActive ? 'pill-success' : 'pill-warning'}`}>
                              {isActive ? '● Active' : '○ Concluded'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className={`btn ${isActive ? 'secondary-btn' : 'primary-btn'}`}
                                style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                                onClick={() => handleToggleClass(cls)}
                                title={isActive ? 'Conclude attendance' : 'Activate attendance'}
                              >
                                {isActive ? 'Conclude' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                className="btn secondary-btn"
                                style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                                onClick={() => handleViewSessionAttendance(cls)}
                                title="View marked attendance roster"
                              >
                                👥 Roster
                              </button>
                              <button
                                type="button"
                                className="btn danger-btn"
                                style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                                onClick={() => handleDeleteClass(cls.id, cls.sessionCode)}
                                title="Delete session"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: MASTER HISTORY LOGS */}
      {activeAdminTab === 'records' && (
        <div className="admin-tab-content">
          <div className="card admin-section-card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Institutional Audit Log</span>
                <h2 className="section-title-clean">Master Attendance History Log</h2>
                <p className="table-caption-clean">
                  Real-time chronological audit trail of all verified dynamic QR attendance scans across the institution.
                </p>
              </div>
              <span className="pill pill-info">
                {filteredHistory.length} Scanned Records
              </span>
            </div>

            {/* Multi-Criteria Filter Bar */}
            <div className="table-filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="search-input-wrapper" style={{ flex: 2, minWidth: '220px' }}>
                  <span className="search-icon">&#128269;</span>
                  <input
                    type="text"
                    placeholder="Search by Student ID, name, course or status..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="input-text admin-search-input"
                  />
                  {historySearchQuery && (
                    <button
                      type="button"
                      className="clear-search-btn"
                      onClick={() => setHistorySearchQuery('')}
                      title="Clear text filter"
                    >
                      &times;
                    </button>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: '160px' }}>
                  <select
                    className="input-text"
                    value={recordsFilterCourse}
                    onChange={(e) => setRecordsFilterCourse(e.target.value)}
                    title="Filter by Course"
                  >
                    <option value="">All Courses</option>
                    {courses.map(c => (
                      <option key={c.id || c.courseId} value={c.courseId}>
                        {c.courseId} - {c.courseName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: '150px' }}>
                  <input
                    type="text"
                    placeholder="Filter Session Code..."
                    value={recordsFilterSession}
                    onChange={(e) => setRecordsFilterSession(e.target.value)}
                    className="input-text"
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={recordsFilterDateFrom}
                    onChange={(e) => setRecordsFilterDateFrom(e.target.value)}
                    className="input-text"
                    title="From Date"
                    style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                  />
                  <span style={{ color: '#94a3b8' }}>-</span>
                  <input
                    type="date"
                    value={recordsFilterDateTo}
                    onChange={(e) => setRecordsFilterDateTo(e.target.value)}
                    className="input-text"
                    title="To Date"
                    style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                  />
                </div>

                {(recordsFilterCourse || recordsFilterSession || recordsFilterDateFrom || recordsFilterDateTo) && (
                  <button
                    type="button"
                    className="btn secondary-btn"
                    onClick={() => {
                      setRecordsFilterCourse('');
                      setRecordsFilterSession('');
                      setRecordsFilterDateFrom('');
                      setRecordsFilterDateTo('');
                    }}
                    style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {filteredHistory.length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Record ID</th>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Course</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                      <th>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((rec) => (
                      <tr key={rec.id}>
                        <td><span className="record-id-chip">#{rec.id}</span></td>
                        <td><strong>{rec.studentId}</strong></td>
                        <td>{rec.studentName}</td>
                        <td>
                          <span className="course-code-badge">{rec.courseId}</span>
                          {rec.courseName && <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '0.84rem' }}>{rec.courseName}</span>}
                        </td>
                        <td>{formatTimestamp(rec.timestamp)}</td>
                        <td>
                          <span className="badge-present">
                            <span className="status-dot"></span>
                            {rec.status || 'PRESENT'}
                          </span>
                        </td>
                        <td>
                          <span className="method-pill">5s Dynamic QR</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No attendance records recorded yet.</p>
                <p className="empty-state-hint">Records will stream here in real time as students scan live teacher dynamic QR sessions.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '520px', width: '90%', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--color-navy)' }}>Edit Student Details ({editingStudent.studentId})</h3>
            <form onSubmit={handleUpdateStudentSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  className="input-text"
                  value={editingStudent.studentName}
                  onChange={(e) => setEditingStudent({ ...editingStudent, studentName: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  className="input-text"
                  value={editingStudent.email}
                  onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Branch</label>
                  <select
                    className="input-text"
                    value={editingStudent.branch}
                    onChange={(e) => setEditingStudent({ ...editingStudent, branch: e.target.value })}
                  >
                    <option value="CS">CS</option>
                    <option value="IT">IT</option>
                    <option value="AIML">AIML</option>
                    <option value="DS">DS</option>
                    <option value="ME">ME</option>
                    <option value="CE">CE</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Division</label>
                  <select
                    className="input-text"
                    value={editingStudent.division}
                    onChange={(e) => {
                      const div = e.target.value;
                      const validBatches = getBatchesForDivision(div);
                      setEditingStudent({ ...editingStudent, division: div, batch: validBatches[0] });
                    }}
                  >
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                    <option value="C">Division C</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Batch</label>
                  <select
                    className="input-text"
                    value={editingStudent.batch}
                    onChange={(e) => setEditingStudent({ ...editingStudent, batch: e.target.value })}
                  >
                    {getBatchesForDivision(editingStudent.division).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Year</label>
                  <select
                    className="input-text"
                    value={editingStudent.academicYear}
                    onChange={(e) => setEditingStudent({ ...editingStudent, academicYear: e.target.value })}
                  >
                    <option value="FE">FE</option>
                    <option value="SE">SE</option>
                    <option value="TE">TE</option>
                    <option value="BE">BE</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Sem</label>
                  <select
                    className="input-text"
                    value={editingStudent.semester}
                    onChange={(e) => setEditingStudent({ ...editingStudent, semester: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn secondary-btn" onClick={() => setEditingStudent(null)}>Cancel</button>
                <button type="submit" className="btn primary-btn" disabled={actionLoading}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FACULTY MODAL */}
      {editingFaculty && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px', width: '90%', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--color-navy)' }}>Edit Faculty ({editingFaculty.username})</h3>
            <form onSubmit={handleUpdateFacultySubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  className="input-text"
                  value={editingFaculty.fullName}
                  onChange={(e) => setEditingFaculty({ ...editingFaculty, fullName: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  className="input-text"
                  value={editingFaculty.email}
                  onChange={(e) => setEditingFaculty({ ...editingFaculty, email: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn secondary-btn" onClick={() => setEditingFaculty(null)}>Cancel</button>
                <button type="submit" className="btn primary-btn" disabled={actionLoading}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COURSE MODAL */}
      {editingCourse && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '560px', width: '90%', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--color-navy)' }}>Edit Course ({editingCourse.courseId})</h3>
            <form onSubmit={handleUpdateCourseSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Course Title</label>
                <input
                  type="text"
                  className="input-text"
                  value={editingCourse.courseName}
                  onChange={(e) => setEditingCourse({ ...editingCourse, courseName: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Branch</label>
                  <select
                    className="input-text"
                    value={editingCourse.branch}
                    onChange={(e) => setEditingCourse({ ...editingCourse, branch: e.target.value })}
                  >
                    <option value="CS">CS</option>
                    <option value="IT">IT</option>
                    <option value="AIML">AIML</option>
                    <option value="DS">DS</option>
                    <option value="ME">ME</option>
                    <option value="CE">CE</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Division</label>
                  <select
                    className="input-text"
                    value={editingCourse.division}
                    onChange={(e) => {
                      const div = e.target.value;
                      const validBatches = getBatchesForDivision(div);
                      setEditingCourse({ ...editingCourse, division: div, batch: validBatches[0] });
                    }}
                  >
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                    <option value="C">Division C</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Batch</label>
                  <select
                    className="input-text"
                    value={editingCourse.batch}
                    onChange={(e) => setEditingCourse({ ...editingCourse, batch: e.target.value })}
                  >
                    {getBatchesForDivision(editingCourse.division).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Type</label>
                  <select
                    className="input-text"
                    value={editingCourse.courseType}
                    onChange={(e) => setEditingCourse({ ...editingCourse, courseType: e.target.value })}
                  >
                    <option value="THEORY">THEORY</option>
                    <option value="LAB">LAB</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Semester</label>
                  <select
                    className="input-text"
                    value={editingCourse.semester}
                    onChange={(e) => setEditingCourse({ ...editingCourse, semester: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Sem {s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Assigned Faculty</label>
                <select
                  className="input-text"
                  value={editingCourse.assignedFacultyId || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, assignedFacultyId: e.target.value })}
                >
                  <option value="">-- Unassigned --</option>
                  {facultyList.map(f => (
                    <option key={f.username} value={f.username}>
                      {f.fullName || f.username} ({f.username})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn secondary-btn" onClick={() => setEditingCourse(null)}>Cancel</button>
                <button type="submit" className="btn primary-btn" disabled={actionLoading}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: VIEW SESSION ATTENDANCE ATTENDEES */}
      {viewingSessionAttendance && (
        <div className="modal-overlay" onClick={() => setViewingSessionAttendance(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Session Attendance Roster</span>
                <h3 style={{ margin: '4px 0 0 0', color: '#0f172a' }}>
                  {viewingSessionAttendance.courseName} ({viewingSessionAttendance.sessionCode})
                </h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setViewingSessionAttendance(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {attendeesLoading ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div className="spinner"></div>
                  <p style={{ marginTop: '8px', color: '#64748b' }}>Loading attendees...</p>
                </div>
              ) : sessionAttendees.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '32px 0' }}>
                  No students have marked attendance for this session yet.
                </p>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Student ID</th>
                        <th>Student Name</th>
                        <th>Status</th>
                        <th>Marked Time</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionAttendees.map((rec, idx) => (
                        <tr key={idx}>
                          <td><strong>{rec.student?.studentId || rec.studentId}</strong></td>
                          <td>{rec.student?.studentName || '-'}</td>
                          <td>
                            <span className="pill pill-success">PRESENT</span>
                          </td>
                          <td>{rec.attendanceTime || '-'}</td>
                          <td>{rec.attendanceDate || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN CREATE CLASS / LECTURE MODAL */}
      {showCreateClassModal && (
        <div className="modal-overlay" onClick={() => setShowCreateClassModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">Academic Scheduling</span>
                <h3 style={{ margin: '4px 0 0 0', color: '#0f172a' }}>Schedule New Lecture Session</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCreateClassModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAdminCreateClass} className="modal-body">
              <div className="form-field-col" style={{ marginBottom: '14px' }}>
                <label className="field-label">Target Course / Subject *</label>
                <select
                  className="input-select"
                  value={newClassForm.courseId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const c = courses.find((x) => x.courseId === cid);
                    setNewClassForm({
                      ...newClassForm,
                      courseId: cid,
                      academicYear: c?.academicYear || newClassForm.academicYear,
                      division: c?.division || newClassForm.division,
                      facultyId: c?.assignedFacultyId || newClassForm.facultyId
                    });
                  }}
                  required
                >
                  <option value="">-- Select Course --</option>
                  {courses.map((c) => (
                    <option key={c.id || c.courseId} value={c.courseId}>
                      {c.courseId} — {c.courseName} ({c.academicYear || 'FE'} Div {c.division || 'A'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-field-col">
                  <label className="field-label">Lecture Type</label>
                  <select
                    className="input-select"
                    value={newClassForm.lectureType}
                    onChange={(e) => setNewClassForm({ ...newClassForm, lectureType: e.target.value })}
                  >
                    <option value="THEORY">Theory Lecture (Classroom)</option>
                    <option value="LAB">Lab Practical (Laboratory)</option>
                  </select>
                </div>
                <div className="form-field-col">
                  <label className="field-label">Assigned Faculty / Instructor</label>
                  <select
                    className="input-select"
                    value={newClassForm.facultyId}
                    onChange={(e) => setNewClassForm({ ...newClassForm, facultyId: e.target.value })}
                  >
                    <option value="">-- Course Assigned Faculty (Default) --</option>
                    {facultyList.map((f) => (
                      <option key={f.username} value={f.username}>
                        {f.fullName} ({f.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-field-col">
                  <label className="field-label">Year</label>
                  <select
                    className="input-select"
                    value={newClassForm.academicYear}
                    onChange={(e) => setNewClassForm({ ...newClassForm, academicYear: e.target.value })}
                  >
                    <option value="FE">First Year (FE)</option>
                    <option value="SE">Second Year (SE)</option>
                    <option value="TE">Third Year (TE)</option>
                    <option value="BE">Final Year (BE)</option>
                  </select>
                </div>
                <div className="form-field-col">
                  <label className="field-label">Division</label>
                  <select
                    className="input-select"
                    value={newClassForm.division}
                    onChange={(e) => setNewClassForm({ ...newClassForm, division: e.target.value })}
                  >
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                    <option value="C">Division C</option>
                  </select>
                </div>
                <div className="form-field-col">
                  <label className="field-label">Batch</label>
                  <select
                    className="input-select"
                    value={newClassForm.batch}
                    onChange={(e) => setNewClassForm({ ...newClassForm, batch: e.target.value })}
                  >
                    <option value="All">All Batches (Theory)</option>
                    <option value={`${newClassForm.division}1`}>{newClassForm.division}1</option>
                    <option value={`${newClassForm.division}2`}>{newClassForm.division}2</option>
                    <option value={`${newClassForm.division}3`}>{newClassForm.division}3</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-field-col">
                  <label className="field-label">Session Date</label>
                  <input
                    type="date"
                    className="input-text"
                    value={newClassForm.sessionDate}
                    onChange={(e) => setNewClassForm({ ...newClassForm, sessionDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field-col">
                  <label className="field-label">Session Time</label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="e.g. 09:00 AM"
                    value={newClassForm.sessionTime}
                    onChange={(e) => setNewClassForm({ ...newClassForm, sessionTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn secondary-btn"
                  onClick={() => setShowCreateClassModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary-btn"
                  disabled={creatingClass}
                >
                  {creatingClass ? 'Scheduling...' : '✓ Schedule Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: ANNOUNCEMENTS */}
      {activeAdminTab === 'announcements' && (
        <div className="admin-tab-content">
          <div className="card admin-form-card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ marginBottom: '14px' }}>
              <div>
                <span className="eyebrow">Institutional Broadcasts</span>
                <h3 className="section-title-clean">Publish College Announcement</h3>
                <p className="table-caption-clean">Send notices, holiday alerts, exam schedules, or circulars across campus.</p>
              </div>
            </div>
            <form onSubmit={handleCreateAdminAnnouncement} className="admin-entity-form">
              <div className="form-field-col">
                <label className="field-label">Headline / Title *</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. End Semester Exam Timetable Announcement"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-field-col">
                <label className="field-label">Target Course (or Institutional)</label>
                <select
                  className="input-text"
                  value={newAnnCourse}
                  onChange={(e) => setNewAnnCourse(e.target.value)}
                >
                  <option value="">All Institutional Courses (Global)</option>
                  {courses.map(c => (
                    <option key={c.courseId} value={c.courseId}>{c.courseId} — {c.courseName}</option>
                  ))}
                </select>
              </div>
              <div className="form-field-col">
                <label className="field-label">Division</label>
                <select
                  className="input-text"
                  value={newAnnDiv}
                  onChange={(e) => {
                    setNewAnnDiv(e.target.value);
                    setNewAnnBatch('All');
                  }}
                >
                  <option value="All">All Divisions</option>
                  <option value="A">Division A</option>
                  <option value="B">Division B</option>
                  <option value="C">Division C</option>
                </select>
              </div>
              <div className="form-field-col">
                <label className="field-label">Batch</label>
                <select
                  className="input-text"
                  value={newAnnBatch}
                  onChange={(e) => setNewAnnBatch(e.target.value)}
                >
                  <option value="All">All Batches</option>
                  {newAnnDiv === 'A' && ['A1', 'A2', 'A3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {newAnnDiv === 'B' && ['B1', 'B2', 'B3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {newAnnDiv === 'C' && ['C1', 'C2', 'C3'].map(b => <option key={b} value={b}>{b}</option>)}
                  {newAnnDiv === 'All' && ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-field-col" style={{ flex: 2 }}>
                <label className="field-label">Announcement Content *</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Detailed announcement content..."
                  value={newAnnContent}
                  onChange={(e) => setNewAnnContent(e.target.value)}
                  required
                />
              </div>
              <div className="form-field-btn-col">
                <button type="submit" className="btn primary-btn admin-submit-btn" disabled={creatingAnn}>
                  {creatingAnn ? 'Broadcasting...' : '📢 Publish Announcement'}
                </button>
              </div>
            </form>
          </div>

          <div className="card admin-section-card">
            <div className="card-header">
              <h3 className="section-title-clean">All Published Announcements</h3>
              <span className="pill pill-info">{announcementsList.length} Messages</span>
            </div>
            {announcementsList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                {announcementsList.map((ann) => (
                  <div key={ann.id} style={{ padding: '16px', borderRadius: '10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="pill pill-info">{ann.courseId || 'GLOBAL'}</span>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--color-navy)' }}>{ann.title}</strong>
                        {ann.authorName && (
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>by {ann.authorName}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : ''}
                        </span>
                        <button
                          type="button"
                          className="btn danger-btn"
                          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleDeleteAdminAnnouncement(ann.id)}
                          title="Delete announcement"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: 0, color: 'var(--color-text)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-box">
                <p className="no-data-text">No announcements posted yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: ASSIGNMENTS MANAGEMENT */}
      {activeAdminTab === 'assignments' && (
        <div className="admin-tab-content">
          <div className="card admin-form-card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span className="eyebrow">Academic Coursework Management</span>
                <h3 className="section-title-clean">Assignments &amp; Submissions Registry</h3>
                <p className="table-caption-clean">Review course assignments, monitor deadlines, and administer institutional assignments across all departments.</p>
              </div>
              <button
                type="button"
                className="btn primary-btn"
                onClick={() => setShowCreateAssignModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>+</span>
                <span>Create New Assignment</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.86rem', fontWeight: 600, color: '#475569' }}>Filter Course:</label>
                <select
                  className="input-select"
                  value={selectedAssignCourse}
                  onChange={(e) => setSelectedAssignCourse(e.target.value)}
                  style={{ minWidth: '160px', padding: '6px 10px', fontSize: '0.86rem' }}
                >
                  <option value="All">All Registered Courses</option>
                  {courses.map(c => (
                    <option key={c.id || c.courseId} value={c.courseId}>{c.courseId} — {c.courseName}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Search assignments by title or description..."
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '6px 12px', fontSize: '0.86rem' }}
                />
              </div>
              <span className="pill pill-blue">
                {adminAssignments.filter(a => {
                  const matchCourse = selectedAssignCourse === 'All' || a.courseId === selectedAssignCourse;
                  const matchQ = !assignSearchQuery.trim() ||
                    (a.title && a.title.toLowerCase().includes(assignSearchQuery.toLowerCase())) ||
                    (a.courseId && a.courseId.toLowerCase().includes(assignSearchQuery.toLowerCase()));
                  return matchCourse && matchQ;
                }).length} Assignment(s)
              </span>
            </div>

            {assignmentsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '10px', color: '#64748b' }}>Loading assignments across courses...</p>
              </div>
            ) : adminAssignments.filter(a => {
                const matchCourse = selectedAssignCourse === 'All' || a.courseId === selectedAssignCourse;
                const matchQ = !assignSearchQuery.trim() ||
                  (a.title && a.title.toLowerCase().includes(assignSearchQuery.toLowerCase())) ||
                  (a.courseId && a.courseId.toLowerCase().includes(assignSearchQuery.toLowerCase()));
                return matchCourse && matchQ;
              }).length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Assignment Title</th>
                      <th>Description</th>
                      <th>Type</th>
                      <th>Due Date / Deadline</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminAssignments.filter(a => {
                      const matchCourse = selectedAssignCourse === 'All' || a.courseId === selectedAssignCourse;
                      const matchQ = !assignSearchQuery.trim() ||
                        (a.title && a.title.toLowerCase().includes(assignSearchQuery.toLowerCase())) ||
                        (a.courseId && a.courseId.toLowerCase().includes(assignSearchQuery.toLowerCase()));
                      return matchCourse && matchQ;
                    }).map((assign) => (
                      <tr key={assign.id}>
                        <td>
                          <span className="pill pill-purple" style={{ fontWeight: 700 }}>
                            {assign.courseId}
                          </span>
                        </td>
                        <td>
                          <strong>{assign.title}</strong>
                        </td>
                        <td style={{ maxWidth: '280px', color: '#475569', fontSize: '0.88rem' }}>
                          {assign.description || 'No description provided.'}
                        </td>
                        <td>
                          <span className="pill pill-blue">{assign.type || 'ASSIGNMENT'}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.86rem', color: '#1e293b' }}>
                          {assign.deadline ? new Date(assign.deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No deadline'}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-danger-icon"
                            onClick={() => handleDeleteAssignment(assign.id, assign.title)}
                            title="Delete assignment"
                            style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.82rem' }}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box" style={{ padding: '36px', textAlign: 'center' }}>
                <p className="no-data-text">No assignments found for the selected filter.</p>
                <button
                  type="button"
                  className="btn primary-btn"
                  onClick={() => setShowCreateAssignModal(true)}
                  style={{ marginTop: '12px' }}
                >
                  + Create First Assignment
                </button>
              </div>
            )}
          </div>

          {/* Modal: Create Assignment */}
          {showCreateAssignModal && (
            <div className="modal-overlay" onClick={() => setShowCreateAssignModal(false)}>
              <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow">Academic Coursework</span>
                    <h3 style={{ margin: '4px 0 0 0', color: '#0f172a' }}>Create New Assignment</h3>
                  </div>
                  <button type="button" className="modal-close-btn" onClick={() => setShowCreateAssignModal(false)}>
                    &times;
                  </button>
                </div>
                <form onSubmit={handleCreateAssignment} className="modal-body">
                  <div className="form-field-col" style={{ marginBottom: '14px' }}>
                    <label className="field-label">Target Course *</label>
                    <select
                      className="input-select"
                      value={newAssignCourseId}
                      onChange={(e) => setNewAssignCourseId(e.target.value)}
                      required
                    >
                      <option value="">-- Select Course --</option>
                      {courses.map(c => (
                        <option key={c.id || c.courseId} value={c.courseId}>{c.courseId} — {c.courseName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field-col" style={{ marginBottom: '14px' }}>
                    <label className="field-label">Assignment Title *</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="e.g. Data Structures Problem Set 3"
                      value={newAssignTitle}
                      onChange={(e) => setNewAssignTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field-col" style={{ marginBottom: '14px' }}>
                    <label className="field-label">Description &amp; Instructions</label>
                    <textarea
                      className="input-text"
                      rows="3"
                      placeholder="Provide problem specifications or submission guidelines..."
                      value={newAssignDesc}
                      onChange={(e) => setNewAssignDesc(e.target.value)}
                    />
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div className="form-field-col">
                      <label className="field-label">Assignment Type</label>
                      <select
                        className="input-select"
                        value={newAssignType}
                        onChange={(e) => setNewAssignType(e.target.value)}
                      >
                        <option value="ASSIGNMENT">Assignment</option>
                        <option value="HOMEWORK">Homework</option>
                        <option value="PROJECT">Term Project</option>
                        <option value="LAB">Lab Practical</option>
                      </select>
                    </div>
                    <div className="form-field-col">
                      <label className="field-label">Submission Deadline</label>
                      <input
                        type="datetime-local"
                        className="input-text"
                        value={newAssignDeadline}
                        onChange={(e) => setNewAssignDeadline(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="btn secondary-btn"
                      onClick={() => setShowCreateAssignModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn primary-btn"
                      disabled={creatingAssign}
                    >
                      {creatingAssign ? 'Creating...' : 'Create Assignment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: EXPERIMENTS & PRACTICALS MANAGEMENT */}
      {activeAdminTab === 'experiments' && (
        <div className="admin-tab-content">
          <div className="card admin-form-card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span className="eyebrow">Laboratory &amp; Practical Curriculum</span>
                <h3 className="section-title-clean">Experiments &amp; Lab Practicals Registry</h3>
                <p className="table-caption-clean">Manage department lab manuals, practical exercises, and syllabus experiments across all courses.</p>
              </div>
              <button
                type="button"
                className="btn primary-btn"
                onClick={() => setShowCreateExpModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>+</span>
                <span>Add Experiment / Practical</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.86rem', fontWeight: 600, color: '#475569' }}>Filter Course:</label>
                <select
                  className="input-select"
                  value={selectedExpCourse}
                  onChange={(e) => setSelectedExpCourse(e.target.value)}
                  style={{ minWidth: '160px', padding: '6px 10px', fontSize: '0.86rem' }}
                >
                  <option value="All">All Registered Courses</option>
                  {courses.map(c => (
                    <option key={c.id || c.courseId} value={c.courseId}>{c.courseId} — {c.courseName}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Search experiments by title or objectives..."
                  value={expSearchQuery}
                  onChange={(e) => setExpSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '6px 12px', fontSize: '0.86rem' }}
                />
              </div>
              <span className="pill pill-green">
                {adminExperiments.filter(x => {
                  const matchCourse = selectedExpCourse === 'All' || x.courseId === selectedExpCourse;
                  const matchQ = !expSearchQuery.trim() ||
                    (x.title && x.title.toLowerCase().includes(expSearchQuery.toLowerCase())) ||
                    (x.courseId && x.courseId.toLowerCase().includes(expSearchQuery.toLowerCase()));
                  return matchCourse && matchQ;
                }).length} Experiment(s)
              </span>
            </div>

            {experimentsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '10px', color: '#64748b' }}>Loading laboratory practicals...</p>
              </div>
            ) : adminExperiments.filter(x => {
                const matchCourse = selectedExpCourse === 'All' || x.courseId === selectedExpCourse;
                const matchQ = !expSearchQuery.trim() ||
                  (x.title && x.title.toLowerCase().includes(expSearchQuery.toLowerCase())) ||
                  (x.courseId && x.courseId.toLowerCase().includes(expSearchQuery.toLowerCase()));
                return matchCourse && matchQ;
              }).length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Experiment Title / Manual</th>
                      <th>Objectives / Scope</th>
                      <th>Category</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminExperiments.filter(x => {
                      const matchCourse = selectedExpCourse === 'All' || x.courseId === selectedExpCourse;
                      const matchQ = !expSearchQuery.trim() ||
                        (x.title && x.title.toLowerCase().includes(expSearchQuery.toLowerCase())) ||
                        (x.courseId && x.courseId.toLowerCase().includes(expSearchQuery.toLowerCase()));
                      return matchCourse && matchQ;
                    }).map((exp) => (
                      <tr key={exp.id}>
                        <td>
                          <span className="pill pill-green" style={{ fontWeight: 700 }}>
                            {exp.courseId}
                          </span>
                        </td>
                        <td>
                          <strong>{exp.title}</strong>
                          {exp.fileName && (
                            <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                              📎 {exp.fileName}
                            </span>
                          )}
                        </td>
                        <td style={{ maxWidth: '300px', color: '#475569', fontSize: '0.88rem' }}>
                          {exp.description || 'Standard laboratory practical exercise.'}
                        </td>
                        <td>
                          <span className="pill pill-purple">{exp.category || 'EXPERIMENT'}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-danger-icon"
                            onClick={() => handleDeleteExperiment(exp.id, exp.title)}
                            title="Delete experiment"
                            style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.82rem' }}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box" style={{ padding: '36px', textAlign: 'center' }}>
                <p className="no-data-text">No laboratory experiments found for the selected filter.</p>
                <button
                  type="button"
                  className="btn primary-btn"
                  onClick={() => setShowCreateExpModal(true)}
                  style={{ marginTop: '12px' }}
                >
                  + Add First Experiment
                </button>
              </div>
            )}
          </div>

          {/* Modal: Add Experiment */}
          {showCreateExpModal && (
            <div className="modal-overlay" onClick={() => setShowCreateExpModal(false)}>
              <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow">Practical Curriculum</span>
                    <h3 style={{ margin: '4px 0 0 0', color: '#0f172a' }}>Add Lab Experiment / Manual</h3>
                  </div>
                  <button type="button" className="modal-close-btn" onClick={() => setShowCreateExpModal(false)}>
                    &times;
                  </button>
                </div>
                <form onSubmit={handleCreateExperiment} className="modal-body">
                  <div className="form-field-col" style={{ marginBottom: '14px' }}>
                    <label className="field-label">Target Course *</label>
                    <select
                      className="input-select"
                      value={newExpCourseId}
                      onChange={(e) => setNewExpCourseId(e.target.value)}
                      required
                    >
                      <option value="">-- Select Course --</option>
                      {courses.map(c => (
                        <option key={c.id || c.courseId} value={c.courseId}>{c.courseId} — {c.courseName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field-col" style={{ marginBottom: '14px' }}>
                    <label className="field-label">Experiment Title / Name *</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="e.g. Experiment 1: Implementation of Binary Search Tree"
                      value={newExpTitle}
                      onChange={(e) => setNewExpTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field-col" style={{ marginBottom: '14px' }}>
                    <label className="field-label">Objectives &amp; Lab Instructions</label>
                    <textarea
                      className="input-text"
                      rows="3"
                      placeholder="Describe laboratory objectives, apparatus required, or algorithm..."
                      value={newExpDesc}
                      onChange={(e) => setNewExpDesc(e.target.value)}
                    />
                  </div>
                  <div className="form-field-col" style={{ marginBottom: '16px' }}>
                    <label className="field-label">Curricular Category</label>
                    <select
                      className="input-select"
                      value={newExpCategory}
                      onChange={(e) => setNewExpCategory(e.target.value)}
                    >
                      <option value="EXPERIMENT">Laboratory Experiment</option>
                      <option value="LAB_MANUAL">Lab Manual &amp; Guidelines</option>
                      <option value="NOTES">Practical Reference Notes</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="btn secondary-btn"
                      onClick={() => setShowCreateExpModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn primary-btn"
                      disabled={creatingExp}
                    >
                      {creatingExp ? 'Adding...' : 'Save Experiment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: LEARNING MATERIALS & RESOURCES MANAGEMENT */}
      {activeAdminTab === 'materials' && (
        <div className="admin-tab-content">
          <div className="card admin-form-card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span className="eyebrow">Academic Coursework &amp; Study Resources</span>
                <h3 className="section-title-clean">Learning Materials &amp; Syllabus Registry</h3>
                <p className="table-caption-clean">Review lecture notes, syllabus documents, and reference resources across all registered courses.</p>
              </div>
              <button
                type="button"
                className="btn primary-btn"
                onClick={() => setShowCreateMatModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>+</span>
                <span>Upload Learning Material</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ minWidth: '220px' }}>
                <select
                  className="input-select"
                  value={selectedMatCourse}
                  onChange={(e) => setSelectedMatCourse(e.target.value)}
                  style={{ padding: '8px 12px' }}
                >
                  <option value="All">All Registered Courses</option>
                  {courses.map(c => (
                    <option key={c.id || c.courseId} value={c.courseId}>{c.courseId} — {c.courseName}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Search materials by title or description..."
                  value={matSearchQuery}
                  onChange={(e) => setMatSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                />
              </div>
              <span className="pill pill-info" style={{ fontWeight: 600 }}>
                {adminMaterials
                  .filter(m => selectedMatCourse === 'All' || m.courseId === selectedMatCourse)
                  .filter(m => !matSearchQuery || (m.title && m.title.toLowerCase().includes(matSearchQuery.toLowerCase())) || (m.description && m.description.toLowerCase().includes(matSearchQuery.toLowerCase())))
                  .length} Material(s)
              </span>
            </div>

            {/* Materials Table */}
            {materialsLoading ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                Loading course materials...
              </div>
            ) : adminMaterials
                .filter(m => selectedMatCourse === 'All' || m.courseId === selectedMatCourse)
                .filter(m => !matSearchQuery || (m.title && m.title.toLowerCase().includes(matSearchQuery.toLowerCase())) || (m.description && m.description.toLowerCase().includes(matSearchQuery.toLowerCase())))
                .length > 0 ? (
              <div className="table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Material Title</th>
                      <th>Category</th>
                      <th>Resource Link</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminMaterials
                      .filter(m => selectedMatCourse === 'All' || m.courseId === selectedMatCourse)
                      .filter(m => !matSearchQuery || (m.title && m.title.toLowerCase().includes(matSearchQuery.toLowerCase())) || (m.description && m.description.toLowerCase().includes(matSearchQuery.toLowerCase())))
                      .map((m) => (
                        <tr key={m.id}>
                          <td>
                            <span className="course-code-badge">{m.courseId}</span>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{m.courseName}</div>
                          </td>
                          <td>
                            <strong>{m.title}</strong>
                            {m.description && (
                              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', maxWidth: '380px' }}>
                                {m.description}
                              </p>
                            )}
                          </td>
                          <td>
                            <span className="pill pill-purple" style={{ fontSize: '0.74rem' }}>
                              {(m.category || 'LECTURE_NOTES').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td>
                            {m.linkUrl ? (
                              <a
                                href={m.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600, fontSize: '0.84rem' }}
                              >
                                🔗 Open Resource
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Direct Document</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn secondary-btn"
                              style={{ padding: '4px 8px', fontSize: '0.78rem', color: '#dc2626', borderColor: '#fca5a5' }}
                              onClick={() => handleDeleteMaterial(m.id, m.title)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state-box" style={{ padding: '36px', textAlign: 'center' }}>
                <p className="no-data-text">No learning materials found for the selected filter.</p>
                <button
                  type="button"
                  className="btn primary-btn"
                  onClick={() => setShowCreateMatModal(true)}
                  style={{ marginTop: '12px' }}
                >
                  + Upload First Material
                </button>
              </div>
            )}
          </div>

          {/* Modal: Add Material */}
          {showCreateMatModal && (
            <div className="modal-overlay" onClick={() => setShowCreateMatModal(false)}>
              <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
                <div className="modal-header">
                  <div>
                    <span className="eyebrow">Course Resources</span>
                    <h3 style={{ margin: '4px 0 0 0', color: '#0f172a' }}>Upload Learning Material</h3>
                  </div>
                  <button type="button" className="modal-close-btn" onClick={() => setShowCreateMatModal(false)}>
                    &times;
                  </button>
                </div>
                <form onSubmit={handleCreateMaterial} className="modal-body">
                  <div className="form-field-col" style={{ marginBottom: '14px' }}>
                    <label className="field-label">Target Course *</label>
                    <select
                      className="input-select"
                      value={newMatCourseId}
                      onChange={(e) => setNewMatCourseId(e.target.value)}
                      required
                    >
                      <option value="">-- Select Course --</option>
                      {courses.map(c => (
                        <option key={c.id || c.courseId} value={c.courseId}>{c.courseId} — {c.courseName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field-col" style={{ marginBottom: '14px' }}>
                    <label className="field-label">Material Title *</label>
                    <input
                      type="text"
                      className="input-text"
                      placeholder="e.g. Lecture 4: Binary Search Trees &amp; AVL Trees"
                      value={newMatTitle}
                      onChange={(e) => setNewMatTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field-col" style={{ marginBottom: '14px' }}>
                    <label className="field-label">Description &amp; Syllabus Topics</label>
                    <textarea
                      className="input-text"
                      rows="3"
                      placeholder="Brief notes, relevant chapter numbers, or study objectives..."
                      value={newMatDesc}
                      onChange={(e) => setNewMatDesc(e.target.value)}
                    />
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div className="form-field-col">
                      <label className="field-label">Material Category</label>
                      <select
                        className="input-select"
                        value={newMatCategory}
                        onChange={(e) => setNewMatCategory(e.target.value)}
                      >
                        <option value="LECTURE_NOTES">Lecture Notes</option>
                        <option value="SYLLABUS">Course Syllabus</option>
                        <option value="REFERENCE_BOOK">Reference Book / PDF</option>
                        <option value="PRESENTATION">Slide Deck / PPT</option>
                        <option value="DOCUMENT">Handout / Document</option>
                      </select>
                    </div>
                    <div className="form-field-col">
                      <label className="field-label">Resource Link (URL)</label>
                      <input
                        type="url"
                        className="input-text"
                        placeholder="https://..."
                        value={newMatLink}
                        onChange={(e) => setNewMatLink(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="btn secondary-btn"
                      onClick={() => setShowCreateMatModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn primary-btn"
                      disabled={creatingMat}
                    >
                      {creatingMat ? 'Uploading...' : 'Save Material'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: SYSTEM SETTINGS */}
      {activeAdminTab === 'profile' && (
        <div className="admin-tab-content">
          {settingsSavedMsg && (
            <div className="alert success-alert" style={{ marginBottom: '16px' }}>
              ✓ {settingsSavedMsg}
            </div>
          )}

          {/* Settings Section 1: Institutional Parameters */}
          <div className="card admin-form-card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <div>
                <span className="eyebrow">Institutional Configuration</span>
                <h3 className="section-title-clean">System Settings &amp; Academic Policies</h3>
                <p className="table-caption-clean">Configure campus-wide attendance thresholds, geofencing coordinates, dynamic QR rotation timing, and administrative policies.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              {/* Institution Identity */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Institution Profile</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>INSTITUTION NAME</span>
                    <strong style={{ color: '#1e293b' }}>{systemSettings.institutionName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>ACADEMIC YEAR</span>
                    <strong style={{ color: '#1e293b' }}>{systemSettings.academicYear}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>ACTIVE TERM</span>
                    <strong style={{ color: '#1e293b' }}>{systemSettings.activeSemester}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>CORE ENGINE</span>
                    <span className="pill pill-blue">SmartAttend Enterprise v2.4</span>
                  </div>
                </div>
              </div>

              {/* Attendance Threshold Rules */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📊</span>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Attendance Compliance</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                  <div>
                    <label style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                      MANDATORY THRESHOLD (%)
                    </label>
                    <input
                      type="number"
                      className="input-text"
                      min="50"
                      max="100"
                      value={systemSettings.attendanceThreshold}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, attendanceThreshold: Number(e.target.value) }))}
                      style={{ padding: '6px 10px', fontSize: '0.88rem' }}
                    />
                    <span style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                      Students below this mark are automatically flagged in Defaulter Lists.
                    </span>
                  </div>
                  <div>
                    <label style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                      WARNING THRESHOLD (%)
                    </label>
                    <input
                      type="number"
                      className="input-text"
                      min="50"
                      max="100"
                      value={systemSettings.warningThreshold}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, warningThreshold: Number(e.target.value) }))}
                      style={{ padding: '6px 10px', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic QR & Geofence Security */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>QR &amp; Geofencing Engine</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>TOKEN ROTATION FREQUENCY</span>
                    <strong style={{ color: '#1e293b' }}>5 Seconds (Cryptographic HMAC)</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>CAMPUS GPS GEOFENCING</span>
                    <span className="pill pill-success">Enforced (Radius: 100m)</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>DEVICE HARDWARE BINDING</span>
                    <span className="pill pill-success">Anti-Proxy HWID Active</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>LATE-MARK TOLERANCE</span>
                    <strong style={{ color: '#1e293b' }}>10 Minutes Post Session Launch</strong>
                  </div>
                </div>
              </div>

              {/* Live Services Infrastructure */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚡</span>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Platform Infrastructure</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>API BACKEND GATEWAY</span>
                    <span style={{ color: '#15803d', fontWeight: 600 }}>● Spring Boot 3.2.0 (Online)</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>DATABASE CLUSTER</span>
                    <span style={{ color: '#15803d', fontWeight: 600 }}>● MySQL Enterprise (Healthy)</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>MOODLE LMS INTEGRATION</span>
                    <span className="pill pill-purple">REST Web Services Active</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem', fontWeight: 600 }}>SESSION RUNTIME</span>
                    <strong style={{ color: '#1e293b' }}>Apache Tomcat 8080</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button
                type="button"
                className="btn primary-btn"
                onClick={() => {
                  setSettingsSavedMsg('Institutional configuration settings updated successfully.');
                  setTimeout(() => setSettingsSavedMsg(''), 4000);
                }}
              >
                💾 Save Configuration Settings
              </button>
            </div>
          </div>

          {/* Settings Section 2: Administrator Profile */}
          <div className="card admin-form-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                {(currentUser?.fullName || currentUser?.username || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="eyebrow" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>System Administration Account</span>
                <h3 style={{ margin: '4px 0 0 0', color: 'var(--color-navy)', fontSize: '1.3rem' }}>
                  {currentUser?.fullName || (sessionStorage.getItem('smartattend_role') === 'ADMIN' ? 'System Administrator' : (sessionStorage.getItem('smartattend_name') || 'System Administrator'))}
                </h3>
                <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                  Institutional Administrator • Full Authority &amp; System Permissions
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Admin Username</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                  {currentUser?.username || 'admin'}
                </p>
              </div>
              <div style={{ padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Scope</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                  Institution-Wide
                </p>
              </div>
              <div style={{ padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Role Badge</span>
                <p style={{ margin: '6px 0 0 0' }}>
                  <span className="pill pill-danger">System Administrator</span>
                </p>
              </div>
              <div style={{ padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Registered Students</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                  {students.length} Students
                </p>
              </div>
              <div style={{ padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Teaching Faculty</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                  {facultyList.length} Teachers
                </p>
              </div>
              <div style={{ padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Registered Courses</span>
                <p style={{ margin: '6px 0 0 0', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                  {courses.length} Subjects
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
