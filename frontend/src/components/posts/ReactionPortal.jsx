import { createPortal } from 'react-dom';

export default function ReactionPortal({ pos, onKeep, onLeave, onPick }) {
  if (!pos) return null;
  return createPortal(
    <div
      onMouseEnter={onKeep}
      onMouseLeave={onLeave}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: 'translateX(-50%)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '28px',
        padding: '7px 12px',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        zIndex: 999999,
        whiteSpace: 'nowrap',
        animation: 'popReact 0.12s cubic-bezier(0.34,1.56,0.64,1)',
        pointerEvents: 'all',
      }}
    >
      {['❤️', '😂', '😮', '😢', '😡', '👍'].map((em) => (
        <button
          key={em}
          onClick={(e) => {
            e.stopPropagation();
            onPick(em, e);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '24px',
            lineHeight: 1,
            padding: '2px 3px',
            borderRadius: '8px',
            transition: 'transform 0.12s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.45)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {em}
        </button>
      ))}
    </div>,
    document.body
  );
}
