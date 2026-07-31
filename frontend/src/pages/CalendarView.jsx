import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, ChevronRight, PlusCircle, User, Phone, Clock, Calendar as CalendarIcon, FileText, X, Edit, Zap, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { generateAdvanceInvoice } from '../utils/invoiceGenerator';
import { saveCachedBookings, getCachedBookings, getOfflinePendingQueue } from '../utils/offlineStorage';

export const CalendarView = () => {
  const { toast, showConfirm } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [selectedBookingModal, setSelectedBookingModal] = useState(null);
  const [selectedEmptyDateModal, setSelectedEmptyDateModal] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editPhoneError, setEditPhoneError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const fetchBookings = async () => {
    try {
      const res = await axios.get('/api/bookings');
      const pendingQueue = getOfflinePendingQueue();
      const combined = [...res.data];
      pendingQueue.forEach(p => {
        if (!combined.some(b => b._id === p._id)) {
          combined.push(p);
        }
      });
      setBookings(combined);
      saveCachedBookings(combined);
      setIsOffline(false);
    } catch (err) {
      // Fallback to offline cached bookings + pending queue
      const cached = getCachedBookings();
      setBookings(cached);
      setIsOffline(true);
      if (cached.length > 0) {
        toast.info('📶 Offline Mode — Loaded cached calendar bookings');
      }
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [month, year]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getBookingsForDate = (dateStr) => {
    return bookings.filter(b => {
      if (b.status === 'cancelled') return false;
      const type = (b.bookingType || 'Staycation').toLowerCase();
      // For staycation, startDate is check-in (3pm), endDate is check-out (12pm)
      // dateStr is included if it falls between startDate and endDate
      const endDate = (type === 'staycation' && b.endDate === b.startDate) ? calculateEndDate(b.startDate) : (b.endDate || b.startDate);
      return b.startDate <= dateStr && endDate >= dateStr;
    });
  };

  const getStatusColorConfig = (status) => {
    switch (status) {
      case 'pending':
        return {
          cellBg: '#fef08a',
          cellBorder: '#eab308',
          pillBg: '#ca8a04',
          pillText: '#ffffff',
          badgeBg: '#fef08a',
          badgeText: '#854d0e',
          badgeBorder: '#eab308',
          label: '🟡 Pending (Yellow)',
        };
      case 'confirmed':
        return {
          cellBg: '#dcfce7',
          cellBorder: '#22c55e',
          pillBg: '#16a34a',
          pillText: '#ffffff',
          badgeBg: '#dcfce7',
          badgeText: '#166534',
          badgeBorder: '#22c55e',
          label: '🟢 Confirmed (Green)',
        };
      case 'completed':
        return {
          cellBg: '#e0f2fe',
          cellBorder: '#38bdf8',
          pillBg: '#0284c7',
          pillText: '#ffffff',
          badgeBg: '#e0f2fe',
          badgeText: '#075985',
          badgeBorder: '#38bdf8',
          label: '🔵 Completed (Blue)',
        };
      case 'cancelled':
        return {
          cellBg: '#fee2e2',
          cellBorder: '#f87171',
          pillBg: '#dc2626',
          pillText: '#ffffff',
          badgeBg: '#fee2e2',
          badgeText: '#991b1b',
          badgeBorder: '#f87171',
          label: '🔴 Cancelled (Red)',
        };
      default:
        return {
          cellBg: '#fef08a',
          cellBorder: '#eab308',
          pillBg: '#ca8a04',
          pillText: '#ffffff',
          badgeBg: '#fef08a',
          badgeText: '#854d0e',
          badgeBorder: '#eab308',
          label: '🟡 Pending',
        };
    }
  };

  const calculateEndDate = (startStr) => {
    const dt = new Date(startStr + 'T00:00:00');
    dt.setDate(dt.getDate() + 1);
    return dt.toISOString().split('T')[0];
  };

  const handleQuickTempHold = async (dateStr) => {
    setLoading(true);
    const staffName = localStorage.getItem('resort_active_staff_name') || 'Staff 1';

    try {
      const res = await axios.post('/api/bookings', {
        guestName: 'Temporary Block',
        phone: '0000000000',
        startDate: dateStr,
        endDate: calculateEndDate(dateStr),
        bookingType: 'Staycation',
        checkInTime: '3:00 PM to 12:00 PM',
        advanceAmount: 0,
        totalAmount: 0,
        status: 'pending',
        notes: 'Temporary date hold',
        createdByName: staffName,
        isTemporary: true,
      });

      setBookings((prev) => [...prev, res.data]);
      setSelectedEmptyDateModal(null);
      toast.temp(`⚡ Temporary hold created for ${dateStr}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create temporary hold');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFromCalendar = (id, guestName) => {
    showConfirm(`Delete date block for "${guestName}"?`, async () => {
      try {
        await axios.delete(`/api/bookings/${id}`);
        setBookings((prev) => prev.filter((b) => b._id !== id));
        setSelectedBookingModal(null);
        toast.success(`Booking for "${guestName}" deleted!`);
      } catch (err) {
        toast.error('Error deleting block');
      }
    });
  };

  const handleCellClick = (dateStr, activeBookings) => {
    const checkinBooking = activeBookings.find(b => b.startDate === dateStr);
    if (checkinBooking) {
      setSelectedBookingModal(checkinBooking);
    } else {
      setSelectedEmptyDateModal(dateStr);
    }
  };

  const handleBookingPillClick = (e, booking) => {
    e.stopPropagation();
    setSelectedBookingModal(booking);
  };

  const validatePhone = (phoneNumber) => {
    if (!phoneNumber) return 'Phone number is required';
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length !== 10) return 'Phone number must be exactly 10 digits';
    return '';
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
      setSelectedBookingModal(res.data);
      setEditPhoneError('');
      toast.success('Booking details updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating booking');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '1rem auto', padding: '0 0.6rem' }}>
      
      {/* Super Responsive Single-Line Month Navigation Bar */}
      <div className="card" style={{ padding: '0.55rem 0.75rem', marginBottom: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap', overflowX: 'auto' }}>
        
        {/* Month Title & Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <button
            onClick={prevMonth}
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.45rem', fontSize: '0.8rem', borderRadius: '50%', minWidth: '32px', height: '32px', justifyContent: 'center' }}
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>

          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0, fontWeight: '800', whiteSpace: 'nowrap' }}>
            {monthNames[month]} {year}
          </h2>

          <button
            onClick={nextMonth}
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.45rem', fontSize: '0.8rem', borderRadius: '50%', minWidth: '32px', height: '32px', justifyContent: 'center' }}
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem' }}
          >
            Today
          </button>
          
          <button
            onClick={() => navigate('/block-date')}
            className="btn btn-primary"
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
          >
            <PlusCircle size={14} /> Block Date
          </button>
        </div>

      </div>

      {/* Short Status Color Legend */}
      <div className="card" style={{ padding: '0.5rem 0.85rem', marginBottom: '0.65rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-main)' }}>Key:</span>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.72rem', fontWeight: '700' }}>
          <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', background: '#fef08a', color: '#854d0e', border: '1px solid #eab308' }}>
            🟡 Pending
          </span>
          <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', background: '#dcfce7', color: '#166534', border: '1px solid #22c55e' }}>
            🟢 Confirmed
          </span>
          <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', background: '#e0f2fe', color: '#075985', border: '1px solid #38bdf8' }}>
            🔵 Completed
          </span>
          <span style={{ padding: '0.15rem 0.45rem', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171' }}>
            🔴 Cancelled
          </span>
        </div>
      </div>

      {/* BIGGER DATES Calendar Grid */}
      <div className="card" style={{ padding: '0.6rem', overflowX: 'auto' }}>
        <div style={{ minWidth: '580px' }}>
          
          {/* Day Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Cells with BIGGER Date Numbers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`empty-${idx}`} style={{ minHeight: '62px', background: 'var(--table-header-bg)', borderRadius: '6px', opacity: 0.4 }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const activeBookings = getBookingsForDate(dateStr);
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              // Check if dateStr is checkout day for a Staycation (e.g. 31st)
              const checkoutBooking = activeBookings.find(b => {
                const type = (b.bookingType || 'Staycation').toLowerCase();
                const end = (type === 'staycation' && b.endDate === b.startDate) ? calculateEndDate(b.startDate) : (b.endDate || b.startDate);
                return type === 'staycation' && end === dateStr && b.startDate !== dateStr;
              });

              // Check if dateStr is checkin day for a Staycation/Daycation (starts today)
              const checkinBooking = activeBookings.find(b => b.startDate === dateStr);

              let cellStyle = { background: 'var(--card-bg)', border: '1px solid var(--border-color)' };
              let isHalfFilled = false;

              if (checkoutBooking && !checkinBooking) {
                // HALF-FILLED DAY CELL: Checkout at 12pm, available from 3pm!
                isHalfFilled = true;
                const cfg = getStatusColorConfig(checkoutBooking.status);
                cellStyle = {
                  background: `linear-gradient(135deg, ${cfg.cellBg} 48%, var(--card-bg) 52%)`,
                  border: `2px dashed ${cfg.cellBorder}`,
                };
              } else if (checkoutBooking && checkinBooking) {
                // SPLIT DAY CELL: One checks out at 12pm, new one checks in at 3pm!
                const cfgOut = getStatusColorConfig(checkoutBooking.status);
                const cfgIn = getStatusColorConfig(checkinBooking.status);
                cellStyle = {
                  background: `linear-gradient(135deg, ${cfgOut.cellBg} 48%, ${cfgIn.cellBg} 52%)`,
                  border: `2px solid ${cfgIn.cellBorder}`,
                };
              } else if (activeBookings.length > 0) {
                const primaryBooking = activeBookings[0];
                const cfg = getStatusColorConfig(primaryBooking.status);
                cellStyle = { background: cfg.cellBg, border: `2px solid ${cfg.cellBorder}` };
              }

              return (
                <div
                  key={dateStr}
                  onClick={() => handleCellClick(dateStr, activeBookings)}
                  style={{
                    minHeight: '68px',
                    borderRadius: '6px',
                    padding: '0.25rem 0.35rem',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    border: isToday ? '2.5px solid #16a34a' : cellStyle.border,
                    background: cellStyle.background,
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                  }}
                  title={activeBookings.length > 0 ? `${dayNum}: ${activeBookings.map(b=>b.guestName).join(', ')}` : `${dayNum}: Click to block`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* BIGGER, BOLDER DATE NUMBER */}
                    <span style={{
                      fontWeight: '900',
                      fontSize: '1.15rem',
                      color: isToday ? '#16a34a' : 'var(--text-main)',
                      background: isToday ? '#dcfce7' : 'transparent',
                      padding: isToday ? '0.05rem 0.35rem' : '0',
                      borderRadius: '4px',
                      lineHeight: '1.1',
                    }}>
                      {dayNum}
                    </span>

                    {isHalfFilled && (
                      <span style={{ fontSize: '0.62rem', fontWeight: '800', background: '#dcfce7', color: '#166534', padding: '0.05rem 0.3rem', borderRadius: '4px', border: '1px solid #86efac' }}>
                        🌗 12 PM Checkout
                      </span>
                    )}

                    {!isHalfFilled && activeBookings.length > 0 && (
                      <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#334155' }}>
                        {activeBookings.length}
                      </span>
                    )}
                  </div>

                  {activeBookings.map((b) => {
                    const cfg = getStatusColorConfig(b.status);
                    const isCheckout = b.endDate === dateStr && b.startDate !== dateStr;
                    const displayName = (b.guestName || 'Guest').trim();
                    const shortName = displayName.length > 5 ? `${displayName.slice(0, 5)}..` : displayName;
                    return (
                      <div
                        key={b._id}
                        onClick={(e) => handleBookingPillClick(e, b)}
                        style={{
                          background: isCheckout ? '#64748b' : cfg.pillBg,
                          color: '#ffffff',
                          fontSize: '0.68rem',
                          padding: '0.1rem 0.3rem',
                          borderRadius: '3px',
                          fontWeight: '800',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.2',
                          marginTop: '2px',
                        }}
                        title={`${displayName} (${isCheckout ? 'Check-out 12 PM' : 'Check-in 3 PM'}) - Click for details`}
                      >
                        {isCheckout ? `🚪 Out 12PM: ${shortName}` : `🔒 ${shortName}`}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* DEAD-CENTERED POPUP MODAL FOR DATE SELECTION / CHECKOUT DAY */}
      {selectedEmptyDateModal && (() => {
        const checkoutB = getBookingsForDate(selectedEmptyDateModal).find(b => {
          const type = (b.bookingType || 'Staycation').toLowerCase();
          const end = (type === 'staycation' && b.endDate === b.startDate) ? calculateEndDate(b.startDate) : (b.endDate || b.startDate);
          return type === 'staycation' && end === selectedEmptyDateModal && b.startDate !== selectedEmptyDateModal;
        });

        return (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '1rem', boxSizing: 'border-box',
          }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '1.25rem', textAlign: 'center', margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)', fontWeight: '700' }}>
                  Action for {selectedEmptyDateModal}
                </h3>
                <button onClick={() => setSelectedEmptyDateModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              {checkoutB ? (
                <div style={{ background: '#f0fdf4', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #86efac', marginBottom: '1rem', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: '800' }}>
                    🌗 CHECKOUT DAY NOTICE
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: '600', marginTop: '0.2rem' }}>
                    <strong>{checkoutB.guestName}</strong> checks out at 12:00 PM Noon.
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: '700', marginTop: '0.3rem', background: '#dcfce7', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                    ✅ You CAN book a new Staycation starting at 3:00 PM!
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.1rem' }}>
                  Select option for this date:
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ justifyContent: 'center', padding: '0.65rem', fontSize: '0.88rem' }}
                  onClick={() => {
                    const dateToBook = selectedEmptyDateModal;
                    setSelectedEmptyDateModal(null);
                    navigate('/block-date', { state: { selectedDate: dateToBook, bookingType: 'Staycation' } });
                  }}
                >
                  📝 Book Staycation starting 3:00 PM
                </button>

                <button
                  className="btn"
                  style={{ background: '#fef08a', color: '#854d0e', border: '1px solid #eab308', justifyContent: 'center', padding: '0.6rem', fontWeight: '700', fontSize: '0.88rem' }}
                  onClick={() => handleQuickTempHold(selectedEmptyDateModal)}
                  disabled={loading}
                >
                  <Zap size={16} color="#d97706" /> {loading ? 'Holding Date...' : '⚡ Quick Hold (3:00 PM Staycation)'}
                </button>

                {checkoutB && (
                  <button
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center', padding: '0.5rem', fontSize: '0.82rem' }}
                    onClick={() => {
                      const cb = checkoutB;
                      setSelectedEmptyDateModal(null);
                      setSelectedBookingModal(cb);
                    }}
                  >
                    🚪 View {checkoutB.guestName} Checkout Details
                  </button>
                )}

                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'center', marginTop: '0.2rem', padding: '0.5rem', fontSize: '0.82rem' }}
                  onClick={() => setSelectedEmptyDateModal(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DEAD-CENTERED VIEW BOOKING DETAILS MODAL */}
      {selectedBookingModal && !editingBooking && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem', boxSizing: 'border-box',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.35rem', maxHeight: '90vh', overflowY: 'auto', margin: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Reservation Details
                </span>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0, fontWeight: '700' }}>
                  {selectedBookingModal.guestName}
                </h3>
              </div>

              <button
                onClick={() => setSelectedBookingModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: '700',
                ...getStatusColorConfig(selectedBookingModal.status).badgeBg && {
                  background: getStatusColorConfig(selectedBookingModal.status).badgeBg,
                  color: getStatusColorConfig(selectedBookingModal.status).badgeText,
                  border: `1px solid ${getStatusColorConfig(selectedBookingModal.status).badgeBorder}`,
                }
              }}>
                {getStatusColorConfig(selectedBookingModal.status).label}
              </span>

              <span style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: '700',
                background: selectedBookingModal.bookingType === 'Daycation' ? '#e0f2fe' : '#dcfce7',
                color: selectedBookingModal.bookingType === 'Daycation' ? '#075985' : '#166534',
                border: '1px solid ' + (selectedBookingModal.bookingType === 'Daycation' ? '#7dd3fc' : '#86efac'),
              }}>
                {selectedBookingModal.bookingType === 'Daycation' ? '☀️ Daycation' : '🛋️ Staycation'}
              </span>
            </div>

            <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.85rem' }}>
              
              <div style={{ background: 'var(--table-header-bg)', padding: '0.55rem', borderRadius: '5px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Phone size={11} /> Phone
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '0.1rem' }}>
                  <a href={`tel:${selectedBookingModal.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {selectedBookingModal.phone}
                  </a>
                </div>
              </div>

              <div style={{ background: 'var(--table-header-bg)', padding: '0.55rem', borderRadius: '5px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={11} /> Time Slot
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '0.1rem' }}>
                  {selectedBookingModal.checkInTime}
                </div>
              </div>

              <div style={{ background: 'var(--table-header-bg)', padding: '0.55rem', borderRadius: '5px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CalendarIcon size={11} /> Check-in
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#16a34a', marginTop: '0.1rem' }}>
                  {selectedBookingModal.startDate}
                </div>
              </div>

              <div style={{ background: 'var(--table-header-bg)', padding: '0.55rem', borderRadius: '5px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CalendarIcon size={11} /> Check-out
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#16a34a', marginTop: '0.1rem' }}>
                  {(() => {
                    const b = selectedBookingModal;
                    if (b.bookingType === 'Staycation' && (b.endDate === b.startDate || !b.endDate)) {
                      const parts = (b.startDate || '').split('-');
                      if (parts.length === 3) {
                        const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                        dt.setDate(dt.getDate() + 1);
                        const resY = dt.getFullYear();
                        const resM = String(dt.getMonth() + 1).padStart(2, '0');
                        const resD = String(dt.getDate()).padStart(2, '0');
                        return `${resY}-${resM}-${resD}`;
                      }
                    }
                    return b.endDate || b.startDate;
                  })()}
                </div>
              </div>

              <div style={{ background: 'var(--table-header-bg)', padding: '0.55rem', borderRadius: '5px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  Advance Paid
                </div>
                <div style={{ fontSize: '0.98rem', fontWeight: '700', color: '#16a34a', marginTop: '0.1rem' }}>
                  ₹{Number(selectedBookingModal.advanceAmount || 0).toLocaleString()}
                </div>
              </div>

              <div style={{ background: 'var(--table-header-bg)', padding: '0.55rem', borderRadius: '5px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  Total Booking
                </div>
                <div style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '0.1rem' }}>
                  ₹{Number(selectedBookingModal.totalAmount || 0).toLocaleString()}
                </div>
              </div>

            </div>

            <div style={{ background: 'var(--table-header-bg)', padding: '0.55rem', borderRadius: '5px', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.8rem' }}>
              <div style={{ color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                👤 <strong>Logged By:</strong> {selectedBookingModal.createdByName || 'Staff 1'}
              </div>
              {selectedBookingModal.notes && (
                <div style={{ color: 'var(--text-muted)', marginTop: '0.15rem', paddingTop: '0.15rem', borderTop: '1px dashed var(--border-color)' }}>
                  📝 <strong>Notes:</strong> {selectedBookingModal.notes}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-danger"
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
                onClick={() => handleDeleteFromCalendar(selectedBookingModal._id, selectedBookingModal.guestName)}
              >
                <Trash2 size={14} /> Delete Block
              </button>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', border: 'none' }}
                  onClick={() => generateAdvanceInvoice(selectedBookingModal)}
                  title="Download Advance Invoice PDF"
                >
                  <FileText size={14} /> Invoice
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
                  onClick={() => setSelectedBookingModal(null)}
                >
                  Close
                </button>

                <button
                  className="btn btn-primary"
                  style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
                  onClick={() => setEditingBooking(selectedBookingModal)}
                >
                  <Edit size={14} /> Edit Details
                </button>
              </div>
            </div>

          </div>
        </div>
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
          <div className="card" style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', margin: 'auto', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-main)', fontWeight: '700' }}>Edit Booking Details</h3>
              <button onClick={() => setEditingBooking(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
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

              <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
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

              <div className="form-group" style={{ marginBottom: '1rem' }}>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
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
