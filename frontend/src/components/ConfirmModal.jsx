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
  thirdText,
  variant = 'danger',
  onConfirm,
  onCancel,
  onThird,
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
    danger:  { 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      ), 
      color: 'var(--text-primary)', 
      bg: 'rgba(0,0,0,0.04)',  
      border: 'var(--border)',  
      btnBg: 'var(--primary)', 
      btnShadow: 'none' 
    },
    warning: { 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ), 
      color: '#f59e0b', 
      bg: 'rgba(245,158,11,0.08)', 
      border: 'rgba(245,158,11,0.2)', 
      btnBg: '#f59e0b', 
      btnShadow: 'none' 
    },
    info:    { 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ), 
      color: 'var(--text-primary)', 
      bg: 'rgba(0,0,0,0.04)',  
      border: 'var(--border)', 
      btnBg: 'var(--primary)', 
      btnShadow: 'none' 
    },
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
          <div style={{
            margin: 0, fontSize: 13.5, color: 'var(--text-secondary)',
            lineHeight: 1.65, paddingLeft: 2,
          }}>
            {message}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: thirdText ? 'column' : 'row', gap: 10, marginTop: 4 }}>
          {thirdText ? (
            <>
              <button
                onClick={onConfirm}
                style={{
                  padding: '10px', borderRadius: 10,
                  border: 'none',
                  background: v.btnBg,
                  boxShadow: v.btnShadow,
                  color: '#fff',
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.18s',
                  width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {confirmText}
              </button>
              <button
                onClick={onThird}
                style={{
                  padding: '10px', borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'rgba(0,0,0,0.03)',
                  color: 'var(--text-primary)',
                  fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.18s',
                  width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
              >
                {thirdText}
              </button>
              <button
                onClick={onCancel}
                style={{
                  padding: '8px', borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: 13, fontWeight: 550,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.18s',
                  width: '100%',
                  textAlign: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                {cancelText}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onCancel}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; }}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10,
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
            </>
          )}
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
