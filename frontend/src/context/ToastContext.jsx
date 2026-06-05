import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const ToastContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  const dismissToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDismissing: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 7000, link = null, icon = null) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, link, icon, isDismissing: false }]);
    
    // Auto-remove after duration (default 7 seconds)
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }, [dismissToast]);

  const removeToast = useCallback((id) => {
    dismissToast(id);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ addToast, toasts }}>
      {children}
      
      {/* Toast Overlay Container */}
      <div 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: toast.type === 'error'
                ? 'var(--danger-gradient, linear-gradient(135deg, #ff416c, #ff4b2b))'
                : toast.type === 'message'
                ? 'linear-gradient(135deg, #ff7a00, #ff9500)'
                : toast.type === 'notification'
                ? 'linear-gradient(135deg, #3a7bd5, #3a6073)' // Elegant dark blue/grey gradient for notifications
                : 'var(--primary-gradient, linear-gradient(135deg, #6c63ff, #3ecfcf))',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              fontWeight: 600,
              minWidth: '280px',
              maxWidth: '400px',
              cursor: toast.link ? 'pointer' : 'default',
              animation: toast.isDismissing 
                ? 'slideOut 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards'
                : 'slideIn 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s ease'
            }}
            onClick={() => {
              if (toast.link) {
                navigate(toast.link);
                dismissToast(toast.id);
              }
            }}
          >
            {/* Custom keyframes injection for slideIn/slideOut */}
            <style>{`
              @keyframes slideIn {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
              @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(120%); opacity: 0; }
              }
            `}</style>
            
            <span>
              {toast.icon 
                ? toast.icon 
                : toast.type === 'error' 
                ? '⚠️' 
                : toast.type === 'message' 
                ? '💬' 
                : '✅'}
            </span>
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent trigger link navigation on click close
                removeToast(toast.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
