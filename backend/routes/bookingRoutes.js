import express from 'express';
import Booking from '../models/Booking.js';

const router = express.Router();

// Helper to calculate exact next day string
const getNextDayStr = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  const resY = dt.getFullYear();
  const resM = String(dt.getMonth() + 1).padStart(2, '0');
  const resD = String(dt.getDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
};

// Helper to check date & time slot collision between two bookings
const doDatesOverlap = (startA, endA, typeA, startB, endB, typeB, currentId = null, targetId = null) => {
  if (currentId && targetId && currentId.toString() === targetId.toString()) {
    return false;
  }

  const tA = (typeA || 'Staycation').toString().trim().toLowerCase();
  const tB = (typeB || 'Staycation').toString().trim().toLowerCase();

  const isDayA = tA === 'daycation';
  const isDayB = tB === 'daycation';

  // Normalize end dates
  const effEndA = isDayA ? startA : (endA && endA !== startA ? endA : getNextDayStr(startA));
  const effEndB = isDayB ? startB : (endB && endB !== startB ? endB : getNextDayStr(startB));

  // Rule 1: Same Check-in Date is always a conflict
  if (startA === startB) {
    return true;
  }

  // Rule 2: Daycation requested on a Staycation Checkout Date (overlaps 9am-12pm)
  if (!isDayA && isDayB && effEndA === startB) {
    return true;
  }

  // Rule 3: Booking A spans over Booking B's start date (e.g. A is Aug 2-Aug 4, B starts Aug 3)
  if (startA < startB && effEndA > startB) {
    return true;
  }

  // Rule 4: Booking B spans over Booking A's start date (e.g. B is Aug 1-Aug 3, A starts Aug 2)
  if (startB < startA && effEndB > startA) {
    return true;
  }

  return false;
};

// Helper to validate 10-digit phone number
const isValidPhone = (phone) => {
  if (!phone) return false;
  const digits = phone.replace(/[\s\-\+]/g, '');
  return /^\d{10}$/.test(digits);
};

// @route   GET /api/bookings
// @desc    Get all bookings/blocked dates
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, search, status } = req.query;

    if (req.inMemoryMode) {
      let result = [...req.inMemoryBookings];

      if (search) {
        const q = search.toLowerCase();
        result = result.filter(
          b => b.guestName.toLowerCase().includes(q) || b.phone.includes(q)
        );
      }

      if (status && status !== 'all') {
        result = result.filter(b => b.status === status);
      }

      if (startDate && endDate) {
        result = result.filter(b => b.status !== 'cancelled' && (b.startDate <= endDate && b.endDate >= startDate));
      }

      result.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      return res.json(result);
    }

    // MongoDB Mode
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { guestName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate && endDate) {
      query.startDate = { $lte: endDate };
      query.endDate = { $gte: startDate };
    }

    const bookings = await Booking.find(query).sort({ startDate: 1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching bookings' });
  }
});

