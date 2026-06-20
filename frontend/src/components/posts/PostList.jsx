import PostCard from './PostCard';

export default function PostList({ posts, currentUser, onLike, onDelete, onComment, onPin }) {
  if (!posts || posts.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: 'var(--text-muted)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          fontSize: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}
      >
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M9 9h6M9 13h6M9 17h4" />
          <circle cx="18" cy="18" r="3" stroke="var(--primary-light)" fill="var(--bg)" />
        </svg>
        <span>Chưa có bài viết nào. Hãy đặt câu hỏi đầu tiên!</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUser={currentUser}
          onLike={onLike}
          onDelete={onDelete}
          onComment={onComment}
          onPin={onPin}
        />
      ))}
    </div>
  );
}
