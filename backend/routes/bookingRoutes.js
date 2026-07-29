import express from 'express';
import Booking from '../models/Booking.js';

const router = express.Router();

// Helper to check date overlap
const doDatesOverlap = (startA, endA, startB, endB) => {
  return startA <= endB && endA >= startB;
};

// Helper to validate 10-12 digit phone number (allows 0000000000 for temporary blocks)
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
        result = result.filter(b => doDatesOverlap(b.startDate, b.endDate, startDate, endDate));
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
      query.$and = [
        { startDate: { $lte: endDate } },
        { endDate: { $gte: startDate } },
      ];
    }

    const bookings = await Booking.find(query).sort({ startDate: 1 });
    res.json(bookings);
  } catch (error) {
    console.error('Fetch Bookings Error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   POST /api/bookings
// @desc    Block new date & record guest booking details (or Temporary Block)
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
      isTemporary,
    } = req.body;

    // Handle Quick Temporary Block defaults
    const finalGuestName = isTemporary || !guestName ? 'Temporary Block' : guestName;
    const finalPhone = isTemporary || !phone ? '0000000000' : phone;

    // Required dates validation
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and End date are required' });
    }

    // Strict 10-digit Phone Validation Check
    if (!isValidPhone(finalPhone)) {
      return res.status(400).json({ message: 'Invalid phone number. Phone number must be exactly 10 digits.' });
    }

    if (startDate > endDate) {
      return res.status(400).json({ message: 'Start date cannot be after end date' });
    }

    const staffName = createdByName || 'Staff';

    // Date collision check
    if (req.inMemoryMode) {
      const activeBookings = req.inMemoryBookings.filter(b => b.status !== 'cancelled');
      const conflict = activeBookings.find(b => doDatesOverlap(b.startDate, b.endDate, startDate, endDate));
      
      if (conflict) {
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
        checkInTime: checkInTime || '3:00 PM to 12:00 PM',
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
    const activeConflicts = await Booking.find({
      status: { $ne: 'cancelled' },
      $and: [
        { startDate: { $lte: endDate } },
        { endDate: { $gte: startDate } },
      ],
    });

    if (activeConflicts.length > 0) {
      const conflict = activeConflicts[0];
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
      checkInTime: checkInTime || '3:00 PM to 12:00 PM',
      advanceAmount: Number(advanceAmount) || 0,
      totalAmount: Number(totalAmount) || 0,
      status: status || 'pending',
      notes: notes || (isTemporary ? 'Temporary block without guest details' : ''),
      createdByName: staffName,
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Create Booking Error:', error);
    res.status(400).json({ message: error.message || 'Validation or Server error' });
  }
});

// @route   PUT /api/bookings/:id
// @desc    Update booking details
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ message: 'Invalid phone number. Phone number must be exactly 10 digits.' });
    }

    if (req.inMemoryMode) {
      const index = req.inMemoryBookings.findIndex(b => b._id === id);
      if (index === -1) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      req.inMemoryBookings[index] = {
        ...req.inMemoryBookings[index],
        ...req.body,
        updatedAt: new Date().toISOString(),
      };

      return res.json(req.inMemoryBookings[index]);
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    Object.assign(booking, req.body);
    const updatedBooking = await booking.save();
    res.json(updatedBooking);
  } catch (error) {
    console.error('Update Booking Error:', error);
    res.status(400).json({ message: error.message || 'Server error' });
  }
});

// @route   DELETE /api/bookings/:id
// @desc    Delete/Cancel a booking
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (req.inMemoryMode) {
      const index = req.inMemoryBookings.findIndex(b => b._id === id);
      if (index === -1) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      req.inMemoryBookings.splice(index, 1);
      return res.json({ message: 'Booking deleted successfully' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await booking.deleteOne();
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Delete Booking Error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

export default router;
