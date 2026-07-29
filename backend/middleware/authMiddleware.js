import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'resort_super_secret_jwt_key_2026_letohfa');

      if (req.inMemoryMode) {
        req.user = req.inMemoryUsers?.find(u => u._id === decoded.id || u.id === decoded.id) || {
          _id: decoded.id,
          name: decoded.name || 'Resort Admin',
          email: decoded.email || 'admin@resort.com',
          role: 'admin',
        };
      } else {
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
          return res.status(401).json({ message: 'User not found, token authorization failed' });
        }
      }

      next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};
