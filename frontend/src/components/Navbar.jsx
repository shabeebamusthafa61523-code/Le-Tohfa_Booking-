import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Calendar, List, PlusCircle, Sun, Moon, Palmtree, LayoutDashboard, Wifi, WifiOff, Share2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { syncOfflineBookings } from '../utils/offlineStorage';

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const isCalendarActive = location.pathname === '/' || location.pathname === '/calendar';

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast.info('📶 Internet reconnected! Syncing offline bookings...');
      await syncOfflineBookings(axios, toast);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('📶 You are offline. Changes will be saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      syncOfflineBookings(axios, toast);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleShareApp = async () => {
    const shareUrl = window.location.origin;
    const shareData = {
      title: 'LETOHFA BOOKING App',
      text: 'Open and install LETOHFA Booking App on your home screen:',
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        // User cancelled or share failed, fallback to clipboard
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('🔗 App Link copied to clipboard! Share on WhatsApp to install on home screen.');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        
        {/* LETOHFA BOOKING Brand Title & Online/Offline Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NavLink to="/" className="nav-brand" title="LETOHFA BOOKING">
            <Palmtree color="#16a34a" size={26} />
            <span style={{ fontWeight: '900', fontSize: '1.25rem', color: 'var(--text-main)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              LETOHFA BOOKING
            </span>
          </NavLink>

          {!isOnline && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                background: '#fee2e2',
                color: '#991b1b',
                padding: '0.15rem 0.5rem',
                borderRadius: '10px',
                border: '1px solid #fca5a5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              title="You are currently offline. Bookings save locally & auto-sync when online."
            >
              <WifiOff size={11} /> Offline Mode
            </span>
          )}
        </div>

        {/* Navigation Links & Day/Night Mode Symbol Toggle & Share App */}
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

          {/* Share App Link Button */}
          <button
            type="button"
            onClick={handleShareApp}
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
            title="Share App Link / Install to Home Screen"
          >
            <Share2 size={17} color="#16a34a" />
          </button>

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
