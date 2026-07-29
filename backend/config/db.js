import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resort_booking_db';
    const isAtlas = mongoUri.includes('mongodb+srv://') || mongoUri.includes('mongodb.net');

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    if (isAtlas) {
      console.log(`🍃 MongoDB Atlas Cloud Connected Successfully: ${conn.connection.host}`);
    } else {
      console.log(`💾 Local MongoDB Connected: ${conn.connection.host}`);
    }
    return true;
  } catch (error) {
    console.warn(`⚠️ MongoDB Connection Warning: ${error.message}`);
    console.warn(`Fallback: Using in-memory dataset mode for instant testing!`);
    return false;
  }
};
