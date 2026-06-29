import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationContext } from '@/context/NotificationContext';
import NotificationItem from './NotificationItem';

export default function NotificationBell({ style }) {
  const navigate = useNavigate();
  const {
    notifs,
    seen,
    unreadCount,
    processing,
    markAllRead,
    acceptInvite,
    declineInvite,
    acceptFriendRequest,
    declineFriendRequest,
    acceptJoinReq,
    declineJoinReq,
    toastEnabled,
    toggleToast
  } = useNotificationContext();

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280 });
  const [ringing, setRinging] = useState(false);
  const btnRef = useRef(null);
  const prevUnreadRef = useRef(null);
  const ringTimerRef = useRef(null);

  // Chỉ rung khi có thông báo MỚI (unreadCount tăng)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[NotificationBell] unreadCount changed:', {
        unreadCount,
        prevUnread: prevUnreadRef.current,
        notifsCount: notifs.length,
        seenCount: seen.size,
      });
    }

    if (prevUnreadRef.current === null) {
      // Lần đầu mount — không rung, chỉ ghi nhớ giá trị ban đầu
      prevUnreadRef.current = unreadCount;
      return;
    }
    if (unreadCount > prevUnreadRef.current) {
      if (import.meta.env.DEV) {
        console.log('[NotificationBell] Triggering ring! unreadCount increased:', prevUnreadRef.current, '->', unreadCount);
      }
      // Có thông báo mới đến — bật rung
      setRinging(true);
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      // Tắt sau 2.5 giây (đủ 1 vòng animation bell-shake)
      ringTimerRef.current = setTimeout(() => {
        if (import.meta.env.DEV) {
          console.log('[NotificationBell] Stopping ring.');
        }
        setRinging(false);
      }, 2500);
    }
    prevUnreadRef.current = unreadCount;
    return () => {
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    };
  }, [unreadCount, notifs, seen]);


  const calcPos = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    
    // Tìm khung profile cha (card chứa chuông + avatar)
    const card = btnRef.current.closest('[data-profilecard]');
    if (card) {
      const cardRect = card.getBoundingClientRect();
      setPos({
        top: cardRect.bottom + 6,
        left: cardRect.left,
        width: cardRect.width,
      });
    } else {
      // Fallback khi không có [data-profilecard] (ví dụ trên di động)
      const width = screenWidth < 360 ? 300 : 320;
      let left = rect.right - width;
      
      // Giới hạn left không âm (clamp về 8px)
      if (left < 8) {
        left = 8;
      }
      
      // Đảm bảo không tràn lề phải
      if (left + width > screenWidth - 8) {
        left = screenWidth - width - 8;
        if (left < 8) {
          left = 8;
        }
      }

      setPos({
        top: rect.bottom + 6,
        left,
        width,
      });
    }
  };

  const handleOpen = () => {
    if (!open) calcPos();
    setOpen((o) => {
      if (o) markAllRead();
      return !o;
    });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !document.querySelector('[data-notif-dropdown]')?.contains(e.target) && !btnRef.current.contains(e.target)) {
        markAllRead();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, markAllRead]);

  const handleActionClick = (n) => {
    markAllRead();
    setOpen(false);
    if (n.type === 'groupmsg' || n.type === 'groupcall') navigate(`/groups/${n.groupId}?tab=chat`);
    else if (n.type === 'fileupload') navigate(`/groups/${n.groupId}?tab=documents`);
    else if (['groupjoin','groupdeputy','othergroupjoin'].includes(n.type)) navigate(`/groups/${n.groupId}`);
    else if (n.type === 'schedule') navigate(`/groups/${n.groupId}?tab=schedule`);
    else if (n.type === 'deadline' || n.type === 'deadline-urgent') navigate(`/groups/${n.groupId}?tab=deadlines`);
    else if (n.type === 'comment' || n.type === 'like' || n.type === 'posttag_user' || n.type === 'posttag_group') navigate('/');
    else if (n.type === 'friendaccept') navigate('/friends');
    else if (n.type === 'joinrequest') navigate(`/groups/${n.groupId}`);
  };

  const onAcceptInvite = (n) => { acceptInvite(n.inviteId); };
  const onDeclineInvite = (n) => { declineInvite(n.inviteId); };
  const onAcceptFriend = (n) => { acceptFriendRequest(n.requestId); };
  const onDeclineFriend = (n) => { declineFriendRequest(n.requestId); };

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <style>{`
        @keyframes bell-shake {
          0%, 25%, 100% { transform: rotate(0); }
          2.5% { transform: rotate(18deg); }
          5% { transform: rotate(-18deg); }
          7.5% { transform: rotate(15deg); }
          10% { transform: rotate(-15deg); }
          12.5% { transform: rotate(10deg); }
          15% { transform: rotate(-10deg); }
          17.5% { transform: rotate(6deg); }
          20% { transform: rotate(-6deg); }
          22.5% { transform: rotate(0); }
        }
        .bell-icon-unread {
          animation: bell-shake 2.2s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite;
          transform-origin: top center;
        }
      `}</style>
      <button
        ref={btnRef}
        onClick={handleOpen}
        title="Thông báo"
        style={{
          background: open ? 'rgba(0, 0, 0, 0.08)' : hovered ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
          border: 'none',
          borderRadius: '50%',
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.25s ease',
          padding: 0,
          flexShrink: 0,
          color: 'var(--text-primary)',
          filter: 'none',
          ...style,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={ringing ? 'bell-icon-unread' : ''}
          style={{ transition: 'all 0.3s' }}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-3px', right: '-3px',
            background: '#FFEDD5', color: '#C2410C',
            borderRadius: '50%',
            minWidth: '16px', height: '16px',
            fontSize: '9px', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', lineHeight: 1, whiteSpace: 'nowrap',
            boxSizing: 'border-box',
            boxShadow: '0 2px 6px rgba(194, 65, 12, 0.2)',
            zIndex: 2,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            onClick={() => { markAllRead(); setOpen(false); }}
            style={{ position: 'fixed', inset: 0, zIndex: 8998 }}
          />
          <div
            data-notif-dropdown
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
              zIndex: 8999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Thông báo</span>
                <button
                  onClick={toggleToast}
                  title={toastEnabled ? 'Tắt popup' : 'Bật popup'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 15, padding: '2px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: toastEnabled ? 1 : 0.5,
                    filter: toastEnabled ? 'none' : 'grayscale(100%)',
                    transition: 'all 0.2s',
                  }}
                >
                  {toastEnabled ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
              {notifs.length > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-primary)', fontSize: 11,
                    cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  Đánh dấu đã đọc
                </button>
              )}
            </div>

             {/* Danh sách scroll ~4 items */}
             <div style={{
               overflowY: 'auto',
               maxHeight: '280px',
               overscrollBehavior: 'contain',
             }}>
              {notifs.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Không có thông báo nào
                </div>
              ) : (
                notifs.map((n) => {
                  const isUnread = !seen.has(n.key);
                  const procKey = n.inviteId || n.requestId;
                  const proc = processing[procKey];
                  return (
                    <NotificationItem
                      key={n.key}
                      notification={n}
                      isUnread={isUnread}
                      isProcessing={proc}
                      onAccept={onAcceptInvite}
                      onDecline={onDeclineInvite}
                      onAcceptFriend={onAcceptFriend}
                      onDeclineFriend={onDeclineFriend}
                      onAcceptJoinRequest={(notif) => acceptJoinReq(notif.requestId, notif.groupId, notif.fromUserId)}
                      onDeclineJoinRequest={(notif) => declineJoinReq(notif.requestId)}
                      onActionClick={handleActionClick}
                    />
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}