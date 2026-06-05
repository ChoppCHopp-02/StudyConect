export default function GroupTable({ filteredGroups, groupSearch, setGroupSearch, users, onEdit, onDelete, onViewMembers, onCreateNew }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 32px', boxShadow: 'var(--shadow)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }} className="form-input-wrap">
          <input type="text" className="form-input" placeholder=" Nhập chính xác mã ID phòng (6 số)..."
            value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ width: 'max-content', padding: '10px 24px' }} onClick={onCreateNew}>
          + Tạo phòng học mới
        </button>
      </div>

      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '16%' }} /><col style={{ width: '9%' }} /><col style={{ width: '8%' }} />
            <col style={{ width: '14%' }} /><col style={{ width: '13%' }} /><col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} /><col style={{ width: '24%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '8px 8px' }}>Tên phòng học</th>
              <th style={{ padding: '8px 8px' }}>Môn học</th>
              <th style={{ padding: '8px 8px' }}>Hình thức</th>
              <th style={{ padding: '8px 8px' }}>Trưởng nhóm</th>
              <th style={{ padding: '8px 8px' }}>Phó nhóm</th>
              <th style={{ padding: '8px 8px' }}>Thành viên</th>
              <th style={{ padding: '8px 8px' }}>Ngày lập</th>
              <th style={{ padding: '8px 8px', textAlign: 'right' }}>Thao tác</th>
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
                <tr key={g.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '12.5px', verticalAlign: 'middle' }} className="table-row-hover">
                  <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: <strong style={{ color: 'var(--secondary)' }}>{g.id}</strong></div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.description || 'Chưa có mô tả.'}</div>
                  </td>
                  <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                    <span style={{ background: 'rgba(108,99,255,0.1)', color: 'var(--primary-light)', padding: '2px 7px', borderRadius: '12px', fontSize: '11px', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.subject}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {isOnline
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(52,211,153,0.12)', color: '#34d399', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>Online</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(251,191,36,0.12)', color: '#fbbf24', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>Offline</span>
                    }
                  </td>
                  <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                    {creator ? (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{creator.fullName || creator.email}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{creator.email}</div>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>ID: {g.creatorId || '—'}</span>}
                  </td>
                  <td style={{ padding: '10px 8px', overflow: 'hidden' }}>
                    {deputy ? (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deputy.fullName || deputy.email}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deputy.email}</div>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <strong style={{ color: 'var(--secondary)', fontSize: '13px' }}>{g.members?.length || 0}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>thành viên</div>
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {g.createdAt ? new Date(g.createdAt).toLocaleDateString('vi-VN') : '-'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 7px', fontSize: '11px', minWidth: 'auto' }} onClick={() => onViewMembers(g)}>👁️ Xem</button>
                      <button className="btn btn-secondary" style={{ padding: '4px 7px', fontSize: '11px', minWidth: 'auto' }} onClick={() => onEdit(g)}>✏️ Sửa</button>
                      <button className="btn btn-danger"    style={{ padding: '4px 7px', fontSize: '11px', minWidth: 'auto' }} onClick={() => onDelete(g.id, g.name)}>🗑️ Xóa</button>
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
