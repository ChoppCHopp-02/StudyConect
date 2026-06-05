import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { updateProfile, changePassword } from '../services/authService';
import { HCM_UNIVERSITIES, MAJORS } from '../constants/educationData';
import { VIETNAM_LOCATIONS } from '../constants/locationData';
import AppLayout from '../layouts/AppLayout';


function CustomSelect({ value, onChange, options, placeholder = "Chọn...", disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 1000 : 1 }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '14.5px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s',
          height: '46px',
          boxSizing: 'border-box'
        }}
      >
        <span>{value || placeholder}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#1a1a2e',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            maxHeight: '300px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            zIndex: 9999,
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--primary) transparent'
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                color: opt === value ? 'var(--primary-light)' : 'var(--text-primary)',
                background: opt === value ? 'rgba(108,99,255,0.12)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left'
              }}
              onMouseEnter={e => {
                if (opt !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={e => {
                if (opt !== value) e.currentTarget.style.background = 'transparent';
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const { addToast } = useToast();
  const fileRef = useRef();

  const [tab, setTab] = useState('info'); // 'info' | 'password'

  // Helper to parse location tag from bio string
  const parseBioLocation = (bioString) => {
    if (bioString && bioString.startsWith('[📍 ')) {
      const endIdx = bioString.indexOf(']');
      if (endIdx > 0) {
        const locPart = bioString.substring(4, endIdx);
        const bioText = bioString.substring(endIdx + 1).trim();
        const parts = locPart.split(', ');
        return { province: parts[0] || '', district: parts[1] || '', bioText };
      }
    }
    return { province: '', district: '', bioText: bioString || '' };
  };

  const parsed = parseBioLocation(user?.bio);

  const initialUniIsCustom = user?.university && !HCM_UNIVERSITIES.includes(user.university);
  const initialMajorIsCustom = user?.major && !MAJORS.includes(user.major);

  // ─── Info form state ─────────────────────────────
  const [info, setInfo] = useState({
    fullName: user?.fullName || '',
    university: initialUniIsCustom ? 'Trường khác...' : (user?.university || ''),
    major: initialMajorIsCustom ? 'Ngành khác...' : (user?.major || ''),
    customUniversity: initialUniIsCustom ? user.university : '',
    customMajor: initialMajorIsCustom ? user.major : '',
    bio: parsed.bioText,
  });

  const [province, setProvince] = useState(parsed.province);
  const [district, setDistrict] = useState(parsed.district);

  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);

  const handleInfoChange = (e) => setInfo(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { addToast('Ảnh phải nhỏ hơn 5MB', 'error'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!info.fullName.trim() || info.fullName.trim().length < 2) {
      addToast('Họ tên phải có ít nhất 2 ký tự', 'error'); return;
    }
    setSavingInfo(true);
    try {
      const formattedBio = (province && district)
        ? `[📍 ${province}, ${district}] ${info.bio.trim()}`
        : info.bio.trim();

      const payload = {
        id: user.id,
        fullName: info.fullName,
        university: info.university === 'Trường khác...' ? info.customUniversity : info.university,
        major: info.major === 'Ngành khác...' ? info.customMajor : info.major,
        bio: formattedBio,
        avatarFile
      };
      const { user: updated } = await updateProfile(payload);
      setUser(updated);
      setAvatarFile(null);
      addToast('Cập nhật hồ sơ thành công!');
    } catch (err) { addToast(err.message, 'error'); }
    finally { setSavingInfo(false); }
  };

  // ─── Password form state ─────────────────────────
  const [pwd, setPwd] = useState({ current: '', newPass: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const handlePwdChange = (e) => setPwd(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSavePwd = async (e) => {
    e.preventDefault();
    if (!pwd.current) { addToast('Nhập mật khẩu hiện tại', 'error'); return; }
    if (!pwd.newPass || pwd.newPass.length < 6) { addToast('Mật khẩu mới phải ít nhất 6 ký tự', 'error'); return; }
    if (pwd.newPass !== pwd.confirm) { addToast('Mật khẩu xác nhận không khớp', 'error'); return; }
    setSavingPwd(true);
    try {
      await changePassword({ id: user.id, currentPassword: pwd.current, newPassword: pwd.newPass });
      setPwd({ current: '', newPass: '', confirm: '' });
      addToast('Đổi mật khẩu thành công!');
    } catch (err) { addToast(err.message, 'error'); }
    finally { setSavingPwd(false); }
  };

  const initials = user?.fullName?.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || '?';

  return (
    <AppLayout>

      {/* Content */}
      <div className="profile-container">
        {/* LEFT: Sidebar */}
        <aside className="profile-sidebar">
          <div className="avatar-wrap">
            {avatarPreview
              ? <img src={avatarPreview} className="avatar-img" alt="avatar" />
              : <div className="avatar-placeholder">{initials}</div>}
            <button className="avatar-edit-btn" onClick={() => fileRef.current?.click()} title="Đổi ảnh">📷</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
          <button 
            type="button" 
            onClick={() => fileRef.current?.click()} 
            style={{ 
              background: 'rgba(108,99,255,0.08)', 
              border: '1.5px solid var(--border)', 
              borderRadius: '12px',
              color: 'var(--primary-light)', 
              fontSize: '12px', 
              fontWeight: 700, 
              cursor: 'pointer', 
              marginBottom: '16px',
              padding: '6px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.15)'; e.currentTarget.style.color = 'var(--secondary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,99,255,0.08)'; e.currentTarget.style.color = 'var(--primary-light)'; }}
          >
            📷 Thay đổi ảnh đại diện
          </button>
          <div className="profile-name">{user?.fullName}</div>
          <div className="profile-email">{user?.email}</div>
          <div className="profile-badge"> Sinh viên</div>

          <div className="profile-meta">
            {user?.university && (
              <div className="profile-meta-item">
                <span className="icon">️</span>
                <span>{user.university}</span>
              </div>
            )}
            {user?.major && (
              <div className="profile-meta-item">
                <span className="icon"></span>
                <span>{user.major}</span>
              </div>
            )}
            {user?.bio && (
              <div className="profile-meta-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Giới thiệu</span>
                <span style={{ fontSize: '13px' }}>{user.bio}</span>
              </div>
            )}
            <div className="profile-meta-item">
              <span className="icon"></span>
              <span>Tham gia: {new Date(user?.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
        </aside>

        {/* RIGHT: Edit forms */}
        <main className="profile-main">
          <div className="profile-card">
            {/* Tabs */}
            <div className="profile-tabs" style={{ display: 'flex' }}>
              <button className={`profile-tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
                 Thông tin cá nhân
              </button>
              <button className={`profile-tab ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
                 Đổi mật khẩu
              </button>
            </div>

            {/* TAB: Thông tin */}
            {tab === 'info' && (
              <>
                <div className="profile-card-header">
                  <div className="card-header-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div className="card-header-text">
                    <h2>Cập nhật hồ sơ</h2>
                    <p>Chỉnh sửa thông tin cá nhân của bạn</p>
                  </div>
                </div>
                <form onSubmit={handleSaveInfo} noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-name">Họ và tên *</label>
                    <div className="form-input-wrap">
                      <input id="p-name" name="fullName" type="text" className="form-input"
                        placeholder="Họ và tên đầy đủ" value={info.fullName} onChange={handleInfoChange} />
                      <span className="input-icon"></span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="p-uni">Trường đại học</label>
                    <div className="form-input-wrap">
                      <select id="p-uni" name="university" className="form-input" style={{ appearance: 'auto', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontSize: '14.5px' }} value={info.university} onChange={handleInfoChange}>
                        <option value="">-- Chọn trường đại học --</option>
                        {HCM_UNIVERSITIES.map(uni => (
                          <option key={uni} value={uni}>{uni}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {info.university === 'Trường khác...' && (
                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label className="form-label" htmlFor="p-uni-custom">Tên trường đại học khác</label>
                      <div className="form-input-wrap">
                        <input id="p-uni-custom" name="customUniversity" type="text" className="form-input"
                          placeholder="Nhập tên trường đại học của bạn" value={info.customUniversity} onChange={handleInfoChange} />
                        <span className="input-icon">️</span>
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label" htmlFor="p-major">Ngành học</label>
                    <div className="form-input-wrap">
                      <select id="p-major" name="major" className="form-input" style={{ appearance: 'auto', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontSize: '14.5px' }} value={info.major} onChange={handleInfoChange}>
                        <option value="">-- Chọn ngành học --</option>
                        {MAJORS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {info.major === 'Ngành khác...' && (
                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label className="form-label" htmlFor="p-major-custom">Tên ngành học khác</label>
                      <div className="form-input-wrap">
                        <input id="p-major-custom" name="customMajor" type="text" className="form-input"
                          placeholder="Nhập ngành học của bạn" value={info.customMajor} onChange={handleInfoChange} />
                        <span className="input-icon"></span>
                      </div>
                    </div>
                  )}

                  {/* Khu vực hoạt động */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Tỉnh / Thành phố</label>
                      <div className="form-input-wrap">
                        <CustomSelect
                          value={province}
                          onChange={(val) => {
                            setProvince(val);
                            setDistrict('');
                          }}
                          options={Object.keys(VIETNAM_LOCATIONS)}
                          placeholder="-- Chọn Tỉnh/Thành phố --"
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Quận / Huyện</label>
                      <div className="form-input-wrap">
                        <CustomSelect
                          value={district}
                          onChange={(val) => setDistrict(val)}
                          options={province ? VIETNAM_LOCATIONS[province] : []}
                          placeholder="-- Chọn Quận/Huyện --"
                          disabled={!province}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="p-bio">Giới thiệu bản thân</label>
                    <textarea id="p-bio" name="bio" className="form-textarea"
                      placeholder="Viết vài dòng giới thiệu về bạn..."
                      value={info.bio} onChange={handleInfoChange} maxLength={300} />
                    <div className="char-count">{info.bio.length}/300</div>
                  </div>

                  {avatarFile && (
                    <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                      <span></span><span>Đã chọn ảnh: <strong>{avatarFile.name}</strong></span>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" disabled={savingInfo}>
                    {savingInfo ? <span className="spinner" /> : ''}
                    {savingInfo ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </form>
              </>
            )}

            {/* TAB: Đổi mật khẩu */}
            {tab === 'password' && (
              <>
                <div className="profile-card-header">
                  <div className="card-header-icon-wrap card-header-icon-shield">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <div className="card-header-text">
                    <h2>Đổi mật khẩu</h2>
                    <p>Cập nhật mật khẩu để bảo mật tài khoản</p>
                  </div>
                </div>
                <form onSubmit={handleSavePwd} noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-curpwd">Mật khẩu hiện tại</label>
                    <div className="form-input-wrap">
                      <input id="p-curpwd" name="current" type={showPwd ? 'text' : 'password'}
                        className="form-input" placeholder="Nhập mật khẩu hiện tại"
                        value={pwd.current} onChange={handlePwdChange} />
                      <span className="input-icon"></span>
                      <button type="button" className="password-toggle"
                        onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                        {showPwd ? '' : '️'}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-newpwd">Mật khẩu mới</label>
                    <div className="form-input-wrap">
                      <input id="p-newpwd" name="newPass" type={showPwd ? 'text' : 'password'}
                        className="form-input" placeholder="Tối thiểu 6 ký tự"
                        value={pwd.newPass} onChange={handlePwdChange} />
                      <span className="input-icon"></span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-confpwd">Xác nhận mật khẩu mới</label>
                    <div className="form-input-wrap">
                      <input id="p-confpwd" name="confirm" type={showPwd ? 'text' : 'password'}
                        className="form-input" placeholder="Nhập lại mật khẩu mới"
                        value={pwd.confirm} onChange={handlePwdChange} />
                      <span className="input-icon">️</span>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={savingPwd}>
                    {savingPwd ? <span className="spinner" /> : ''}
                    {savingPwd ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                  </button>
                </form>
              </>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  );
}