// src/pages/Register.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { HCM_UNIVERSITIES, MAJORS } from '../constants/educationData';
import { VIETNAM_LOCATIONS } from '../constants/locationData';

/* ─── CustomSelect (giống Profile) ────────────────────── */
function CustomSelect({ value, onChange, options, placeholder = 'Chọn...', disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 1000 : 1 }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '14.5px', cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none', opacity: disabled ? 0.6 : 1,
          height: '46px', boxSizing: 'border-box', transition: 'all 0.2s',
        }}
      >
        <span>{value || placeholder}</span>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </div>
      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: '#1a1a2e', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          maxHeight: '260px', overflowY: 'auto', overscrollBehavior: 'contain', zIndex: 9999,
          scrollbarWidth: 'thin', scrollbarColor: 'var(--primary) transparent',
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setIsOpen(false); }}
              style={{
                padding: '10px 16px', fontSize: '14px',
                color: opt === value ? 'var(--primary-light)' : 'var(--text-primary)',
                background: opt === value ? 'rgba(108,99,255,0.12)' : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background = 'transparent'; }}
            >{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    university: '', major: '', customUniversity: '', customMajor: '',
  });
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      setError('Họ tên phải có ít nhất 2 ký tự.'); return false;
    }
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) {
      setError('Email không hợp lệ.'); return false;
    }
    if (!form.password || form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.'); return false;
    }
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.'); return false;
    }
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep1()) { setError(''); setStep(2); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Encode location vào bio theo cùng format Profile dùng → Friend "Lân cận" đọc được
      const bio = (province && district)
        ? `[📍 ${province}, ${district}]`
        : '';

      const payload = {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        university: form.university === 'Trường khác...' ? form.customUniversity : form.university,
        major: form.major === 'Ngành khác...' ? form.customMajor : form.major,
        bio,
      };
      const { user } = await register(payload);
      setUser(user);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">📚</div>
          <div className="auth-logo-text">
            <h2>Studyconect</h2>
            <span>Học nhóm hiệu quả hơn</span>
          </div>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h1>Tạo tài khoản mới </h1>
          <p>
            {step === 1 ? 'Bước 1/2 – Thông tin đăng nhập' : 'Bước 2/2 – Học tập & Khu vực (tuỳ chọn)'}
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: '4px', borderRadius: '4px',
              background: s <= step ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'var(--bg-input)',
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>

        {error && (
          <div className="alert alert-error">
            <span>️</span><span>{error}</span>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleNext} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Họ và tên</label>
              <div className="form-input-wrap">
                <input id="reg-name" name="fullName" type="text" className="form-input"
                  placeholder="Họ và tên đầy đủ của bạn" value={form.fullName} onChange={handleChange} />
                <span className="input-icon"></span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email</label>
              <div className="form-input-wrap">
                <input id="reg-email" name="email" type="email" className="form-input"
                  placeholder="Email dùng để đăng nhập" value={form.email} onChange={handleChange} />
                <span className="input-icon">️</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-pass">Mật khẩu</label>
                <div className="form-input-wrap">
                  <input id="reg-pass" name="password" type={showPass ? 'text' : 'password'}
                    className="form-input" placeholder="Tối thiểu 6 ký tự"
                    value={form.password} onChange={handleChange} />
                  <span className="input-icon"></span>
                  <button type="button" className="password-toggle"
                    onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                    {showPass ? '' : '️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-confirm">Xác nhận</label>
                <div className="form-input-wrap">
                  <input id="reg-confirm" name="confirmPassword" type={showConfirm ? 'text' : 'password'}
                    className="form-input" placeholder="Nhập lại mật khẩu"
                    value={form.confirmPassword} onChange={handleChange} />
                  <span className="input-icon"></span>
                  <button type="button" className="password-toggle"
                    onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                    {showConfirm ? '' : '️'}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Tiếp theo
            </button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-uni">Trường đại học</label>
              <div className="form-input-wrap">
                <select id="reg-uni" name="university" className="form-input" style={{ appearance: 'auto', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontSize: '14.5px' }} value={form.university} onChange={handleChange}>
                  <option value="">-- Chọn trường đại học --</option>
                  {HCM_UNIVERSITIES.map(uni => (
                    <option key={uni} value={uni}>{uni}</option>
                  ))}
                </select>
              </div>
            </div>

            {form.university === 'Trường khác...' && (
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label" htmlFor="reg-uni-custom">Tên trường đại học khác</label>
                <div className="form-input-wrap">
                  <input id="reg-uni-custom" name="customUniversity" type="text" className="form-input"
                    placeholder="Nhập tên trường đại học của bạn" value={form.customUniversity} onChange={handleChange} />
                  <span className="input-icon">️</span>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label" htmlFor="reg-major">Ngành học</label>
              <div className="form-input-wrap">
                <select id="reg-major" name="major" className="form-input" style={{ appearance: 'auto', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontSize: '14.5px' }} value={form.major} onChange={handleChange}>
                  <option value="">-- Chọn ngành học --</option>
                  {MAJORS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {form.major === 'Ngành khác...' && (
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label" htmlFor="reg-major-custom">Tên ngành học khác</label>
                <div className="form-input-wrap">
                  <input id="reg-major-custom" name="customMajor" type="text" className="form-input"
                    placeholder="Nhập ngành học của bạn" value={form.customMajor} onChange={handleChange} />
                  <span className="input-icon"></span>
                </div>
              </div>
            )}

            {/* ─── Khu vực sinh sống ─── */}
            <div style={{ marginTop: '20px', marginBottom: '4px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                📍 Khu vực sinh sống
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>TỈNH / THÀNH PHỐ</div>
                <CustomSelect
                  value={province}
                  onChange={(val) => { setProvince(val); setDistrict(''); }}
                  options={Object.keys(VIETNAM_LOCATIONS)}
                  placeholder="-- Chọn Tỉnh/Thành phố --"
                />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>QUẬN / HUYỆN</div>
                <CustomSelect
                  value={district}
                  onChange={(val) => setDistrict(val)}
                  options={province ? VIETNAM_LOCATIONS[province] : []}
                  placeholder="-- Chọn Quận/Huyện --"
                  disabled={!province}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                Quay lại
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Đang tạo...' : 'Hoàn tất đăng ký'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          Đã có tài khoản?{' '}
          <Link to="/login" className="auth-link">Đăng nhập ngay</Link>
        </div>
      </div>
    </div>
  );
}