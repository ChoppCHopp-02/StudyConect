import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { updateProfile, changePassword } from '../services/authService';
import { HCM_UNIVERSITIES, MAJORS } from '../constants/educationData';
import { VIETNAM_LOCATIONS } from '../constants/locationData';


function CustomSelect({ value, onChange, options, placeholder = "Chọn...", disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

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
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            maxHeight: '300px',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            zIndex: 9999,
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--primary) transparent'
          }}
        >
          {/* Ô tìm kiếm nhanh */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '13.5px', textAlign: 'center' }}>
              Không tìm thấy kết quả
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  color: opt === value ? 'var(--primary)' : 'var(--text-primary)',
                  background: opt === value ? 'rgba(35, 97, 95, 0.12)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left'
                }}
                onMouseEnter={e => {
                  if (opt !== value) e.currentTarget.style.background = 'var(--bg-input)';
                }}
                onMouseLeave={e => {
                  if (opt !== value) e.currentTarget.style.background = 'transparent';
                }}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { addToast } = useToast();
  const fileRef = useRef();

  const [tab, setTab] = useState('info'); // 'info' | 'password'

  // Helper to parse location tag and privacy options from bio string
  const parseBioLocation = (bioString) => {
    let province = '';
    let district = '';
    let hideLocation = false;
    let hideJoinDate = false;
    let bioText = bioString || '';

    // 1. Extract location [📍 ...]
    if (bioText.startsWith('[📍 ')) {
      const endIdx = bioText.indexOf(']');
      if (endIdx > 0) {
        const locPart = bioText.substring(4, endIdx);
        bioText = bioText.substring(endIdx + 1).trim();
        const parts = locPart.split(', ');
        province = parts[0] || '';
        district = parts[1] || '';
      }
    }

    // 2. Extract visibility tags: [hide_loc:1] and [hide_join:1]
    if (bioText.includes('[hide_loc:1]')) {
      hideLocation = true;
      bioText = bioText.replace('[hide_loc:1]', '').trim();
    }
    if (bioText.includes('[hide_join:1]')) {
      hideJoinDate = true;
      bioText = bioText.replace('[hide_join:1]', '').trim();
    }

    return { province, district, hideLocation, hideJoinDate, bioText };
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
  const [hideLocation, setHideLocation] = useState(parsed.hideLocation);
  const [hideJoinDate, setHideJoinDate] = useState(parsed.hideJoinDate);

  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [savingInfo, setSavingInfo] = useState(false);

  // Đồng bộ cài đặt ẩn khi profile tải lại
  useEffect(() => {
    const freshParsed = parseBioLocation(user?.bio);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHideLocation(freshParsed.hideLocation);
    setHideJoinDate(freshParsed.hideJoinDate);
  }, [user?.bio]);

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
      let formattedBio = '';
      if (province && district) {
        formattedBio += `[📍 ${province}, ${district}]`;
      }
      if (hideLocation) {
        formattedBio += `[hide_loc:1]`;
      }
      if (hideJoinDate) {
        formattedBio += `[hide_join:1]`;
      }
      formattedBio += ` ${info.bio.trim()}`;
      formattedBio = formattedBio.trim();

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
      setTimeout(() => {
        navigate('/');
      }, 500);
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
    <>

      {/* Content */}
      <div className="profile-container">
        {/* LEFT: Sidebar */}
        <aside className="profile-sidebar">
          <div className="avatar-wrap">
            {avatarPreview
              ? <img src={avatarPreview} className="avatar-img" alt="avatar" />
              : <div className="avatar-placeholder">{initials}</div>}
            <button className="avatar-edit-btn" onClick={() => fileRef.current?.click()} title="Đổi ảnh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
          <button 
            type="button" 
            onClick={() => fileRef.current?.click()} 
            style={{ 
              background: 'var(--bg-input)', 
              border: '1.5px solid var(--border)', 
              borderRadius: '12px',
              color: 'var(--text-primary)', 
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
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-input)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Thay đổi ảnh đại diện
          </button>
          <div className="profile-name">{user?.fullName}</div>
          <div className="profile-email">{user?.email}</div>
          <div className="profile-badge"> Sinh viên</div>
 
          <div className="profile-meta">
            {user?.university && (
              <div className="profile-meta-item">
                <span className="icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                  </svg>
                </span>
                <span>{user.university}</span>
              </div>
            )}
            {user?.major && (
              <div className="profile-meta-item">
                <span className="icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10" />
                    <path d="M6 10h10" />
                  </svg>
                </span>
                <span>{user.major}</span>
              </div>
            )}
            {parsed.province && parsed.district && (
              <div className="profile-meta-item">
                <span className="icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                <span>
                  {parsed.province}, {parsed.district}
                  {parsed.hideLocation && <span style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginLeft: '6px' }}>(Đã ẩn)</span>}
                </span>
              </div>
            )}
            {parsed.bioText && (
              <div className="profile-meta-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>Giới thiệu</span>
                <span style={{ fontSize: '13px' }}>{parsed.bioText}</span>
              </div>
            )}
            <div className="profile-meta-item">
              <span className="icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <span>
                Tham gia: {new Date(user?.createdAt).toLocaleDateString('vi-VN')}
                {parsed.hideJoinDate && <span style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginLeft: '6px' }}>(Đã ẩn)</span>}
              </span>
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
                      <input id="p-name" name="fullName" type="text" className="form-input no-icon"
                        placeholder="Họ và tên đầy đủ" value={info.fullName} onChange={handleInfoChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Trường đại học</label>
                    <CustomSelect
                      value={info.university}
                      onChange={(val) => setInfo(prev => ({ ...prev, university: val }))}
                      options={HCM_UNIVERSITIES}
                      placeholder="-- Chọn trường đại học --"
                    />
                  </div>

                  {info.university === 'Trường khác...' && (
                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label className="form-label" htmlFor="p-uni-custom">Tên trường đại học khác</label>
                      <div className="form-input-wrap">
                        <input id="p-uni-custom" name="customUniversity" type="text" className="form-input no-icon"
                          placeholder="Nhập tên trường đại học của bạn" value={info.customUniversity} onChange={handleInfoChange} />
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label">Ngành học</label>
                    <CustomSelect
                      value={info.major}
                      onChange={(val) => setInfo(prev => ({ ...prev, major: val }))}
                      options={MAJORS}
                      placeholder="-- Chọn ngành học --"
                    />
                  </div>

                  {info.major === 'Ngành khác...' && (
                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label className="form-label" htmlFor="p-major-custom">Tên ngành học khác</label>
                      <div className="form-input-wrap">
                        <input id="p-major-custom" name="customMajor" type="text" className="form-input no-icon"
                          placeholder="Nhập ngành học của bạn" value={info.customMajor} onChange={handleInfoChange} />
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

                  {/* Thiết lập quyền riêng tư */}
                  <div className="form-group" style={{ marginTop: '20px', marginBottom: '20px' }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Thiết lập quyền riêng tư
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px', color: 'var(--text-primary)', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={hideLocation}
                          onChange={(e) => setHideLocation(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <span>Ẩn khu vực sinh sống</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px', color: 'var(--text-primary)', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={hideJoinDate}
                          onChange={(e) => setHideJoinDate(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <span>Ẩn ngày tham gia</span>
                      </label>
                    </div>
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
                        value={pwd.current} onChange={handlePwdChange} style={{ paddingLeft: '42px' }} />
                      <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                      <button type="button" className="password-toggle"
                        onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {showPwd ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-newpwd">Mật khẩu mới</label>
                    <div className="form-input-wrap">
                      <input id="p-newpwd" name="newPass" type={showPwd ? 'text' : 'password'}
                        className="form-input" placeholder="Tối thiểu 6 ký tự"
                        value={pwd.newPass} onChange={handlePwdChange} style={{ paddingLeft: '42px' }} />
                      <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-confpwd">Xác nhận mật khẩu mới</label>
                    <div className="form-input-wrap">
                      <input id="p-confpwd" name="confirm" type={showPwd ? 'text' : 'password'}
                        className="form-input" placeholder="Nhập lại mật khẩu mới"
                        value={pwd.confirm} onChange={handlePwdChange} style={{ paddingLeft: '42px' }} />
                      <span className="input-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
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
    </>
  );
}