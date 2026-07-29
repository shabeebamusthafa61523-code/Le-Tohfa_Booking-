import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, List, PlusCircle, Sun, Moon, Palmtree, LayoutDashboard } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isCalendarActive = location.pathname === '/' || location.pathname === '/calendar';

  return (
    <nav className="navbar">
      <div className="nav-container">
        
        {/* LETOHFA BOOKING Brand Title */}
        <NavLink to="/" className="nav-brand" title="LETOHFA BOOKING">
          <Palmtree color="#16a34a" size={26} />
          <span style={{ fontWeight: '900', fontSize: '1.25rem', color: 'var(--text-main)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            LETOHFA BOOKING
          </span>
        </NavLink>

        {/* Navigation Links & Day/Night Mode Symbol Toggle */}
        <div className="nav-links">
          
          <NavLink
            to="/calendar"
            className={isCalendarActive ? 'nav-link active' : 'nav-link'}
          >
            <Calendar size={16} /> Calendar
          </NavLink>

          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>

          <NavLink
            to="/bookings"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <List size={16} /> Bookings List
          </NavLink>

          <NavLink
            to="/block-date"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <PlusCircle size={16} /> Block Date
          </NavLink>

          {/* Theme Switcher Symbol Only Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn"
            style={{
              padding: '0.45rem',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justify: 'center',
              width: '36px',
              height: '36px',
            }}
            title={theme === 'light' ? 'Switch to Night Mode (Dark)' : 'Switch to Day Mode (Light)'}
          >
            {theme === 'light' ? (
              <Moon size={18} color="#0284c7" />
            ) : (
              <Sun size={18} color="#eab308" />
            )}
          </button>

        </div>

      </div>
    </nav>
  );
};
