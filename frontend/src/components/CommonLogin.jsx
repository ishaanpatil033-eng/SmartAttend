import React, { useState } from 'react';
import { login } from '../services/api.js';

const CommonLogin = ({ onLoginSuccess, onBackToLanding }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Please enter both Login ID and password.');
      return;
    }

    setLoading(true);
    try {
      const userData = await login(username.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess(userData);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Authentication failed. Please check your credentials.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* 1. Top navigation with Brand and Back button */}
      <header className="login-topbar">
        <div className="login-topbar-container">
          <div
            className="brand-wrapper"
            onClick={onBackToLanding}
            style={{ cursor: 'pointer' }}
            title="Return to SmartAttend Homepage"
          >
            <span className="brand-mark">SA</span>
            <div>
              <span className="brand-name">SmartAttend</span>
              <span className="tagline">Students Attendance Management System</span>
            </div>
          </div>

          <button
            type="button"
            className="btn login-back-btn"
            onClick={onBackToLanding}
          >
            &larr; Back to Homepage
          </button>
        </div>
      </header>

      {/* 2. Centralized Common Login Card */}
      <main className="login-main-content">
        <div className="login-card-box" style={{ maxWidth: '440px', margin: '40px auto', padding: '36px 32px' }}>
          <div className="login-card-header" style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div className="feature-icon-wrapper icon-blue" style={{ margin: '0 auto 16px auto', width: '56px', height: '56px', fontSize: '1.6rem' }}>
              <span>🔐</span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '8px' }}>
              Sign In to SmartAttend
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Enter your institutional credentials. Your workspace is determined automatically.
            </p>
          </div>

          {errorMsg && (
            <div
              className="alert-banner alert-error"
              style={{
                marginBottom: '20px',
                padding: '12px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.88rem'
              }}
            >
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="login-username" style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
                Login ID / Username
              </label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                placeholder="e.g. Student ID, Faculty ID, or Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoFocus
                autoComplete="username"
                style={{ width: '100%', padding: '12px 14px', fontSize: '0.95rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label htmlFor="login-password" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                style={{ width: '100%', padding: '12px 14px', fontSize: '0.95rem' }}
              />
            </div>

            <button
              type="submit"
              className="btn primary-btn login-submit-btn"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span>&rarr;</span>
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Need account assistance? Contact your department administrator or HOD.
            </p>
          </div>
        </div>
      </main>

      {/* 3. Minimal Footer */}
      <footer className="login-footer" style={{ padding: '20px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
        SmartAttend &bull; Students Attendance Management System &bull; Secured with Spring Security &amp; BCrypt
      </footer>
    </div>
  );
};

export default CommonLogin;
