import React, { useState } from 'react';

const LandingPage = ({ onGetStarted, onLogin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLoginClick = () => {
    if (onLogin) {
      onLogin();
    } else if (onGetStarted) {
      onGetStarted();
    }
  };

  const scrollToSection = (sectionId) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-wrapper">
      {/* 1. NAVIGATION / HEADER */}
      <header className="landing-nav-header">
        <div className="landing-nav-container">
          <div
            className="landing-brand"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ cursor: 'pointer' }}
          >
            <span className="brand-mark landing-brand-mark">SA</span>
            <div className="brand-text-col">
              <span className="landing-brand-name">SmartAttend</span>
              <span className="landing-brand-tagline">Students Attendance Management System</span>
            </div>
          </div>

          <nav className={`landing-nav-links ${mobileMenuOpen ? 'nav-open' : ''}`}>
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => {
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Home
            </button>
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => scrollToSection('purpose')}
            >
              Why SmartAttend
            </button>
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => scrollToSection('how-it-works')}
            >
              How It Works
            </button>
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLoginClick();
              }}
            >
              Sign In
            </button>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="btn primary-btn landing-cta-btn"
              onClick={handleLoginClick}
            >
              Sign In
            </button>
            <button
              type="button"
              className="landing-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {/* 2. SHORT PROFESSIONAL HERO SECTION */}
      <section className="landing-hero-section">
        <div className="landing-hero-container" style={{ gridTemplateColumns: '1fr', textAlign: 'center', maxWidth: '860px', margin: '0 auto', padding: '48px 20px' }}>
          <div className="landing-hero-content" style={{ margin: '0 auto' }}>
            <div className="hero-pill-badge" style={{ margin: '0 auto 20px auto' }}>
              <span className="pulse-dot"></span>
              Academic Attendance &amp; LMS Platform
            </div>

            <h1 className="landing-hero-title" style={{ fontSize: '2.8rem', lineHeight: 1.2, marginBottom: '20px' }}>
              SmartAttend <br />
              <span className="hero-gradient-text">Students Attendance Management System</span>
            </h1>

            <p className="landing-hero-subtitle" style={{ fontSize: '1.15rem', color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: '720px', margin: '0 auto 32px auto' }}>
              A high-integrity academic attendance and learning platform featuring dynamic 5-second QR code rotation, GPS classroom geofencing, device binding, and bidirectional Moodle LMS synchronization.
            </p>

            <div className="landing-hero-actions" style={{ justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
              <button
                type="button"
                className="btn primary-btn hero-primary-btn"
                onClick={handleLoginClick}
                style={{ padding: '14px 32px', fontSize: '1.05rem', fontWeight: 700 }}
              >
                Sign In
                <span className="btn-arrow" style={{ marginLeft: '8px' }}>→</span>
              </button>
              <button
                type="button"
                className="btn secondary-btn hero-secondary-btn"
                onClick={() => scrollToSection('how-it-works')}
                style={{ padding: '14px 28px', fontSize: '1.05rem' }}
              >
                See How It Works
              </button>
            </div>

            <div className="hero-quick-meta" style={{ justifyContent: 'center', display: 'flex', gap: '24px', flexWrap: 'wrap', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              <span className="meta-item">✓ 5-Second Dynamic QR Rotation</span>
              <span className="meta-item">✓ Real-time Geofencing &amp; Anti-Proxy</span>
              <span className="meta-item">✓ Native Moodle REST Synchronization</span>
              <span className="meta-item">✓ Unified Institutional Login</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PURPOSE / PROBLEM STATEMENT */}
      <section id="purpose" className="landing-section" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="landing-section-header">
          <span className="section-eyebrow">Purpose &amp; Problem Statement</span>
          <h2 className="section-title">Why SmartAttend was Created</h2>
          <p className="section-subtitle">
            Traditional attendance tracking consumes valuable instructional time, enables proxy attendance, and fragments academic recordkeeping.
          </p>
        </div>

        <div className="steps-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <div className="step-card" style={{ background: '#ffffff' }}>
            <div className="feature-icon-wrapper icon-blue" style={{ marginBottom: '14px' }}>
              <span>⏱️</span>
            </div>
            <h3 className="step-title">Eliminates Roll-Call Delays</h3>
            <p className="step-desc">
              Oral roll calls or paper sign-in sheets consume 10–15 minutes of lecture time. SmartAttend automates class-wide attendance in seconds without disrupting teaching.
            </p>
          </div>

          <div className="step-card" style={{ background: '#ffffff' }}>
            <div className="feature-icon-wrapper icon-emerald" style={{ marginBottom: '14px' }}>
              <span>🛡️</span>
            </div>
            <h3 className="step-title">Prevents Proxy Attendance</h3>
            <p className="step-desc">
              Static codes and paper signatures allow absent students to have peers mark for them. SmartAttend combines 5-second QR rotation with browser geofencing and device integrity checks to verify physical presence.
            </p>
          </div>

          <div className="step-card" style={{ background: '#ffffff' }}>
            <div className="feature-icon-wrapper icon-orange" style={{ marginBottom: '14px' }}>
              <span>🔄</span>
            </div>
            <h3 className="step-title">Centralizes Academic Records</h3>
            <p className="step-desc">
              Replaces scattered paper sheets and manual spreadsheet re-entry with unified MySQL records and direct REST API synchronization into Moodle LMS Gradebook.
            </p>
          </div>
        </div>
      </section>

      {/* 4. "HOW IT WORKS" — ACTION-BASED EXPLANATION */}
      <section id="how-it-works" className="landing-section how-it-works-section">
        <div className="landing-section-header">
          <span className="section-eyebrow">Action-Driven Workflow</span>
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            What happens when users perform actual actions in the SmartAttend system:
          </p>
        </div>

        <div className="steps-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {/* Action 1 */}
          <div className="step-card">
            <div className="step-number-badge">Action 01</div>
            <h3 className="step-title">Teacher Starts Session</h3>
            <p className="step-desc">
              The instructor selects an assigned course and initiates a dynamic attendance session on the classroom display.
            </p>
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '0.84rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              &rarr; System generates the live dynamic attendance QR code.
            </div>
          </div>

          {/* Action 2 */}
          <div className="step-card">
            <div className="step-number-badge">Action 02</div>
            <h3 className="step-title">QR Refreshes Automatically</h3>
            <p className="step-desc">
              The dynamic QR code rotates automatically on screen every 5 seconds with a single-use cryptographic token.
            </p>
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '0.84rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              &rarr; A new token is generated every 5s; previous tokens expire instantly to prevent photo sharing.
            </div>
          </div>

          {/* Action 3 */}
          <div className="step-card">
            <div className="step-number-badge">Action 03</div>
            <h3 className="step-title">Student Scans the QR Code</h3>
            <p className="step-desc">
              The student opens the camera scanner from their mobile portal and scans the active classroom QR code.
            </p>
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '0.84rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              &rarr; Backend validates the session, authenticated student identity, dynamic 5s QR token, and device integrity.
            </div>
          </div>

          {/* Action 4 */}
          <div className="step-card">
            <div className="step-number-badge">Action 04</div>
            <h3 className="step-title">Attendance is Recorded</h3>
            <p className="step-desc">
              Once verification checks pass, attendance is atomically saved to the database.
            </p>
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '0.84rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              &rarr; The record becomes available in the relevant attendance records, student summary, and course averages.
            </div>
          </div>

          {/* Action 5 */}
          <div className="step-card">
            <div className="step-number-badge">Action 05</div>
            <h3 className="step-title">Admin Manages Courses &amp; Students</h3>
            <p className="step-desc">
              Administrators register students, assign course offerings, and audit institutional attendance records.
            </p>
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '0.84rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              &rarr; Changes are immediately reflected in the academic management system and departmental reports.
            </div>
          </div>

          {/* Action 6 */}
          <div className="step-card">
            <div className="step-number-badge">Action 06</div>
            <h3 className="step-title">Faculty Syncs with Moodle LMS</h3>
            <p className="step-desc">
              The instructor clicks the Moodle Sync action from the faculty dashboard or Moodle integration tab.
            </p>
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '0.84rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              &rarr; Verified attendance grades update in Moodle Gradebook and enrolled course rosters synchronize via REST API.
            </div>
          </div>
        </div>
      </section>

      {/* 5. UNIFIED INSTITUTIONAL LOGIN CALL-TO-ACTION */}
      <section id="access-portals" className="landing-section" style={{ backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
        <div className="landing-section-header" style={{ maxWidth: '650px', margin: '0 auto 32px auto' }}>
          <span className="section-eyebrow">Institutional Access</span>
          <h2 className="section-title">Sign In to SmartAttend</h2>
          <p className="section-subtitle">
            SmartAttend provides a single, unified entrance for all institutional roles. Enter your Login ID and password to access your authorized workspace.
          </p>
        </div>

        <div style={{ maxWidth: '500px', margin: '0 auto', padding: '32px', background: '#ffffff', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔐</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '8px' }}>
            Unified Academic Login
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            Students, Faculty, Department Heads (HOD), and Administrators sign in through the same secure login portal.
          </p>
          <button
            type="button"
            className="btn primary-btn"
            style={{ width: '100%', padding: '14px 24px', fontSize: '1rem', fontWeight: 700 }}
            onClick={handleLoginClick}
          >
            Go to Login Page &rarr;
          </button>
        </div>
      </section>

      {/* 6. CONCISE FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer-container" style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
          <div className="footer-brand-col">
            <div className="footer-brand-row">
              <span className="brand-mark footer-brand-mark">SA</span>
              <div>
                <span className="footer-brand-name">SmartAttend</span>
                <span className="footer-brand-desc">Students Attendance Management System</span>
              </div>
            </div>
            <p className="footer-mission" style={{ maxWidth: '580px', marginTop: '8px' }}>
              Dynamic 5-second QR attendance management with single-scan token rotation, academic structure verification, and native Moodle LMS REST integration.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Back to Top &uarr;
            </button>
            <button
              type="button"
              className="footer-link-btn"
              onClick={handleLoginClick}
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="footer-bottom-container">
            <span>&copy; {new Date().getFullYear()} SmartAttend. Students Attendance Management System.</span>
            <span className="footer-tagline">Smart Attendance. Simplified.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