// @route   POST /api/bookings
// @desc    Create new booking / block date
// @access  Public
router.post('/', async (req, res) => {
  try {
    const {
      guestName,
      phone,
      startDate,
      endDate,
      bookingType,
      checkInTime,
      advanceAmount,
      totalAmount,
      status,
      notes,
      createdByName,
    } = req.body;

    const isTemporary = (phone === '0000000000' || guestName === 'Temporary Block');
    const finalPhone = isTemporary ? '0000000000' : (phone || '').replace(/\D/g, '');
    const finalGuestName = isTemporary ? 'Temporary Block' : (guestName || 'Guest').trim();

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and End date are required' });
    }

    if (!isValidPhone(finalPhone)) {
      return res.status(400).json({ message: 'Invalid phone number. Phone number must be exactly 10 digits.' });
    }

    if (startDate > endDate) {
      return res.status(400).json({ message: 'Start date cannot be after end date' });
    }

    const staffName = createdByName || 'Staff';

    // Date collision check with precise time slot awareness
    if (req.inMemoryMode) {
      const activeBookings = req.inMemoryBookings.filter(b => b.status !== 'cancelled');
      const conflict = activeBookings.find(b => doDatesOverlap(b.startDate, b.endDate, b.bookingType, startDate, endDate, bookingType));
      
      if (conflict) {
        const confType = (conflict.bookingType || 'Staycation').toLowerCase();
        const reqType = (bookingType || 'Staycation').toLowerCase();

        if (confType === 'staycation' && reqType === 'daycation' && (conflict.endDate === startDate || conflict.startDate === startDate)) {
          return res.status(400).json({
            message: `Cannot book Daycation (9am-9pm) on ${startDate}. Previous Staycation for ${conflict.guestName} checks out at 12:00 PM. (You CAN book a Staycation starting at 3:00 PM).`,
          });
        }
        return res.status(400).json({
          message: `Dates conflict with existing booking for ${conflict.guestName} (${conflict.startDate} to ${conflict.endDate})`,
        });
      }

      const newBooking = {
        _id: 'book_' + Date.now(),
        guestName: finalGuestName,
        phone: finalPhone,
        startDate,
        endDate,
        bookingType: bookingType || 'Staycation',
        checkInTime: checkInTime || (bookingType === 'Daycation' ? '9:00 AM to 9:00 PM' : '3:00 PM to 12:00 PM'),
        advanceAmount: Number(advanceAmount) || 0,
        totalAmount: Number(totalAmount) || 0,
        status: status || 'pending',
        notes: notes || (isTemporary ? 'Temporary block without guest details' : ''),
        createdByName: staffName,
        createdAt: new Date().toISOString(),
      };

      req.inMemoryBookings.push(newBooking);
      return res.status(201).json(newBooking);
    }

    // MongoDB Mode Collision Check
    const activeBookings = await Booking.find({
      status: { $ne: 'cancelled' },
    });

    const conflict = activeBookings.find(b =>
      doDatesOverlap(b.startDate, b.endDate, b.bookingType, startDate, endDate, bookingType, null, b._id)
    );

    if (conflict) {
      const confType = (conflict.bookingType || 'Staycation').toLowerCase();
      const reqType = (bookingType || 'Staycation').toLowerCase();

      if (confType === 'staycation' && reqType === 'daycation' && (conflict.endDate === startDate || conflict.startDate === startDate)) {
        return res.status(400).json({
          message: `Cannot book Daycation (9am-9pm) on ${startDate}. Previous Staycation for ${conflict.guestName} checks out at 12:00 PM. (You CAN book a Staycation starting at 3:00 PM).`,
        });
      }
      return res.status(400).json({
        message: `Dates conflict with existing booking for ${conflict.guestName} (${conflict.startDate} to ${conflict.endDate})`,
      });
    }

    const booking = await Booking.create({
      guestName: finalGuestName,
      phone: finalPhone,
      startDate,
      endDate,
      bookingType: bookingType || 'Staycation',
      checkInTime: checkInTime || (bookingType === 'Daycation' ? '9:00 AM to 9:00 PM' : '3:00 PM to 12:00 PM'),
      advanceAmount: Number(advanceAmount) || 0,
      totalAmount: Number(totalAmount) || 0,
      status: status || 'pending',
      notes: notes || (isTemporary ? 'Temporary block without guest details' : ''),
      createdByName: staffName,
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error creating booking' });
  }
});

// @route   PUT /api/bookings/:id
// @desc    Update booking
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const { phone } = req.body;

    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ message: 'Invalid phone number. Phone number must be exactly 10 digits.' });
    }

    if (req.inMemoryMode) {
      const idx = req.inMemoryBookings.findIndex(b => b._id === req.params.id);
      if (idx === -1) return res.status(404).json({ message: 'Booking not found' });

      req.inMemoryBookings[idx] = { ...req.inMemoryBookings[idx], ...req.body };
      return res.json(req.inMemoryBookings[idx]);
    }

    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Booking not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating booking' });
  }
});

// @route   DELETE /api/bookings/:id
// @desc    Delete booking
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    if (req.inMemoryMode) {
      req.inMemoryBookings = req.inMemoryBookings.filter(b => b._id !== req.params.id);
      return res.json({ message: 'Booking deleted' });
    }

    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting booking' });
  }
});

export default router;
