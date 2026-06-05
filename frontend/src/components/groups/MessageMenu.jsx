import { useEffect, useRef, useState } from 'react';

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function MessageMenu({ x, y, isMine, isPinned, canPin, onDelete, onReact, onReply, onPin, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: y, left: x });

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  useEffect(() => {
    if (!ref.current) return;
    const parent = ref.current.offsetParent;
    const menuW = ref.current.offsetWidth || 200;
    const menuH = ref.current.offsetHeight || (isMine ? 160 : 120);
    const containerW = parent ? parent.offsetWidth : window.innerWidth;
    const containerH = parent ? parent.offsetHeight : window.innerHeight;
    const PADDING = 8;

    let left = x;
    let top = y;

    if (left + menuW + PADDING > containerW) left = containerW - menuW - PADDING;
    if (left < PADDING) left = PADDING;
    if (top + menuH + PADDING > containerH) top = containerH - menuH - PADDING;
    if (top < PADDING) top = PADDING;

    setPos({ top, left });
  }, [x, y, isMine]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 100,
        minWidth: '180px',
        animation: 'fadeIn 0.12s ease',
      }}
    >
      {/* Quick reactions */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '4px 6px 8px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '4px',
        }}
      >
        {QUICK_REACTIONS.map((em) => (
          <button
            key={em}
            onClick={() => {
              onReact(em);
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '3px 4px',
              borderRadius: '6px',
              lineHeight: 1,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            {em}
          </button>
        ))}
      </div>
      {/* Actions */}
      <button
        onClick={() => {
          onReply();
          onClose();
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          background: 'none',
          color: 'var(--primary-light)',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'inherit',
          textAlign: 'left',
          transition: 'background 0.12s',
        }}
      >
        <span style={{ fontSize: '16px' }}>↩️</span>
        Trả lời
      </button>

      {canPin && (
        <button
          onClick={() => {
            onPin();
            onClose();
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: 'none',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            textAlign: 'left',
            transition: 'background 0.12s',
          }}
        >
          <span style={{ fontSize: '16px' }}>📌</span>
          {isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
        </button>
      )}

      {isMine && (
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: 'none',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            textAlign: 'left',
            transition: 'background 0.12s',
          }}
        >
          <span style={{ fontSize: '16px' }}>🗑️</span>
          Xóa tin nhắn
        </button>
      )}
    </div>
  );
}
