import { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import useNotifications from '../hooks/useNotifications';

const NotificationContext = createContext(null);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const userId = user?.id;
  const notifications = useNotifications(userId);
  const { notifs } = notifications;

  // Track keys that have already been notified (toasted) to prevent duplicates
  const notifiedKeysRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

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
            let link = null;
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

            // Trigger Toast popup (Display for 5 seconds as requested)
            addToast(n.body, 'notification', 5000, link, icon);
          }
        });
      }
    }
  }, [notifs, userId, addToast]);

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
    </NotificationContext.Provider>
  );
};
