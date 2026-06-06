import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getTotalUnread, refreshCache } from '@/services/chatServiceTEMP';
import NotificationBell from '@/components/notifications/NotificationBell';
import { supabase } from '@/config/supabaseClient';
import { getSearchSuggestions } from '@/services/interactionService';
import Avatar from '@/components/common/Avatar';
const NAV_ICONS = {
  home: (isActive) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? 'var(--secondary)' : 'var(--text-secondary)' }}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  groups: (isActive) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? 'var(--secondary)' : 'var(--text-secondary)' }}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  schedule: (isActive) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? 'var(--secondary)' : 'var(--text-secondary)' }}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
      <path d="m9 16 2 2 4-4"/>
    </svg>
  ),
  friends: (isActive) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? 'var(--secondary)' : 'var(--text-secondary)' }}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" x2="19" y1="8" y2="14"/>
      <line x1="16" x2="22" y1="11" y2="11"/>
    </svg>
  ),
  docs: (isActive) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? 'var(--secondary)' : 'var(--text-secondary)' }}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="M10 9H8"/>
      <path d="M16 13H8"/>
      <path d="M16 17H8"/>
    </svg>
  ),
  chat: (isActive) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? 'var(--secondary)' : 'var(--text-secondary)' }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  match: (isActive) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? 'var(--secondary)' : 'var(--text-secondary)' }}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>
  ),
  pomodoro: (isActive) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.3s', color: isActive ? 'var(--secondary)' : 'var(--text-secondary)' }}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { icon: 'home', label: 'Trang chủ', to: '/', key: 'home' },
  { icon: 'match', label: 'Ghép học tập', to: '/match', key: 'match' },
  { icon: 'pomodoro', label: 'Tự học Pomodoro', to: '/pomodoro', key: 'pomodoro' },
  { icon: 'groups', label: 'Nhóm học', to: '/groups', key: 'groups' },
  { icon: 'schedule', label: 'Lịch & Deadline', to: '/schedule', key: 'schedule' },
  { icon: 'friends', label: 'Kết bạn', to: '/friends', key: 'friends' },
  { icon: 'docs', label: 'Tài liệu', to: '/my-documents', key: 'docs' },
  { icon: 'chat', label: 'Nhắn tin', to: '/chat', key: 'chat' },
];

