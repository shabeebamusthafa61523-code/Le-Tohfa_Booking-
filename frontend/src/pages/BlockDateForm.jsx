import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Pencil, Check, Calendar } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const BlockDateForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const getSavedStaffName = () => {
    return localStorage.getItem('resort_active_staff_name') || 'Staff 1';
  };

  const calculateEndDate = (startStr, type) => {
    if (!startStr) return startStr;
    if (type === 'Daycation') {
      return startStr;
    }
    const dt = new Date(startStr + 'T00:00:00');
    dt.setDate(dt.getDate() + 1);
    return dt.toISOString().split('T')[0];
  };

  const initialStartDate = getTodayStr();
  const initialType = 'Staycation';

  const [formData, setFormData] = useState({
    guestName: '',
    phone: '',
    startDate: initialStartDate,
    endDate: calculateEndDate(initialStartDate, initialType),
    bookingType: initialType,
    checkInTime: '3:00 PM to 12:00 PM',
    advanceAmount: 2000,
    totalAmount: 15000,
    status: 'pending',
    notes: '',
    createdByName: getSavedStaffName(),
  });

  const [isEditingStaffName, setIsEditingStaffName] = useState(false);
  const [customTimeActive, setCustomTimeActive] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePhone = (phoneNumber) => {
    if (!phoneNumber) return 'Phone number is required';
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      return 'Phone number must be exactly 10 digits';
    }
    return '';
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: digitsOnly }));
    setPhoneError(validatePhone(digitsOnly));
  };

  const handleBookingTypeChange = (type) => {
    let defaultTime;
    let defaultTotal;
    let activateCustomTime = false;

    if (type === 'Staycation') {
      defaultTime = '3:00 PM to 12:00 PM';
      defaultTotal = 15000;
    } else if (type === 'Daycation') {
      defaultTime = '9:00 AM to 9:00 PM';
      defaultTotal = 12000;
    } else {
      // Event
      defaultTime = '';
      defaultTotal = 25000;
      activateCustomTime = true;
    }

    const autoEndDate = calculateEndDate(formData.startDate, type);

    setFormData((prev) => ({
      ...prev,
      bookingType: type,
      checkInTime: defaultTime,
      totalAmount: defaultTotal,
      endDate: autoEndDate,
    }));
    setCustomTimeActive(activateCustomTime);
  };

  const handleStartDateChange = (e) => {
    const val = e.target.value;
    const autoEndDate = calculateEndDate(val, formData.bookingType);
    setFormData((prev) => ({
      ...prev,
      startDate: val,
      endDate: autoEndDate,
    }));
  };

  const handleTimeSelect = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setCustomTimeActive(true);
    } else {
      setCustomTimeActive(false);
      setFormData((prev) => ({ ...prev, checkInTime: val }));
    }
  };

  const handleAdvancePreset = (e) => {
    const val = e.target.value;
    if (val !== 'custom') {
      setFormData((prev) => ({ ...prev, advanceAmount: Number(val) }));
    }
  };

  const handleTotalPreset = (e) => {
    const val = e.target.value;
    if (val !== 'custom') {
      setFormData((prev) => ({ ...prev, totalAmount: Number(val) }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStaffNameSave = () => {
    localStorage.setItem('resort_active_staff_name', formData.createdByName || 'Staff 1');
    setIsEditingStaffName(false);
    toast.success(`Staff name saved as "${formData.createdByName}"!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const pErr = validatePhone(formData.phone);
    if (pErr) {
      setPhoneError(pErr);
      toast.error(pErr);
      return;
    }

    setLoading(true);
    localStorage.setItem('resort_active_staff_name', formData.createdByName || 'Staff 1');

    try {
      await axios.post('/api/bookings', formData);
      toast.success('Date blocked successfully!');
      setTimeout(() => {
        navigate('/bookings');
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to block dates');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '1.5rem auto', padding: '0 0.85rem' }}>
      <div className="card">
        
        {/* Title Bar */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#0f172a' }}>
            Block Date / Add Booking
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.15rem' }}>
            Block resort dates with guest details, package type & time slots.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Staff Member Tag */}
          <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label className="form-label" style={{ color: '#059669', margin: 0 }}>
                Logged By / Active Staff Member
              </label>

              {!isEditingStaffName && (
                <button
                  type="button"
                  onClick={() => setIsEditingStaffName(true)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#0284c7',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                  title="Click pencil symbol to edit staff name"
                >
                  <Pencil size={14} /> Edit Name
                </button>
              )}
            </div>

            {isEditingStaffName ? (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  name="createdByName"
                  className="form-input"
                  placeholder="Enter staff name e.g. Ramesh, Staff 1"
                  value={formData.createdByName}
                  onChange={handleChange}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={handleStaffNameSave}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                >
                  <Check size={16} /> Save
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '0.35rem', fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span>👤 {formData.createdByName || 'Staff 1'}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>(Saved until edited ✏️)</span>
              </div>
            )}
          </div>

          {/* Staycation / Daycation / Event selector */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Booking Type / Package</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleBookingTypeChange('Staycation')}
                style={{
                  padding: '0.65rem 0.5rem',
                  borderRadius: '6px',
                  border: '2px solid ' + (formData.bookingType === 'Staycation' ? '#059669' : '#cbd5e1'),
                  background: formData.bookingType === 'Staycation' ? '#dcfce7' : '#ffffff',
                  color: formData.bookingType === 'Staycation' ? '#166534' : '#475569',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                🛋️ Staycation
              </button>

              <button
                type="button"
                onClick={() => handleBookingTypeChange('Daycation')}
                style={{
                  padding: '0.65rem 0.5rem',
                  borderRadius: '6px',
                  border: '2px solid ' + (formData.bookingType === 'Daycation' ? '#0284c7' : '#cbd5e1'),
                  background: formData.bookingType === 'Daycation' ? '#e0f2fe' : '#ffffff',
                  color: formData.bookingType === 'Daycation' ? '#075985' : '#475569',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ☀️ Daycation
              </button>

              <button
                type="button"
                onClick={() => handleBookingTypeChange('Event')}
                style={{
                  padding: '0.65rem 0.5rem',
                  borderRadius: '6px',
                  border: '2px solid ' + (formData.bookingType === 'Event' ? '#7c3aed' : '#cbd5e1'),
                  background: formData.bookingType === 'Event' ? '#f3e8ff' : '#ffffff',
                  color: formData.bookingType === 'Event' ? '#6d28d9' : '#475569',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                🎉 Event
              </button>
            </div>
          </div>

          {/* Check-in Date */}
          <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '6px', border: '1px solid #bbf7d0', marginBottom: '1.25rem' }}>
            <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={16} /> Check-in Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  className="form-input"
                  value={formData.startDate}
                  onChange={handleStartDateChange}
                  required
                />
              </div>

              <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Auto Check-out Date</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#16a34a', marginTop: '0.1rem' }}>
                  📅 {formData.endDate}{' '}
                  <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#475569' }}>
                    ({formData.bookingType === 'Daycation' ? 'Same Day' : 'Next Day'})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Slot Dropdown & Custom Type */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Select Time Slot</label>
            <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: customTimeActive ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
              <select
                className="form-select"
                value={customTimeActive ? 'custom' : formData.checkInTime}
                onChange={handleTimeSelect}
              >
                <option value="3:00 PM to 12:00 PM">3:00 PM to 12:00 PM (Staycation)</option>
                <option value="9:00 AM to 9:00 PM">9:00 AM to 9:00 PM (Daycation)</option>
                <option value="custom">✏️ Custom Time (Event / Other)...</option>
              </select>

              {customTimeActive && (
                <input
                  type="text"
                  name="checkInTime"
                  className="form-input"
                  placeholder="e.g. 10:00 AM to 8:00 PM"
                  value={formData.checkInTime}
                  onChange={handleChange}
                  required
                />
              )}
            </div>
          </div>

          {/* Guest Name & Exact 10-Digit Phone Input */}
          <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Guest Name</label>
              <input
                type="text"
                name="guestName"
                className="form-input"
                placeholder="Enter guest full name"
                value={formData.guestName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number (Exactly 10 Digits)</label>
              <input
                type="text"
                name="phone"
                className="form-input"
                style={{ borderColor: phoneError ? '#ef4444' : undefined }}
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={handlePhoneChange}
                maxLength="10"
                required
              />
              {phoneError ? (
                <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '0.2rem', fontWeight: '600' }}>
                  ⚠️ {phoneError}
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                  {formData.phone.length}/10 digits
                </span>
              )}
            </div>
          </div>

          {/* Advance Paid (₹) — with quick preset buttons & single editable input */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Advance Paid (₹)</label>
              
              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, advanceAmount: 2000 }))}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    border: '1px solid ' + (Number(formData.advanceAmount) === 2000 ? '#16a34a' : 'var(--border-color)'),
                    background: Number(formData.advanceAmount) === 2000 ? '#dcfce7' : 'var(--card-bg)',
                    color: Number(formData.advanceAmount) === 2000 ? '#166534' : 'var(--text-main)',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ ₹2,000
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, advanceAmount: 3000 }))}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    border: '1px solid ' + (Number(formData.advanceAmount) === 3000 ? '#16a34a' : 'var(--border-color)'),
                    background: Number(formData.advanceAmount) === 3000 ? '#dcfce7' : 'var(--card-bg)',
                    color: Number(formData.advanceAmount) === 3000 ? '#166534' : 'var(--text-main)',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ ₹3,000
                </button>
              </div>
            </div>

            <input
              type="number"
              name="advanceAmount"
              className="form-input"
              placeholder="Type Advance Amount (₹)"
              value={formData.advanceAmount}
              onChange={handleChange}
              required
              min="0"
              style={{ fontWeight: '700', fontSize: '1rem', color: '#16a34a' }}
            />
          </div>

          {/* Total Amount — auto-filled by type, fully editable */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">
              Total Booking Amount (₹)
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: '600', color:
                formData.bookingType === 'Staycation' ? '#166534' :
                formData.bookingType === 'Daycation'  ? '#075985' : '#6d28d9',
                background:
                  formData.bookingType === 'Staycation' ? '#dcfce7' :
                  formData.bookingType === 'Daycation'  ? '#e0f2fe' : '#f3e8ff',
                padding: '0.1rem 0.45rem', borderRadius: '10px',
              }}>
                {formData.bookingType === 'Staycation' ? '🛋️ ₹15,000 base'
                  : formData.bookingType === 'Daycation' ? '☀️ ₹12,000 base'
                  : '🎉 ₹25,000 base'}
              </span>
            </label>
            <input
              type="number"
              name="totalAmount"
              className="form-input"
              placeholder="Total Booking Amount (₹)"
              value={formData.totalAmount}
              onChange={handleChange}
              min="0"
              style={{ fontWeight: '700', fontSize: '1rem' }}
            />
          </div>

          {/* Status Selection: Pending vs Confirmed */}
          <div className="form-group">
            <label className="form-label">Booking Status</label>
            <select
              name="status"
              className="form-select"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="pending">🟡 Pending (Yellow)</option>
              <option value="confirmed">🟢 Confirmed (Green)</option>
            </select>
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Notes (Optional)</label>
            <textarea
              name="notes"
              className="form-textarea"
              rows="2"
              placeholder="Any special requests or details..."
              value={formData.notes}
              onChange={handleChange}
            ></textarea>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/bookings')}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || Boolean(phoneError) || formData.phone.length !== 10}
            >
              {loading ? 'Saving...' : 'Submit Booking'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
