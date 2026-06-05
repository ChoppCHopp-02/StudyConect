// src/pages/FriendDetail.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import { useToast } from '../components/Toast';
import { supabase } from '../config/supabaseClient';
import AppLayout from '../layouts/AppLayout';
import PostList from '../components/posts/PostList';
import {
  toggleLikePost,
  deletePost,
  createComment,
  togglePinPost,
  getUserPosts
} from '../services/interactionService';

const AVATAR_COLORS = ['#6c63ff', '#ff6b9d', '#3ecfcf', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6'];
const colorOf = (str) => AVATAR_COLORS[(str || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

export default function FriendDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { initiateCall } = useCall();
  const { addToast } = useToast();

  const [friendData, setFriendData] = useState(null);
  const [loadingFriend, setLoadingFriend] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [checkingFriendship, setCheckingFriendship] = useState(true);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'about' | 'posts'
  const [onlineUserIds, setOnlineUserIds] = useState([]);
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

  // Subscribe to real-time presence channel
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id.toString(),
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.keys(state);
        setOnlineUserIds(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id.toString(),
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const isOnline = onlineUserIds.includes(id?.toString());

  // Parse location bio [📍 Province, District]
  const parseLocation = (bio) => {
    if (bio && bio.startsWith('[📍 ')) {
      const endIdx = bio.indexOf(']');
      if (endIdx > 0) {
        return bio.substring(4, endIdx);
      }
    }
    return null;
  };

  // Clean location tags from bio display
  const displayBioText = (bio) => {
    if (!bio) return 'Chưa có tiểu sử.';
    if (bio.startsWith('[📍 ')) {
      const endIdx = bio.indexOf(']');
      if (endIdx > 0) {
        return bio.substring(endIdx + 1).trim() || 'Chưa có tiểu sử.';
      }
    }
    return bio;
  };

  // Check friendship status
  useEffect(() => {
    const checkFriendship = async () => {
      if (!user?.id || !id) return;
      try {
        const uid = parseInt(user.id, 10);
        const fid = parseInt(id, 10);
        
        const { data, error } = await supabase
          .from('friendships')
          .select('status')
          .eq('status', 'accepted')
          .or(`and(from_user_id.eq.${uid},to_user_id.eq.${fid}),and(from_user_id.eq.${fid},to_user_id.eq.${uid})`)
          .maybeSingle();

        if (error) throw error;
        setIsFriend(!!data);
      } catch (err) {
        console.error('Error checking friendship:', err);
      } finally {
        setCheckingFriendship(false);
      }
    };
    checkFriendship();
  }, [user, id]);

  // Fetch friend user profile
  useEffect(() => {
    const fetchFriendProfile = async () => {
      if (!id) return;
      setLoadingFriend(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', parseInt(id, 10))
          .single();

        if (error) throw error;
        setFriendData(data);
      } catch (err) {
        console.error('Error fetching friend profile:', err);
        addToast('Không thể tải thông tin bạn bè.', 'error');
      } finally {
        setLoadingFriend(false);
      }
    };
    fetchFriendProfile();
  }, [id, addToast]);

  // Load friend posts
  const loadPosts = useCallback(async () => {
    if (!id) return;
    setLoadingPosts(true);
    try {
      const fetched = await getUserPosts(id);
      setPosts(fetched);
    } catch (err) {
      console.error('Error loading user posts:', err);
      addToast('Không thể tải danh sách bài viết.', 'error');
    } finally {
      setLoadingPosts(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    if (activeTab === 'posts') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadPosts();
    }
  }, [activeTab, loadPosts]);

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
      addToast(`Bình luận thất bại: ${err.message}`, 'error');
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
      console.error('Error toggling pin:', err);
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
      try {
        await deletePost(postId);
        setPosts(posts.filter((p) => p.id !== postId));
        addToast('Đã xóa bài viết thành công.', 'success');
      } catch (err) {
        addToast(`Xóa thất bại: ${err.message}`, 'error');
      }
    }
  };

  const handleStartCall = () => {
    if (friendData) {
      initiateCall({
        userId: friendData.id.toString(),
        fullName: friendData.full_name,
        avatar: friendData.avatar
      });
    }
  };

  // Render Loader
  if (loadingFriend || checkingFriendship) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
          Đang tải thông tin bạn bè...
        </div>
      </AppLayout>
    );
  }

  // Handle Unauthorized (Not Friends)
  if (!isFriend) {
    return (
      <AppLayout>
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontWeight: 800 }}>Quyền riêng tư</h2>
          <p style={{ maxWidth: '420px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Bạn chỉ có thể xem hồ sơ cá nhân và lịch sử đăng bài của những người dùng đã nằm trong danh sách bạn bè chính thức.
          </p>
          <Link to="/friends" className="btn btn-secondary" style={{ borderRadius: '24px', display: 'inline-flex', padding: '10px 24px' }}>
            ← Quay lại trang Kết bạn
          </Link>
        </div>
      </AppLayout>
    );
  }

  const locationInfo = parseLocation(friendData.bio);
  const initials = friendData.full_name
    ?.split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || '?';

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
      <div className="profile-container" style={{ marginTop: '24px' }}>
        
        {/* LEFT COLUMN: Sidebar info */}
        <div className="profile-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Back btn */}
          <button 
            onClick={() => navigate('/friends')}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 0',
              transition: 'var(--transition)'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-light)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            ← Quay lại bạn bè
          </button>

          {/* Avatar Area */}
          <div>
            <div className="avatar-wrap" style={{ position: 'relative', margin: '0 auto 16px', display: 'block', width: 'fit-content' }}>
              {friendData.avatar ? (
                <img src={friendData.avatar} alt="avatar" className="avatar-img" />
              ) : (
                <div className="avatar-placeholder" style={{ background: `linear-gradient(135deg, ${colorOf(friendData.full_name)}, ${colorOf(friendData.full_name)}99)` }}>
                  {initials}
                </div>
              )}
              <span style={{
                position: 'absolute', bottom: '8px', right: '8px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: isOnline ? '#10b981' : '#ef4444',
                border: '3px solid var(--bg-card)',
                boxShadow: isOnline ? '0 0 10px #10b981' : 'none',
                zIndex: 2
              }} />
            </div>

            <h1 className="profile-name" style={{ fontSize: '22px', fontWeight: 800 }}>{friendData.full_name}</h1>
            <p className="profile-email">{friendData.email}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
              <span className="profile-badge" style={{ margin: 0 }}>
                🤝 BẠN BÈ
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '20px',
                background: isOnline ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                color: isOnline ? '#10b981' : '#ef4444',
                border: isOnline ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'
              }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? '#10b981' : '#ef4444' }} />
                {isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
              </span>
            </div>
          </div>

          {/* Metadata Info */}
          <div className="profile-meta" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            {friendData.university && (
              <div className="profile-meta-item">
                <span className="icon">🏫</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trường học</div>
                  <div style={{ fontWeight: 600 }}>{friendData.university}</div>
                </div>
              </div>
            )}
            {friendData.major && (
              <div className="profile-meta-item">
                <span className="icon">📚</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Chuyên ngành</div>
                  <div style={{ fontWeight: 600 }}>{friendData.major}</div>
                </div>
              </div>
            )}
            {locationInfo && (
              <div className="profile-meta-item">
                <span className="icon">📍</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Khu vực</div>
                  <div style={{ fontWeight: 600 }}>{locationInfo}</div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            
            {/* Lịch sử đăng bài (Tab Button) */}
            <button
              onClick={() => setActiveTab('posts')}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: activeTab === 'posts' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                background: activeTab === 'posts' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(255, 122, 0, 0.08))' : 'var(--bg-input)',
                color: activeTab === 'posts' ? 'var(--secondary)' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.25s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={e => {
                if (activeTab !== 'posts') {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.color = 'var(--primary-light)';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== 'posts') {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
            >
              📝 Lịch sử đăng bài
            </button>

            {/* Thông tin thêm (Tab Button) */}
            <button
              onClick={() => setActiveTab('about')}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: activeTab === 'about' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                background: activeTab === 'about' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(255, 122, 0, 0.08))' : 'var(--bg-input)',
                color: activeTab === 'about' ? 'var(--secondary)' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.25s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={e => {
                if (activeTab !== 'about') {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.color = 'var(--primary-light)';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== 'about') {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
            >
              👤 Thông tin giới thiệu
            </button>

            {/* Nhắn tin */}
            <Link 
              to="/chat" 
              className="btn btn-secondary" 
              style={{ 
                borderRadius: '12px', 
                fontSize: '14px', 
                fontWeight: 600,
                padding: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                textDecoration: 'none'
              }}
            >
              💬 Nhắn tin trò chuyện
            </Link>

            {/* Gọi Video */}
            <button 
              onClick={handleStartCall}
              className="btn btn-primary"
              style={{ 
                borderRadius: '12px', 
                fontSize: '14px', 
                fontWeight: 700,
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              📹 Gọi video riêng tư
            </button>

          </div>
        </div>

        {/* RIGHT COLUMN: Tab content */}
        <div className="profile-main">
          
          {activeTab === 'about' && (
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="card-header-icon-wrap">
                  ✨
                </div>
                <div className="card-header-text">
                  <h2>Giới thiệu bản thân</h2>
                  <p>Thông tin chi tiết về {friendData.full_name}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                <div>
                  <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tiểu sử</h3>
                  <div style={{
                    background: 'var(--bg-input)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    fontSize: '15px',
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-line'
                  }}>
                    {displayBioText(friendData.bio)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '10px' }}>
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Trường Đại học</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{friendData.university || 'Chưa cập nhật'}</div>
                  </div>
                  <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Chuyên ngành</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{friendData.major || 'Chưa cập nhật'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'posts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="profile-card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ textAlign: 'left' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>📝 Lịch sử bài đăng</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Toàn bộ các bài viết chia sẻ của {friendData.full_name}</p>
                  </div>
                  <div style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--primary-light)',
                    fontSize: '13px',
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                  }}>
                    {posts.length} Bài viết
                  </div>
                </div>
              </div>

              {loadingPosts ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '18px' }}>
                  Đang tải danh sách bài viết...
                </div>
              ) : (
                <PostList
                  posts={posts}
                  currentUser={user}
                  onLike={handleLikePost}
                  onDelete={handleDeletePost}
                  onComment={handleCommentPost}
                  onPin={handlePinPost}
                />
              )}
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
