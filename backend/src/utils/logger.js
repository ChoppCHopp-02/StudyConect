// backend/utils/logger.js
// Lightweight structured logger (no external dependencies)

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = {
  error: '\x1b[31m', // red
  warn:  '\x1b[33m', // yellow
  info:  '\x1b[36m', // cyan
  debug: '\x1b[90m', // grey
  reset: '\x1b[0m',
};

const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'production' ? LEVELS.warn : LEVELS.debug);

const log = (level, message, meta = {}) => {
  if (LEVELS[level] > currentLevel) return;

  const color   = COLORS[level] ?? '';
  const reset   = COLORS.reset;
  const ts      = new Date().toISOString();
  const prefix  = `${color}[${level.toUpperCase()}]${reset}`;
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';

  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
    `${prefix} ${ts} ${message}${metaStr}`
  );
};

const logger = {
  error: (message, meta) => log('error', message, meta),
  warn:  (message, meta) => log('warn',  message, meta),
  info:  (message, meta) => log('info',  message, meta),
  debug: (message, meta) => log('debug', message, meta),

  /** Express request logger middleware */
  requestMiddleware: (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms  = Date.now() - start;
      const lvl = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      log(lvl, `${req.method} ${req.originalUrl} ${res.statusCode} — ${ms}ms`);
    });
    next();
  },
};

module.exports = logger;
