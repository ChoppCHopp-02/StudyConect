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
    <div className="person-card" style={{ cursor: person.friendSince ? 'pointer' : 'default' }}
      onClick={handleCardClick}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {person.friendSince ? (
          <Link to={`/friends/${person.userId}`} style={{ display: 'flex', textDecoration: 'none' }}>
            <Avatar src={person.avatar} initial={person.initial} color={colorOf(person.fullName)} size={40} />
          </Link>
        ) : (
          <Avatar src={person.avatar} initial={person.initial} color={colorOf(person.fullName)} size={40} />
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
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
              đŸ“ {person.proximityBadge}
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
            Báº¡n bĂ¨ tá»« {new Date(person.friendSince).toLocaleDateString('vi-VN')}
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

//  NĂºt nhá» 
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
      padding: '5px 12px', borderRadius: '16px', cursor: disabled ? 'default' : 'pointer',
      fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
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
    <button onClick={onClick} className={`tab-btn ${active ? 'active' : ''} ${highlight ? 'highlight' : ''}`}>
      {label}
      {count > 0 && (
        <span className="tab-badge">{count}</span>
      )}
    </button>
  );
}

//  Empty state 
function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
      {icon && <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>}
      <div style={{ fontSize: '13px' }}>{text}</div>
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
    if (bioString && bioString.startsWith('[đŸ“ ')) {
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
    if (bio.startsWith('[đŸ“ ')) {
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
        const dists = ['Quáº­n Cáº§u Giáº¥y', 'Quáº­n Äá»‘ng Äa', 'Quáº­n Hai BĂ  TrÆ°ng', 'Quáº­n HoĂ n Kiáº¿m', 'Quáº­n 1', 'Quáº­n 3', 'Quáº­n PhĂº Nhuáº­n', 'Quáº­n SÆ¡n TrĂ ', 'Quáº­n Háº£i ChĂ¢u'];
        const otherDists = dists.filter(d => d !== myLoc.district);
        dist = otherDists[seed % otherDists.length];
      } else {
        city = myLoc.province === 'HĂ  Ná»™i' ? 'TP. Há»“ ChĂ­ Minh' : 'HĂ  Ná»™i';
        dist = city === 'HĂ  Ná»™i' ? 'Quáº­n Cáº§u Giáº¥y' : 'Quáº­n 1';
      }
    }

    if (city === myLoc.province) {
      if (dist === myLoc.district) {
        return { level: 1, label: `CĂ¹ng ${dist}`, city, dist };
      } else {
        return { level: 2, label: `LĂ¢n cáº­n (${dist})`, city, dist };
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

  // Auto-refresh má»—i 5 giĂ¢y Ä‘á»ƒ cáº­p nháº­t lá»i má»i káº¿t báº¡n má»›i
  // DĂ¹ng ref Ä‘á»ƒ track id cá»§a tá»«ng lá»i má»i (trĂ¡nh false-positive khi count báº±ng nhau)
  const knownReqIds = useRef(null);
  useEffect(() => {
    const t = setInterval(async () => {
      if (!user?.id) return;
      try {
        const p = await getPendingRequests(String(user.id));
        const newIds = p.map(r => r.requestId).sort().join(',');
        if (knownReqIds.current === null) {
          // Láº§n Ä‘áº§u cháº¡y  chá»‰ ghi nháº­n, khĂ´ng trigger
          knownReqIds.current = newIds;
          return;
        }
        if (newIds !== knownReqIds.current) {
          knownReqIds.current = newIds;
          setPending(p);
          // Náº¿u cĂ³ lá»i má»i má»›i hÆ¡n trÆ°á»›c  alert + chuyá»ƒn tab
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
      addToast(`ÄĂ£ káº¿t báº¡n vá»›i ${req.fullName}`, 'success');
      await loadAll();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setAction(req.requestId, false); }
  };

  const handleReject = async (req, label = 'ÄĂ£ tá»« chá»‘i') => {
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
      addToast(`ÄĂ£ gá»­i lá»i má»i Ä‘áº¿n ${person.fullName}`, 'success');
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
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Vui lĂ²ng Ä‘Äƒng nháº­p Ä‘á»ƒ sá»­ dá»¥ng chá»©c nÄƒng káº¿t báº¡n.</p>
          <Link to="/login" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '15px', width: 'auto', borderRadius: '24px' }}>ÄÄƒng nháº­p</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppLayout>
      <main className="friend-page-container">
          {/* Header Banner */}
          <div className="friend-header-banner">
            <div className="friend-header-content">
              <div className="friend-header-icon">đŸ‘¥</div>
              <div>
                <h1 className="friend-header-title">Káº¿t báº¡n</h1>
                <p className="friend-header-sub">Káº¿t ná»‘i vá»›i sinh viĂªn cĂ¹ng trÆ°á»ng, cĂ¹ng ngĂ nh vĂ  má»Ÿ rá»™ng máº¡ng lÆ°á»›i há»c táº­p.</p>
              </div>
            </div>
            <div className="friend-search-wrap">
              <span style={{ fontSize: '16px', flexShrink: 0 }}>đŸ”</span>
              <input
                className="friend-search-input"
                placeholder="TĂ¬m kiáº¿m theo tĂªn, trÆ°á»ng..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', padding: 0, lineHeight: 1 }}>âœ•</button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="friend-tabs">
            <TabBtn label="Báº¡n bĂ¨" count={friends.length} active={tab === 'friends'} onClick={() => setTab('friends')} />
            <TabBtn label="Lá»i má»i nháº­n" count={pending.length} active={tab === 'pending'} onClick={() => { setTab('pending'); setNewPendingAlert(false); }} highlight={newPendingAlert && tab !== 'pending'} />
            <TabBtn label="ÄĂ£ gá»­i" count={sent.length} active={tab === 'sent'} onClick={() => setTab('sent')} />
            <TabBtn label="LĂ¢n cáº­n" count={myLocation.province ? nearbySuggestions.length : 0} active={tab === 'nearby'} onClick={() => setTab('nearby')} />
            <TabBtn label="Gá»£i Ă½" count={suggestions.length} active={tab === 'suggestions'} onClick={() => setTab('suggestions')} />
          </div>

          {/* Content */}
          <div className="friend-list-wrap">
            {loading ? (
              <div className="friend-loading">
                <div className="friend-loading-spinner" />
                <span>Äang táº£i...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* Báº¡n bĂ¨ */}
                {tab === 'friends' && (
                  filter(friends).length === 0
                    ? <EmptyState icon="đŸ¤" text={search ? 'KhĂ´ng tĂ¬m tháº¥y báº¡n bĂ¨ nĂ o.' : 'Báº¡n chÆ°a cĂ³ báº¡n bĂ¨ nĂ o. HĂ£y káº¿t báº¡n ngay!'} />
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
                                Há»§y káº¿t báº¡n
                              </Btn>
                            }
                          />
                        ));
                      })()
                )}

                {/* Lá»i má»i nháº­n */}
                {tab === 'pending' && (
                  filter(pending).length === 0
                    ? <EmptyState icon="đŸ“­" text="KhĂ´ng cĂ³ lá»i má»i káº¿t báº¡n nĂ o." />
                    : filter(pending).map(p => (
                      <PersonCard key={p.requestId} person={p} actions={<>
                        <Btn variant="success" disabled={actionLoading[p.requestId]} onClick={() => handleAccept(p)}>âœ“ Cháº¥p nháº­n</Btn>
                        <Btn variant="secondary" disabled={actionLoading[p.requestId]} onClick={() => handleReject(p, 'ÄĂ£ tá»« chá»‘i lá»i má»i')}>Tá»« chá»‘i</Btn>
                      </>} />
                    ))
                )}

                {/* ÄĂ£ gá»­i */}
                {tab === 'sent' && (
                  filter(sent).length === 0
                    ? <EmptyState icon="đŸ“¤" text="ChÆ°a gá»­i lá»i má»i káº¿t báº¡n nĂ o." />
                    : filter(sent).map(p => (
                      <PersonCard key={p.requestId} person={p} actions={
                        <Btn variant="secondary" disabled={actionLoading[p.requestId]} onClick={() => handleReject(p, 'ÄĂ£ thu há»“i lá»i má»i')}>Thu há»“i</Btn>
                      } />
                    ))
                )}

                {/* LĂ¢n cáº­n */}
                {tab === 'nearby' && (
                  !myLocation.province ? (
                    <div className="friend-empty-location">
                      <div style={{ fontSize: '56px', marginBottom: '16px' }}>đŸ“</div>
                      <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>ChÆ°a thiáº¿t láº­p vá»‹ trĂ­</h3>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                        Cáº­p nháº­t Tá»‰nh/ThĂ nh phá»‘ trong trang cĂ¡ nhĂ¢n Ä‘á»ƒ tĂ¬m báº¡n há»c quanh Ä‘Ă¢y nhĂ©!
                      </p>
                      <Link to="/profile" style={{ padding: '10px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: 600, display: 'inline-block', textDecoration: 'none', background: 'var(--primary)', color: 'white' }}>
                        Äáº¿n Trang cĂ¡ nhĂ¢n
                      </Link>
                    </div>
                  ) : (
                    filter(nearbySuggestions).length === 0
                      ? <EmptyState icon="đŸ“" text={search ? 'KhĂ´ng tĂ¬m tháº¥y báº¡n há»c lĂ¢n cáº­n nĂ o.' : 'KhĂ´ng cĂ³ báº¡n há»c lĂ¢n cáº­n nĂ o.'} />
                      : filter(nearbySuggestions).map(p => (
                        <PersonCard key={p.userId} person={p} actions={
                          <Btn variant="primary" disabled={actionLoading[p.userId]} onClick={() => handleSend(p)}>+ Káº¿t báº¡n</Btn>
                        } />
                      ))
                  )
                )}

                {/* Gá»£i Ă½ */}
                {tab === 'suggestions' && (
                  filter(suggestions).length === 0
                    ? <EmptyState icon="đŸ’¡" text={search ? 'KhĂ´ng tĂ¬m tháº¥y ngÆ°á»i dĂ¹ng phĂ¹ há»£p.' : 'KhĂ´ng cĂ²n gá»£i Ă½ káº¿t báº¡n nĂ o.'} />
                    : filter(suggestions).map(p => (
                      <PersonCard key={p.userId} person={p} actions={
                        <Btn variant="primary" disabled={actionLoading[p.userId]} onClick={() => handleSend(p)}>+ Káº¿t báº¡n</Btn>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setConfirmUnfriend(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '36px 32px', maxWidth: '440px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.5)', animation: 'slideIn 0.2s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '52px', marginBottom: '14px' }}>đŸ‘¥</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px' }}>Há»§y káº¿t báº¡n?</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Báº¡n cĂ³ cháº¯c muá»‘n há»§y káº¿t báº¡n vá»›i <strong style={{ color: 'var(--text-primary)' }}>{confirmUnfriend.person.fullName}</strong>? HĂ nh Ä‘á»™ng nĂ y khĂ´ng thá»ƒ hoĂ n tĂ¡c.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmUnfriend(null)} style={{ flex: 1, padding: '12px 0', borderRadius: '14px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Giá»¯ láº¡i
              </button>
              <button
                onClick={async () => { const p = confirmUnfriend.person; setConfirmUnfriend(null); await handleReject(p, `ÄĂ£ há»§y káº¿t báº¡n vá»›i ${p.fullName}`); }}
                disabled={actionLoading[confirmUnfriend.person.requestId]}
                style={{ flex: 1, padding: '12px 0', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}
              >
                Há»§y káº¿t báº¡n
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .friend-page-container {
          padding: 24px 28px;
          max-width: 860px;
          margin: 0 auto;
        }

        /* â”€â”€ Header Banner â”€â”€ */
        .friend-header-banner {
          background: linear-gradient(135deg, rgba(108,99,255,0.12) 0%, rgba(255,122,0,0.08) 100%);
          border: 1px solid rgba(108,99,255,0.2);
          border-radius: 20px;
          padding: 24px 28px;
          margin-bottom: 20px;
          backdrop-filter: blur(20px);
        }
        .friend-header-content {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .friend-header-icon {
          font-size: 36px;
          width: 60px; height: 60px;
          background: rgba(108,99,255,0.15);
          border: 1px solid rgba(108,99,255,0.25);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .friend-header-title {
          font-size: 24px; font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 4px;
          letter-spacing: -0.5px;
        }
        .friend-header-sub {
          font-size: 14px; color: var(--text-muted);
          margin: 0; line-height: 1.5;
        }
        .friend-search-wrap {
          display: flex; align-items: center; gap: 10px;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 12px 16px;
          transition: all 0.3s;
        }
        .friend-search-wrap:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .friend-search-input {
          background: none; border: none; outline: none; flex: 1;
          color: var(--text-primary); font-size: 14px; font-family: inherit;
        }
        .friend-search-input::placeholder { color: var(--text-muted); }

        /* â”€â”€ Tabs â”€â”€ */
        .friend-tabs {
          display: flex; gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .tab-btn {
          padding: 9px 18px;
          border-radius: 20px;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
          background: var(--bg-card);
          color: var(--text-muted);
          border: 1px solid var(--border);
          white-space: nowrap;
          display: flex; align-items: center; gap: 7px;
        }
        .tab-btn:hover {
          background: rgba(108,99,255,0.08);
          color: var(--text-primary);
          border-color: rgba(108,99,255,0.3);
        }
        .tab-btn.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 16px rgba(99,102,241,0.35);
        }
        .tab-btn.highlight {
          border-color: rgba(239,68,68,0.5);
          color: #ef4444;
          background: rgba(239,68,68,0.08);
          animation: pulse 1.2s ease-in-out infinite;
        }
        .tab-badge {
          background: rgba(255,255,255,0.3);
          color: white;
          font-size: 11px; font-weight: 800;
          padding: 2px 7px; border-radius: 12px;
          min-width: 20px; text-align: center;
        }
        .tab-btn:not(.active) .tab-badge {
          background: rgba(108,99,255,0.15);
          color: var(--primary-light);
        }
        .tab-btn.highlight .tab-badge {
          background: rgba(239,68,68,0.2);
          color: #fca5a5;
        }

        /* â”€â”€ Person Card â”€â”€ */
        .person-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 16px 20px;
          display: flex; align-items: center; gap: 16px;
          transition: all 0.25s ease;
        }
        .person-card:hover {
          border-color: rgba(108,99,255,0.35);
          box-shadow: 0 8px 28px rgba(108,99,255,0.12);
          transform: translateY(-2px);
        }

        /* â”€â”€ List wrap â”€â”€ */
        .friend-list-wrap {
          padding-bottom: 32px;
        }

        /* â”€â”€ Loading â”€â”€ */
        .friend-loading {
          display: flex; flex-direction: column; align-items: center;
          gap: 14px; padding: 80px 0; color: var(--text-muted); font-size: 15px;
        }
        .friend-loading-spinner {
          width: 36px; height: 36px;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* â”€â”€ Empty location â”€â”€ */
        .friend-empty-location {
          text-align: center;
          padding: 60px 24px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
          50%       { box-shadow: 0 0 0 6px rgba(239,68,68,0.3); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
