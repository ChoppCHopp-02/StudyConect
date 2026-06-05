export default function GroupMembers({
  group,
  user,
  isAssigningDeputy,
  friendRequestingIds,
  kickingIds,
  handleAssignDeputy,
  handleRemoveDeputy,
  handleSendFriendRequest,
  handleKickMember,
  membersDetails = [],
  friendships = [],
  joinRequests = [],
  approvingIds = {},
  rejectingIds = {},
  handleApproveJoin,
  handleRejectJoin,
  onlineUserIds = [],
}) {
  const isLeader = Number(user?.id) === Number(group?.creatorId);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Yêu cầu tham gia — chỉ trưởng nhóm thấy, nhóm riêng tư */}
      {isLeader && group?.isPrivate && joinRequests.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1.5px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⏳ Yêu cầu tham gia nhóm
            <span style={{ fontSize: 12, background: '#f59e0b', color: '#000', borderRadius: 20, padding: '2px 8px', fontWeight: 800 }}>{joinRequests.length}</span>
          </h3>
          <p style={{ margin: '0 0 14px 0', fontSize: 12, color: 'var(--text-muted)' }}>Duyệt hoặc từ chối các yêu cầu tham gia nhóm riêng tư.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {joinRequests.map(req => {
              const initials = req.fullName?.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || '?';
              return (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {req.avatar
                    ? <img src={req.avatar} alt={req.fullName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,var(--primary),var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>{initials}</div>
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{req.fullName}</div>
                    {req.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{req.email}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => handleApproveJoin(req)} disabled={approvingIds[req.id]}
                      style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: 12, opacity: approvingIds[req.id] ? 0.6 : 1, fontFamily: 'inherit' }}>
                      {approvingIds[req.id] ? '...' : '✓ Duyệt'}
                    </button>
                    <button onClick={() => handleRejectJoin(req)} disabled={rejectingIds[req.id]}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 700, fontSize: 12, opacity: rejectingIds[req.id] ? 0.6 : 1, fontFamily: 'inherit' }}>
                      {rejectingIds[req.id] ? '...' : '✕ Từ chối'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>Danh sách thành viên</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
          {group.members.length} thành viên
        </p>
      </div>
      {group.members.map((memberId) => {
        const isLeader = Number(memberId) === Number(group.creatorId);
        const isDeputy = Number(memberId) === Number(group.deputyId);
        const isCurrentUser = Number(memberId) === Number(user?.id);
        const isCurrentUserLeader = Number(user?.id) === Number(group.creatorId);
        const memberInfo = membersDetails.find((u) => Number(u.id) === Number(memberId)) || null;
        const displayName = String(memberInfo?.fullName || memberId);
        const displayAvatar = memberInfo?.avatar || null;
        const memberInitials = displayName
          .split(' ')
          .map((w) => w[0])
          .slice(-2)
          .join('')
          .toUpperCase();
        const friendStatus = !isCurrentUser
          ? friendships.find(
              (f) =>
                (Number(f.from_user_id) === Number(user?.id) && Number(f.to_user_id) === Number(memberId)) ||
                (Number(f.from_user_id) === Number(memberId) && Number(f.to_user_id) === Number(user?.id))
            )
          : null;
        const isFriend = friendStatus?.status === 'accepted';
        const isPending = friendStatus?.status === 'pending' && Number(friendStatus?.from_user_id) === Number(user?.id);
        const isMeReceiving = friendStatus?.status === 'pending' && Number(friendStatus?.to_user_id) === Number(user?.id);
        const isRequesting = friendRequestingIds[String(memberId)];

        return (
          <div
            key={memberId}
            style={{
              background: 'var(--bg-card)',
              border: isLeader
                ? '1.5px solid rgba(245, 158, 11, 0.4)'
                : isDeputy
                ? '1.5px solid rgba(108, 99, 255, 0.35)'
                : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--primary)',
                    display: 'block',
                  }}
                  alt={displayName}
                />
              ) : (
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: isLeader
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '15px',
                    color: 'white',
                  }}
                >
                  {memberInitials}
                </div>
              )}
              <span style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: onlineUserIds.includes(String(memberId)) ? '#10b981' : '#ef4444',
                border: '2px solid var(--bg-card)',
                boxShadow: onlineUserIds.includes(String(memberId)) ? '0 0 6px #10b981' : 'none'
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
                  {displayName}
                  {isCurrentUser && <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}> (Bạn)</span>}
                </span>
                {isLeader && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    Trưởng nhóm
                  </span>
                )}
                {isDeputy && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(108, 99, 255, 0.12)',
                      color: 'var(--primary-light)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      border: '1px solid rgba(108, 99, 255, 0.3)',
                    }}
                  >
                    Phó nhóm
                  </span>
                )}
              </div>
              {memberInfo?.email && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {memberInfo.email}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
              {!isCurrentUser &&
                (isFriend ? (
                  <span
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#10b981',
                      fontWeight: 600,
                      fontSize: '13px',
                      border: '1px solid rgba(16,185,129,0.3)',
                    }}
                  >
                    Bạn bè
                  </span>
                ) : isPending ? (
                  <span
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#f59e0b',
                      fontWeight: 600,
                      fontSize: '13px',
                      border: '1px solid rgba(245,158,11,0.3)',
                    }}
                  >
                    Chờ phản hồi
                  </span>
                ) : isMeReceiving ? (
                  <span
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(108, 99, 255, 0.1)',
                      color: 'var(--primary-light)',
                      fontWeight: 600,
                      fontSize: '13px',
                      border: '1px solid rgba(108,99,255,0.3)',
                    }}
                  >
                    Đã gửi lời mời cho bạn
                  </span>
                ) : (
                  <button
                    onClick={() => handleSendFriendRequest(String(memberId))}
                    disabled={isRequesting}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(108, 99, 255, 0.35)',
                      cursor: 'pointer',
                      background: 'rgba(108, 99, 255, 0.08)',
                      color: 'var(--primary-light)',
                      fontWeight: 600,
                      fontSize: '13px',
                    }}
                  >
                    {isRequesting ? '...' : 'Kết bạn'}
                  </button>
                ))}
              {isCurrentUserLeader && !isLeader && (
                isDeputy ? (
                  <button
                    onClick={handleRemoveDeputy}
                    disabled={isAssigningDeputy}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: 'pointer',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      fontWeight: 600,
                      fontSize: '13px',
                    }}
                  >
                    {isAssigningDeputy ? '...' : '✕ Thu hồi phó nhóm'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleAssignDeputy(memberId)}
                    disabled={isAssigningDeputy}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(108, 99, 255, 0.35)',
                      cursor: 'pointer',
                      background: 'rgba(108, 99, 255, 0.08)',
                      color: 'var(--primary-light)',
                      fontWeight: 600,
                      fontSize: '13px',
                    }}
                  >
                    {isAssigningDeputy ? '...' : 'Đặt làm phó nhóm'}
                  </button>
                )
              )}
              {(isCurrentUserLeader || Number(user?.id) === Number(group.deputyId)) && !isLeader && !isCurrentUser && (
                <button
                  onClick={() => handleKickMember(memberId)}
                  disabled={kickingIds[String(memberId)]}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    cursor: 'pointer',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#ef4444',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {kickingIds[String(memberId)] ? '...' : '🚫 Kick'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
