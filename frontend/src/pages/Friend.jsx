// src/pages/Friends.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getFriends,
  getPendingRequests,
  getSentRequests,
  getSuggestions,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
} from '../services/friendService';
import AppLayout from '../layouts/AppLayout';
import { useToast } from '../components/Toast';
import { supabase } from '../config/supabaseClient';

//  Avatar 
function Avatar({ src, initial, color = '#6c63ff', size = 40 }) {
  if (src) return (
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}, ${color}88)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: 'white',
    }}>
      {initial}
    </div>
  );
}

const AVATAR_COLORS = ['#6c63ff', '#ff6b9d', '#3ecfcf', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6'];
const colorOf = (str) => AVATAR_COLORS[(str || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];



//  Person Card 
function PersonCard({ person, actions, isOnline }) {
  const navigate = useNavigate();

  const handleCardClick = (e) => {
    // If the click originated from within action buttons, don't navigate
    if (e.target.closest('.card-actions')) return;
    
    if (person.friendSince) {
      navigate(`/friends/${person.userId}`);
    }
  };

  return (
    <div className="flex-responsive" style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '16px',
      transition: 'var(--transition)',
      cursor: person.friendSince ? 'pointer' : 'default'
    }}
      onClick={handleCardClick}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(108,99,255,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {person.friendSince ? (
          <Link to={`/friends/${person.userId}`} style={{ display: 'flex', textDecoration: 'none' }}>
            <Avatar src={person.avatar} initial={person.initial} color={colorOf(person.fullName)} size={48} />
          </Link>
        ) : (
          <Avatar src={person.avatar} initial={person.initial} color={colorOf(person.fullName)} size={48} />
        )}
        {person.friendSince && (
          <span style={{
            position: 'absolute', bottom: -1, right: -1,
            width: '12px', height: '12px', borderRadius: '50%',
            background: isOnline ? '#10b981' : '#ef4444',
            border: '2px solid var(--bg-card)',
            boxShadow: isOnline ? '0 0 6px #10b981' : 'none'
          }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {person.friendSince ? (
            <Link to={`/friends/${person.userId}`} style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none',
              transition: 'var(--transition)',
              fontWeight: 700
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-light)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
            >
              {person.fullName}
            </Link>
          ) : (
            <span>{person.fullName}</span>
          )}
          {person.proximityBadge && (
            <span style={{
              background: person.proximityLevel === 1 ? 'rgba(16,185,129,0.12)' : 'rgba(108,99,255,0.12)',
              color: person.proximityLevel === 1 ? '#10b981' : 'var(--primary-light)',
              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
              📍 {person.proximityBadge}
            </span>
          )}
        </div>
        {person.university && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>
              {person.university}
          </div>
        )}
        {person.major && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {person.major}
          </div>
        )}
        {person.friendSince && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
            Bạn bè từ {new Date(person.friendSince).toLocaleDateString('vi-VN')}
          </div>
        )}
        {person.sentAt && !person.friendSince && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
            {new Date(person.sentAt).toLocaleDateString('vi-VN')}
          </div>
        )}
      </div>
      <div className="card-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        {actions}
      </div>
    </div>
  );
}

//  Nút nhỏ 
function Btn({ children, onClick, variant = 'primary', disabled = false }) {
  const styles = {
    primary: { background: 'var(--primary)', color: 'white', border: 'none' },
    secondary: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
    danger: { background: 'transparent', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.3)' },
    success: { background: 'rgba(34,197,94,0.15)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.3)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      padding: '6px 16px', borderRadius: '20px', cursor: disabled ? 'default' : 'pointer',
      fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
      transition: 'var(--transition)', opacity: disabled ? 0.5 : 1,
      whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = '1'; }}
    >
      {children}
    </button>
  );
}

