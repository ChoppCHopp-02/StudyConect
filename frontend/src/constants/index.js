// src/constants/index.js
// Barrel export — tất cả constants trong app

export { STORAGE_KEYS } from './storageKeys';
export { HCM_UNIVERSITIES, MAJORS } from './educationData';

// ─── NAVIGATION ────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { icon: '🏠', label: 'Trang chủ',      to: '/',             key: 'home'     },
  { icon: '👥', label: 'Nhóm học',        to: '/groups',       key: 'groups'   },
  { icon: '📅', label: 'Lịch & Deadline', to: '/schedule',     key: 'schedule' },
  { icon: '🤝', label: 'Kết bạn',         to: '/friends',      key: 'friends'  },
  { icon: '📁', label: 'Tài liệu',        to: '/my-documents', key: 'docs'     },
  { icon: '💬', label: 'Nhắn tin',        to: '/chat',         key: 'chat'     },
];

// ─── ROUTES ────────────────────────────────────────────────────────
export const ROUTES = {
  HOME:           '/',
  LOGIN:          '/login',
  REGISTER:       '/register',
  FORGOT_PASSWORD:'/forgot-password',
  PROFILE:        '/profile',
  GROUPS:         '/groups',
  GROUP_DETAIL:   '/groups/:id',
  SCHEDULE:       '/schedule',
  FRIENDS:        '/friends',
  MY_DOCUMENTS:   '/my-documents',
  CHAT:           '/chat',
  ROOM:           '/room/:roomId',
  ADMIN_LOGIN:    '/admin-login',
  ADMIN:          '/admin',
};

// ─── POSTS / HOME FEED ─────────────────────────────────────────────
export const POST_TAGS = [
  'Toán - Lý',
  'Lập trình',
  'Kinh tế',
  'Ngoại ngữ',
  'Thông báo',
  'Khác',
];

// ─── REACTIONS ─────────────────────────────────────────────────────
export const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

// ─── TIME CONSTANTS ────────────────────────────────────────────────
export const TIME_MS = {
  ONE_MINUTE: 60 * 1000,
  ONE_HOUR:   60 * 60 * 1000,
  ONE_DAY:    24 * 60 * 60 * 1000,
};

// ─── FILE LIMITS ───────────────────────────────────────────────────
export const FILE_LIMITS = {
  MAX_UPLOAD_SIZE: 20 * 1024 * 1024, // 20MB
};

// ─── AVATAR COLORS ─────────────────────────────────────────────────
export const AVATAR_COLORS = [
  '#6c63ff',
  '#ff6b9d',
  '#3ecfcf',
  '#f59e0b',
  '#22c55e',
  '#ef4444',
];
