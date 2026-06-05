import { useState, useRef, useEffect } from 'react';
import ReactionPortal from './ReactionPortal';

export default function LikeCommentBar({ isLiked, likedEmoji, showComments, onLike, onToggleComments }) {
  const [reactPos, setReactPos] = useState(null);
  const hideTimer = useRef(null);
  const likeBtnRef = useRef(null);

  const keepOpen = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (likeBtnRef.current) {
      const r = likeBtnRef.current.getBoundingClientRect();
      setReactPos({ top: r.top - 54, left: r.left + r.width / 2 });
    }
  };

  const scheduleClose = () => {
    hideTimer.current = setTimeout(() => setReactPos(null), 180);
  };

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  return (
    <div style={{ display: 'flex', padding: '4px 10px' }}>
      {/* Like Button with Hover reactions */}
      <div style={{ flex: 1 }} onMouseEnter={keepOpen} onMouseLeave={scheduleClose}>
        <ReactionPortal
          pos={reactPos}
          onKeep={keepOpen}
          onLeave={scheduleClose}
          onPick={(em, e) => {
            onLike(em, e);
            setReactPos(null);
          }}
        />
        <button
          ref={likeBtnRef}
          onClick={(e) => onLike(isLiked ? null : '👍', e)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 4px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            color: isLiked ? 'var(--primary-light)' : 'var(--text-muted)',
            transition: 'background 0.15s, color 0.15s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <span style={{ fontSize: '16px' }}>{isLiked && likedEmoji ? likedEmoji : (isLiked ? '💜' : '🤍')}</span> Thích
        </button>
      </div>

      {/* Comment Toggle Button */}
      <button
        onClick={onToggleComments}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '10px 4px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 600,
          color: showComments ? 'var(--primary-light)' : 'var(--text-muted)',
          transition: 'background 0.15s, color 0.15s',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
      >
        <span style={{ fontSize: '16px' }}>💬</span> Bình luận
      </button>

      <style>{`@keyframes popReact { from { opacity:0; transform:translateX(-50%) scale(0.8); } to { opacity:1; transform:translateX(-50%) scale(1); } }`}</style>
    </div>
  );
}
