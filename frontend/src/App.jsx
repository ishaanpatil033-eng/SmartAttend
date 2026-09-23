import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import HorizontalNavbar from './components/HorizontalNavbar.jsx';
import LandingPage from './components/LandingPage.jsx';
import CommonLogin from './components/CommonLogin.jsx';
import MoodleIntegration from './components/MoodleIntegration.jsx';
import HodDashboard from './components/HodDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import TeacherDashboard from './components/TeacherDashboard.jsx';
import TeacherQrDashboard from './components/TeacherQrDashboard.jsx';
import StudentDashboard from './components/StudentDashboard.jsx';
import StudentQrScanner from './components/StudentQrScanner.jsx';
import StudentCourseManagement from './components/StudentCourseManagement.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { getMe, logout } from './services/api.js';
import './styles.css';

const App = () => {
  // viewMode: 'landing' (public homepage) | 'login' (authentication screen) | 'workspace' (role dashboards)
  const [viewMode, setViewMode] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null); // Authenticated Spring Security user
  const [selectedRole, setSelectedRole] = useState(null); // 'student' | 'teacher' | 'admin' | 'hod'
  const [activeTab, setActiveTab] = useState('student-dashboard');
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState('');
  const [activeCourseId, setActiveCourseId] = useState('');
  const [activeSessionCode, setActiveSessionCode] = useState('');

  // Role to default dashboard tab mapping
  const roleTabMap = {
    student: 'student-dashboard',
    teacher: 'teacher-dashboard',
    faculty: 'teacher-dashboard',
    admin: 'admin-dashboard',
    hod: 'hod-dashboard'
  };

  // Restore authenticated session on application mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const user = await getMe();
        if (user && user.username) {
          setCurrentUser(user);
          let cleanRole = user.role ? user.role.replace('ROLE_', '').toLowerCase() : 'student';
          if (cleanRole === 'faculty') cleanRole = 'teacher';
          setSelectedRole(cleanRole);
          if (user.studentId) {
            setActiveStudentId(user.studentId);
          }
          const targetTab = roleTabMap[cleanRole] || 'student-dashboard';
          setActiveTab(targetTab);
          setActiveSubTab('overview');
          setViewMode('workspace');
        } else {
          setViewMode(prev => (prev === 'login' ? 'login' : 'landing'));
        }
      } catch (err) {
        setViewMode(prev => (prev === 'login' ? 'login' : 'landing'));
      }
    };
    restoreSession();

    window.__smartattend_setRole = (roleKey) => {
      setSelectedRole(roleKey);
      setActiveTab(roleTabMap[roleKey] || 'student-dashboard');
      setActiveSubTab(roleKey === 'teacher' || roleKey === 'faculty' ? 'classes' : 'overview');
      setViewMode('workspace');
    };

    window.__smartattend_setUser = (user) => {
      setCurrentUser(user);
    };
  }, []);

  const handleOpenQrSession = (selectedCourse, sessionCode = '') => {
    if (typeof selectedCourse === 'string' && selectedCourse.trim()) {
      setActiveCourseId(selectedCourse.trim());
    }
    if (typeof sessionCode === 'string' && sessionCode.trim()) {
      setActiveSessionCode(sessionCode.trim());
    }
    setActiveTab('teacher-qr');
  };

  const handleOpenStudentScanner = (studentId, courseId, sessionCode = '') => {
    if (studentId) {
      setActiveStudentId(studentId);
    }
    if (courseId) {
      setActiveCourseId(courseId);
    }
    if (sessionCode) {
      setActiveSessionCode(sessionCode);
    }
    setActiveTab('student-scan');
  };

  const handleOpenLogin = () => {
    setViewMode('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLanding = () => {
    if (currentUser) {
      setViewMode('workspace');
    } else {
      setViewMode('landing');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (tabKey, subTabKey = null) => {
    setActiveTab(tabKey);
    if (subTabKey) {
      setActiveSubTab(subTabKey);
    }
    setIsMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    let cleanRole = userData.role ? userData.role.replace('ROLE_', '').toLowerCase() : 'student';
    if (cleanRole === 'faculty') cleanRole = 'teacher';
    setSelectedRole(cleanRole);
    if (userData.studentId) {
      setActiveStudentId(userData.studentId);
    }
    const targetTab = roleTabMap[cleanRole] || 'student-dashboard';
    setActiveTab(targetTab);
    setActiveSubTab('overview');
    setIsMobileSidebarOpen(false);
    setViewMode('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('Logout notice:', err);
    } finally {
      setCurrentUser(null);
      setSelectedRole(null);
      setViewMode('landing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectRole = (roleKey) => {
    if (currentUser) {
      const targetTab = roleTabMap[roleKey] || 'student-dashboard';
      setActiveTab(targetTab);
      setViewMode('workspace');
    } else {
      setViewMode('login');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. PUBLIC LANDING PAGE
  if (viewMode === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => {
          if (currentUser) {
            setViewMode('workspace');
          } else {
            handleOpenLogin();
          }
        }}
        onLogin={handleOpenLogin}
      />
    );
  }

  // 2. COMMON LOGIN SCREEN
  if (viewMode === 'login') {
    return (
      <CommonLogin
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={handleBackToLanding}
      />
    );
  }

  // 3. WORKSPACE (AUTHENTICATED DASHBOARD SYSTEM)
  return (
    <div className="app-layout">
      <Header
        onBackToLanding={handleBackToLanding}
        onSwitchRole={handleOpenLogin}
        onLogout={handleLogout}
        currentRole={selectedRole}
        currentUser={currentUser}
        onToggleMobileNav={() => setIsMobileSidebarOpen(prev => !prev)}
      />

      <HorizontalNavbar
        role={selectedRole}
        activeTab={activeTab}
        activeSubTab={activeSubTab}
        onNavigate={handleNavigate}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="workspace-shell horizontal-workspace">
        <main className="workspace-main-content">
          <div className="app-container">
            <ErrorBoundary
              onReset={() => {
                const targetTab = roleTabMap[selectedRole] || 'student-dashboard';
                setActiveTab(targetTab);
                setActiveSubTab('overview');
              }}
            >
              {activeTab === 'student-dashboard' && (
                <StudentDashboard
                  onOpenScanner={handleOpenStudentScanner}
                  currentStudentId={activeStudentId}
                  onStudentChange={(id) => setActiveStudentId(id)}
                  currentUser={currentUser}
                  activeSubTab={activeSubTab}
                  onSubTabChange={(sub) => setActiveSubTab(sub)}
                />
              )}
              {activeTab === 'student-scan' && (
                <StudentQrScanner
                  initialStudentId={activeStudentId}
                  initialCourseId={activeCourseId}
                  initialSessionCode={activeSessionCode}
                  onBackToDashboard={() => {
                    if (selectedRole === 'admin') {
                      setActiveTab('admin-dashboard');
                      setActiveSubTab('overview');
                    } else {
                      setActiveTab('student-dashboard');
                      setActiveSubTab('overview');
                    }
                  }}
                />
              )}
              {activeTab === 'teacher-dashboard' && (
                <TeacherDashboard
                  selectedCourseId={activeCourseId}
                  onSelectCourse={(course) => setActiveCourseId(course)}
                  onOpenQrSession={handleOpenQrSession}
                  currentUser={currentUser}
                  activeSubTab={activeSubTab}
                  onSubTabChange={(sub) => setActiveSubTab(sub)}
                />
              )}
              {activeTab === 'teacher-qr' && (
                <TeacherQrDashboard
                  initialCourseId={activeCourseId}
                  initialSessionCode={activeSessionCode}
                  onBackToDashboard={() => {
                    if (selectedRole === 'admin') {
                      setActiveTab('admin-dashboard');
                      setActiveSubTab('classes');
                    } else {
                      setActiveTab('teacher-dashboard');
                      setActiveSubTab('classes');
                    }
                  }}
                />
              )}
              {activeTab === 'admin-dashboard' && selectedRole !== 'hod' && (
                <AdminDashboard
                  currentUser={currentUser}
                  activeSubTab={activeSubTab}
                  onSubTabChange={(sub) => setActiveSubTab(sub)}
                />
              )}
              {(activeTab === 'hod-dashboard' || (selectedRole === 'hod' && activeTab === 'admin-dashboard')) && (
                <HodDashboard
                  currentUser={currentUser}
                  activeSubTab={activeSubTab}
                  onSubTabChange={(sub) => setActiveSubTab(sub)}
                />
              )}
              {activeTab === 'records' && <StudentCourseManagement />}
              {activeTab === 'moodle' && <MoodleIntegration />}
            </ErrorBoundary>
          </div>

          <footer className="footer">
            <p>&copy; {new Date().getFullYear()} SmartAttend. Students Attendance Management System.</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default App;
