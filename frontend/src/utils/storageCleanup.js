// src/utils/storageCleanup.js

export const runStorageCleanup = () => {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove = [];
    const preserveKeys = [
      'sc_session',
      'sc_admin_session',
      'studyconect_toast_enabled',
      'studyconect_kicked_notifications'
    ];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;

      // Preserve friend nicknames (starts with sc_nickname_)
      if (key.startsWith('sc_nickname_')) {
        continue;
      }

      // Preserve notification seen state (sc_notif_seen)
      if (key === 'sc_notif_seen') {
        continue;
      }

      // If it is in the explicit preserve list, do not delete
      if (preserveKeys.includes(key)) {
        continue;
      }

      // Remove obsolete/large caching keys
      if (
        key.startsWith('studyconect_') ||
        key.startsWith('studyconect__') || // covers keys like studyconect__group_chat_43
        key.startsWith('reactions_') ||
        key.startsWith('sc_submissions_') ||
        key === 'sc_chats' ||
        key === 'sc_friends' ||
        key === 'sc_posts' ||
        key === 'sc_groups' ||
        key === 'sc_files' ||
        key === 'sc_schedules' ||
        key === 'sc_deadlines'
      ) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      console.log(`[Storage Cleanup] Cleaning up ${keysToRemove.length} obsolete localStorage keys to free up quota...`);
      keysToRemove.forEach(key => {
        window.localStorage.removeItem(key);
      });
      console.log('[Storage Cleanup] Cleanup complete.');
    }
  } catch (err) {
    console.warn('[Storage Cleanup] Error running localStorage cleanup:', err);
  }
};
