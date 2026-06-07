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
  const [pos, setPos] = useState({ top: 0, left: 0, width: 280 });
  const btnRef = useRef(null);

  // Dropdown nằm trong vùng sidebar, dưới chuông, không đè content
  const calcPos = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const gap = 6;
    // Lấy sidebar (element cha gần nhất có class aside hoặc tính từ rect.left về 0)
    // Dropdown rộng bằng từ left=8 đến rect.right (tức nằm gọn trong sidebar)
    const dropW = Math.max(rect.right - 8, 200); // rộng bằng sidebar tính từ lề
    setPos({
      top: rect.bottom + gap,
      left: 8,
      width: Math.min(dropW, rect.right), // không vượt quá mép phải sidebar
    });
  };

  const handleOpen = () => {
    if (!open) calcPos();
    setOpen((o) => {
      if (o) markAllRead();
      return !o;
    });
  };

  // Đóng khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.closest('[data-notif-root]')?.contains(e.target)) {
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
    else if (n.type === 'comment' || n.type === 'like') navigate('/');
    else if (n.type === 'friendaccept') navigate('/friends');
    else if (n.type === 'joinrequest') navigate(`/groups/${n.groupId}`);
  };

  const onAcceptInvite = (n) => { acceptInvite(n.inviteId); };
  const onDeclineInvite = (n) => { declineInvite(n.inviteId); };
  const onAcceptFriend = (n) => { acceptFriendRequest(n.requestId); };
  const onDeclineFriend = (n) => { declineFriendRequest(n.requestId); };

  return (
    <div data-notif-root style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Nút chuông */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        title="Thông báo"
        style={{
          background: open ? 'rgba(108,99,255,0.15)' : 'transparent',
          border: 'none',
          borderRadius: '50%',
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
          padding: 0,
          flexShrink: 0,
          ...style,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(108,99,255,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = open ? 'rgba(108,99,255,0.15)' : 'transparent'; }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-3px', right: '-3px',
            background: '#ef4444',
            color: '#fff',
            borderRadius: '50%',
            minWidth: '16px', height: '16px',
            fontSize: '9px', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', lineHeight: 1, whiteSpace: 'nowrap',
            boxSizing: 'border-box',
            boxShadow: '0 0 6px rgba(239,68,68,0.6)',
            zIndex: 2,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown — fixed, nằm gọn trong vùng sidebar */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => { markAllRead(); setOpen(false); }}
            style={{ position: 'fixed', inset: 0, zIndex: 8998 }}
          />
          <div style={{
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
          }}>
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
                <span style={{ fontWeight: 700, fontSize: 14 }}>🔔 Thông báo</span>
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
                  {toastEnabled ? '🔊' : '🔇'}
                </button>
              </div>
              {notifs.length > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--primary)', fontSize: 11,
                    cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  Đánh dấu đã đọc
                </button>
              )}
            </div>

            {/* Danh sách — scroll, ~2 items */}
            <div style={{
              overflowY: 'auto',
              maxHeight: '160px',
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