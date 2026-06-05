// src/components/common/Toast.jsx
// Toast notification component + useToast hook
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState, useCallback } from 'react';

/**
 * Toast container — render danh sách toasts
 */
export const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} removeToast={removeToast} />
      ))}
    </div>
  );
};

/**
 * ToastItem — 1 toast message, tự động ẩn sau 3s
 */
const ToastItem = ({ toast, removeToast }) => {
  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  return (
    <div className={`toast ${toast.type}`}>
      <span className="toast-icon">
        {toast.type === 'success' ? '✅' : '❌'}
      </span>
      <span className="toast-msg">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        ✕
      </button>
    </div>
  );
};

/**
 * useToast hook — quản lý danh sách toast
 * @returns {{ toasts, addToast, removeToast }}
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
};

export default Toast;
