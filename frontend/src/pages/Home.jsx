/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getUserSchedulesAndDeadlines, getPosts, deletePost, createComment, toggleLikePost, togglePinPost } from '@/services/interactionService';
import { getFriends } from '@/services/friendService';
import { supabase } from '@/config/supabaseClient';
import AppLayout from '@/layouts/AppLayout';
import Avatar from '@/components/common/Avatar';
import PostList from '@/components/posts/PostList';
import CreatePostModal from '@/components/posts/CreatePostModal';
import ConfirmModal from '@/components/ConfirmModal';



export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [schedules, setSchedules] = useState(() => {
    try {
      const cached = localStorage.getItem('studyconect_schedules');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [deadlines, setDeadlines] = useState(() => {
    try {
      const cached = localStorage.getItem('studyconect_deadlines');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [friends, setFriends] = useState([]);
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

  // Fetch friends list
  useEffect(() => {
    if (!user?.id) return;
    const fetchFriendsList = async () => {
      try {
        const list = await getFriends(user.id);
        setFriends(list);
      } catch (err) {
        console.warn('Error fetching friends:', err);
      }
    };
    fetchFriendsList();
  }, [user?.id]);

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



  // Fetch database posts
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const fetchPosts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getPosts(user.id);
      setPosts(data);
    } catch (err) {
      console.warn('Error fetching posts:', err);
      setPosts([]);
    }
  }, [user?.id]);

  const fetchSideData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 2. Execute the async network calls in parallel using Promise.all
      const [schedulesRes] = await Promise.all([
        getUserSchedulesAndDeadlines(user.id).catch(err => { console.warn('Schedules fetch failed:', err); return null; })
      ]);

      // 4. User schedules & deadlines list (only update if successfully fetched)
      if (schedulesRes) {
        const { schedules: schedList = [], deadlines: deadList = [] } = schedulesRes;
        
        // Filter upcoming schedules
        const now = Date.now();
        const upcomingSched = schedList
          .filter((s) => new Date(s.dateTime) >= now)
          .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
          .slice(0, 3);
        setSchedules(upcomingSched);
        localStorage.setItem('studyconect_schedules', JSON.stringify(upcomingSched));

        // Filter incomplete deadlines due soon
        const oneDayMs = 24 * 60 * 60 * 1000;
        const incompleteDead = deadList
          .filter((d) => !d.completed)
          .map((d) => {
            const due = new Date(d.dueDate).getTime();
            return {
              ...d,
              dueSoon: due > now && due - now <= oneDayMs,
              overdue: due < now,
            };
          })
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
          .slice(0, 4);
        setDeadlines(incompleteDead);
        localStorage.setItem('studyconect_deadlines', JSON.stringify(incompleteDead));
      }
    } catch (err) {
      console.warn('Error fetching side panel data:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
    fetchSideData();

    // Listen for realtime posts from Supabase
    const postsChannel = supabase
      .channel('realtime-posts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          fetchPosts(); // Automatically refetch post feed in real-time!
        }
      )
      .subscribe();

    const interval = setInterval(fetchSideData, 6000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(postsChannel);
    };
  }, [fetchPosts, fetchSideData]);

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', height: '100%', alignItems: 'stretch' }}>

          {/* MIDDLE COLUMN: Feed */}
          <main style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', paddingRight: '4px', overflow: 'hidden' }}>
            {/* Create Question Box - Fixed Top */}
            <div style={{ flexShrink: 0, paddingBottom: '14px', zIndex: 20 }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '16px 18px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Avatar src={user?.avatar} initial={user?.fullName || 'U'} size={42} />
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '24px', padding: '12px 18px', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
                >
                  Bạn muốn chia sẻ điều gì hôm nay? Đăng bài ngay...
                </button>
              </div>
            </div>

            {/* Post List - Scrollable Area */}
            <div className="no-scrollbar" style={{ flex: 1, height: 0, overflowY: 'auto' }}>
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
 
          {/* RIGHT COLUMN: fixed, does not scroll with posts */}
          <aside className="no-scrollbar" style={{ position: 'sticky', top: '20px', alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto', paddingBottom: '24px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', maxHeight: '420px' }}>

              {/* ─ Header chung ─ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(255,122,0,0.5))' }}>
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                    <line x1="16" x2="16" y1="2" y2="6"/>
                    <line x1="8" x2="8" y1="2" y2="6"/>
                    <line x1="3" x2="21" y1="10" y2="10"/>
                    <path d="m9 16 2 2 4-4"/>
                  </svg>
                  Lịch & Deadline
                </span>
                <Link to="/schedule" style={{ fontSize: '12px', color: 'var(--secondary)', textDecoration: 'none', fontWeight: 700 }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary)'}>Tất cả</Link>
              </div>

              {/* ─ Scrollable body ─ */}
              <div className="no-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>

              {/* ─ Buổi học sắp tới ─ */}
              <div style={{ padding: '10px 16px 6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                  </svg>
                  Buổi học sắp tới
                </div>
                {schedules.length === 0 ? (
                  <div style={{ padding: '10px 0 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    Chưa có lịch học nào
                  </div>
                ) : (
                  schedules.map((s) => (
                    <Link key={s.id} to={`/groups/${s.groupId}?tab=schedule`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <div
                        style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,122,0,0.06)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: '30px', height: '30px', borderRadius: '7px', flexShrink: 0, background: 'rgba(255,122,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                            <path d="M6 6h10"/><path d="M6 10h10"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{s.topic}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🕐</span>
                            <span>{new Date(s.dateTime).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {/* ─ Divider ─ */}
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, var(--border), transparent)', margin: '0 16px' }} />

              {/* ─ Deadline cần nộp ─ */}
              <div style={{ padding: '10px 16px 14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Deadline cần nộp
                </div>
                {deadlines.length === 0 ? (
                  <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    Không còn deadline nào 🎉
                  </div>
                ) : (
                  deadlines.map((d) => (
                    <Link key={d.id} to={`/groups/${d.groupId}?tab=deadlines`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <div
                        style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', background: d.dueSoon ? 'rgba(244,63,94,0.03)' : 'none', transition: 'all 0.2s ease', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = d.dueSoon ? 'rgba(244,63,94,0.08)' : 'rgba(255,122,0,0.06)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = d.dueSoon ? 'rgba(244,63,94,0.03)' : 'transparent'}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: d.overdue ? '#64748b' : d.dueSoon ? 'var(--error)' : 'var(--success)', boxShadow: d.overdue ? 'none' : d.dueSoon ? '0 0 8px var(--error)' : '0 0 8px var(--success)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: d.overdue ? 'var(--text-muted)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📂 {d.groupName}</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: d.dueSoon ? 'var(--error)' : d.overdue ? 'var(--text-muted)' : 'var(--success)' }}>
                              {d.dueSoon ? '⚡ Dưới 24h' : new Date(d.dueDate).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              </div>{/* end scrollable body */}
            </div>

            {/* ── Bạn bè trực tuyến ── */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow)', padding: '14px 16px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                  Bạn bè trực tuyến
                </span>
                <Link to="/friends" style={{ fontSize: '12px', color: 'var(--secondary)', textDecoration: 'none', fontWeight: 700 }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-light)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary)'}>Tất cả</Link>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxHeight: '200px',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                paddingRight: '4px',
                paddingBottom: '20px',
              }}>
                {friends.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '10px 0' }}>
                    Chưa có bạn bè nào. <Link to="/friends" style={{ color: 'var(--secondary)', fontWeight: 600 }}>Kết bạn ngay</Link>
                  </div>
                ) : (
                  (() => {
                    const sortedFriends = [...friends].sort((a, b) => {
                      const aOn = onlineUserIds.includes(a.userId.toString()) ? 1 : 0;
                      const bOn = onlineUserIds.includes(b.userId.toString()) ? 1 : 0;
                      return bOn - aOn; // Online first
                    });
                    return sortedFriends.slice(0, 20).map((f) => {
                      const isOnline = onlineUserIds.includes(f.userId.toString());
                      return (
                        <Link key={f.userId} to={`/friends/${f.userId}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '10px', transition: 'all 0.2s ease', cursor: 'pointer', background: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <Avatar src={f.avatar} initial={f.fullName} size={32} />
                              <span style={{
                                position: 'absolute', bottom: -1, right: -1,
                                width: '10px', height: '10px', borderRadius: '50%',
                                background: isOnline ? '#10b981' : '#ef4444',
                                border: '2px solid var(--bg-card)',
                                boxShadow: isOnline ? '0 0 6px #10b981' : 'none'
                              }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.fullName}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          </aside>


        </div>
      </div>

      {showCreateModal && (
        <CreatePostModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(newPost) => setPosts([newPost, ...posts])}
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