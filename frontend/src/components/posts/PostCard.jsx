import { useState } from 'react';
import Avatar from '@/components/common/Avatar';
import { timeAgo } from '@/utils';
import LikeCommentBar from './LikeCommentBar';
import CommentRow from './CommentRow';

export default function PostCard({ post, currentUser, onLike, onDelete, onComment, onPin }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, name }
  const [commentReactions, setCommentReactions] = useState({}); // commentId -> emoji string or null

  const isLong = post && post.content ? post.content.length > 200 : false;
  const myLike = Array.isArray(post?.likes)
    ? post.likes.find((l) => (typeof l === 'object' ? String(l.userId) : String(l)) === String(currentUser?.id))
    : null;
  const isLiked = !!myLike;
  const likedEmoji = typeof myLike === 'object' ? myLike?.emoji : null;
  const isOwner = post?.userId === currentUser?.id;

  const handleComment = () => {
    if (!commentText.trim()) return;
    const finalText = commentText.trim();
    onComment(post.id, finalText, replyTo ? { id: replyTo.id, name: replyTo.name } : null);
    setCommentText('');
    setReplyTo(null);
  };

  const tagColorMap = {
    'Toán - Lý': '#f59e0b',
    'Lập trình': '#3ecfcf',
    'Kinh tế': '#22c55e',
    'Ngoại ngữ': '#6c63ff',
    'Thông báo': '#ef4444',
  };
  const tagColor = tagColorMap[post.tag] || '#8b92b8';

  return (
    <article
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        marginBottom: '14px',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(108,99,255,0.4)';
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(108,99,255,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px 0' }}>
        <Avatar src={post.userAvatar} initial={post.userFullName || 'U'} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
              {post.userFullName}
            </span>
            {post.isPinned && (
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  background: 'rgba(255, 122, 0, 0.12)',
                  color: 'var(--secondary)',
                  border: '1px solid rgba(255, 122, 0, 0.25)',
                }}
              >
                📌 Đã ghim
              </span>
            )}
            {post.tag && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 9px',
                  borderRadius: '20px',
                  background: `${tagColor}22`,
                  color: tagColor,
                  border: `1px solid ${tagColor}44`,
                }}
              >
                {post.tag}
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
            {post.university && `🏫 ${post.university} · `}
            {timeAgo(post.createdAt)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {isOwner && onPin && (
            <button
              onClick={() => onPin(post.id)}
              title={post.isPinned ? "Bỏ ghim bài viết" : "Ghim bài viết"}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: post.isPinned ? 'var(--secondary)' : 'var(--text-muted)',
                fontSize: '16px',
                padding: '4px 8px',
                borderRadius: '8px',
                lineHeight: 1,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = post.isPinned ? 'var(--secondary)' : 'var(--text-muted)')}
            >
              📌
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => onDelete(post.id)}
              title="Xóa bài"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '18px',
                padding: '4px 8px',
                borderRadius: '8px',
                lineHeight: 1,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              🗑
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 18px 14px' }}>
        <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>
          {isLong && !expanded ? (post.content || '').slice(0, 200) + '…' : (post.content || '')}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--primary-light)',
              fontWeight: 600,
              fontSize: '13px',
              padding: '4px 0 0',
              fontFamily: 'inherit',
            }}
          >
            {expanded ? '▲ Thu gọn' : '▼ Xem thêm'}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px 10px',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {post.likes && post.likes.length > 0 && (() => {
            const emojis = [
              ...new Set(
                post.likes.map((l) => (typeof l === 'object' ? l.emoji : '💜')).filter(Boolean)
              ),
            ].slice(0, 3);
            return (
              <>
                <span>{emojis.join('')}</span>
                <span>{post.likes.length} lượt thích</span>
              </>
            );
          })()}
        </span>
        <span style={{ cursor: 'pointer' }} onClick={() => setShowComments((v) => !v)}>
          {post.comments && post.comments.length > 0 && `${post.comments.length} bình luận`}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '0 18px' }} />

      {/* Action buttons */}
      <LikeCommentBar
        post={post}
        isLiked={isLiked}
        likedEmoji={likedEmoji}
        showComments={showComments}
        onLike={(em, e) => onLike(post.id, em, e)}
        onToggleComments={() => setShowComments((v) => !v)}
      />

      {/* Comments section */}
      {showComments && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px 14px' }}>
          {/* Threaded comments tree */}
          {post.comments && post.comments.length > 0 && (() => {
            const roots = post.comments.filter((c) => !c.parentId);
            const repliesOf = (pid) => post.comments.filter((c) => c.parentId === pid);
            const renderComment = (c, depth = 0) => {
              const replies = repliesOf(c.id);
              return (
                <div key={c.id}>
                  <CommentRow
                    comment={c}
                    liked={!!commentReactions[c.id]}
                    likedEmoji={commentReactions[c.id] || null}
                    onLike={(em) =>
                      setCommentReactions((prev) => ({
                        ...prev,
                        [c.id]: prev[c.id] && !em ? null : em || '👍',
                      }))
                    }
                    onReply={() => {
                      setReplyTo({ id: c.id, name: c.userFullName });
                      setShowComments(true);
                      setTimeout(
                        () => document.getElementById(`comment-input-${post.id}`)?.focus(),
                        80
                      );
                    }}
                  />
                  {replies.length > 0 && (
                    <div
                      style={{
                        marginLeft: depth < 1 ? '40px' : '20px',
                        marginTop: '8px',
                        paddingLeft: '12px',
                        borderLeft: '2px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {replies.map((r) => renderComment(r, depth + 1))}
                    </div>
                  )}
                </div>
              );
            };
            return (
              <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {roots.map((c) => renderComment(c))}
              </div>
            );
          })()}

          {/* Write comment */}
          {currentUser && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {replyTo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0 0 40px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--primary-light)', fontWeight: 600 }}>
                    ↩️ Đang trả lời <strong>{replyTo.name}</strong>
                  </span>
                  <button
                    onClick={() => setReplyTo(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: '13px',
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Avatar
                  src={currentUser.avatar}
                  initial={currentUser.fullName || 'U'}
                  size={30}
                />
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                  }}
                >
                  <input
                    id={`comment-input-${post.id}`}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                    placeholder={replyTo ? `Trả lời ${replyTo.name}...` : 'Viết bình luận...'}
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      padding: '8px 14px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentText.trim()}
                    style={{
                      background: commentText.trim() ? 'var(--primary)' : 'transparent',
                      border: 'none',
                      cursor: commentText.trim() ? 'pointer' : 'default',
                      padding: '0 14px',
                      color: commentText.trim() ? 'white' : 'var(--text-muted)',
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      transition: 'var(--transition)',
                    }}
                  >
                    Gửi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
