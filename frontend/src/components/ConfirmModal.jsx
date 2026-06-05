import { useEffect } from 'react';

/**
 * ConfirmModal – thay thế window.confirm() với giao diện đẹp
 *
 * Props:
 *   isOpen      – hiện/ẩn modal
 *   title       – tiêu đề (string)
 *   message     – nội dung (string | ReactNode)
 *   confirmText – nhãn nút xác nhận (mặc định "Xác nhận")
 *   cancelText  – nhãn nút huỷ (mặc định "Huỷ")
 *   variant     – 'danger' | 'warning' | 'info' (mặc định 'danger')
 *   onConfirm   – callback khi bấm xác nhận
 *   onCancel    – callback khi bấm huỷ / đóng
 */
export default function ConfirmModal({
  isOpen,
  title = 'Xác nhận',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Huỷ',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  // Đóng bằng phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantMap = {
    danger:  { icon: '🗑️', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  btnBg: 'linear-gradient(135deg,#ef4444,#dc2626)', btnShadow: '0 4px 14px rgba(239,68,68,0.4)' },
    warning: { icon: '⚠️', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', btnBg: 'linear-gradient(135deg,#f59e0b,#d97706)', btnShadow: '0 4px 14px rgba(245,158,11,0.4)' },
    info:    { icon: 'ℹ️', color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)', btnBg: 'linear-gradient(135deg,#6366f1,#4f46e5)', btnShadow: '0 4px 14px rgba(99,102,241,0.4)' },
  };
  const v = variantMap[variant] || variantMap.danger;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: `1px solid var(--border)`,
          borderRadius: 18,
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          width: '100%', maxWidth: 400,
          padding: '28px 28px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
          animation: 'confirmPop 0.18s ease',
        }}
      >
        {/* Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: v.bg, border: `1px solid ${v.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>
            {v.icon}
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {title}
          </h3>
        </div>

        {/* Message */}
        {message && (
          <p style={{
            margin: 0, fontSize: 13.5, color: 'var(--text-secondary)',
            lineHeight: 1.65, paddingLeft: 2,
          }}>
            {message}
          </p>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-secondary)',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1.4, padding: '10px', borderRadius: 10,
              border: 'none',
              background: v.btnBg,
              boxShadow: v.btnShadow,
              color: '#fff',
              fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confirmPop {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
}
