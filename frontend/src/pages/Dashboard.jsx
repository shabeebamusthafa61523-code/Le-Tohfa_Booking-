import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  PlusCircle,
  List,
  Users,
  Sun,
  Home,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', '7days', 'thisMonth', 'upcoming'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' (earliest date), 'desc' (latest date)

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/bookings');
      setBookings(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered & Sorted Bookings according to Date Filter & Sort Order
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'today') {
      result = result.filter((b) => b.startDate <= todayStr && b.endDate >= todayStr);
    } else if (dateFilter === '7days') {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      result = result.filter((b) => b.startDate >= todayStr && b.startDate <= nextWeekStr);
    } else if (dateFilter === 'thisMonth') {
      const currentMonthStr = todayStr.substring(0, 7);
      result = result.filter((b) => b.startDate && b.startDate.startsWith(currentMonthStr));
    } else if (dateFilter === 'upcoming') {
      result = result.filter((b) => b.startDate >= todayStr);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [bookings, dateFilter, sortOrder]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    const totalCount = bookings.length;
    const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
    const pendingCount = bookings.filter((b) => b.status === 'pending').length;
    const completedCount = bookings.filter((b) => b.status === 'completed').length;
    const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;

    const totalAdvance = bookings.reduce((sum, b) => sum + Number(b.advanceAmount || 0), 0);
    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

    const staycationCount = bookings.filter((b) => b.bookingType === 'Staycation' || !b.bookingType).length;
    const daycationCount = bookings.filter((b) => b.bookingType === 'Daycation').length;

    return {
      totalCount,
      confirmedCount,
      pendingCount,
      completedCount,
      cancelledCount,
      totalAdvance,
      totalRevenue,
      staycationCount,
      daycationCount,
    };
  }, [bookings]);

  return (
    <div style={{ maxWidth: '1180px', margin: '1.5rem auto', padding: '0 0.85rem' }}>
      
      {/* Dashboard Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', color: 'var(--text-main)', margin: 0, fontWeight: '800' }}>
            📊 Resort Management Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.15rem' }}>
            Real-time analytics, revenue metrics, and date-sorted reservations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/calendar')} className="btn btn-secondary" style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem' }}>
            <Calendar size={16} /> Open Calendar
          </button>
          <button onClick={() => navigate('/block-date')} className="btn btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}>
            <PlusCircle size={16} /> Block New Date
          </button>
        </div>
      </div>

      {/* ANALYTICS STAT CARDS GRID */}
      <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1: Total Bookings */}
        <div className="card" style={{ padding: '1.1rem', margin: 0, borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700' }}>
            <span>TOTAL BOOKINGS</span>
            <Users size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)', marginTop: '0.25rem' }}>
            {metrics.totalCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            🛋️ {metrics.staycationCount} Staycations | ☀️ {metrics.daycationCount} Daycations
          </div>
        </div>

        {/* Card 2: Confirmed Bookings */}
        <div className="card" style={{ padding: '1.1rem', margin: 0, borderLeft: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700' }}>
            <span>CONFIRMED</span>
            <CheckCircle2 size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#16a34a', marginTop: '0.25rem' }}>
            {metrics.confirmedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            🟢 Active confirmed resort dates
          </div>
        </div>

        {/* Card 3: Pending Bookings */}
        <div className="card" style={{ padding: '1.1rem', margin: 0, borderLeft: '4px solid #eab308' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700' }}>
            <span>PENDING HOLDS</span>
            <Clock size={18} color="#eab308" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ca8a04', marginTop: '0.25rem' }}>
            {metrics.pendingCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            🟡 Pending confirmation
          </div>
        </div>

        {/* Card 4: Total Revenue Collected */}
        <div className="card" style={{ padding: '1.1rem', margin: 0, borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700' }}>
            <span>TOTAL ADVANCE REVENUE</span>
            <DollarSign size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: '900', color: '#059669', marginTop: '0.25rem' }}>
            ₹{metrics.totalAdvance.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Total Value: ₹{metrics.totalRevenue.toLocaleString()}
          </div>
        </div>

      </div>

      {/* RECENT RESERVATIONS & DATE SORTING TOOLBAR */}
      <div className="card" style={{ padding: '1.25rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0, fontWeight: '800' }}>
              🗓️ Reservations & Date Sorting
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {filteredBookings.length} of {bookings.length} reservations
            </span>
          </div>

          {/* DATE FILTER & SORTING CONTROLS */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            
            {/* Quick Date Range Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                <Filter size={14} /> Filter:
              </span>
              <select
                className="form-select"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem', fontWeight: '700', width: 'auto' }}
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">🗓️ All Dates</option>
                <option value="today">⚡ Today's Reservations</option>
                <option value="7days">📆 Next 7 Days</option>
                <option value="thisMonth">📅 Current Month</option>
                <option value="upcoming">🚀 Upcoming Dates</option>
              </select>
            </div>

            {/* Date Sort Order Switcher */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem' }}
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title="Toggle Date Sorting Order"
            >
              <ArrowUpDown size={14} /> Date: {sortOrder === 'asc' ? 'Earliest First (A-Z)' : 'Latest First (Z-A)'}
            </button>

          </div>
        </div>

        {/* RESERVATIONS TABLE */}
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading reservations...</div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No reservations found for the selected date filter.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Check-in Date</th>
                  <th>Check-out Date</th>
                  <th>Type</th>
                  <th>Guest Name</th>
                  <th>Phone Number</th>
                  <th>Time Slot</th>
                  <th>Advance Paid</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: '800', color: '#16a34a' }}>{b.startDate}</td>
                    <td style={{ fontWeight: '600' }}>{b.endDate}</td>
                    <td>
                      <span style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        background: b.bookingType === 'Daycation' ? '#e0f2fe' : '#dcfce7',
                        color: b.bookingType === 'Daycation' ? '#075985' : '#166534',
                      }}>
                        {b.bookingType === 'Daycation' ? '☀️ Daycation' : '🛋️ Staycation'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700' }}>{b.guestName}</td>
                    <td style={{ fontWeight: '600' }}>{b.phone}</td>
                    <td style={{ fontSize: '0.82rem' }}>{b.checkInTime}</td>
                    <td style={{ fontWeight: '700', color: '#16a34a' }}>₹{Number(b.advanceAmount || 0).toLocaleString()}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        background: b.status === 'confirmed' ? '#dcfce7' : b.status === 'pending' ? '#fef08a' : '#e0f2fe',
                        color: b.status === 'confirmed' ? '#166534' : b.status === 'pending' ? '#854d0e' : '#075985',
                        border: '1px solid ' + (b.status === 'confirmed' ? '#22c55e' : b.status === 'pending' ? '#eab308' : '#38bdf8'),
                      }}>
                        {b.status === 'confirmed' ? '🟢 Confirmed' : b.status === 'pending' ? '🟡 Pending' : b.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                        onClick={() => navigate('/bookings')}
                      >
                        View in List
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
