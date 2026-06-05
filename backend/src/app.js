// backend/app.js
const express  = require('express');
const cors     = require('cors');
const logger   = require('./utils/logger');
const { apiError } = require('./utils/apiResponse');

const app = express();

// ── Global middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(logger.requestMiddleware);

// ── Health check ───────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'StudyConnect API is running 🚀', uptime: process.uptime() });
});

// ── API routes ─────────────────────────────────────────────────────
// Uncomment as controllers are implemented:
// app.use('/api/auth',          require('./controllers/authController'));
// app.use('/api/users',         require('./controllers/userController'));
// app.use('/api/groups',        require('./controllers/groupController'));
// app.use('/api/posts',         require('./controllers/postController'));
// app.use('/api/chat',          require('./controllers/chatController'));
// app.use('/api/admin',         require('./controllers/adminController'));

// ── 404 handler ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json(apiError('Route không tồn tại', 404));
});

// ── Global error handler ──────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error(err.message, { stack: err.stack });
  const status  = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Đã xảy ra lỗi server' : err.message;
  res.status(status).json(apiError(message, status));
});

module.exports = app;
