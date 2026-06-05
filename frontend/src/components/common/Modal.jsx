// src/components/common/Modal.jsx
// Reusable base modal — backdrop + container + close-on-backdrop

import { useEffect } from 'react';

/**
 * Base Modal component
 * @param {boolean}   open      - Hiển thị hay không
 * @param {Function}  onClose   - Callback khi đóng
 * @param {ReactNode} children  - Nội dung modal
 * @param {number}    maxWidth  - Max width của modal (default 560)
 * @param {string}    className - CSS class tuỳ chỉnh
 */
export default function Modal({ open, onClose, children, maxWidth = 560, className = '' }) {
  // Khoá scroll body khi modal mở
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={onClose}
    >
      <div
        className={className}
        style={{
          background: 'var(--bg-card)',
          borderRadius: '20px',
          width: '100%',
          maxWidth,
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Modal.Header — phần header với title và nút đóng
 */
Modal.Header = function ModalHeader({ title, subtitle, icon, onClose }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 20px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              flexShrink: 0,
              background: 'linear-gradient(135deg, var(--primary), #5b53e0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '17px',
            }}
          >
            {icon}
          </div>
        )}
        <div>
          {title && (
            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
              {title}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'var(--bg-input)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            fontSize: '16px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

/**
 * Modal.Body — phần body có thể scroll
 */
Modal.Body = function ModalBody({ children, style = {} }) {
  return (
    <div
      style={{
        padding: '16px 20px',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        flex: 1,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Modal.Footer — phần footer với actions
 */
Modal.Footer = function ModalFooter({ children, style = {} }) {
  return (
    <div
      style={{
        padding: '12px 20px 18px',
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
