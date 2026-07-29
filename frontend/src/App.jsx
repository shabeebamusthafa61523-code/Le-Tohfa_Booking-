import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { BlockDateForm } from './pages/BlockDateForm';
import { BookingsList } from './pages/BookingsList';
import { CalendarView } from './pages/CalendarView';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-main)' }}>
            <Navbar />
            <Routes>
              {/* Default Landing Page is Dashboard */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/bookings" element={<BookingsList />} />
              <Route path="/block-date" element={<BlockDateForm />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
