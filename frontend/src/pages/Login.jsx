// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    setLoading(true);
    try {
      const { user } = await login(form);
      if (user.role === 'admin') {
        setError('Tài khoản Quản trị viên không được phép đăng nhập tại trang dành cho học sinh. Vui lòng truy cập trang /admin.');
        return;
      }
      setUser(user);
      navigate('/');
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
          <h1>Chào mừng trở lại! </h1>
          <p>Đăng nhập để tiếp tục học tập cùng nhóm</p>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error">
            <span>️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <div className="form-input-wrap">
              <input
                id="login-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="Nhập email của bạn"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
              <span className="input-icon">️</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Mật khẩu</label>
            <div className="form-input-wrap">
              <input
                id="login-password"
                name="password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Nhập mật khẩu"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
              <span className="input-icon"></span>
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
              >
                {showPass ? '' : '️'}
              </button>
            </div>
            <Link to="/forgot-password" className="forgot-link">Quên mật khẩu?</Link>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

        </form>

        <div className="auth-footer">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="auth-link">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}