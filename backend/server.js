import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Booking from './models/Booking.js';
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Global in-memory dataset state for demo fallback mode
const inMemoryUsers = [
  {
    _id: 'user_demo_1',
    name: 'Resort Admin',
    email: 'admin@resort.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
];

const inMemoryBookings = [
  {
    _id: 'book_demo_1',
    guestName: 'Rajesh Sharma',
    phone: '9876543210',
    startDate: '2026-08-01',
    endDate: '2026-08-02',
    bookingType: 'Staycation',
    checkInTime: '3:00 PM to 12:00 PM',
    advanceAmount: 2000,
    totalAmount: 12000,
    status: 'pending',
    notes: 'Pool view villa requested. Check-in after lunch.',
    createdByName: 'Staff 1',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'book_demo_2',
    guestName: 'Ananya Verma',
    phone: '9123456789',
    startDate: '2026-08-05',
    endDate: '2026-08-06',
    bookingType: 'Staycation',
    checkInTime: '3:00 PM to 12:00 PM',
    advanceAmount: 3000,
    totalAmount: 15000,
    status: 'confirmed',
    notes: 'Anniversary celebration arrangement.',
    createdByName: 'Staff 2',
    createdAt: new Date().toISOString(),
  },
];

// Middleware
app.use(cors());
app.use(express.json());

// In-Memory Mode Injector Middleware
let dbConnected = false;

app.use((req, res, next) => {
  req.inMemoryMode = !dbConnected;
  req.inMemoryUsers = inMemoryUsers;
  req.inMemoryBookings = inMemoryBookings;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    dbStatus: dbConnected ? 'MongoDB Connected' : 'In-Memory Fallback Active',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend dist build in production single-host deployment
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

// Seed default admin in MongoDB if connected
const seedDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@resort.com' });
    if (!adminExists) {
      await User.create({
        name: 'Resort Admin',
        email: 'admin@resort.com',
        password: 'admin123',
        role: 'admin',
      });
      console.log('🌱 Seeded default admin account (admin@resort.com / admin123) into MongoDB');
    }
  } catch (err) {
    console.warn('Admin seed warning:', err.message);
  }
};

// Start Server & Connect Database
const startServer = async () => {
  dbConnected = await connectDB();
  if (dbConnected) {
    await seedDefaultAdmin();
  }
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🏰 Resort Booking Backend Server running on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:5000/api/health`);
    console.log(`💾 Database Status: ${dbConnected ? 'MongoDB Connected' : 'In-Memory Demo Dataset Active'}`);
    console.log(`===================================================`);
  });
};

startServer();
