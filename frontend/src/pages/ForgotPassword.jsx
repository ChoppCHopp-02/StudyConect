// src/pages/ForgotPassword.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../services/authService';
import { supabase } from '../config/supabaseClient';

export default function ForgotPassword() {
  const [mode, setMode] = useState('forgot'); // 'forgot' | 'sent' | 'reset' | 'done'
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [demoToken, setDemoToken] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch token automatically in DEV environment to offer high-end testing UX
  useEffect(() => {
    if (mode === 'sent' && email) {
      const fetchDemoToken = async () => {
        try {
          const { data, error: dbError } = await supabase
            .from('users')
            .select('reset_token')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();
          if (!dbError && data && data.reset_token) {
            setDemoToken(data.reset_token);
          }
        } catch (err) {
          console.warn('[Demo Helper] Cannot fetch token for quick test:', err);
        }
      };
      // Brief delay to allow backend write to finish
      const timer = setTimeout(fetchDemoToken, 800);
      return () => clearTimeout(timer);
    }
  }, [mode, email]);

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword({ email });
      setMessage(res.message);
      setMode('sent');
    } catch (err) {
      setError(err.message || 'Gửi yêu cầu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!token.trim()) {
      setError('Vui lòng nhập mã token khôi phục.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token, password: newPassword });
      setMode('done');
    } catch (err) {
      setError(err.message || 'Đặt lại mật khẩu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    if (demoToken) {
      setToken(demoToken);
      setMode('reset');
    }
  };

  const handleCopyToken = () => {
    if (demoToken) {
      navigator.clipboard.writeText(demoToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Progress Steps Bar Renderer
  const renderSteps = (currentStep) => {
    const steps = [
      { title: 'Email', modeKey: 'forgot' },
      { title: 'Xác minh', modeKey: 'sent' },
      { title: 'Mật khẩu', modeKey: 'reset' }
    ];
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', padding: '0 8px', position: 'relative' }}>
        {/* Progress Line */}
        <div style={{ position: 'absolute', top: '15px', left: '32px', right: '32px', height: '2px', background: 'rgba(255,255,255,0.06)', zIndex: 0 }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(to right, var(--primary-light), var(--secondary))',
            width: currentStep === 'forgot' ? '0%' : currentStep === 'sent' ? '50%' : '100%',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
        
        {steps.map((s, idx) => {
          const isCompleted = (currentStep === 'sent' && idx < 1) || (currentStep === 'reset' && idx < 2) || currentStep === 'done';
          const isActive = (currentStep === 'forgot' && idx === 0) || (currentStep === 'sent' && idx === 1) || (currentStep === 'reset' && idx === 2);
          
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, gap: '6px' }}>
              <div style={{
                width: '32px', height: '32px',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCompleted || isActive ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(20,20,35,0.8)',
                border: isActive ? '2.5px solid rgba(255,255,255,0.8)' : isCompleted ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: isCompleted || isActive ? '#fff' : 'var(--text-muted)',
                fontSize: '12px', fontWeight: 800,
                boxShadow: isActive ? '0 0 16px rgba(108, 99, 255, 0.45)' : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : idx + 1}
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'all 0.3s'
              }}>
                {s.title}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="auth-page">
      {/* Dynamic Background blobs */}
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(108,99,255,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(255,122,0,0.04) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div className="auth-card" style={{ animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)', backdropFilter: 'blur(20px)' }}>
        {/* Brand Header */}
        <div className="auth-logo">
          <div className="auth-logo-icon">📚</div>
          <div className="auth-logo-text">
            <h2>Studyconect</h2>
            <span>Học nhóm hiệu quả hơn</span>
          </div>
        </div>

        {/* Step progress (hide in done state) */}
        {mode !== 'done' && renderSteps(mode)}

        {/* Global Error message */}
        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', animation: 'shake 0.3s ease' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" x2="12" y1="8" y2="12"/>
              <line x1="12" x2="12.01" y1="16" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Email Form */}
        {mode === 'forgot' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="auth-header" style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Quên mật khẩu?</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.5 }}>Nhập email liên kết với tài khoản của bạn. Chúng tôi sẽ gửi hướng dẫn khôi phục mật khẩu.</p>
            </div>

            <form onSubmit={handleForgot} noValidate>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" htmlFor="forgot-email" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Email tài khoản</label>
                <div className="form-input-wrap" style={{ position: 'relative' }}>
                  <span className="input-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', transition: 'color 0.2s' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    className="form-input"
                    placeholder="example@email.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', border: 'none', color: '#white', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(108,99,255,0.25)', transition: 'all 0.25s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(108,99,255,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(108,99,255,0.25)'; }}
              >
                {loading ? <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : null}
                {loading ? 'Đang xử lý...' : 'Gửi mã khôi phục'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Instructions Sent & Helper */}
        {mode === 'sent' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="auth-header" style={{ marginBottom: '20px' }}>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Xác thực email
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.5 }}>
                Mã xác thực đã được gửi thành công tới email: <br />
                <strong style={{ color: 'var(--primary-light)', fontWeight: 700 }}>{email}</strong>
              </p>
            </div>

            {message && (
              <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--success)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>{message}</span>
              </div>
            )}

            {/* Smart Demo Glass Card Helper */}
            {demoToken ? (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', borderRadius: '14px', padding: '16px', marginBottom: '24px', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  <span>🔧 Chế độ thử nghiệm</span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                  Hệ thống phát hiện reset token trong DB của bạn. Bạn có thể sử dụng token này để kiểm thử nhanh.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px' }}>
                  <code style={{ fontSize: '13px', color: 'var(--primary-light)', fontFamily: 'monospace', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {demoToken}
                  </code>
                  <button
                    onClick={handleCopyToken}
                    style={{ background: 'none', border: 'none', color: copied ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s' }}
                    title="Sao chép token"
                  >
                    {copied ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Đã chép
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                        </svg>
                        Sao chép
                      </>
                    )}
                  </button>
                </div>
                <button
                  onClick={handleQuickFill}
                  style={{ width: '100%', padding: '10px', background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: '10px', color: 'var(--primary-light)', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(108,99,255,0.12)'}
                >
                  Tự động điền &amp; Đổi mật khẩu
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" x2="19" y1="12" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', marginBottom: '24px', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                ℹ️ Mở <strong>DevTools Console (F12)</strong> để xem reset token được in ra ở chế độ phát triển để tiếp tục.
              </div>
            )}

            <div className="form-actions" style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMode('forgot')}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" x2="5" y1="12" y2="12"/>
                  <polyline points="12 19 5 12 12 5"/>
                </svg>
                Quay lại
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setMode('reset')}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', border: 'none', color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(108,99,255,0.2)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(108,99,255,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(108,99,255,0.2)'; }}
              >
                Nhập token
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" x2="19" y1="12" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Reset Password Form */}
        {mode === 'reset' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="auth-header" style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Đặt mật khẩu mới</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.5 }}>Nhập mã token bảo mật và mật khẩu mới cho tài khoản của bạn.</p>
            </div>

            <form onSubmit={handleReset} noValidate>
              {/* Token Input */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="reset-token" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Mã token khôi phục</label>
                <div className="form-input-wrap" style={{ position: 'relative' }}>
                  <span className="input-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', transition: 'color 0.2s' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 1.5 1.5M15.5 7.5 14 6"/>
                    </svg>
                  </span>
                  <input
                    id="reset-token"
                    type="text"
                    className="form-input"
                    placeholder="Dán token nhận được"
                    value={token}
                    onChange={e => { setToken(e.target.value); setError(''); }}
                    style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="new-pass" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Mật khẩu mới</label>
                <div className="form-input-wrap" style={{ position: 'relative' }}>
                  <span className="input-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="new-pass"
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Mật khẩu từ 6 ký tự"
                    value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); setError(''); }}
                    style={{ width: '100%', padding: '12px 42px 12px 42px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    {showPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                        <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                        <line x1="2" x2="22" y1="2" y2="22"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" htmlFor="confirm-new-pass" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Xác nhận mật khẩu mới</label>
                <div className="form-input-wrap" style={{ position: 'relative' }}>
                  <span className="input-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="confirm-new-pass"
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <div className="form-actions" style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMode('sent')}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" x2="5" y1="12" y2="12"/>
                    <polyline points="12 19 5 12 12 5"/>
                  </svg>
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', border: 'none', color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(108,99,255,0.2)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(108,99,255,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(108,99,255,0.2)'; }}
                >
                  {loading ? <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : null}
                  {loading ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: Reset Success */}
        {mode === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0', animation: 'scaleUpCheck 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <div className="success-checkmark" style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)', filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.3))' }}>
                <circle cx="12" cy="12" r="10" fill="rgba(16,185,129,0.1)"/>
                <polyline points="7.5 12 10.5 15 16.5 9" />
              </svg>
            </div>
            
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>Thành công!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.5 }}>Mật khẩu tài khoản của bạn đã được đặt lại thành công. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.</p>
            
            <Link
              to="/login"
              className="btn btn-primary"
              style={{ textDecoration: 'none', width: '100%', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14.5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(108,99,255,0.25)', transition: 'all 0.25s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(108,99,255,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(108,99,255,0.25)'; }}
            >
              Đăng nhập ngay
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" x2="19" y1="12" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>
        )}

        {/* Card Footer Link (Back to Login) */}
        {mode !== 'done' && (
          <div className="auth-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '24px', paddingTop: '18px', textAlign: 'center' }}>
            <Link
              to="/login"
              className="auth-link"
              style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-light)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" x2="5" y1="12" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Quay lại đăng nhập
            </Link>
          </div>
        )}
      </div>

      {/* Embedded CSS animations directly inside a style tag for optimal portability and consistency */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleUpCheck {
          0% { transform: scale(0.85); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .form-input:focus ~ .input-icon {
          color: var(--primary-light) !important;
        }
      `}</style>
    </div>
  );
}