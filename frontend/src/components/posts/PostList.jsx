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
        }}
      >
        Chưa có bài viết nào. Hãy đặt câu hỏi đầu tiên!
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
