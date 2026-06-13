// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { apiError } = require('../utils/apiResponse');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error(
  '[Auth] JWT_SECRET chưa được cấu hình trong .env'
);

/**
 * Verify user JWT from Authorization header.
 * Attaches decoded payload to req.user.
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(apiError('Không có quyền truy cập. Vui lòng đăng nhập.', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json(apiError('Token không hợp lệ hoặc đã hết hạn.', 401));
  }
};

/**
 * Verify admin-level JWT. Must run after protect().
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json(apiError('Chỉ quản trị viên mới có quyền thực hiện thao tác này.', 403));
  }
  next();
};

/**
 * Sign a new JWT for a user object.
 */
const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

module.exports = { protect, adminOnly, signToken };
