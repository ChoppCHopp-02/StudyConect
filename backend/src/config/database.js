// backend/config/database.js
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME     || 'postgres',
  process.env.DB_USER     || 'postgres',
  process.env.DB_PASSWORD || process.env.DB_PASS || '',
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT || '6543', 10),
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully');
    if (process.env.DB_SYNC === 'true' && process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ force: false });
      logger.info('Database models synchronized');
    }
  } catch (error) {
    logger.error('Database connection failed:', {
      message: error.message
    });
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
