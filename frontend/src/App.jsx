import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { SplashScreen } from './components/SplashScreen';
import { Dashboard } from './pages/Dashboard';
import { BlockDateForm } from './pages/BlockDateForm';
import { BookingsList } from './pages/BookingsList';
import { CalendarView } from './pages/CalendarView';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';

export function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ThemeProvider>
      <ToastProvider>
        {showSplash && <SplashScreen onFinished={() => setShowSplash(false)} />}
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)' }}>
            <Navbar />
            <Routes>
              {/* Default Landing Page is Calendar View */}
              <Route path="/" element={<CalendarView />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bookings" element={<BookingsList />} />
              <Route path="/block-date" element={<BlockDateForm />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
