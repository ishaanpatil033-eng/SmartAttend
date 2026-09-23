import React, { useState, useEffect, useRef } from 'react';
import { login, getHealthStatus } from '../services/api.js';

const CommonLogin = ({ onLoginSuccess, onBackToLanding }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const slowTimerRef = useRef(null);

  // Pre-wake Render Free Tier backend via lightweight GET /api/health
  // Strictly non-blocking and independent; never delays or interferes with login
  useEffect(() => {
    getHealthStatus().catch(() => {});
    return () => {
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions

    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Please enter both Login ID and password.');
      return;
    }

    setLoading(true);
    setIsWakingUp(false);

    // If backend takes longer than 6 seconds (Render Free Tier cold start), inform user
    slowTimerRef.current = setTimeout(() => {
      setIsWakingUp(true);
    }, 6000);

    try {
      const userData = await login(username.trim(), password);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      if (onLoginSuccess) {
        onLoginSuccess(userData);
      }
    } catch (err) {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);

      if (err.response) {
        const status = err.response.status;
        if (status === 401) {
          // A. HTTP 401 / actual invalid credentials
          setErrorMsg(err.response.data?.error || 'Invalid username or password.');
        } else if (status >= 500) {
          // C. HTTP 5xx backend failure
          setErrorMsg('Server is temporarily unavailable. Please try again.');
        } else {
          // D. Other unexpected HTTP errors
          setErrorMsg(err.response.data?.error || err.response.data?.message || 'An unexpected error occurred. Please try again.');
        }
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout') || err.message?.includes('Network Error')) {
        // B. Network failure / timeout / backend waking up
        setErrorMsg('Server is waking up. Please wait a few seconds and try again.');
      } else {
        // Fallback for missing HTTP response / network issue without falsely blaming credentials
        setErrorMsg('Server is waking up. Please wait a few seconds and try again.');
      }
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setLoading(false);
      setIsWakingUp(false);
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
                  <span>{isWakingUp ? 'Waking up server, please wait...' : 'Signing in...'}</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span>&rarr;</span>
                </>
              )}
            </button>
            {loading && isWakingUp && (
              <p
                style={{
                  marginTop: '12px',
                  marginBottom: 0,
                  fontSize: '0.82rem',
                  color: 'var(--color-primary)',
                  textAlign: 'center',
                  lineHeight: 1.4
                }}
              >
                The cloud server is waking up from idle. Please wait a moment while it finishes starting...
              </p>
            )}
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
