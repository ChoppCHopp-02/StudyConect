import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOnlineUsers } from '@/context/OnlineUsersContext';
import { getTotalUnread, refreshCache } from '@/services/chatServiceTEMP';
import { supabase } from '@/config/supabaseClient';
import Avatar from '@/components/common/Avatar';
import { getUserSchedulesAndDeadlines } from '@/services/interactionService';
import { getFriends } from '@/services/friendService';
const NAV_ICONS = {
  home: (isActive, activeColor) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? (activeColor || 'var(--secondary)') : 'var(--text-secondary)' }}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  groups: (isActive, activeColor) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? (activeColor || 'var(--secondary)') : 'var(--text-secondary)' }}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  schedule: (isActive, activeColor) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? (activeColor || 'var(--secondary)') : 'var(--text-secondary)' }}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
      <path d="m9 16 2 2 4-4"/>
    </svg>
  ),
  friends: (isActive, activeColor) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? (activeColor || 'var(--secondary)') : 'var(--text-secondary)' }}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" x2="19" y1="8" y2="14"/>
      <line x1="16" x2="22" y1="11" y2="11"/>
    </svg>
  ),
  docs: (isActive, activeColor) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? (activeColor || 'var(--secondary)') : 'var(--text-secondary)' }}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="M10 9H8"/>
      <path d="M16 13H8"/>
      <path d="M16 17H8"/>
    </svg>
  ),
  chat: (isActive, activeColor) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? (activeColor || 'var(--secondary)') : 'var(--text-secondary)' }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  flashcards: (isActive, activeColor) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? (activeColor || 'var(--secondary)') : 'var(--text-secondary)' }}>
      <rect width="18" height="10" x="3" y="3" rx="2" ry="2"/>
      <rect width="18" height="10" x="3" y="11" rx="2" ry="2"/>
    </svg>
  ),
  profile: (isActive, activeColor) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? (activeColor || 'var(--secondary)') : 'var(--text-secondary)' }}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  more: (isActive, activeColor) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? (activeColor || 'var(--secondary)') : 'var(--text-secondary)' }}>
      <line x1="4" x2="20" y1="12" y2="12"/>
      <line x1="4" x2="20" y1="6" y2="6"/>
      <line x1="4" x2="20" y1="18" y2="18"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { icon: 'home', label: 'Trang chủ', to: '/', key: 'home' },
  { icon: 'groups', label: 'Nhóm học', to: '/groups', key: 'groups' },
  { icon: 'schedule', label: 'Lịch và Deadline', to: '/schedule', key: 'schedule' },
  { icon: 'friends', label: 'Kết bạn', to: '/friends', key: 'friends' },
  { icon: 'docs', label: 'Tài liệu', to: '/my-documents', key: 'docs' },
  { icon: 'chat', label: 'Nhắn tin', to: '/chat', key: 'chat' },
];

