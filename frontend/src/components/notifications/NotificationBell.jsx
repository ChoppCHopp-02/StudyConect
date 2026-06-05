import { useState, useRef } from 'react';
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
    declineJoinReq
  } = useNotificationContext();

  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropW = 360;
      let left = rect.left;
      if (left + dropW > window.innerWidth - 8) {
        left = window.innerWidth - dropW - 8;
      }
      if (left < 8) left = 8;
      setDropPos({ top: rect.bottom + 8, left });
    }
    setOpen((o) => {
      if (o) {
        markAllRead();
      }
      return !o;
    });
  };

  const handleActionClick = (n) => {
    markAllRead();
    setOpen(false);
    if (n.type === 'groupmsg') {
      navigate(`/groups/${n.groupId}?tab=chat`);
    } else if (n.type === 'groupcall') {
      navigate(`/groups/${n.groupId}?tab=chat`);
    } else if (n.type === 'fileupload') {
      navigate(`/groups/${n.groupId}?tab=documents`);
    } else if (n.type === 'groupjoin' || n.type === 'groupdeputy' || n.type === 'othergroupjoin') {
      navigate(`/groups/${n.groupId}`);
    } else if (n.type === 'schedule') {
      navigate(`/groups/${n.groupId}?tab=schedule`);
    } else if (n.type === 'deadline' || n.type === 'deadline-urgent') {
      navigate(`/groups/${n.groupId}?tab=deadlines`);
    } else if (n.type === 'comment' || n.type === 'like') {
      navigate('/');
    } else if (n.type === 'friendaccept') {
      navigate('/friends');
    } else if (n.type === 'joinrequest') {
      navigate(`/groups/${n.groupId}`);
    }
  };

  const onAcceptInvite = (n) => {
    acceptInvite(n.inviteId);
  };

  const onDeclineInvite = (n) => {
    declineInvite(n.inviteId);
  };

  const onAcceptFriend = (n) => {
    acceptFriendRequest(n.requestId);
  };

  const onDeclineFriend = (n) => {
    declineFriendRequest(n.requestId);
  };

  return (
    <div style={{ position: 'relative' }}>
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
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(108,99,255,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = open ? 'rgba(108,99,255,0.15)' : 'transparent';
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              minWidth: '16px',
              height: '16px',
              fontSize: '9px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)',
              zIndex: 2,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop to close */}
          <div
            onClick={() => {
              markAllRead();
              setOpen(false);
            }}
            style={{ position: 'fixed', inset: 0, zIndex: 8999 }}
          />
          <div
            style={{
              position: 'fixed',
              top: dropPos.top,
              left: dropPos.left,
              width: 360,
              height: 300,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              zIndex: 9000,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 15 }}>🔔 Thông báo</span>
              {notifs.length > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Đánh dấu đã đọc
                </button>
              )}
            </div>
            <div style={{ overflowY: 'auto', flex: 1, overscrollBehavior: 'contain' }}>
              {notifs.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
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
