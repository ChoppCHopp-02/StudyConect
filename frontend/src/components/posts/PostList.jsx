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
          border: 'none',
          borderRadius: '18px',
          fontSize: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}
      >
        <span>Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!</span>
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
