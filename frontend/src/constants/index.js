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
  'linear-gradient(135deg, #6c63ff, #857dfa)',
  'linear-gradient(135deg, #ff6b9d, #ff8da1)',
  'linear-gradient(135deg, #3ecfcf, #5ce6e6)',
  'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'linear-gradient(135deg, #22c55e, #4ade80)',
  'linear-gradient(135deg, #ef4444, #f87171)',
];
