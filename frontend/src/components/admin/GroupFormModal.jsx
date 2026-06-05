export default function GroupFormModal({ show, onClose, currentEditGroup, groupForm, setGroupForm, onSubmit, submitting }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
      <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '480px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '28px', boxShadow: 'var(--shadow-glow)', maxHeight: '90vh', overflowY: 'auto', overscrollBehavior: 'contain' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px', color: 'var(--text-primary)' }}>
          {currentEditGroup ? '✏️ Chỉnh sửa thông tin phòng học' : '🏠 Tạo phòng học mới'}
        </h3>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tên phòng học *</label>
            <div className="form-input-wrap">
              <input type="text" className="form-input no-icon" placeholder="Nhập tên phòng học của bạn..."
                value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} required />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Môn học / Lĩnh vực *</label>
            <div className="form-input-wrap">
              <input type="text" className="form-input no-icon" placeholder="Nhập chuyên ngành/môn học..."
                value={groupForm.subject} onChange={(e) => setGroupForm({ ...groupForm, subject: e.target.value })} required />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Hình thức học</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => { setGroupForm({ ...groupForm, meetingMode: 'online' }); }}
                style={{ flex: 1, padding: '11px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit', border: groupForm.meetingMode === 'online' ? '2px solid #34d399' : '1.5px solid var(--border)', background: groupForm.meetingMode === 'online' ? 'rgba(52,211,153,0.12)' : 'var(--bg-input)', color: groupForm.meetingMode === 'online' ? '#34d399' : 'var(--text-muted)' }}>
                🌐 Online
              </button>
              <button type="button" onClick={() => setGroupForm({ ...groupForm, meetingMode: 'offline' })}
                style={{ flex: 1, padding: '11px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '14px', fontFamily: 'inherit', border: groupForm.meetingMode === 'offline' ? '2px solid #fbbf24' : '1.5px solid var(--border)', background: groupForm.meetingMode === 'offline' ? 'rgba(251,191,36,0.12)' : 'var(--bg-input)', color: groupForm.meetingMode === 'offline' ? '#fbbf24' : 'var(--text-muted)' }}>
                📍 Offline
              </button>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Mô tả chi tiết</label>
            <textarea className="form-textarea" placeholder="Giới thiệu mục tiêu của phòng học..." style={{ height: '60px', resize: 'vertical' }}
              value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? 'Đang xử lý...' : currentEditGroup ? 'Lưu thay đổi' : 'Tạo phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