export default function AppLayout({ children, hideNavbar = false, hideSidebar = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const shouldHideSidebar = hideSidebar;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingFriendsCount, setPendingFriendsCount] = useState(0);
  
  const [search, setSearch] = useState('');
  const [searchData, setSearchData] = useState({ users: [], groups: [] });

  // Fetch all search suggestions on mount
  useEffect(() => {
    const fetchSearchSuggestions = async () => {
      try {
        const data = await getSearchSuggestions();
        setSearchData(data);
      } catch (err) {
        console.error('Error loading search suggestions:', err);
      }
    };
    fetchSearchSuggestions();
  }, []);

  const filteredUsers = search.trim()
    ? searchData.users.filter(u => u.fullName.toLowerCase().includes(search.trim().toLowerCase()) && String(u.id) !== String(user?.id))
    : [];

  const filteredGroups = search.trim()
    ? searchData.groups.filter(g => g.name.toLowerCase().includes(search.trim().toLowerCase()))
    : [];

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
    const interval = setInterval(updateUnread, 3000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchPendingCount = async () => {
      try {
        const cached = localStorage.getItem('studyconect_pending_friends');
        if (cached) setPendingFriendsCount(parseInt(cached, 10));

        const { count } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .eq('to_user_id', parseInt(user.id, 10))
          .eq('status', 'pending');
          
        if (count !== null) {
          setPendingFriendsCount(count);
          localStorage.setItem('studyconect_pending_friends', count.toString());
        }
      } catch {
        // ignore
      }
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 6000);
    return () => clearInterval(interval);
  }, [user]);

  // Close drawer when route changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileMenuOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.fullName
    ?.split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="app-layout-wrapper" style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      {/* Decorative background glows */}
      <div style={{
        position: 'fixed', top: '-200px', right: '-200px',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(255,122,0,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0
      }} />
      <div style={{
        position: 'fixed', bottom: '-150px', left: '-150px',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0
      }} />

      {!hideNavbar && (
        <nav className="navbar" style={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 100,
          background: 'rgba(9, 12, 21, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)'
        }}>
          <Link to="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div className="nav-brand-icon" style={{ fontSize: '20px' }}>📚</div>
            <span className="nav-brand-text" style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px'
            }}>Studyconect</span>
          </Link>

          <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {(location.pathname.startsWith('/groups') || location.pathname === '/schedule') && (
              <div className="flex-desktop-only" style={{ alignItems: 'center', gap: '10px' }}>
                <Link to="/" style={{
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: location.pathname === '/' ? 'var(--secondary)' : 'var(--text-secondary)',
                  border: location.pathname === '/' ? '1.5px solid var(--secondary)' : '1.5px solid var(--border)',
                  background: location.pathname === '/' ? 'rgba(255, 122, 0, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease-in-out'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--secondary)';
                    e.currentTarget.style.color = 'var(--secondary)';
                    e.currentTarget.style.background = 'rgba(255, 122, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    const isActive = location.pathname === '/';
                    e.currentTarget.style.borderColor = isActive ? 'var(--secondary)' : 'var(--border)';
                    e.currentTarget.style.color = isActive ? 'var(--secondary)' : 'var(--text-secondary)';
                    e.currentTarget.style.background = isActive ? 'rgba(255, 122, 0, 0.12)' : 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  Trang chủ
                </Link>

                <Link to="/groups" style={{
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: location.pathname.startsWith('/groups') ? 'var(--secondary)' : 'var(--text-secondary)',
                  border: location.pathname.startsWith('/groups') ? '1.5px solid var(--secondary)' : '1.5px solid var(--border)',
                  background: location.pathname.startsWith('/groups') ? 'rgba(255, 122, 0, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease-in-out'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--secondary)';
                    e.currentTarget.style.color = 'var(--secondary)';
                    e.currentTarget.style.background = 'rgba(255, 122, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    const isActive = location.pathname.startsWith('/groups');
                    e.currentTarget.style.borderColor = isActive ? 'var(--secondary)' : 'var(--border)';
                    e.currentTarget.style.color = isActive ? 'var(--secondary)' : 'var(--text-secondary)';
                    e.currentTarget.style.background = isActive ? 'rgba(255, 122, 0, 0.12)' : 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  Nhóm học
                </Link>

                <Link to="/schedule" style={{
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: location.pathname === '/schedule' ? 'var(--secondary)' : 'var(--text-secondary)',
                  border: location.pathname === '/schedule' ? '1.5px solid var(--secondary)' : '1.5px solid var(--border)',
                  background: location.pathname === '/schedule' ? 'rgba(255, 122, 0, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease-in-out'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--secondary)';
                    e.currentTarget.style.color = 'var(--secondary)';
                    e.currentTarget.style.background = 'rgba(255, 122, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    const isActive = location.pathname === '/schedule';
                    e.currentTarget.style.borderColor = isActive ? 'var(--secondary)' : 'var(--border)';
                    e.currentTarget.style.color = isActive ? 'var(--secondary)' : 'var(--text-secondary)';
                    e.currentTarget.style.background = isActive ? 'rgba(255, 122, 0, 0.12)' : 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  Lịch &amp; Deadline
                </Link>
              </div>
            )}

            {user?.id && (
              <div className="mobile-only">
                <NotificationBell 
                  style={{ 
                    height: '34px', 
                    width: '34px', 
                    padding: 0, 
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }} 
                />
              </div>
            )}
            {user?.avatar ? (
              <Link to="/profile" style={{ display: 'flex', alignItems: 'center' }}>
                <img src={user.avatar} className="nav-avatar" alt="avatar" style={{ border: '2px solid var(--primary)', width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
              </Link>
            ) : (
              <Link to="/profile" style={{ textDecoration: 'none' }}>
                <div className="nav-avatar-placeholder" style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'white',
                  border: '2px solid var(--primary)'
                }}>{initials}</div>
              </Link>
            )}
            <button className="btn-logout desktop-only" onClick={handleLogout} style={{
              background: 'none',
              border: '1.5px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
              Đăng xuất
            </button>
          </div>
        </nav>
      )}

      {/* Mobile Drawer (Menu trượt di động) */}
      <div className={`mobile-drawer-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '20px' }}>📚</div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Studyconect</span>
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
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/' ? 'var(--primary-light)' : 'var(--text-primary)', background: location.pathname === '/' ? 'rgba(108,99,255,0.1)' : 'none', fontWeight: 600, fontSize: '14px' }}>
              <span>🏠</span> Trang chủ
            </Link>
            <Link to="/match" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/match' ? 'var(--primary-light)' : 'var(--text-primary)', background: location.pathname === '/match' ? 'rgba(108,99,255,0.1)' : 'none', fontWeight: 600, fontSize: '14px' }}>
              <span>🤝</span> Ghép học tập
            </Link>
            <Link to="/pomodoro" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/pomodoro' ? 'var(--primary-light)' : 'var(--text-primary)', background: location.pathname === '/pomodoro' ? 'rgba(108,99,255,0.1)' : 'none', fontWeight: 600, fontSize: '14px' }}>
              <span>🍅</span> Tự học Pomodoro
            </Link>
            <Link to="/flashcards" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/flashcards' ? 'var(--primary-light)' : 'var(--text-primary)', background: location.pathname === '/flashcards' ? 'rgba(108,99,255,0.1)' : 'none', fontWeight: 600, fontSize: '14px' }}>
              <span>🗂️</span> Thẻ học &amp; Trắc nghiệm
            </Link>
            <Link to="/groups" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname.startsWith('/groups') ? 'var(--primary-light)' : 'var(--text-primary)', background: location.pathname.startsWith('/groups') ? 'rgba(108,99,255,0.1)' : 'none', fontWeight: 600, fontSize: '14px' }}>
              <span>👥</span> Nhóm học
            </Link>
            <Link to="/schedule" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/schedule' ? 'var(--primary-light)' : 'var(--text-primary)', background: location.pathname === '/schedule' ? 'rgba(108,99,255,0.1)' : 'none', fontWeight: 600, fontSize: '14px' }}>
              <span>📅</span> Lịch học &amp; Deadline
            </Link>
            <Link to="/friends" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/friends' ? 'var(--primary-light)' : 'var(--text-primary)', background: location.pathname === '/friends' ? 'rgba(108,99,255,0.1)' : 'none', fontWeight: 600, fontSize: '14px' }}>
              <span>🤝</span> Kết bạn
            </Link>
            <Link to="/my-documents" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/my-documents' ? 'var(--primary-light)' : 'var(--text-primary)', background: location.pathname === '/my-documents' ? 'rgba(108,99,255,0.1)' : 'none', fontWeight: 600, fontSize: '14px' }}>
              <span>📁</span> Tài liệu của tôi
            </Link>
            <Link to="/chat" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/chat' ? 'var(--primary-light)' : 'var(--text-primary)', background: location.pathname === '/chat' ? 'rgba(108,99,255,0.1)' : 'none', fontWeight: 600, fontSize: '14px' }}>
              <span>💬</span> Nhắn tin
            </Link>
            <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', textDecoration: 'none', color: location.pathname === '/profile' ? 'var(--primary-light)' : 'var(--text-primary)', background: location.pathname === '/profile' ? 'rgba(108,99,255,0.1)' : 'none', fontWeight: 600, fontSize: '14px' }}>
              <span>👤</span> Hồ sơ cá nhân
            </Link>
          </div>

          <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
            <button onClick={handleLogout} className="btn-logout" style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '10px', borderRadius: '8px', background: 'none', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      <main style={{ position: 'relative', zIndex: 1 }}>
        {shouldHideSidebar ? (
          children
        ) : (
          <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 16px' }}>
            <div className="layout-2col">
              {/* Unified desktop left sidebar */}
              <aside className="desktop-only" style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 10 }}>
                {/* Profile Widget */}
                {user && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', marginBottom: '8px', overflow: 'visible', paddingRight: '8px' }}>
                    <Link to="/profile" style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 10px 10px 12px', transition: 'var(--transition)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Avatar src={user?.avatar} initial={user?.fullName || 'U'} size={34} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.fullName || 'Người dùng'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--primary-light)', fontWeight: 600 }}>Xem hồ sơ</div>
                        </div>
                      </div>
                    </Link>
                    <div style={{ flexShrink: 0, paddingRight: '4px' }}>
                      <NotificationBell 
                        userId={user.id} 
                        style={{ 
                          height: '38px', 
                          width: '38px', 
                          padding: 0, 
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }} 
                      />
                    </div>
                  </div>
                )}

                {/* Search */}
                <div
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    background: 'var(--bg-input)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '12px', 
                    padding: '9px 14px', 
                    marginBottom: '8px', 
                    cursor: 'text', 
                    transition: 'all 0.2s ease' 
                  }}
                  onClick={() => document.getElementById('sidebar-search')?.focus()}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.3-4.3"/>
                    </svg>
                  </span>
                  <input
                    id="sidebar-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm..."
                    style={{ background: 'none', border: 'none', outline: 'none', flex: 1, color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit' }}
                  />
                  {search && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSearch(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Smart Global Search Dropdown */}
                {search.trim() && (filteredUsers.length > 0 || filteredGroups.length > 0) && (
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '12px',
                    marginBottom: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.08)'
                  }}>
                    {/* Matching Groups */}
                    {filteredGroups.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                          👥 Nhóm học tập ({filteredGroups.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {filteredGroups.slice(0, 3).map(g => (
                            <Link key={g.id} to={`/groups/${g.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                              <div
                                style={{ padding: '6px 8px', borderRadius: '8px', background: 'var(--bg-input)', fontSize: '12px', fontWeight: 600, transition: 'var(--transition)' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
                              >
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>{g.category}</div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Users */}
                    {filteredUsers.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                          🎓 Thành viên ({filteredUsers.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {filteredUsers.slice(0, 3).map(u => (
                            <Link key={u.id} to="/friends" style={{ textDecoration: 'none', color: 'inherit' }}>
                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', background: 'var(--bg-input)', fontSize: '12px', fontWeight: 600, transition: 'var(--transition)' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
                              >
                                <Avatar src={u.avatar} initial={u.fullName} size={24} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{u.fullName}</div>
                                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 500 }}>{u.university}</div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Sidebar items */}
                {NAV_ITEMS.map((item) => {
                  const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
                  const hasUnread = item.key === 'chat' && unreadCount > 0;
                  const hasPending = item.key === 'friends' && pendingFriendsCount > 0;
                  return (
                    <Link key={item.key} to={item.to} style={{ textDecoration: 'none' }}>
                      <div
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          padding: '11px 14px', 
                          borderRadius: '12px', 
                          background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(255, 122, 0, 0.08))' : 'none', 
                          border: isActive ? '1px solid rgba(255, 122, 0, 0.25)' : '1px solid transparent',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
                          transform: 'translateY(0)',
                          position: 'relative' 
                        }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          if (!isActive) {
                            e.currentTarget.style.background = 'var(--bg-input)';
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.transform = 'translateY(0)';
                          if (!isActive) {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.borderColor = 'transparent';
                          }
                        }}
                      >
                        <span style={{ 
                          width: '28px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          flexShrink: 0, 
                          filter: isActive ? 'drop-shadow(0 0 8px rgba(255, 122, 0, 0.55))' : 'none' 
                        }}>
                          {NAV_ICONS[item.icon] ? NAV_ICONS[item.icon](isActive) : item.icon}
                        </span>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: isActive ? 700 : 500, 
                          color: isActive ? 'var(--secondary)' : 'var(--text-secondary)', 
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
              </aside>
              <div style={{ minWidth: 0 }}>
                {children}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Thanh điều hướng dưới di động) */}
      <div className="mobile-bottom-nav">
        <Link to="/" className={`mobile-bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <span className="mobile-bottom-nav-icon">🏠</span>
          <span>Trang chủ</span>
        </Link>
        <Link to="/groups" className={`mobile-bottom-nav-item ${location.pathname.startsWith('/groups') ? 'active' : ''}`}>
          <span className="mobile-bottom-nav-icon">👥</span>
          <span>Nhóm học</span>
        </Link>
        <Link to="/schedule" className={`mobile-bottom-nav-item ${location.pathname === '/schedule' ? 'active' : ''}`}>
          <span className="mobile-bottom-nav-icon">📅</span>
          <span>Lịch học</span>
        </Link>
        <Link to="/chat" className={`mobile-bottom-nav-item ${location.pathname === '/chat' ? 'active' : ''}`}>
          <span className="mobile-bottom-nav-icon">💬</span>
          <span>Nhắn tin</span>
          {unreadCount > 0 && (
            <span className="mobile-bottom-nav-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <button className="mobile-bottom-nav-item" onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <span className="mobile-bottom-nav-icon">☰</span>
          <span>Thêm</span>
        </button>
      </div>
    </div>
  );
}
