import { HCM_UNIVERSITIES, MAJORS } from '@/constants/educationData';

const IS = { // inputStyle shorthand
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bg-input)', border: '1.5px solid var(--border)',
  borderRadius: '10px', padding: '10px 13px',
  color: 'var(--text-primary)', fontSize: '13px',
  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
};

export default function UserFormModal({ show, onClose, currentEditUser, userForm, setUserForm, onSubmit, submitting }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '520px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary), #5b53e0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>
              {currentEditUser ? '✏️' : '👤'}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>{currentEditUser ? 'Cập nhật tài khoản' : 'Tạo tài khoản mới'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{currentEditUser ? 'Chỉnh sửa thông tin người dùng' : 'Điền thông tin thành viên mới'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', width: 32, height: 32, cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Full name + Role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Họ và tên *</label>
              <input type="text" style={IS} placeholder="Nguyễn Văn A" value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Vai trò</label>
              <select style={{ ...IS, appearance: 'auto', cursor: 'pointer' }} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                <option value="user">👤 Học sinh / Sinh viên</option>
                <option value="admin">🛡️ Quản trị viên</option>
              </select>
            </div>
          </div>

          {/* Email + Password */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Email *</label>
              <input type="email" style={IS} placeholder="sv@student.edu.vn" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                {currentEditUser ? 'Mật khẩu mới (tùy chọn)' : 'Mật khẩu *'}
              </label>
              <input type="text" style={IS} placeholder={currentEditUser ? 'Để trống nếu không đổi' : 'Tối thiểu 6 ký tự'}
                value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required={!currentEditUser} />
            </div>
          </div>

          {/* Major */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Ngành học</label>
            <select style={{ ...IS, appearance: 'auto', cursor: 'pointer' }} value={userForm.major} onChange={(e) => setUserForm({ ...userForm, major: e.target.value })}>
              <option value="">-- Chọn ngành học --</option>
              {MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {userForm.major === 'Ngành khác...' && (
              <input type="text" style={{ ...IS, marginTop: '8px' }} placeholder="Nhập ngành học của bạn"
                value={userForm.majorCustom || ''} onChange={(e) => setUserForm({ ...userForm, majorCustom: e.target.value })} />
            )}
          </div>

          {/* University */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Trường đại học</label>
            <select style={{ ...IS, appearance: 'auto', cursor: 'pointer' }} value={userForm.university} onChange={(e) => setUserForm({ ...userForm, university: e.target.value })}>
              <option value="">-- Chọn trường đại học --</option>
              {HCM_UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            {userForm.university === 'Trường khác...' && (
              <input type="text" style={{ ...IS, marginTop: '8px' }} placeholder="Nhập tên trường đại học"
                value={userForm.universityCustom || ''} onChange={(e) => setUserForm({ ...userForm, universityCustom: e.target.value })} />
            )}
          </div>

          {/* Bio */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Giới thiệu ngắn</label>
            <textarea style={{ ...IS, height: '72px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              placeholder="Viết giới thiệu về người dùng..." value={userForm.bio}
              onChange={(e) => setUserForm({ ...userForm, bio: e.target.value })} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px 18px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '10px' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>Hủy</button>
          <button type="button" onClick={onSubmit} disabled={submitting} style={{ flex: 1, padding: '11px', borderRadius: '12px', background: submitting ? 'var(--bg-input)' : 'linear-gradient(135deg, var(--primary), #5b53e0)', border: 'none', color: submitting ? 'var(--text-muted)' : 'white', fontWeight: 700, fontSize: '14px', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {submitting ? '⏳ Đang xử lý...' : currentEditUser ? '💾 Lưu thay đổi' : '✅ Tạo tài khoản'}
          </button>
        </div>
      </div>
    </div>
  );
}
