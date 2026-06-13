import { useState, useRef, useEffect } from 'react';

export default function LikeCommentBar({ isLiked, likedEmoji, showComments, onLike, onToggleComments }) {
  return (
    <div style={{ display: 'flex', padding: '4px 10px' }}>
      {/* Heart (Like) Button */}
      <div style={{ flex: 1 }}>
        <button
          onClick={(e) => onLike(isLiked ? null : '❤️', e)}
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
            color: isLiked ? '#ef4444' : 'var(--text-muted)',
            transition: 'background 0.15s, color 0.15s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <span style={{ fontSize: '16px' }}>{isLiked ? '❤️' : '🤍'}</span> Thích
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
        Bình luận
      </button>
    </div>
  );
}