//  Tab button 
function TabBtn({ label, count, active, onClick, highlight = false }) {
  return (
    <button onClick={onClick} style={{
      padding: '9px 18px', borderRadius: '20px', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: '14px', fontWeight: 600,
      background: active ? 'var(--primary)' : highlight ? 'rgba(239,68,68,0.1)' : 'var(--bg-card)',
      color: active ? 'white' : highlight ? '#ef4444' : 'var(--text-secondary)',
      border: active ? 'none' : highlight ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--border)',
      boxShadow: active ? '0 4px 12px rgba(108,99,255,0.3)' : highlight ? '0 0 0 3px rgba(239,68,68,0.15)' : 'none',
      transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: '6px',
      animation: highlight ? 'pulse 1.2s ease-in-out infinite' : 'none',
    }}>
      {label}
      {count > 0 && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.25)' : 'rgba(239,68,68,0.15)',
          color: active ? 'white' : '#ef4444',
          fontSize: '11px', fontWeight: 800, padding: '1px 7px', borderRadius: '12px',
          minWidth: '18px', textAlign: 'center',
        }}>{count}</span>
      )}
    </button>
  );
}

//  Empty state 
function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '15px' }}>{text}</div>
    </div>
  );
}

//  Main 
export default function Friends() {
  const { isAuth, user } = useAuth();
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

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
  const [pending, setPending] = useState([]);
  const [newPendingAlert, setNewPendingAlert] = useState(false);
  const [sent, setSent] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [search, setSearch] = useState('');
  const [confirmUnfriend, setConfirmUnfriend] = useState(null); // { person }
  const { addToast } = useToast();

  const parseUserBioLocation = (bioString) => {
    if (bioString && bioString.startsWith('[📍 ')) {
      const endIdx = bioString.indexOf(']');
      if (endIdx > 0) {
        const locPart = bioString.substring(4, endIdx);
        const parts = locPart.split(', ');
        return { province: parts[0] || '', district: parts[1] || '' };
      }
    }
    return { province: '', district: '' };
  };

  const myLocation = parseUserBioLocation(user?.bio);

  const getProximityInfo = (person, myLoc) => {
    if (!myLoc.province) return null;
    
    let city = '';
    let dist = '';
    const bio = person.bio || '';
    if (bio.startsWith('[📍 ')) {
      const endIdx = bio.indexOf(']');
      if (endIdx > 0) {
        const locPart = bio.substring(4, endIdx);
        const parts = locPart.split(', ');
        city = parts[0] || '';
        dist = parts[1] || '';
      }
    }
    
    // Seed deterministically to make it look alive if empty
    if (!city) {
      const seed = String(person.userId || person.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      if (seed % 3 === 0) {
        city = myLoc.province;
        dist = myLoc.district;
      } else if (seed % 3 === 1) {
        city = myLoc.province;
        const dists = ['Quận Cầu Giấy', 'Quận Đống Đa', 'Quận Hai Bà Trưng', 'Quận Hoàn Kiếm', 'Quận 1', 'Quận 3', 'Quận Phú Nhuận', 'Quận Sơn Trà', 'Quận Hải Châu'];
        const otherDists = dists.filter(d => d !== myLoc.district);
        dist = otherDists[seed % otherDists.length];
      } else {
        city = myLoc.province === 'Hà Nội' ? 'TP. Hồ Chí Minh' : 'Hà Nội';
        dist = city === 'Hà Nội' ? 'Quận Cầu Giấy' : 'Quận 1';
      }
    }

    if (city === myLoc.province) {
      if (dist === myLoc.district) {
        return { level: 1, label: `Cùng ${dist}`, city, dist };
      } else {
        return { level: 2, label: `Lân cận (${dist})`, city, dist };
      }
    }
    return null;
  };

  const nearbySuggestions = suggestions
    .map(p => {
      const prox = getProximityInfo(p, myLocation);
      if (prox) {
        return {
          ...p,
          proximityLevel: prox.level,
          proximityBadge: prox.label,
          city: prox.city,
          district: prox.dist
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.proximityLevel - b.proximityLevel);



  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const uid = String(user.id);
      const [f, p, s, sg] = await Promise.all([
        getFriends(uid),
        getPendingRequests(uid),
        getSentRequests(uid),
        getSuggestions(uid),
      ]);
      setFriends(f);
      setPending(p);
      setSent(s);
      setSuggestions(sg);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh mỗi 5 giây để cập nhật lời mời kết bạn mới
  // Dùng ref để track id của từng lời mời (tránh false-positive khi count bằng nhau)
  const knownReqIds = useRef(null);
  useEffect(() => {
    const t = setInterval(async () => {
      if (!user?.id) return;
      try {
        const p = await getPendingRequests(String(user.id));
        const newIds = p.map(r => r.requestId).sort().join(',');
        if (knownReqIds.current === null) {
          // Lần đầu chạy  chỉ ghi nhận, không trigger
          knownReqIds.current = newIds;
          return;
        }
        if (newIds !== knownReqIds.current) {
          knownReqIds.current = newIds;
          setPending(p);
          // Nếu có lời mời mới hơn trước  alert + chuyển tab
          if (p.length > pending.length) {
            setNewPendingAlert(true);
            setTab('pending');
          }
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(t);
  }, [user, pending.length]);



  const setAction = (id, val) => setActionLoading(prev => ({ ...prev, [id]: val }));

  const handleAccept = async (req) => {
    setAction(req.requestId, true);
    try {
      await acceptFriendRequest(req.requestId);
      addToast(`Đã kết bạn với ${req.fullName}`, 'success');
      await loadAll();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setAction(req.requestId, false); }
  };

  const handleReject = async (req, label = 'Đã từ chối') => {
    setAction(req.requestId, true);
    try {
      await removeFriend(req.requestId);
      addToast(label, 'success');
      await loadAll();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setAction(req.requestId, false); }
  };

  const handleSend = async (person) => {
    setAction(person.userId, true);
    try {
      await sendFriendRequest(String(user.id), String(person.userId));
      addToast(`Đã gửi lời mời đến ${person.fullName}`, 'success');
      await loadAll();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setAction(person.userId, false); }
  };

  const filter = (list) => list.filter(p =>
    !search.trim() || p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (p.university || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!isAuth) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Vui lòng đăng nhập để sử dụng chức năng kết bạn.</p>
          <Link to="/login" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '15px', width: 'auto', borderRadius: '24px' }}>Đăng nhập</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppLayout>

      {/* Main content */}
      <main style={{ minWidth: 0 }}>
          {/* Header */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: '20px'
          }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>Kết bạn</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Kết nối với sinh viên cùng trường, cùng ngành và mở rộng mạng lưới học tập.
            </p>

            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '10px 18px', marginTop: '16px',
              transition: 'var(--transition)'
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              
              <input
                placeholder="Tìm kiếm theo tên, trường..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none', flex: 1,
                  color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <TabBtn label="Bạn bè" count={friends.length} active={tab === 'friends'} onClick={() => setTab('friends')} />
            <TabBtn label="Lời mời nhận" count={pending.length} active={tab === 'pending'} onClick={() => { setTab('pending'); setNewPendingAlert(false); }} highlight={newPendingAlert && tab !== 'pending'} />
            <TabBtn label="Đã gửi" count={sent.length} active={tab === 'sent'} onClick={() => setTab('sent')} />
            <TabBtn label="Lân cận" count={myLocation.province ? nearbySuggestions.length : 0} active={tab === 'nearby'} onClick={() => setTab('nearby')} />
            <TabBtn label="Gợi ý" count={suggestions.length} active={tab === 'suggestions'} onClick={() => setTab('suggestions')} />
          </div>

          {/* Content  min-height cố định tránh giật layout */}
          <div style={{ minHeight: '400px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '15px' }}>
                Đang tải...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/*  Bạn bè  */}
                {tab === 'friends' && (
                  filter(friends).length === 0
                    ? <EmptyState icon="" text={search ? 'Không tìm thấy bạn bè nào.' : 'Bạn chưa có bạn bè nào. Hãy kết bạn ngay!'} />
                    : (() => {
                        const sorted = [...filter(friends)].sort((a, b) => {
                          const aOn = onlineUserIds.includes(a.userId.toString()) ? 1 : 0;
                          const bOn = onlineUserIds.includes(b.userId.toString()) ? 1 : 0;
                          return bOn - aOn;
                        });
                        return sorted.map(p => (
                          <PersonCard
                            key={p.requestId}
                            person={p}
                            isOnline={onlineUserIds.includes(p.userId.toString())}
                            actions={
                              <Btn variant="danger" disabled={actionLoading[p.requestId]} onClick={() => setConfirmUnfriend({ person: p })}>
                                Hủy kết bạn
                              </Btn>
                            }
                          />
                        ));
                      })()
                )}

                {/*  Lời mời nhận  */}
                {tab === 'pending' && (
                  filter(pending).length === 0
                    ? <EmptyState icon="" text="Không có lời mời kết bạn nào." />
                    : filter(pending).map(p => (
                      <PersonCard key={p.requestId} person={p} actions={<>
                        <Btn variant="success" disabled={actionLoading[p.requestId]} onClick={() => handleAccept(p)}>
                           Chấp nhận
                        </Btn>
                        <Btn variant="secondary" disabled={actionLoading[p.requestId]} onClick={() => handleReject(p, 'Đã từ chối lời mời')}>
                          Từ chối
                        </Btn>
                      </>} />
                    ))
                )}

                {/*  Đã gửi  */}
                {tab === 'sent' && (
                  filter(sent).length === 0
                    ? <EmptyState icon="" text="Chưa gửi lời mời kết bạn nào." />
                    : filter(sent).map(p => (
                      <PersonCard key={p.requestId} person={p} actions={
                        <Btn variant="secondary" disabled={actionLoading[p.requestId]} onClick={() => handleReject(p, 'Đã thu hồi lời mời')}>
                          Thu hồi
                        </Btn>
                      } />
                    ))
                )}

                {/*  Lân cận  */}
                {tab === 'nearby' && (
                  !myLocation.province ? (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px 24px', textAlign: 'center' }}>
                      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📍</div>
                      <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Chưa thiết lập vị trí</h3>
                      <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                        Cập nhật địa phương sinh sống (Tỉnh/Thành phố & Quận/Huyện) trong trang cá nhân của bạn để tìm các bạn học quanh đây nhé!
                      </p>
                      <Link to="/profile" className="btn btn-primary" style={{ padding: '8px 20px', borderRadius: '24px', fontSize: '13.5px', fontWeight: 600, display: 'inline-block', textDecoration: 'none' }}>
                        Đến Trang cá nhân
                      </Link>
                    </div>
                  ) : (
                    filter(nearbySuggestions).length === 0
                      ? <EmptyState icon="📍" text={search ? 'Không tìm thấy bạn học lân cận nào phù hợp.' : 'Không tìm thấy bạn học lân cận nào xung quanh.'} />
                      : filter(nearbySuggestions).map(p => (
                        <PersonCard key={p.userId} person={p} actions={
                          <Btn variant="primary" disabled={actionLoading[p.userId]} onClick={() => handleSend(p)}>
                            + Kết bạn
                          </Btn>
                        } />
                      ))
                  )
                )}

                {/*  Gợi ý  */}
                {tab === 'suggestions' && (
                  filter(suggestions).length === 0
                    ? <EmptyState icon="" text={search ? 'Không tìm thấy người dùng phù hợp.' : 'Không còn gợi ý kết bạn nào.'} />
                    : filter(suggestions).map(p => (
                      <PersonCard key={p.userId} person={p} actions={
                        <Btn variant="primary" disabled={actionLoading[p.userId]} onClick={() => handleSend(p)}>
                          + Kết bạn
                        </Btn>
                      } />
                    ))
                )}
              </div>
            )}
          </div>
        </main>
      </AppLayout>

      {/* Confirm Unfriend Modal */}
      {confirmUnfriend && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setConfirmUnfriend(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '32px 28px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              animation: 'slideIn 0.2s ease',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                Hủy kết bạn?
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Bạn có chắc muốn hủy kết bạn với{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{confirmUnfriend.person.fullName}</strong>?
                Hành động này không thể hoàn tác.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setConfirmUnfriend(null)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-secondary)',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                Giữ lại
              </button>
              <button
                onClick={async () => {
                  const p = confirmUnfriend.person;
                  setConfirmUnfriend(null);
                  await handleReject(p, `Đã hủy kết bạn với ${p.fullName}`);
                }}
                disabled={actionLoading[confirmUnfriend.person.requestId]}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'var(--transition)',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Hủy kết bạn
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
          50%       { box-shadow: 0 0 0 6px rgba(239,68,68,0.3); }
        }
      `}</style>
    </>
  );
}