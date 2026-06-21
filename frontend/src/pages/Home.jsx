/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getUserSchedulesAndDeadlines, getPosts, deletePost, createComment, toggleLikePost, togglePinPost } from '@/services/interactionService';
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

  const [schedules, setSchedules] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [friends, setFriends] = useState([]);
  const [myLeaderGroups, setMyLeaderGroups] = useState([]);
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
      // Cache removed to comply with quota limits
    } catch (err) {
      console.warn('Error fetching posts:', err);
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
      }
    } catch (err) {
      console.warn('Error fetching side panel data:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
    fetchSideData();

    // Chỉ refetch khi có post mới INSERT hoặc xóa/sửa post của mình
    const postsChannel = supabase
      .channel('realtime-posts')
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
            if (postUserId && String(postUserId) === String(user?.id)) {
              fetchPosts();
            }
          }
        }
      )
      .subscribe();

    const interval = setInterval(fetchSideData, 30000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(postsChannel);
    };
  }, [fetchPosts, fetchSideData, user?.id]);

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', height: '100%', alignItems: 'stretch' }}>

          {/* MIDDLE COLUMN: Feed */}
          <main style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', paddingRight: '4px', overflow: 'hidden' }}>
            {/* Create Question Box - Fixed Top */}
            <div style={{ flexShrink: 0, paddingBottom: '14px', zIndex: 20 }}>
              <div className="sc-card-animated sc-card-hover" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid var(--border)', borderRadius: '18px', padding: '16px 18px', display: 'flex', gap: '12px', alignItems: 'center', animationDelay: '0s' }}>
                <div className="sc-avatar-hover" style={{ display: 'inline-flex', borderRadius: '50%', flexShrink: 0 }}>
                  <Avatar src={user?.avatar} initial={user?.fullName || 'U'} size={42} />
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '24px', padding: '12px 18px', color: 'var(--text-muted)', fontSize: '14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'; }}
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
 
          {/* RIGHT COLUMN: fixed, does not scroll with posts */}
          <aside className="no-scrollbar" style={{ position: 'sticky', top: 0, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto', paddingBottom: '24px' }}>
            <div className="sc-card-animated" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', maxHeight: '420px', animationDelay: '0.1s' }}>

              {/* ─ Header chung ─ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                    <line x1="16" x2="16" y1="2" y2="6"/>
                    <line x1="8" x2="8" y1="2" y2="6"/>
                    <line x1="3" x2="21" y1="10" y2="10"/>
                    <path d="m9 16 2 2 4-4"/>
                  </svg>
                  Lịch và Deadline
                </span>
                <Link to="/schedule" style={{ fontSize: '12px', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700 }}>Tất cả</Link>
              </div>

              {/* ─ Scrollable body ─ */}
              <div className="no-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>

              {/* ─ Buổi học sắp tới ─ */}
              <div style={{ padding: '10px 16px 6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(17,24,39,0.06)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: '30px', height: '30px', borderRadius: '7px', flexShrink: 0, background: 'rgba(17,24,39,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                            <path d="M6 6h10"/><path d="M6 10h10"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{s.topic}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
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
                <div style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Deadline cần nộp
                </div>
                {deadlines.length === 0 ? (
                  <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    Không còn deadline nào
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                ) : (
                  deadlines.map((d) => (
                    <Link key={d.id} to={`/groups/${d.groupId}?tab=deadlines`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'center',
                          padding: '8px 8px',
                          margin: '2px 0',
                          borderRadius: '8px',
                          borderBottom: '1px solid var(--border)',
                          background: d.dueSoon ? 'linear-gradient(135deg, rgba(217, 158, 46, 0.08), rgba(217, 158, 46, 0.03))' : 'none',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = d.dueSoon ? 'linear-gradient(135deg, rgba(217, 158, 46, 0.15), rgba(217, 158, 46, 0.05))' : 'rgba(17,24,39,0.06)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = d.dueSoon ? 'linear-gradient(135deg, rgba(217, 158, 46, 0.08), rgba(217, 158, 46, 0.03))' : 'transparent'}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: d.overdue ? '#64748b' : d.dueSoon ? 'var(--error)' : 'var(--success)', boxShadow: d.overdue ? 'none' : d.dueSoon ? '0 0 8px var(--error)' : '0 0 8px var(--success)' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: d.overdue ? 'var(--text-muted)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                              </svg>
                              {d.groupName}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: d.dueSoon ? 'var(--error)' : d.overdue ? 'var(--text-muted)' : 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              {d.dueSoon ? (
                                <>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                  </svg>
                                  Dưới 24h
                                </>
                              ) : (
                                new Date(d.dueDate).toLocaleDateString('vi-VN')
                              )}
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
            <div className="sc-card-animated" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow)', animationDelay: '0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <span className="sc-online-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#2A7576', boxShadow: '0 0 6px rgba(168, 124, 135, 0.7)' }} />
                  Bạn bè trực tuyến ({friends.filter(f => onlineUserIds.includes(f.userId.toString())).length})
                </span>
                <Link to="/friends" style={{ fontSize: '12px', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700 }}>Tất cả</Link>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxHeight: '200px',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                padding: '10px 16px 16px 16px',
              }}>
                {friends.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px', opacity: 0.55 }}>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="17" y1="8" x2="21" y2="12" />
                      <line x1="21" y1="8" x2="17" y2="12" />
                    </svg>
                    <span>Chưa có bạn bè nào. <Link to="/friends" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Kết bạn ngay</Link></span>
                  </div>
                ) : (() => {
                  const onlineFriends = friends.filter(f => onlineUserIds.includes(f.userId.toString()));
                  if (onlineFriends.length === 0) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px', opacity: 0.55 }}>
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="17" y1="8" x2="21" y2="12" />
                          <line x1="21" y1="8" x2="17" y2="12" />
                        </svg>
                        <span>Chưa có bạn bè nào trực tuyến.</span>
                      </div>
                    );
                  }
                  return onlineFriends.slice(0, 20).map((f) => (
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
                            background: '#2A7576',
                            border: '2px solid var(--bg-card)',
                            boxShadow: '0 0 6px rgba(168, 124, 135, 0.7)'
                          }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.fullName}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Đang hoạt động
                          </div>
                        </div>
                      </div>
                    </Link>
                  ));
                })()}
              </div>
            </div>
          </aside>


        </div>
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