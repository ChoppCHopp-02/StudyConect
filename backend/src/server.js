// backend/server.js
require('dotenv').config();
const app              = require('./app');
const { connectDB }    = require('./config/database');
const logger           = require('./utils/logger');

const PORT = parseInt(process.env.PORT || '5000', 10);

const start = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 StudyConnect API running on http://localhost:${PORT}`);
      logger.info(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.warn(`${signal} received — shutting down gracefully...`);
      server.close(() => {
        logger.info('✅ HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Force shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start server:', { message: err.message });
    process.exit(1);
  }
};

start();
