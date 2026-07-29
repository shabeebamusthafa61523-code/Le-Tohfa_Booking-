import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { PlusCircle, Edit, Trash2, X, Calendar, ArrowUpDown, LayoutGrid, List, Phone, Clock, User, SlidersHorizontal, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const BookingsList = () => {
  const { toast, showConfirm } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [sortByOption, setSortByOption] = useState('date-asc');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editPhoneError, setEditPhoneError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const filterPanelRef = useRef(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/bookings', {
        params: { search: searchQuery, status: statusFilter },
      });
      setBookings(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [searchQuery, statusFilter]);

  // Close filter popover on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target)) {
        setShowFilterPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validatePhone = (phoneNumber) => {
    if (!phoneNumber) return 'Phone number is required';
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length !== 10) return 'Phone number must be exactly 10 digits';
    return '';
  };

  const getDateBadgeParts = (dateStr) => {
    if (!dateStr) return { day: '1', month: 'JAN' };
    const dt = new Date(dateStr + 'T00:00:00');
    const day = dt.getDate();
    const month = dt.toLocaleString('default', { month: 'short' }).toUpperCase();
    return { day, month };
  };

  const handleInlineStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await axios.put(`/api/bookings/${id}`, { status: newStatus });
      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status: res.data.status } : b))
      );
      toast.success(`Status updated to ${newStatus.toUpperCase()}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = (id, guestName) => {
    showConfirm(`Delete booking block for ${guestName}?`, async () => {
      try {
        await axios.delete(`/api/bookings/${id}`);
        setBookings((prev) => prev.filter((b) => b._id !== id));
        toast.success(`Booking for "${guestName}" removed!`);
      } catch (err) {
        toast.error('Error deleting booking');
      }
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingBooking) return;

    const pErr = validatePhone(editingBooking.phone);
    if (pErr) {
      setEditPhoneError(pErr);
      toast.error(pErr);
      return;
    }

    try {
      const res = await axios.put(`/api/bookings/${editingBooking._id}`, editingBooking);
      setBookings((prev) => prev.map((b) => (b._id === res.data._id ? res.data : b)));
      setEditingBooking(null);
      setEditPhoneError('');
      toast.success('Booking details updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating booking');
    }
  };

  const formatMonthYear = (monthKey) => {
    if (!monthKey) return 'Unscheduled';
    const [y, m] = monthKey.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const availableMonths = useMemo(() => {
    const monthSet = new Set();
    bookings.forEach((b) => {
      if (b.startDate && b.startDate.length >= 7) {
        monthSet.add(b.startDate.substring(0, 7));
      }
    });
    return Array.from(monthSet).sort();
  }, [bookings]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (selectedMonth !== 'all') count++;
    if (sortByOption !== 'date-asc') count++;
    return count;
  }, [statusFilter, selectedMonth, sortByOption]);

  const processedBookings = useMemo(() => {
    let filtered = [...bookings];

    if (selectedMonth !== 'all') {
      filtered = filtered.filter((b) => b.startDate && b.startDate.startsWith(selectedMonth));
    }

    filtered.sort((a, b) => {
      if (sortByOption === 'date-asc') {
        return new Date(a.startDate) - new Date(b.startDate);
      } else if (sortByOption === 'date-desc') {
        return new Date(b.startDate) - new Date(a.startDate);
      } else if (sortByOption === 'name-asc') {
        return (a.guestName || '').localeCompare(b.guestName || '');
      } else if (sortByOption === 'name-desc') {
        return (b.guestName || '').localeCompare(a.guestName || '');
      } else if (sortByOption === 'advance-desc') {
        return (b.advanceAmount || 0) - (a.advanceAmount || 0);
      } else if (sortByOption === 'total-desc') {
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      }
      return new Date(a.startDate) - new Date(b.startDate);
    });

    return filtered;
  }, [bookings, selectedMonth, sortByOption]);

  const groupedByMonth = useMemo(() => {
    const groups = {};
    processedBookings.forEach((b) => {
      const monthKey = b.startDate ? b.startDate.substring(0, 7) : 'Other';
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(b);
    });
    return groups;
  }, [processedBookings]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending':
        return { background: '#fef08a', color: '#854d0e', border: '1px solid #eab308' };
      case 'confirmed':
        return { background: '#dcfce7', color: '#166534', border: '1px solid #22c55e' };
      case 'completed':
        return { background: '#e0f2fe', color: '#075985', border: '1px solid #38bdf8' };
      case 'cancelled':
        return { background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' };
      default:
        return { background: '#fef08a', color: '#854d0e', border: '1px solid #eab308' };
    }
  };

  return (
    <div style={{ maxWidth: '1180px', margin: '1.5rem auto', padding: '0 0.85rem' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', color: 'var(--text-main)', margin: 0 }}>Bookings & Blocked Dates</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.15rem' }}>
            Reservations list with compact Filter & Sort icon menu
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Table vs Grid View Switcher */}
          <div style={{ display: 'flex', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '2px' }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '4px',
                border: 'none',
                background: viewMode === 'table' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <List size={14} /> Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '4px',
                border: 'none',
                background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <LayoutGrid size={14} /> Grid Cards
            </button>
          </div>

          <Link to="/block-date" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <PlusCircle size={18} /> Block New Date
          </Link>
        </div>
      </div>

      {/* SEARCH BAR WITH ALL FILTERS & SORT COMBINED IN A SINGLE ICON BUTTON */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem', overflow: 'visible' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', position: 'relative' }} ref={filterPanelRef}>
          
          {/* Search Input Box */}
          <div style={{ flex: 1 }}>
            <input
              type="text"
              className="form-input"
              style={{ margin: 0 }}
              placeholder="Search Guest Name or Phone Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* SINGLE FILTER & SORT ICON BUTTON */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            style={{
              padding: '0.65rem 0.9rem',
              position: 'relative',
              borderColor: activeFilterCount > 0 ? 'var(--primary)' : undefined,
              background: showFilterPanel ? 'var(--table-header-bg)' : undefined,
            }}
            title="Filter and Sort Options"
          >
            <SlidersHorizontal size={18} color={activeFilterCount > 0 ? '#16a34a' : 'currentColor'} />
            <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>Filter & Sort</span>
            
            {activeFilterCount > 0 && (
              <span style={{
                background: '#16a34a',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: '900',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '0.2rem',
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* POPOVER PANEL CONTAINING ALL FILTERS AND SORTS */}
          {showFilterPanel && (
            <div className="card" style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '320px',
              zIndex: 500,
              padding: '1.25rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
              margin: 0,
              animation: 'slideIn 0.15s ease-out',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <SlidersHorizontal size={16} /> Filters & Sorting
                </h4>
                <button
                  type="button"
                  onClick={() => setShowFilterPanel(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* 1. Month Filter */}
              <div style={{ marginBottom: '0.85rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>🗓️ Filter by Month</label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.82rem', padding: '0.45rem' }}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="all">🗓️ All Months</option>
                  {availableMonths.map((mKey) => (
                    <option key={mKey} value={mKey}>
                      {formatMonthYear(mKey)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Sort Order */}
              <div style={{ marginBottom: '0.85rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>🔀 Sort Order</label>
                <select
                  className="form-select"
                  style={{ fontSize: '0.82rem', padding: '0.45rem', fontWeight: '700' }}
                  value={sortByOption}
                  onChange={(e) => setSortByOption(e.target.value)}
                >
                  <option value="date-asc">📅 Date: Earliest First</option>
                  <option value="date-desc">📅 Date: Latest First</option>
                  <option value="name-asc">👤 Guest Name: A ➔ Z</option>
                  <option value="name-desc">👤 Guest Name: Z ➔ A</option>
                  <option value="advance-desc">💰 Advance: High ➔ Low</option>
                  <option value="total-desc">💰 Total: High ➔ Low</option>
                </select>
              </div>

              {/* 3. Status Filter */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>🏷️ Filter by Status</label>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        border: '1px solid #cbd5e1',
                        background: statusFilter === st ? (st === 'pending' ? '#eab308' : st === 'confirmed' ? '#16a34a' : '#059669') : 'transparent',
                        color: statusFilter === st ? '#ffffff' : 'var(--text-main)',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {st === 'pending' ? '🟡 Pending' : st === 'confirmed' ? '🟢 Confirmed' : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Filters */}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.4rem', fontSize: '0.78rem' }}
                  onClick={() => {
                    setStatusFilter('all');
                    setSelectedMonth('all');
                    setSortByOption('date-asc');
                  }}
                >
                  Reset All Filters
                </button>
              )}

            </div>
          )}

        </div>
      </div>

      {/* View Output (Table vs Grid View) */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading details...</div>
      ) : processedBookings.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No bookings found matching criteria. <Link to="/block-date" style={{ color: '#16a34a' }}>Block a date now</Link>.
        </div>
      ) : (
        Object.keys(groupedByMonth).map((monthKey) => (
          <div key={monthKey} style={{ marginBottom: '1.5rem' }}>
            
            {/* Month Header Banner */}
            <div style={{
              background: 'var(--table-header-bg)',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
            }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                🗓️ {formatMonthYear(monthKey)}
              </h3>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', background: 'var(--card-bg)', color: 'var(--text-main)', padding: '0.15rem 0.55rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                {groupedByMonth[monthKey].length} {groupedByMonth[monthKey].length === 1 ? 'Booking' : 'Bookings'}
              </span>
            </div>

            {/* TABLE VIEW */}
            {viewMode === 'table' ? (
              <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                <div className="table-responsive">
                  <table className="simple-table" style={{ marginTop: 0 }}>
                    <thead>
                      <tr>
                        <th>Date Badge</th>
                        <th>Date Range</th>
                        <th>Type</th>
                        <th>Guest Name</th>
                        <th>Phone Number</th>
                        <th>Time Slot</th>
                        <th>Advance Paid</th>
                        <th>Total</th>
                        <th>Logged By</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedByMonth[monthKey].map((b) => {
                        const { day, month } = getDateBadgeParts(b.startDate);
                        return (
                          <tr key={b._id}>
                            {/* ROUND CHECK-IN DATE AVATAR BADGE */}
                            <td style={{ width: '60px' }}>
                              <div
                                style={{
                                  width: '44px',
                                  height: '44px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #16a34a, #059669)',
                                  color: '#ffffff',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justify: 'center',
                                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
                                }}
                                title={`Check-in: ${b.startDate}`}
                              >
                                <span style={{ fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', lineHeight: 1 }}>
                                  {month}
                                </span>
                                <span style={{ fontSize: '1rem', fontWeight: '900', lineHeight: 1, marginTop: '1px' }}>
                                  {day}
                                </span>
                              </div>
                            </td>

                            <td style={{ fontWeight: '600' }}>
                              {b.startDate} to {b.endDate}
                            </td>
                            <td>
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                background: b.bookingType === 'Daycation' ? '#e0f2fe' : '#dcfce7',
                                color: b.bookingType === 'Daycation' ? '#075985' : '#166534',
                              }}>
                                {b.bookingType || 'Staycation'}
                              </span>
                            </td>
                            <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>{b.guestName}</td>
                            <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{b.phone}</td>
                            <td style={{ fontSize: '0.85rem', fontWeight: '500' }}>{b.checkInTime}</td>
                            <td style={{ fontWeight: '600', color: '#16a34a' }}>
                              ₹{Number(b.advanceAmount || 0).toLocaleString()}
                            </td>
                            <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                              ₹{Number(b.totalAmount || 0).toLocaleString()}
                            </td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              {b.createdByName || 'Staff'}
                            </td>
                            
                            <td>
                              <select
                                className="form-select"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  fontSize: '0.78rem',
                                  fontWeight: '700',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  minWidth: '135px',
                                  ...getStatusStyle(b.status || 'pending'),
                                }}
                                value={b.status || 'pending'}
                                disabled={updatingId === b._id}
                                onChange={(e) => handleInlineStatusChange(b._id, e.target.value)}
                              >
                                <option value="pending" style={{ background: '#ffffff', color: '#854d0e' }}>🟡 Pending (Yellow)</option>
                                <option value="confirmed" style={{ background: '#ffffff', color: '#166534' }}>🟢 Confirmed (Green)</option>
                                <option value="completed" style={{ background: '#ffffff', color: '#075985' }}>🔵 Completed</option>
                                <option value="cancelled" style={{ background: '#ffffff', color: '#991b1b' }}>🔴 Cancelled</option>
                              </select>
                            </td>

                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                  onClick={() => { setEditingBooking(b); setEditPhoneError(''); }}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                                  title="Edit Details"
                                >
                                  <Edit size={13} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(b._id, b.guestName)}
                                  className="btn btn-danger"
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                                  title="Delete Block"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* GRID CARDS VIEW WITH ROUND DATE AVATAR BADGE */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {groupedByMonth[monthKey].map((b) => {
                  const { day, month } = getDateBadgeParts(b.startDate);
                  return (
                    <div key={b._id} className="card" style={{ padding: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        
                        {/* Card Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            
                            {/* ROUND CHECK-IN DATE AVATAR BADGE */}
                            <div
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #16a34a, #059669)',
                                color: '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.35)',
                                flexShrink: 0,
                              }}
                              title={`Check-in: ${b.startDate}`}
                            >
                              <span style={{ fontSize: '0.62rem', fontWeight: '800', textTransform: 'uppercase', lineHeight: 1 }}>
                                {month}
                              </span>
                              <span style={{ fontSize: '1.1rem', fontWeight: '900', lineHeight: 1, marginTop: '2px' }}>
                                {day}
                              </span>
                            </div>

                            <div>
                              <span style={{
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                background: b.bookingType === 'Daycation' ? '#e0f2fe' : '#dcfce7',
                                color: b.bookingType === 'Daycation' ? '#075985' : '#166534',
                              }}>
                                {b.bookingType === 'Daycation' ? '☀️ Daycation' : '🛋️ Staycation'}
                              </span>
                            </div>

                          </div>

                          <select
                            className="form-select"
                            style={{
                              padding: '0.25rem 0.45rem',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              width: 'auto',
                              ...getStatusStyle(b.status || 'pending'),
                            }}
                            value={b.status || 'pending'}
                            disabled={updatingId === b._id}
                            onChange={(e) => handleInlineStatusChange(b._id, e.target.value)}
                          >
                            <option value="pending" style={{ background: '#ffffff', color: '#854d0e' }}>🟡 Pending</option>
                            <option value="confirmed" style={{ background: '#ffffff', color: '#166534' }}>🟢 Confirmed</option>
                            <option value="completed" style={{ background: '#ffffff', color: '#075985' }}>🔵 Completed</option>
                            <option value="cancelled" style={{ background: '#ffffff', color: '#991b1b' }}>🔴 Cancelled</option>
                          </select>
                        </div>

                        {/* Guest Name & Dates */}
                        <h4 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: '0 0 0.35rem 0', fontWeight: '800' }}>
                          {b.guestName}
                        </h4>

                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#16a34a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={14} /> {b.startDate} ➔ {b.endDate}
                        </div>

                        {/* Info Details List */}
                        <div style={{ background: 'var(--table-header-bg)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', fontWeight: '600', marginBottom: '0.25rem' }}>
                            <Phone size={13} />
                            <a href={`tel:${b.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {b.phone}
                            </a>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            <Clock size={13} /> {b.checkInTime}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.35rem', borderTop: '1px dashed var(--border-color)', marginTop: '0.35rem' }}>
                            <span>Advance: <strong style={{ color: '#16a34a' }}>₹{Number(b.advanceAmount || 0).toLocaleString()}</strong></span>
                            <span>Total: <strong>₹{Number(b.totalAmount || 0).toLocaleString()}</strong></span>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                          👤 Logged By: <strong>{b.createdByName || 'Staff'}</strong>
                        </div>

                      </div>

                      {/* Card Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                        <button
                          onClick={() => { setEditingBooking(b); setEditPhoneError(''); }}
                          className="btn btn-secondary"
                          style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.4rem' }}
                        >
                          <Edit size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(b._id, b.guestName)}
                          className="btn btn-danger"
                          style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '0.4rem' }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        ))
      )}

      {/* DEAD-CENTERED EDIT MODAL RESPONSIVE */}
      {editingBooking && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 11000, padding: '1rem', boxSizing: 'border-box',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', margin: 'auto', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-main)' }}>Edit Booking Details</h3>
              <button onClick={() => setEditingBooking(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="form-label">Staff / Handled By</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingBooking.createdByName || 'Staff'}
                  onChange={(e) => setEditingBooking({ ...editingBooking, createdByName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Guest Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingBooking.guestName}
                  onChange={(e) => setEditingBooking({ ...editingBooking, guestName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (Exactly 10 Digits)</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ borderColor: editPhoneError ? '#ef4444' : undefined }}
                  value={editingBooking.phone}
                  maxLength="10"
                  onChange={(e) => {
                    const p = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setEditingBooking({ ...editingBooking, phone: p });
                    setEditPhoneError(validatePhone(p));
                  }}
                />
                {editPhoneError && (
                  <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '0.2rem' }}>
                    ⚠️ {editPhoneError}
                  </span>
                )}
              </div>

              <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Advance Paid (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editingBooking.advanceAmount}
                    onChange={(e) => setEditingBooking({ ...editingBooking, advanceAmount: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Total Amount (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editingBooking.totalAmount || 0}
                    onChange={(e) => setEditingBooking({ ...editingBooking, totalAmount: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={editingBooking.status || 'pending'}
                  onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value })}
                >
                  <option value="pending">🟡 Pending (Yellow)</option>
                  <option value="confirmed">🟢 Confirmed (Green)</option>
                  <option value="completed">🔵 Completed (Blue)</option>
                  <option value="cancelled">🔴 Cancelled (Red)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingBooking(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={Boolean(editPhoneError) || editingBooking.phone?.length !== 10}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
