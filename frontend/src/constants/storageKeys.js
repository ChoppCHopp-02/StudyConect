// src/constants/storageKeys.js
// Tập trung tất cả localStorage keys — tránh hardcode rải rác

export const STORAGE_KEYS = {
  // Auth
  USERS: 'sc_users',
  SESSION: 'sc_session',
  ADMIN_SESSION: 'sc_admin_session',

  // Groups
  GROUPS: 'sc_groups',
  GROUP_INVITES: 'sc_group_invites',

  // Social
  FRIENDS: 'sc_friends',

  // Interaction
  POSTS: 'sc_posts',
  GLOBAL_POSTS: 'sc_global_posts',
  COMMENTS: 'sc_comments',
  FILES: 'sc_files',

  // Schedule & Deadline
  SCHEDULES: 'sc_schedules',
  DEADLINES: 'sc_deadlines',

  // Chat
  CHATS: 'sc_chats',

  // Notifications
  NOTIF_SEEN: 'sc_notif_seen',

  // Submissions (dynamic — append groupId)
  submissions: (groupId) => `sc_submissions_${groupId}`,

  // Reactions (dynamic — append groupId)
  reactions: (groupId) => `reactions_${groupId}`,
};
