// src/pages/ForgotPassword.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../services/authService';

export default function ForgotPassword() {
  const [mode, setMode] = useState('forgot');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setError('Vui lòng nhập email hợp lệ.'); return; }
    setLoading(true);
    try {
      const res = await forgotPassword({ email });
      setMessage(res.message);
      setMode('sent');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!token.trim()) { setError('Vui lòng nhập token.'); return; }
    if (!newPassword || newPassword.length < 6) { setError('Mật khẩu phải ít nhất 6 ký tự.'); return; }
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp.'); return; }
    setLoading(true);
    try {
      await resetPassword({ token, password: newPassword });
      setMode('done');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"></div>
          <div className="auth-logo-text"><h2>Studyconect</h2><span>Học nhóm hiệu quả hơn</span></div>
        </div>

        {/* BƯỚC 1 - Nhập email */}
        {mode === 'forgot' && (
          <>
            <div className="auth-header">
              <h1>Quên mật khẩu? </h1>
              <p>Nhập email để nhận hướng dẫn đặt lại mật khẩu</p>
            </div>
            {error && <div className="alert alert-error"><span>️</span><span>{error}</span></div>}
            <form onSubmit={handleForgot} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">Email tài khoản</label>
                <div className="form-input-wrap">
                  <input id="forgot-email" type="email" className="form-input"
                    placeholder="Nhập email của bạn"
                    value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />
                  <span className="input-icon">️</span>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : ''}
                {loading ? 'Đang gửi...' : 'Gửi hướng dẫn'}
              </button>
            </form>
          </>
        )}

        {/* BƯỚC 2 - Đã gửi */}
        {mode === 'sent' && (
          <>
            <div className="auth-header">
              <h1>Kiểm tra email </h1>
              <p>Đã gửi tới <strong style={{ color: 'var(--primary-light)' }}>{email}</strong></p>
            </div>
            <div className="alert alert-success"><span></span><span>{message}</span></div>
            <div style={{ background:'rgba(108,99,255,0.08)', border:'1px dashed var(--border)', borderRadius:'var(--radius-sm)', padding:'16px', marginBottom:'20px', fontSize:'13px', color:'var(--text-secondary)' }}>
              <p> <strong style={{ color:'var(--primary-light)' }}>Demo:</strong> Mở DevTools Console (F12) để xem reset token, sau đó nhấn "Nhập token".</p>
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setMode('forgot')}>← Quay lại</button>
              <button className="btn btn-primary" onClick={() => setMode('reset')}>Nhập token →</button>
            </div>
          </>
        )}

        {/* BƯỚC 3 - Đặt lại mật khẩu */}
        {mode === 'reset' && (
          <>
            <div className="auth-header">
              <h1>Đặt mật khẩu mới </h1>
              <p>Nhập token từ console và mật khẩu mới</p>
            </div>
            {error && <div className="alert alert-error"><span>️</span><span>{error}</span></div>}
            <form onSubmit={handleReset} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-token">Token xác nhận</label>
                <div className="form-input-wrap">
                  <input id="reset-token" type="text" className="form-input" placeholder="Dán token từ console"
                    value={token} onChange={e => { setToken(e.target.value); setError(''); }} />
                  <span className="input-icon"></span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-pass">Mật khẩu mới</label>
                <div className="form-input-wrap">
                  <input id="new-pass" type={showPass ? 'text' : 'password'} className="form-input"
                    placeholder="Tối thiểu 6 ký tự" value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError(''); }} />
                  <span className="input-icon"></span>
                  <button type="button" className="password-toggle" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                    {showPass ? '' : '️'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-new-pass">Xác nhận mật khẩu</label>
                <div className="form-input-wrap">
                  <input id="confirm-new-pass" type={showPass ? 'text' : 'password'} className="form-input"
                    placeholder="Nhập lại mật khẩu mới" value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }} />
                  <span className="input-icon"></span>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setMode('sent')}>← Quay lại</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <span className="spinner" /> : ''}
                  {loading ? 'Đang đặt lại...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* BƯỚC 4 - Thành công */}
        {mode === 'done' && (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:'64px', marginBottom:'16px', lineHeight:1 }}></div>
            <h1 style={{ fontSize:'24px', fontWeight:800, marginBottom:'8px' }}>Thành công!</h1>
            <p style={{ color:'var(--text-secondary)', marginBottom:'28px' }}>Mật khẩu đã được đặt lại thành công.</p>
            <Link to="/login" className="btn btn-primary" style={{ textDecoration:'none', display:'inline-flex' }}>
               Đăng nhập ngay
            </Link>
          </div>
        )}

        {mode !== 'done' && (
          <div className="auth-footer">
            <Link to="/login" className="auth-link">← Quay lại đăng nhập</Link>
          </div>
        )}
      </div>
    </div>
  );
}