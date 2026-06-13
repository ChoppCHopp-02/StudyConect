export default function GroupTable({ filteredGroups, groupSearch, setGroupSearch, users, onEdit, onDelete, onViewMembers, onCreateNew }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 32px', boxShadow: 'var(--shadow), var(--shadow-glow)', backdropFilter: 'blur(16px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }} className="form-input-wrap">
          <input type="text" className="form-input" placeholder=" Nhập chính xác mã ID phòng (6 số)..."
            value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ width: 'max-content', padding: '10px 24px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={onCreateNew}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tạo phòng học mới
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '12px 10px' }}>Tên phòng học</th>
              <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Môn học</th>
              <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Hình thức</th>
              <th style={{ padding: '12px 10px' }}>Trưởng nhóm</th>
              <th style={{ padding: '12px 10px' }}>Phó nhóm</th>
              <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Thành viên</th>
              <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Ngày lập</th>
              <th style={{ padding: '12px 10px', textAlign: 'right', width: '1%', whiteSpace: 'nowrap' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {groupSearch.trim().length > 0 && groupSearch.trim().length < 6
                    ? 'Vui lòng nhập chính xác 6 chữ số ID phòng học...'
                    : groupSearch.trim().length >= 6
                      ? 'Không tìm thấy phòng học nào phù hợp với ID này.'
                      : 'Chưa thành lập phòng học nào.'}
                </td>
              </tr>
            ) : filteredGroups.map((g) => {
              const isOnline = !g.meetingMode || g.meetingMode === 'online';
              const creator = users.find((u) => u.id === g.creatorId);
              const deputy  = g.deputyId ? users.find((u) => u.id === g.deputyId) : null;
              return (
                <tr key={g.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '13.5px', verticalAlign: 'middle' }} className="table-row-hover">
                  <td style={{ padding: '16px 10px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{g.name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>ID: <strong style={{ color: 'var(--secondary)' }}>{g.id}</strong></div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{g.description || 'Chưa có mô tả.'}</div>
                  </td>
                  <td style={{ padding: '16px 10px', whiteSpace: 'nowrap' }}>
                    <span style={{ background: 'rgba(108,99,255,0.1)', color: 'var(--primary-light)', padding: '4px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 600 }}>
                      {g.subject}
                    </span>
                  </td>
                  <td style={{ padding: '16px 10px', whiteSpace: 'nowrap' }}>
                    {isOnline
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(52,211,153,0.12)', color: '#34d399', padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600 }}>Online</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(251,191,36,0.12)', color: '#fbbf24', padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600 }}>Offline</span>
                    }
                  </td>
                  <td style={{ padding: '16px 10px' }}>
                    {creator ? (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{creator.fullName || creator.email}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{creator.email}</div>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>ID: {g.creatorId || '—'}</span>}
                  </td>
                  <td style={{ padding: '16px 10px' }}>
                    {deputy ? (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{deputy.fullName || deputy.email}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{deputy.email}</div>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                  </td>
                  <td style={{ padding: '16px 10px', whiteSpace: 'nowrap' }}>
                    <strong style={{ color: 'var(--secondary)', fontSize: '14px' }}>{g.members?.length || 0}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginLeft: '4px' }}>thành viên</span>
                  </td>
                  <td style={{ padding: '16px 10px', color: 'var(--text-muted)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                    {g.createdAt ? new Date(g.createdAt).toLocaleDateString('vi-VN') : '-'}
                  </td>
                  <td style={{ padding: '16px 10px', textAlign: 'right', width: '1%', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '12px', minWidth: 'auto', borderRadius: '8px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => onViewMembers(g)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Xem
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '12px', minWidth: 'auto', borderRadius: '8px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => onEdit(g)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"/>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                        Sửa
                      </button>
                      <button className="btn btn-danger"    style={{ padding: '5px 10px', fontSize: '12px', minWidth: 'auto', borderRadius: '8px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => onDelete(g.id, g.name)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
