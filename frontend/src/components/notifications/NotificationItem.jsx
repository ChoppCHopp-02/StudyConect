import { timeAgo } from '@/utils';

export default function NotificationItem({
  notification: n,
  isUnread,
  isProcessing,
  onAccept,
  onDecline,
  onAcceptFriend,
  onDeclineFriend,
  onAcceptJoinRequest,
  onDeclineJoinRequest,
  onActionClick
}) {
  const isInvite = n.type === 'groupinvite';
  const isUrgentDeadline = n.type === 'deadline-urgent';
  const isActionable = n.type !== 'groupinvite' && n.type !== 'friendreq' && n.type !== 'joinrequest';

  return (
    <div
      onClick={() => {
        if (isActionable) {
          onActionClick(n);
        }
      }}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: isUrgentDeadline
          ? (isUnread ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.04)')
          : (isUnread ? 'rgba(108,99,255,0.07)' : 'transparent'),
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        transition: 'background 0.2s',
        borderLeft: isUrgentDeadline ? '3px solid #ef4444' : 'none',
        cursor: isActionable ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isUrgentDeadline ? '#ef4444' : (isUnread ? 'var(--primary)' : 'transparent'),
          flexShrink: 0,
          marginTop: 6,
          border: (!isUrgentDeadline && !isUnread) ? '1px solid var(--border)' : 'none',
          boxShadow: isUrgentDeadline ? '0 0 6px #ef4444' : 'none',
        }}
      />
      {/* Icon riêng cho missedcall — kiểu Home page */}
      {n.type === 'missedcall' && (
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
          background: 'rgba(239,68,68,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.4))',
          alignSelf: 'flex-start',
          marginTop: 2,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.18 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
            <line x1="23" y1="1" x2="1" y2="23" />
          </svg>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: (isUnread || isUrgentDeadline) ? 700 : 500,
            color: isUrgentDeadline ? '#ef4444' : n.type === 'missedcall' ? '#fca5a5' : 'var(--text-primary)',
            marginBottom: 3,
          }}
        >
          {n.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.body}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {timeAgo(n.createdAt)}
        </div>


        {isUrgentDeadline && (
          <button
            onClick={() => onActionClick(n)}
            style={{
              marginTop: 8,
              padding: '5px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'rgba(239,68,68,0.85)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Nộp bài ngay
            </span>
          </button>
        )}

        {isInvite && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => onAccept(n)}
              disabled={!!isProcessing}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                border: 'none',
                background: isProcessing === 'accepting' ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.85)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.7 : 1,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {isProcessing === 'accepting' ? '...' : 'Chấp nhận'}
            </button>
            <button
              onClick={() => onDecline(n)}
              disabled={!!isProcessing}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: 12,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.7 : 1,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {isProcessing === 'declining' ? '...' : 'Từ chối'}
            </button>
          </div>
        )}

        {n.type === 'friendreq' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => onAcceptFriend(n)}
              disabled={!!isProcessing}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                border: 'none',
                background: isProcessing === 'accepting' ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.85)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.7 : 1,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {isProcessing === 'accepting' ? '...' : 'Chấp nhận'}
            </button>
            <button
              onClick={() => onDeclineFriend(n)}
              disabled={!!isProcessing}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: 12,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.7 : 1,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {isProcessing === 'declining' ? '...' : 'Từ chối'}
            </button>
          </div>
        )}

        {n.type === 'joinrequest' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => onAcceptJoinRequest(n)}
              disabled={!!isProcessing}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                border: 'none',
                background: isProcessing === 'accepting' ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.85)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.7 : 1,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {isProcessing === 'accepting' ? '...' : 'Duyệt'}
            </button>
            <button
              onClick={() => onDeclineJoinRequest(n)}
              disabled={!!isProcessing}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: 12,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.7 : 1,
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {isProcessing === 'declining' ? '...' : 'Từ chối'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
