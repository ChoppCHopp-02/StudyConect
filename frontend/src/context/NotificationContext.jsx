import { createContext, useContext, useState } from 'react';
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

  // Toggle for popup toast notifications (persisted to localStorage)
  const [toastEnabled, setToastEnabled] = useState(() => {
    return localStorage.getItem('studyconect_toast_enabled') !== 'false';
  });

  const toggleToast = () => {
    setToastEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('studyconect_toast_enabled', next ? 'true' : 'false');
      } catch (err) {
        console.warn('Error setting toast enabled state:', err);
      }
      return next;
    });
  };

  return (
    <NotificationContext.Provider value={{ ...notifications, toastEnabled, toggleToast }}>
      {children}
    </NotificationContext.Provider>
  );
};
