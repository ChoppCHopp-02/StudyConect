// User management table for Admin panel
export default function UserTable({ filteredUsers, admin, userSearch, setUserSearch, onEdit, onDelete, onCreateNew }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 32px', boxShadow: 'var(--shadow), var(--shadow-glow)', backdropFilter: 'blur(16px)' }}>
      {/* Search & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }} className="form-input-wrap">
          <input
            type="text"
            className="form-input"
            placeholder=" Tìm kiếm user (Tên, Email)..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" style={{ width: 'max-content', padding: '10px 24px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={onCreateNew}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Thêm thành viên mới
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Thành viên</th>
              <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Trường / Ngành học</th>
              <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Vai trò</th>
              <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Ngày tham gia</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', width: '1%', whiteSpace: 'nowrap' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Không tìm thấy người dùng nào phù hợp.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const userInitials = u.fullName?.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase() || '?';
                const isSelf = u.id === admin.id;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14.5px', transition: 'var(--transition)' }} className="table-row-hover">
                    <td style={{ padding: '16px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {u.avatar ? (
                        <img src={u.avatar} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} alt="avatar" />
                      ) : (
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '50%',
                          background: u.role === 'admin' ? 'linear-gradient(135deg, var(--accent), var(--primary))' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13.5px', fontWeight: 700, color: 'white',
                        }}>
                          {userInitials}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {u.fullName}{isSelf && <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '8px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 6 }}>(Tôi)</span>}
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 16px', color: 'var(--text-secondary)' }}>
                      {u.university ? (
                        <div>
                          <div>{u.university}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.major}</div>
                        </div>
                      ) : <span>-</span>}
                    </td>
                    <td style={{ padding: '16px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '4px 10px', borderRadius: '20px',
                        background: u.role === 'admin' ? 'rgba(255,107,157,0.15)' : 'rgba(108,99,255,0.15)',
                        color: u.role === 'admin' ? 'var(--accent)' : 'var(--primary-light)',
                        border: u.role === 'admin' ? '1px solid rgba(255,107,157,0.3)' : '1px solid rgba(108,99,255,0.3)',
                      }}>
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '16px 16px', textAlign: 'right', width: '1%', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '12px', minWidth: 'auto', borderRadius: '8px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => onEdit(u)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                          Sửa
                        </button>
                        <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '12px', minWidth: 'auto', borderRadius: '8px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }} disabled={isSelf} onClick={() => onDelete(u.id, u.fullName)}>
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
