/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPosts, deletePost, createComment, toggleLikePost, togglePinPost } from '@/services/interactionService';
import { getFriends } from '@/services/friendService';
import { getAllGroups } from '@/services/groupService';
import { supabase } from '@/config/supabaseClient';
import AppLayout from '@/layouts/AppLayout';
import Avatar from '@/components/common/Avatar';
import PostList from '@/components/posts/PostList';
import CreatePostModal from '@/components/posts/CreatePostModal';
import ConfirmModal from '@/components/ConfirmModal';
import { Typewriter } from '@/components/common/Typewriter';



export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [friends, setFriends] = useState([]);
  const [myLeaderGroups, setMyLeaderGroups] = useState([]);
  const [particles, setParticles] = useState([]); // { id, x, y, char, delay, leftOffset }

  const spawnParticles = (emoji, clientX, clientY) => {
    // Spawn 6 fixed-positioned emoji particles
    const newParticles = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      x: clientX,
      y: clientY - 10,
      char: emoji,
      delay: i * 0.05,
      leftOffset: (Math.random() - 0.5) * 100
    }));

    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1500);
  };

  // Fetch friends list
  useEffect(() => {
    if (!user?.id) return;
    const loadFriendsAndGroups = async () => {
      try {
        const list = await getFriends(user.id);
        setFriends(list);
        // Cache removed to comply with quota limits
      } catch (err) {
        console.warn('Error fetching friends:', err);
      }
      try {
        const allGroups = await getAllGroups();
        const leaderGroups = allGroups.filter(g => String(g.creatorId) === String(user.id));
        setMyLeaderGroups(leaderGroups);
      } catch (err) {
        console.warn('Error fetching groups:', err);
      }
    };
    loadFriendsAndGroups();
  }, [user?.id]);

  // Fetch database posts
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const fetchPosts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getPosts(user.id);
      setPosts(data);
      // Cache removed to comply with quota limits
    } catch (err) {
      console.warn('Error fetching posts:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchPosts();

    // Chỉ refetch khi có post mới INSERT hoặc xóa/sửa post của mình
    const postsChannel = supabase
      .channel(`posts-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Post mới → luôn refetch (có thể là bạn bè đăng)
            fetchPosts();
          } else if (payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') {
            // Chỉ refetch nếu post đó thuộc về user hiện tại hoặc đang hiển thị trong feed
            const postUserId = payload.old?.user_id || payload.new?.user_id;
            if (postUserId && String(postUserId) === String(user.id)) {
              fetchPosts();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, [fetchPosts, user?.id]);

  // Post handlers
  const handleLikePost = async (postId, emoji, e) => {
    if (!user) return;
    try {
      if (emoji && e && e.clientX && e.clientY) {
        spawnParticles(emoji, e.clientX, e.clientY);
      }
      const updatedLikes = await toggleLikePost(postId, user.id, emoji);
      setPosts(posts.map((p) => {
        if (p.id !== postId) return p;
        return { ...p, likes: updatedLikes };
      }));
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleDeletePost = (postId) => {
    setConfirmConfig({
      title: 'Xóa câu hỏi',
      message: 'Bạn có chắc chắn muốn xóa câu hỏi này? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          await deletePost(postId);
          setPosts(posts.filter((p) => p.id !== postId));
        } catch (err) {
          console.error(`Xóa thất bại: ${err.message}`);
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleCommentPost = async (postId, content, replyTo = null) => {
    if (!user) return;
    try {
      const newComment = await createComment(postId, {
        content,
        userId: user.id,
        parentId: replyTo?.id || null
      });
      if (replyTo) {
        newComment.replyToName = replyTo.name;
      }
      setPosts(posts.map((p) => {
        if (p.id !== postId) return p;
        const comments = Array.isArray(p.comments) ? [...p.comments] : [];
        comments.push(newComment);
        return { ...p, comments };
      }));
    } catch (err) {
      alert(`Bình luận thất bại: ${err.message}`);
    }
  };

  const handlePinPost = async (postId) => {
    try {
      const isPinned = await togglePinPost(postId);
      setPosts(posts.map((p) => {
        if (p.id !== postId) return p;
        return { ...p, isPinned };
      }));
    } catch (err) {
      console.error('Error toggling pin on post:', err);
    }
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });



  return (
    <AppLayout>
      <style>{`
        @keyframes floatEmojiUpFixed {
          0% {
            transform: translate3d(-50%, 0, 0) scale(0.3) rotate(0deg);
            opacity: 0;
          }
          12% {
            transform: translate3d(-50%, -20px, 0) scale(1.4) rotate(15deg);
            opacity: 1;
          }
          50% {
            transform: translate3d(calc(-50% + var(--dx) * 0.5), -80px, 0) scale(1.1) rotate(-15deg);
            opacity: 0.95;
          }
          100% {
            transform: translate3d(calc(-50% + var(--dx)), -160px, 0) scale(0.6) rotate(35deg);
            opacity: 0;
          }
        }
        .emoji-particle-fixed {
          position: fixed;
          pointer-events: none;
          font-size: 32px;
          z-index: 999999;
          animation: floatEmojiUpFixed 1.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          user-select: none;
        }
        @keyframes sc-float-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .sc-card-animated {
          animation: sc-float-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .sc-card-hover {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sc-card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(35, 97, 95, 0.12);
        }
        @keyframes sc-pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.7; }
        }
        .sc-online-dot {
          animation: sc-pulse-dot 1.8s ease-in-out infinite;
        }
        .sc-avatar-hover {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .sc-avatar-hover:hover {
          transform: scale(1.08) rotate(-3deg);
        }
      `}</style>

      {particles.map(p => (
        <span
          key={p.id}
          className="emoji-particle-fixed"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            animationDelay: `${p.delay}s`,
            '--dx': `${p.leftOffset}px`
          }}
        >
          {p.char}
        </span>
      ))}
      <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* MIDDLE COLUMN: Feed */}
        <main style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', paddingRight: '4px', overflow: 'hidden', height: '100%' }}>
          {/* Create Question Box - Fixed Top */}
          <div style={{ flexShrink: 0, paddingBottom: '14px', zIndex: 20 }}>
            <div className="sc-card-animated sc-card-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '16px 18px', display: 'flex', gap: '12px', alignItems: 'center', animationDelay: '0s' }}>
              <div className="sc-avatar-hover" style={{ display: 'inline-flex', borderRadius: '50%', flexShrink: 0 }}>
                <Avatar src={user?.avatar} initial={user?.fullName || 'U'} size={42} />
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '24px', padding: '12px 18px', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'rgba(181, 73, 91, 0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
              >
                <Typewriter
                  text={[
                    'Bạn muốn chia sẻ điều gì hôm nay?',
                    'Hôm nay học gì rồi?',
                    'Đặt câu hỏi cho nhóm học của bạn...',
                  ]}
                />
              </button>
            </div>
          </div>

          {/* Post List - Scrollable Area */}
          <div className="no-scrollbar sc-card-animated" style={{ flex: 1, height: 0, overflowY: 'auto', animationDelay: '0.05s' }}>
            <PostList
              posts={sortedPosts}
              currentUser={user}
              onLike={handleLikePost}
              onDelete={handleDeletePost}
              onComment={handleCommentPost}
              onPin={handlePinPost}
            />
          </div>
        </main>
      </div>

      {showCreateModal && (
        <CreatePostModal
          user={user}
          friends={friends}
          myLeaderGroups={myLeaderGroups}
          onClose={() => setShowCreateModal(false)}
          onSubmit={() => {}}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmConfig}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        confirmText={confirmConfig?.confirmText}
        cancelText={confirmConfig?.cancelText}
        variant={confirmConfig?.variant}
        onConfirm={confirmConfig?.onConfirm}
        onCancel={confirmConfig?.onCancel || (() => setConfirmConfig(null))}
      />
    </AppLayout>
  );
}