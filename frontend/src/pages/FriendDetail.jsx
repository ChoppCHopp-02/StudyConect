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

const AVATAR_COLORS = ['#4A2530', '#A87C87', '#C9A896', '#E8D3C3', '#D69E2E'];
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
    if (!bio) return null;
    if (bio.includes('[hide_loc:1]')) return null; // Ẩn khu vực sinh sống

    if (bio.startsWith('[📍 ')) {
      const endIdx = bio.indexOf(']');
      if (endIdx > 0) {
        return bio.substring(4, endIdx);
      }
    }
    return null;
  };

  // Clean location tags and visibility tags from bio display
  const displayBioText = (bio) => {
    if (!bio) return 'Chưa có tiểu sử.';
    let clean = bio;
    if (clean.startsWith('[📍 ')) {
      const endIdx = clean.indexOf(']');
      if (endIdx > 0) {
        clean = clean.substring(endIdx + 1).trim();
      }
    }
    clean = clean.replace('[hide_loc:1]', '').replace('[hide_join:1]', '').trim();
    return clean || 'Chưa có tiểu sử.';
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
          .select('id, full_name, email, avatar, university, major, bio, created_at')
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
          <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
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
            onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
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
                background: isOnline ? '#2A7576' : '#ef4444',
                border: '3px solid var(--bg-card)',
                boxShadow: isOnline ? '0 0 10px rgba(168, 124, 135, 0.7)' : 'none',
                zIndex: 2
              }} />
            </div>

            <h1 className="profile-name" style={{ fontSize: '22px', fontWeight: 800 }}>{friendData.full_name}</h1>
            <p className="profile-email">{friendData.email}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
              <span className="profile-badge" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <polyline points="16 11 18 13 22 9" />
                </svg>
                BẠN BÈ
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '20px',
                background: isOnline ? 'rgba(42,117,118,0.12)' : 'rgba(239,68,68,0.12)',
                color: isOnline ? '#2A7576' : '#ef4444',
                border: isOnline ? '1px solid rgba(42,117,118,0.3)' : '1px solid rgba(239,68,68,0.3)'
              }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? '#2A7576' : '#ef4444' }} />
                {isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
              </span>
            </div>
          </div>

          {/* Metadata Info */}
          <div className="profile-meta" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            {friendData.university && (
              <div className="profile-meta-item">
                <span className="icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                  </svg>
                </span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trường học</div>
                  <div style={{ fontWeight: 600 }}>{friendData.university}</div>
                </div>
              </div>
            )}
            {friendData.major && (
              <div className="profile-meta-item">
                <span className="icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10" />
                    <path d="M6 10h10" />
                  </svg>
                </span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Chuyên ngành</div>
                  <div style={{ fontWeight: 600 }}>{friendData.major}</div>
                </div>
              </div>
            )}
            {locationInfo && (
              <div className="profile-meta-item">
                <span className="icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Khu vực</div>
                  <div style={{ fontWeight: 600 }}>{locationInfo}</div>
                </div>
              </div>
            )}
            {friendData.created_at && !friendData.bio?.includes('[hide_join:1]') && (
              <div className="profile-meta-item">
                <span className="icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ngày tham gia</div>
                  <div style={{ fontWeight: 600 }}>{new Date(friendData.created_at).toLocaleDateString('vi-VN')}</div>
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
                background: activeTab === 'posts' ? 'var(--bg-input)' : 'transparent',
                color: activeTab === 'posts' ? 'var(--text-primary)' : 'var(--text-secondary)',
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
                  e.currentTarget.style.color = 'var(--primary)';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== 'posts') {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Lịch sử đăng bài
            </button>

            {/* Thông tin thêm (Tab Button) */}
            <button
              onClick={() => setActiveTab('about')}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: activeTab === 'about' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                background: activeTab === 'about' ? 'var(--bg-input)' : 'transparent',
                color: activeTab === 'about' ? 'var(--text-primary)' : 'var(--text-secondary)',
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
                  e.currentTarget.style.color = 'var(--primary)';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== 'about') {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Thông tin giới thiệu
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Nhắn tin trò chuyện
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="m22 8-6 4 6 4V8Z" />
                <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
              </svg>
              Gọi video riêng tư
            </button>

          </div>
        </div>

        {/* RIGHT COLUMN: Tab content */}
        <div className="profile-main">
          
          {activeTab === 'about' && (
            <div className="profile-card">
              <div className="profile-card-header">
                <div className="card-header-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
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
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                      Lịch sử bài đăng
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Toàn bộ các bài viết chia sẻ của {friendData.full_name}</p>
                  </div>
                  <div style={{
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid var(--border)'
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
