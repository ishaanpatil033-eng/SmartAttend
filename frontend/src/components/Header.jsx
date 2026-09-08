import React from 'react';

const Header = () => {
  return (
    <header className="topbar">
      <div className="brand-wrapper">
        <span className="brand-mark">SA</span>
        <div>
          <span className="brand-name">SmartAttend</span>
          <span className="tagline">Attendance Management System</span>
        </div>
      </div>
      <div className="status-badge">System Initialized</div>
    </header>
  );
};

export default Header;
