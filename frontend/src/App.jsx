import React, { useState } from 'react';
import Header from './components/Header.jsx';
import TeacherQrDashboard from './components/TeacherQrDashboard.jsx';
import StudentQrScanner from './components/StudentQrScanner.jsx';
import StudentCourseManagement from './components/StudentCourseManagement.jsx';
import './styles.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('teacher');

  return (
    <div className="app-layout">
      <Header />

      <main className="main-content">
        <section className="hero-banner">
          <span className="hero-badge">SmartAttend Attendance System</span>
          <h1>Students Attendance Management System</h1>
          <p>
            Dynamic 5-second QR attendance management connected with Spring Boot backend and MySQL database.
          </p>
        </section>

        <nav className="tab-navigation">
          <div className="tab-container">
            <button
              type="button"
              className={`tab-button ${activeTab === 'teacher' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('teacher')}
            >
              Teacher: Dynamic QR Code
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'student' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('student')}
            >
              Student: Scan QR Attendance
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'records' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('records')}
            >
              Students, Classes & Records
            </button>
          </div>
        </nav>

        <div className="app-container">
          {activeTab === 'teacher' && <TeacherQrDashboard />}
          {activeTab === 'student' && <StudentQrScanner />}
          {activeTab === 'records' && <StudentCourseManagement />}
        </div>
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} SmartAttend. Students Attendance Management System.</p>
      </footer>
    </div>
  );
};

export default App;