export default function AppLayout({ children, hideNavbar = false, hideSidebar = false, hideRightSidebar = false }) {
  const { user, logout, admin, adminLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const displayUser = isAdminPath ? admin : user;

  const shouldHideSidebar = hideSidebar;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingFriendsCount, setPendingFriendsCount] = useState(0);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

  const [schedules, setSchedules] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [friends, setFriends] = useState([]);
  const friendsCacheRef = useRef({}); // { [userId]: friends[] } — cache in memory, reset on page reload only
  const onlineUserIds = useOnlineUsers();

  // Fetch sidebar data: friends, schedules & deadlines
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const loadFriends = async () => {
      // Chỉ fetch nếu chưa có trong cache memory
      if (friendsCacheRef.current[user.id]) {
        setFriends(friendsCacheRef.current[user.id]);
        return;
      }
      try {
        const list = await getFriends(user.id);
        friendsCacheRef.current[user.id] = list;
        if (isMounted) setFriends(list);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Error fetching friends in layout:', err);
      }
    };

    const fetchSideData = async () => {
      try {
        const schedulesRes = await getUserSchedulesAndDeadlines(user.id).catch(() => null);
        if (schedulesRes && isMounted) {
          const { schedules: schedList = [], deadlines: deadList = [] } = schedulesRes;
          const now = Date.now();
          const upcomingSched = schedList
            .filter((s) => new Date(s.dateTime) >= now)
            .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
            .slice(0, 3);
          setSchedules(upcomingSched);

          const oneDayMs = 24 * 60 * 60 * 1000;
          const processedDeadlines = deadList
            .map(d => {
              const due = new Date(d.dueDate).getTime();
              return {
                ...d,
                dueSoon: !d.completed && due > now && (due - now) <= oneDayMs,
                overdue: !d.completed && due < now
              };
            })
            .filter(d => !d.completed)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 4);
          setDeadlines(processedDeadlines);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Error fetching schedules/deadlines in layout:', err);
      }
    };

    loadFriends();
    fetchSideData();

    // Poll schedules/deadlines mỗi 30 phút (tăng từ 15) — dữ liệu này không cần thời gian thực
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchSideData();
      }
    }, 1800000); // 30 phút

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id]);


  


  useEffect(() => {
    if (!user?.id) return;
    const updateUnread = async () => {
      try {
        await refreshCache(String(user.id));
        const count = getTotalUnread(String(user.id));
        setUnreadCount(count);
      } catch {
        // ignore
      }
    };
    updateUnread();
    // Không dùng setInterval để poll unread — Realtime subscription (ở dưới) đã xử lý update
    // nên xóa interval này để giảm egress từ refreshCache liên tục
    return;
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    // Channel unique mỗi mount tránh duplicate
    const channelName = `layout-unread-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async () => {
          try {
            await refreshCache(String(user.id));
            const count = getTotalUnread(String(user.id));
            setUnreadCount(count);
          } catch {
            // ignore
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async () => {
          try {
            await refreshCache(String(user.id));
            const count = getTotalUnread(String(user.id));
            setUnreadCount(count);
          } catch {
            // ignore
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchPendingCount = async () => {
      try {
        const { count } = await supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .eq('to_user_id', parseInt(user.id, 10))
          .eq('status', 'pending');
          
        if (count !== null) {
          setPendingFriendsCount(count);
        }
      } catch {
        // ignore
      }
    };
    fetchPendingCount();
    // Fallback poll 30 phút (tăng từ 15 phút) — Realtime xử lý cập nhật thời gian thực
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPendingCount();
      }
    }, 1800000); // fallback 30 phút
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    // Channel unique mỗi mount
    const channelName = `layout-pending-friends-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `to_user_id=eq.${user.id}`,
        },
        async () => {
          try {
            const { count } = await supabase
              .from('friendships')
              .select('id', { count: 'exact', head: true })
              .eq('to_user_id', parseInt(user.id, 10))
              .eq('status', 'pending');
              
            if (count !== null) {
              setPendingFriendsCount(count);
            }
          } catch {
            // ignore
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Close drawer when route changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileMenuOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleLogout = () => {
    if (isAdminPath) {
      adminLogout();
      navigate('/admin');
    } else {
      logout();
      navigate('/login');
    }
  };

  const initials = displayUser?.fullName
    ?.split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || '?';

  const isChatOrCallPath = location.pathname.startsWith('/chat') || 
                            location.pathname.startsWith('/meetroom') || 
                            location.pathname.startsWith('/call') || 
                            location.pathname.startsWith('/admin') || 
                            location.pathname.startsWith('/login') || 
                            location.pathname.startsWith('/register') ||
                            location.pathname.startsWith('/reset-password') ||
                            location.pathname.startsWith('/forgot-password');
  const showRightSidebar = !hideRightSidebar && !isChatOrCallPath && user;
  const layoutClass = (showRightSidebar && !rightSidebarCollapsed) ? 'layout-3col-custom' : 'layout-2col-custom';

  return (
    <div className="app-layout-wrapper sc-animated-bg" style={{ height: '100%', overflow: 'hidden', overscrollBehavior: 'none', position: 'relative' }}>


      {!hideNavbar && (
        <nav className="navbar" style={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 100,
          background: 'var(--bg-card)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)'
        }}>
          <Link to="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div className="nav-brand-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/studyconect_logo.png" alt="Logo" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
            </div>
            <span className="nav-brand-text" style={{
              fontFamily: "'Fraunces', serif",
              fontStyle: 'italic',
              fontSize: '21px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--primary-light) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.3px'
            }}>StudyConnect</span>
          </Link>

          <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {(location.pathname.startsWith('/groups') || location.pathname === '/schedule') && (
              <div className="flex-desktop-only" style={{ alignItems: 'center', gap: '10px' }}>
                <Link to="/" style={{
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: location.pathname === '/' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: location.pathname === '/' ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border)',
                  background: location.pathname === '/' ? 'var(--bg-input)' : 'rgba(255, 255, 255, 0.02)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease-in-out'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--text-primary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.background = 'var(--bg-input)';
                  }}
                  onMouseLeave={(e) => {
                    const isActive = location.pathname === '/';
                    e.currentTarget.style.borderColor = isActive ? 'var(--text-primary)' : 'var(--border)';
                    e.currentTarget.style.color = isActive ? 'var(--text-primary)' : 'var(--text-secondary)';
                    e.currentTarget.style.background = isActive ? 'var(--bg-input)' : 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  Trang chủ
                </Link>

                <Link to="/groups" style={{
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: location.pathname.startsWith('/groups') ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: location.pathname.startsWith('/groups') ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border)',
                  background: location.pathname.startsWith('/groups') ? 'var(--bg-input)' : 'rgba(255, 255, 255, 0.02)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease-in-out'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--text-primary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.background = 'var(--bg-input)';
                  }}
                  onMouseLeave={(e) => {
                    const isActive = location.pathname.startsWith('/groups');
                    e.currentTarget.style.borderColor = isActive ? 'var(--text-primary)' : 'var(--border)';
                    e.currentTarget.style.color = isActive ? 'var(--text-primary)' : 'var(--text-secondary)';
                    e.currentTarget.style.background = isActive ? 'var(--bg-input)' : 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  Nhóm học
                </Link>

                <Link to="/schedule" style={{
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: location.pathname === '/schedule' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: location.pathname === '/schedule' ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border)',
                  background: location.pathname === '/schedule' ? 'var(--bg-input)' : 'rgba(255, 255, 255, 0.02)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease-in-out'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--text-primary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.background = 'var(--bg-input)';
                  }}
                  onMouseLeave={(e) => {
                    const isActive = location.pathname === '/schedule';
                    e.currentTarget.style.borderColor = isActive ? 'var(--text-primary)' : 'var(--border)';
                    e.currentTarget.style.color = isActive ? 'var(--text-primary)' : 'var(--text-secondary)';
                    e.currentTarget.style.background = isActive ? 'var(--bg-input)' : 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  Lịch và Deadline
                </Link>
              </div>
            )}


            {displayUser && location.pathname !== '/groups' && (
              <button className="btn-logout desktop-only" onClick={handleLogout} style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}>
                Đăng xuất
              </button>
            )}
          </div>
        </nav>
      )}

      {/* Mobile Drawer (Menu trượt di động) */}
      <div className={`mobile-drawer-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/studyconect_logo.png" alt="Logo" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
              <span style={{ fontSize: '18px', fontWeight: 900, fontFamily: "'Fraunces', serif", fontStyle: 'italic', background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--primary-light) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>StudyConnect</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
          </div>

          {user?.id && (
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {user.avatar ? (
                <img src={user.avatar} alt="avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
              ) : (
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: 'white', border: '2px solid var(--primary)' }}>{initials}</div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{user.fullName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.email || 'Sinh viên'}</div>
              </div>
            </div>
          )}

          <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)', background: location.pathname === '/' ? 'var(--bg-input)' : 'none', border: location.pathname === '/' ? '1px solid var(--border)' : '1px solid transparent', fontWeight: 600, fontSize: '14px' }}>
              {NAV_ICONS.home(location.pathname === '/', 'var(--text-primary)')}
              Trang chủ
            </Link>

            <Link to="/flashcards" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)', background: location.pathname === '/flashcards' ? 'var(--bg-input)' : 'none', border: location.pathname === '/flashcards' ? '1px solid var(--border)' : '1px solid transparent', fontWeight: 600, fontSize: '14px' }}>
              {NAV_ICONS.flashcards(location.pathname === '/flashcards', 'var(--text-primary)')}
              Thẻ học và Trắc nghiệm
            </Link>
            <Link to="/groups" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)', background: location.pathname.startsWith('/groups') ? 'var(--bg-input)' : 'none', border: location.pathname.startsWith('/groups') ? '1px solid var(--border)' : '1px solid transparent', fontWeight: 600, fontSize: '14px' }}>
              {NAV_ICONS.groups(location.pathname.startsWith('/groups'), 'var(--text-primary)')}
              Nhóm học
            </Link>
            <Link to="/schedule" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)', background: location.pathname === '/schedule' ? 'var(--bg-input)' : 'none', border: location.pathname === '/schedule' ? '1px solid var(--border)' : '1px solid transparent', fontWeight: 600, fontSize: '14px' }}>
              {NAV_ICONS.schedule(location.pathname === '/schedule', 'var(--text-primary)')}
              Lịch học và Deadline
            </Link>
            <Link to="/friends" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)', background: location.pathname === '/friends' ? 'var(--bg-input)' : 'none', border: location.pathname === '/friends' ? '1px solid var(--border)' : '1px solid transparent', fontWeight: 600, fontSize: '14px' }}>
              {NAV_ICONS.friends(location.pathname === '/friends', 'var(--text-primary)')}
              Kết bạn
            </Link>
            <Link to="/my-documents" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)', background: location.pathname === '/my-documents' ? 'var(--bg-input)' : 'none', border: location.pathname === '/my-documents' ? '1px solid var(--border)' : '1px solid transparent', fontWeight: 600, fontSize: '14px' }}>
              {NAV_ICONS.docs(location.pathname === '/my-documents', 'var(--text-primary)')}
              Tài liệu của tôi
            </Link>
            <Link to="/chat" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)', background: location.pathname === '/chat' ? 'var(--bg-input)' : 'none', border: location.pathname === '/chat' ? '1px solid var(--border)' : '1px solid transparent', fontWeight: 600, fontSize: '14px' }}>
              {NAV_ICONS.chat(location.pathname === '/chat', 'var(--text-primary)')}
              Nhắn tin
            </Link>
            <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)', background: location.pathname === '/profile' ? 'var(--bg-input)' : 'none', border: location.pathname === '/profile' ? '1px solid var(--border)' : '1px solid transparent', fontWeight: 600, fontSize: '14px' }}>
              {NAV_ICONS.profile(location.pathname === '/profile', 'var(--text-primary)')}
              Hồ sơ cá nhân
            </Link>
          </div>

          <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
            <button onClick={handleLogout} className="btn-logout" style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '10px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      <main style={{ position: 'relative', zIndex: 1, height: hideNavbar ? '100%' : 'calc(100% - 64px)', overflow: shouldHideSidebar ? 'auto' : 'hidden' }}>
        {shouldHideSidebar ? (
          children
        ) : (
          <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 16px', height: '100%' }}>
            <div className={`layout-grid-custom ${layoutClass}`} style={{ height: '100%' }}>
              {/* Unified desktop left sidebar */}
              <aside className="desktop-only no-scrollbar" style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10, height: 'calc(100vh - 112px)', maxHeight: 'calc(100vh - 112px)', overflowY: 'auto' }}>
                {/* Profile Widget */}
                {user && (
                  <div data-profilecard="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '14px', marginBottom: '4px', overflow: 'visible', paddingRight: '8px' }}>
                    <Link to="/profile" style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 10px 10px 12px', transition: 'var(--transition)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Avatar src={user?.avatar} initial={user?.fullName || 'U'} size={34} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.fullName || 'Người dùng'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>Xem hồ sơ</div>
                        </div>
                      </div>
                    </Link>
                  </div>
                )}

                {/* Sidebar items container */}
                <div style={{ 
                  background: 'var(--bg-card)', 
                  border: '1.5px solid var(--border)', 
                  borderRadius: '14px', 
                  padding: '12px 10px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  flexGrow: 1,
                  marginBottom: '8px' 
                }}>
                  {NAV_ITEMS.map((item) => {
                    const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);

                    const sidebarBg = isActive ? '#1A1A1A' : 'none';
                    const sidebarBorder = isActive ? '1px solid #1A1A1A' : '1px solid transparent';
                    const sidebarTextColor = isActive ? '#ffffff' : 'var(--text-secondary)';
                    const sidebarIconColor = isActive ? '#ffffff' : 'var(--text-primary)';

                    const hasUnread = item.key === 'chat' && unreadCount > 0;
                    const hasPending = item.key === 'friends' && pendingFriendsCount > 0;
                    return (
                      <Link key={item.key} to={item.to} style={{ textDecoration: 'none' }}>
                        <div
                          className={!isActive ? 'sc-nav-item' : ''}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            padding: '10px 14px', 
                            borderRadius: '10px', 
                            background: sidebarBg, 
                            border: sidebarBorder,
                            position: 'relative' 
                          }}
                        >
                          <span style={{ 
                            width: '28px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            flexShrink: 0, 
                            filter: 'none' 
                          }}>
                            {NAV_ICONS[item.icon] ? NAV_ICONS[item.icon](isActive, sidebarIconColor) : item.icon}
                          </span>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: isActive ? 700 : 500, 
                            color: sidebarTextColor, 
                            flex: 1,
                            whiteSpace: 'nowrap'
                          }}>
                            {item.label}
                          </span>
                          {hasUnread && (
                            <span style={{ 
                              background: '#ef4444', 
                              color: 'white', 
                              fontSize: '10px', 
                              fontWeight: 800, 
                              padding: '2px 6px', 
                              borderRadius: '10px', 
                              minWidth: '18px', 
                              textAlign: 'center',
                              boxShadow: '0 0 8px rgba(239, 68, 68, 0.45)',
                              lineHeight: 1
                            }}>
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                          {hasPending && (
                            <span style={{ 
                              background: '#ef4444', 
                              color: 'white', 
                              fontSize: '10px', 
                              fontWeight: 800, 
                              padding: '2px 6px', 
                              borderRadius: '10px', 
                              minWidth: '18px', 
                              textAlign: 'center',
                              boxShadow: '0 0 8px rgba(239, 68, 68, 0.45)',
                              lineHeight: 1
                            }}>
                              {pendingFriendsCount > 99 ? '99+' : pendingFriendsCount}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </aside>
              <div style={{ minWidth: 0, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                {children}
              </div>

              {/* Unified desktop right sidebar */}
              {showRightSidebar && !rightSidebarCollapsed && (
                <aside className="flex-desktop-only no-scrollbar" style={{ width: '300px', position: 'sticky', top: 0, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto', paddingBottom: '24px', flexShrink: 0 }}>
                  
                  {/* Schedule and Deadline card */}
                  <div className="sc-card-animated" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', maxHeight: '420px', animationDelay: '0.1s', color: 'var(--text-primary)' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Link to="/schedule" style={{ fontSize: '12px', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700 }}>Tất cả</Link>
                        <button 
                          onClick={() => setRightSidebarCollapsed(true)} 
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            transition: 'var(--transition)'
                          }}
                          title="Thu gọn"
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-input)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="no-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
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
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26, 26, 26, 0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <div style={{ width: '30px', height: '30px', borderRadius: '7px', flexShrink: 0, background: 'rgba(26, 26, 26, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
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

                      <div style={{ height: '1px', background: 'var(--border)', margin: '0 16px' }} />

                      <div style={{ padding: '10px 16px 14px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          Deadline cần nộp
                        </div>
                        {deadlines.length === 0 ? (
                          <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            Không còn deadline nào
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
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
                                  background: d.dueSoon ? 'rgba(255, 77, 77, 0.05)' : 'none',
                                  transition: 'all 0.2s ease',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26, 26, 26, 0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = d.dueSoon ? 'rgba(255, 77, 77, 0.05)' : 'transparent'}
                              >
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: d.overdue ? 'var(--text-muted)' : d.dueSoon ? '#ff4d4d' : '#2ecc71' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                                      </svg>
                                      {d.groupName}
                                    </span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: d.dueSoon ? '#ff4d4d' : 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
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
                    </div>
                  </div>

                  {/* Online Friends card */}
                  <div className="sc-card-animated" style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow)', animationDelay: '0.15s', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                        <span className="sc-online-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#2ecc71' }} />
                        Bạn bè trực tuyến ({friends.filter(f => onlineUserIds.includes(f.userId.toString())).length})
                      </span>
                      <Link to="/friends" style={{ fontSize: '12px', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700 }}>Tất cả</Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', overscrollBehavior: 'contain', padding: '10px 16px 16px 16px' }}>
                      {friends.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px', opacity: 0.55 }}>
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="17" y1="8" x2="21" y2="12" />
                            <line x1="21" y1="8" x2="17" y2="12" />
                          </svg>
                          <span style={{ color: 'var(--text-muted)' }}>Chưa có bạn bè nào. <Link to="/friends" style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'underline' }}>Kết bạn ngay</Link></span>
                        </div>
                      ) : (() => {
                        const onlineFriends = friends.filter(f => onlineUserIds.includes(f.userId.toString()));
                        if (onlineFriends.length === 0) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px', opacity: 0.55 }}>
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="17" y1="8" x2="21" y2="12" />
                                <line x1="21" y1="8" x2="17" y2="12" />
                              </svg>
                              <span style={{ color: 'var(--text-muted)' }}>Chưa có bạn bè nào trực tuyến.</span>
                            </div>
                          );
                        }
                        return onlineFriends.slice(0, 20).map((f) => (
                          <Link key={f.userId} to={`/friends/${f.userId}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '10px', transition: 'all 0.2s ease', cursor: 'pointer', background: 'transparent' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26, 26, 26, 0.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                <Avatar src={f.avatar} initial={f.fullName} size={32} />
                                <span style={{
                                  position: 'absolute', bottom: -1, right: -1,
                                  width: '10px', height: '10px', borderRadius: '50%',
                                  background: '#2ecc71',
                                  border: '2px solid var(--bg-card)',
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
              )}

              {/* Hover trigger zone & slide-out expand button on the right edge of viewport */}
              {showRightSidebar && rightSidebarCollapsed && (
                <div className="right-sidebar-expand-trigger">
                  <button 
                    className="right-sidebar-expand-btn"
                    onClick={() => setRightSidebarCollapsed(false)} 
                    title="Hiện thanh bên phải"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Thanh điều hướng dưới di động) */}
      {!hideNavbar && (
        <div className="mobile-bottom-nav">
          <Link to="/" className={`mobile-bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
            <span className="mobile-bottom-nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px' }}>
              {NAV_ICONS.home(location.pathname === '/')}
            </span>
            <span>Trang chủ</span>
          </Link>
          <Link to="/groups" className={`mobile-bottom-nav-item ${location.pathname.startsWith('/groups') ? 'active' : ''}`}>
            <span className="mobile-bottom-nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px' }}>
              {NAV_ICONS.groups(location.pathname.startsWith('/groups'))}
            </span>
            <span>Nhóm học</span>
          </Link>
          <Link to="/schedule" className={`mobile-bottom-nav-item ${location.pathname === '/schedule' ? 'active' : ''}`}>
            <span className="mobile-bottom-nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px' }}>
              {NAV_ICONS.schedule(location.pathname === '/schedule')}
            </span>
            <span>Lịch học</span>
          </Link>
          <Link to="/chat" className={`mobile-bottom-nav-item ${location.pathname === '/chat' ? 'active' : ''}`}>
            <span className="mobile-bottom-nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px', position: 'relative' }}>
              {NAV_ICONS.chat(location.pathname === '/chat')}
            </span>
            <span>Nhắn tin</span>
            {unreadCount > 0 && (
              <span className="mobile-bottom-nav-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
          <button className="mobile-bottom-nav-item" onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <span className="mobile-bottom-nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px' }}>
              {NAV_ICONS.more(mobileMenuOpen)}
            </span>
            <span>Thêm</span>
          </button>
        </div>
      )}
    </div>
  );
}