import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  guestName: {
    type: String,
    required: [true, 'Guest name is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function (v) {
        const digits = v.replace(/[\s\-\+]/g, '');
        return /^\d{10}$/.test(digits);
      },
      message: (props) => `${props.value} is not a valid 10-digit phone number`,
    },
  },
  startDate: {
    type: String, // YYYY-MM-DD
    required: [true, 'Start date is required'],
  },
  endDate: {
    type: String, // YYYY-MM-DD
    required: [true, 'End date is required'],
  },
  bookingType: {
    type: String,
    enum: ['Staycation', 'Daycation'],
    default: 'Staycation',
  },
  checkInTime: {
    type: String,
    required: [true, 'Check-in time is required'],
    default: '3:00 PM to 12:00 PM',
  },
  advanceAmount: {
    type: Number,
    required: [true, 'Advance amount is required'],
    default: 0,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'blocked'],
    default: 'pending',
  },
  notes: {
    type: String,
    default: '',
  },
  createdByName: {
    type: String,
    default: 'Staff',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const BookingModel = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export default BookingModel;
