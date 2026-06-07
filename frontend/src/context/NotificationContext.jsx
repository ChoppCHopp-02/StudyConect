import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import useNotifications from '../hooks/useNotifications';

const NotificationContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const notifications = useNotifications(userId);
  const { notifs } = notifications;

  // Track keys that have already been notified (toasted) to prevent duplicates
  const notifiedKeysRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

  // Tracks if toast popups are enabled
  const [toastEnabled, setToastEnabled] = useState(() => {
    return localStorage.getItem('studyconect_toast_enabled') !== 'false';
  });
  const toastEnabledRef = useRef(toastEnabled);
  useEffect(() => {
    toastEnabledRef.current = toastEnabled;
    localStorage.setItem('studyconect_toast_enabled', toastEnabled ? 'true' : 'false');
  }, [toastEnabled]);

  const toggleToast = () => setToastEnabled(prev => !prev);

  useEffect(() => {
    if (!userId) {
      notifiedKeysRef.current.clear();
      isInitialLoadRef.current = true;
      return;
    }

    if (notifs && notifs.length > 0) {
      if (isInitialLoadRef.current) {
        // On first load, record existing notification keys so we don't spam the user with old toasts
        notifs.forEach(n => {
          notifiedKeysRef.current.add(n.key);
        });
        isInitialLoadRef.current = false;
      } else {
        // On subsequent runs, find any new notifications
        notifs.forEach(n => {
          if (!notifiedKeysRef.current.has(n.key)) {
            notifiedKeysRef.current.add(n.key);

            // Map notification type to navigation link and icon
            // eslint-disable-next-line no-useless-assignment
            let link = null;
            // eslint-disable-next-line no-useless-assignment
            let icon = '🔔';

            switch (n.type) {
              case 'friendreq':
                link = '/friends';
                icon = '🤝';
                break;
              case 'friendaccept':
                link = '/friends';
                icon = '🎉';
                break;
              case 'groupinvite':
                link = '/groups';
                icon = '👥';
                break;
              case 'groupjoin':
                link = n.groupId ? `/groups/${n.groupId}` : '/groups';
                icon = '🔔';
                break;
              case 'groupdeputy':
                link = n.groupId ? `/groups/${n.groupId}` : '/groups';
                icon = '👑';
                break;
              case 'othergroupjoin':
                link = n.groupId ? `/groups/${n.groupId}` : '/groups';
                icon = '👥';
                break;
              case 'schedule':
                link = n.groupId ? `/groups/${n.groupId}` : '/schedule';
                icon = '📅';
                break;
              case 'deadline':
              case 'deadline-urgent':
                link = n.groupId ? `/groups/${n.groupId}` : '/schedule';
                icon = n.type === 'deadline-urgent' ? '🚨' : '⏰';
                break;
              case 'groupcall':
                link = n.groupId ? `/room/${n.groupId}` : '/groups';
                icon = '📞';
                break;
              case 'fileupload':
                link = n.groupId ? `/groups/${n.groupId}` : '/groups';
                icon = '📎';
                break;
              case 'comment':
                link = '/';
                icon = '💬';
                break;
              case 'like':
                link = '/';
                icon = n.title ? n.title.split(' ')[0] : '❤️';
                break;
              case 'privatemsg':
                link = '/chat';
                icon = '💬';
                break;
              case 'joinrequest':
                link = n.groupId ? `/groups/${n.groupId}` : '/groups';
                icon = '👥';
                break;
              case 'groupkick':
                link = '/groups';
                icon = '⚠️';
                break;
              default:
                link = null;
                icon = '🔔';
            }

          }
        });
      }
    }
  }, [notifs, userId]);

  return (
    <NotificationContext.Provider value={{ ...notifications, toastEnabled, toggleToast }}>
      {children}
    </NotificationContext.Provider>
  );
};
