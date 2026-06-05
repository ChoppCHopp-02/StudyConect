import { useState, useRef, useEffect } from 'react';
import Avatar from '@/components/common/Avatar';
import { timeAgo } from '@/utils';
import ReactionPortal from './ReactionPortal';

export default function CommentRow({ comment: c, liked, likedEmoji, onLike, onReply }) {
  const [reactPos, setReactPos] = useState(null);
  const hideTimer = useRef(null);
  const btnRef = useRef(null);

  const keepOpen = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setReactPos({ top: r.top - 54, left: r.left + r.width / 2 });
    }
  };

  const scheduleClose = () => {
    hideTimer.current = setTimeout(() => setReactPos(null), 200);
  };

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <Avatar src={c.userAvatar} initial={c.userFullName || 'U'} size={30} />
      <div style={{ flex: 1 }}>
        <div style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '8px 12px' }}>
          <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '2px' }}>
            {c.userFullName}
          </div>
          {c.replyToName && (
            <div style={{ fontSize: '11px', color: 'var(--primary-light)', fontWeight: 600, marginBottom: '3px' }}>
              ↩️ Trả lời <strong>{c.replyToName}</strong>
            </div>
          )}
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{c.content}</div>
        </div>
        {/* Action row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '3px 6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</span>

          {/* Like */}
          <div onMouseEnter={keepOpen} onMouseLeave={scheduleClose} style={{ position: 'relative' }}>
            <ReactionPortal
              pos={reactPos}
              onKeep={keepOpen}
              onLeave={scheduleClose}
              onPick={(em) => {
                onLike(em);
                setReactPos(null);
              }}
            />
            <button
              ref={btnRef}
              onClick={() => onLike(liked ? null : '👍')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                padding: '2px 0',
                color: liked ? 'var(--primary-light)' : 'var(--text-muted)',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              {liked && likedEmoji ? <span style={{ fontSize: '14px' }}>{likedEmoji}</span> : null} Thích
            </button>
          </div>

          <button
            onClick={onReply}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              padding: '2px 0',
              color: 'var(--text-muted)',
              fontFamily: 'inherit',
            }}
          >
            Trả lời
          </button>
        </div>
      </div>
    </div>
  );
}
