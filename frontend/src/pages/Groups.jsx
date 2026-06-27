import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getAllGroups, createGroup, joinGroup, leaveGroup, deleteGroup, transferAdminAndLeave, getMyJoinRequestStatus, getSubjectsByMajor, saveSubjectForMajor } from '../services/groupService';
import { getFriends } from '../services/friendService';
import { sendGroupInvite, getGroupInvitesSent } from '../services/groupInviteService';
import ConfirmModal from '../components/ConfirmModal';
import { supabase } from '../config/supabaseClient';
import { formatBytes } from '../utils';

import { geocodeAddress, staticMapUrl, googleMapsSearchUrl } from '../utils/geocoding';

const SIDEBAR_ITEMS = [
  { label: 'Chat', to: '/chat' },
  { label: 'Kết bạn', to: '/friends' },
  { label: 'Tài liệu của tôi', to: '/my-documents' },
];

// ── CREATE GROUP MODAL (2-Step) ────────────────────────────────────────────
function CreateGroupModal({ formData, setFormData, meetingMode, setMeetingMode, isPrivate, setIsPrivate, isSubmitting, onClose, onSubmit, selectedLocation, setSelectedLocation, userMajor }) {
  const [step, setStep] = useState(1); // 1 = pick mode, 2 = fill form
  const [geoLoading, setGeoLoading] = useState(false);
  const [customName, setCustomName] = useState('');
  const [dbSubjects, setDbSubjects] = useState([]);
  const [subjectMode, setSubjectMode] = useState('select'); // 'select' | 'custom'
  const [customSubject, setCustomSubject] = useState('');

  // Load môn học theo ngành khi step 2 mở ra
  useEffect(() => {
    if (step !== 2 || !userMajor) return;
    let cancelled = false;
    getSubjectsByMajor(userMajor).then(subjects => {
      if (!cancelled) setDbSubjects(subjects);
    });
    return () => { cancelled = true; };
  }, [step, userMajor]);

  const handleCustomLocationChange = (name) => {
    setCustomName(name);
    setSelectedLocation({
      name,
      address: name,
      lat: null,
      lng: null
    });
  };

  useEffect(() => {
    if (meetingMode !== 'offline' || !customName || customName.trim().length <= 5) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGeoLoading(true);
    const timer = setTimeout(async () => {
      const geo = await geocodeAddress(customName);
      if (geo) {
        const parts = customName.split(',').map(p => p.trim());
        const province = parts[parts.length - 1] || 'Hà Nội';
        const district = parts[parts.length - 2] || '';
        const ward = parts[parts.length - 3] || '';
        setSelectedLocation(prev => ({
          ...prev,
          province,
          district,
          ward,
          lat: geo.lat,
          lng: geo.lng,
          formattedAddress: geo.formattedAddress
        }));
      }
      setGeoLoading(false);
    }, 1200);

    return () => {
      clearTimeout(timer);
      setGeoLoading(false);
    };
  }, [customName, meetingMode, setSelectedLocation]);

  const handleModeSelect = (mode) => {
    setMeetingMode(mode);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: '80px 16px 32px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', width: '100%', maxWidth: step === 1 ? '480px' : '440px', maxHeight: 'calc(100vh - 120px)', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'max-width 0.3s ease' }}>

        {/* Header */}
        <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {step === 2 && (
              <button onClick={handleBack} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, flexShrink: 0, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >←</button>
            )}
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {step === 1 ? (
                  'Tạo Nhóm Học Mới'
                ) : meetingMode === 'online' ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Nhóm Học Online
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Nhóm Học Offline
                  </>
                )}
              </h3>
              <p style={{ margin: '1px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                {step === 1 ? 'Chọn hình thức học của nhóm bạn' : 'Điền thông tin chi tiết cho nhóm học'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: '3px 5px', borderRadius: 6, lineHeight: 1, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
          >✕</button>
        </div>



        {/* STEP 1: Pick mode */}
        {step === 1 && (
          <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Online Card */}
            <button onClick={() => handleModeSelect('online')} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26, 26, 26, 0.05)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>Học Online</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>Không cần ra ngoài — học mọi lúc mọi nơi, kết nối và cộng tác cùng nhóm dù ở bất kỳ đâu.</div>
              </div>
            </button>

            {/* Offline Card */}
            <button onClick={() => handleModeSelect('offline')} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26, 26, 26, 0.05)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>Học Offline</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>Gặp gỡ trực tiếp, trao đổi dễ hơn — chọn địa điểm phù hợp để cả nhóm cùng học chung.</div>
              </div>
            </button>
          </div>
        )}

        {/* STEP 2: Fill form */}
        {step === 2 && (
          <>
            {/* Mode badge */}
            <div style={{ padding: '8px 18px 0' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: meetingMode === 'online' ? 'rgba(0,0,0,0.06)' : 'rgba(16,185,129,0.12)', color: meetingMode === 'online' ? 'var(--text-primary)' : '#10b981', border: `1px solid ${meetingMode === 'online' ? 'var(--border)' : 'rgba(16,185,129,0.3)'}` }}>
                {meetingMode === 'online' ? (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Học Online
                  </>
                ) : (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Học Offline
                  </>
                )}
              </span>
            </div>

            <div className="no-scrollbar" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
              {/* Tên nhóm */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tên nhóm *</label>
                <div className="form-input-wrap">
                  <input className="form-input" style={{ padding: '9px 13px', fontSize: 13 }} placeholder={meetingMode === 'online' ? 'Nhập tên nhóm của bạn ' : 'Nhập tên nhóm học của bạn'} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
              </div>

              {/* Môn học */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Môn học *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <select
                    className="form-input"
                    style={{ padding: '9px 13px', fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', appearance: 'auto' }}
                    value={subjectMode === 'custom' ? 'custom' : (formData.subject || '')}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setSubjectMode('custom');
                        setFormData({ ...formData, subject: customSubject });
                      } else {
                        setSubjectMode('select');
                        setFormData({ ...formData, subject: val });
                      }
                    }}
                    required={subjectMode !== 'custom'}
                  >
                    <option value="">-- Chọn môn học --</option>
                    {dbSubjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    {!userMajor && (
                      <option value="Chung">Chung</option>
                    )}
                    <option value="custom">Môn học khác...</option>
                  </select>
                  {subjectMode === 'custom' && (
                    <input
                      className="form-input"
                      style={{ padding: '9px 13px', fontSize: 13, borderColor: 'var(--primary-light)', boxShadow: '0 0 0 2px rgba(0,0,0,0.08)' }}
                      placeholder="Nhập tên môn học mới..."
                      value={customSubject}
                      onChange={e => {
                        setCustomSubject(e.target.value);
                        setFormData({ ...formData, subject: e.target.value });
                      }}
                      required
                    />
                  )}
                </div>
              </div>

              {/* Mô tả - Chỉ hiển thị khi tạo nhóm công khai */}
              {!isPrivate && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Mô tả nhóm</label>
                  <textarea className="form-textarea" placeholder="Mô tả ngắn gọn về nhóm để thành viên hiểu mục tiêu học" style={{ height: '72px', resize: 'none', padding: '9px 13px', fontSize: 13 }} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
              )}

              {/* Location Picker for Offline mode */}
              {meetingMode === 'offline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Tên địa điểm học tập *</label>
                    <div className="form-input-wrap">
                      <input
                        className="form-input"
                        style={{ padding: '9px 13px', fontSize: 13 }}
                        placeholder="Nhập tên quán cà phê, thư viện..."
                        value={customName}
                        onChange={e => handleCustomLocationChange(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Map preview */}
                  {geoLoading && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Đang tìm địa điểm...
                    </div>
                  )}
                  {!geoLoading && selectedLocation && customName.trim() && (
                    <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                      {selectedLocation.lat && selectedLocation.lng && (
                        <img
                          src={staticMapUrl({ lat: selectedLocation.lat, lng: selectedLocation.lng })}
                          alt="Bản đồ địa điểm"
                          style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                            📍 {selectedLocation.name}
                          </div>
                          {selectedLocation.formattedAddress && selectedLocation.formattedAddress !== selectedLocation.name && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{selectedLocation.formattedAddress}</div>
                          )}
                        </div>
                        <a
                          href={googleMapsSearchUrl(selectedLocation.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#10b981,#059669)', padding: '6px 12px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(16,185,129,0.35)' }}
                        >
                          Mở Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Số lượng thành viên tối đa */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Số lượng thành viên tối đa</label>
                <div className="form-input-wrap">
                  <select
                    className="form-input"
                    style={{ padding: '9px 13px', fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', width: '100%', cursor: 'pointer' }}
                    value={formData.maxMembers || 10}
                    onChange={e => setFormData({ ...formData, maxMembers: parseInt(e.target.value, 10) })}
                  >
                    <option value={5}>5 thành viên</option>
                    <option value={10}>10 thành viên</option>
                    <option value={15}>15 thành viên</option>
                    <option value={20}>20 thành viên</option>
                    <option value={30}>30 thành viên</option>
                    <option value={50}>50 thành viên</option>
                    <option value={100}>100 thành viên</option>
                  </select>
                </div>
              </div>

              {/* Toggle Riêng tư / Công khai */}
              <div style={{ borderRadius: 10, border: `1.5px solid ${isPrivate ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}`, background: isPrivate ? 'rgba(239,68,68,0.04)' : 'rgba(16,185,129,0.04)', padding: '12px 16px', transition: 'all 0.25s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 14 }}>{isPrivate ? '🔒' : '🌐'}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isPrivate ? '#ef4444' : '#10b981' }}>
                        {isPrivate ? 'Nhóm Riêng tư' : 'Nhóm Công khai'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {isPrivate
                        ? 'Thành viên mới cần gửi yêu cầu và được trưởng nhóm duyệt mới vào được.'
                        : 'Bất kỳ ai cũng có thể tham gia nhóm ngay mà không cần chờ duyệt.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(p => {
                      const next = !p;
                      if (next) {
                        setFormData(prev => ({ ...prev, description: '' }));
                      }
                      return next;
                    })}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
                      background: isPrivate ? '#ef4444' : '#10b981',
                      position: 'relative', transition: 'background 0.25s', padding: 0,
                    }}
                    title={isPrivate ? 'Đang bật: Riêng tư — nhấn để chuyển sang Công khai' : 'Đang tắt: Công khai — nhấn để chuyển sang Riêng tư'}
                  >
                    <span style={{
                      position: 'absolute', top: 3, left: isPrivate ? 23 : 3,
                      width: 18, height: 18, borderRadius: '50%', background: 'white',
                      transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: 13 }} onClick={onClose}>Hủy</button>
              <button type="button" className="btn btn-primary" style={{ flex: 2, padding: '8px', fontSize: 13, background: meetingMode === 'online' ? undefined : 'linear-gradient(135deg, #10b981, #059669)', boxShadow: meetingMode === 'offline' ? '0 4px 16px rgba(16,185,129,0.35)' : undefined }} disabled={isSubmitting} onClick={onSubmit}>
                {isSubmitting ? 'Đang tạo...' : `Tạo nhóm ${meetingMode === 'online' ? 'Online' : 'Offline'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


// ── INVITE FRIENDS MODAL ───────────────────────────────────────────────────
function InviteFriendsModal({ group, currentUser, onClose, addToast }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invitingIds, setInvitingIds] = useState({});
  const [inviteStatus, setInviteStatus] = useState({});

  useEffect(() => {
    const load = async () => {
      const list = await getFriends(currentUser.id).catch(() => []);
      setFriends(list.filter(f => !group.members.some(m => Number(m) === Number(f.userId))));
      const sent = await getGroupInvitesSent(group.id, currentUser.id).catch(() => []);
      const statusMap = {};
      sent.forEach(inv => { if (inv.status === 'pending') statusMap[inv.toUserId] = 'pending'; });
      setInviteStatus(statusMap);
      setLoading(false);
    };
    load();
  }, [currentUser.id, group]);

  const handleInvite = async (friend) => {
    setInvitingIds(prev => ({ ...prev, [friend.userId]: true }));
    try {
      await sendGroupInvite({
        groupId: group.id, groupName: group.name,
        fromUserId: currentUser.id, fromUserName: currentUser.fullName,
        toUserId: friend.userId,
      });
      setInviteStatus(prev => ({ ...prev, [friend.userId]: 'pending' }));
      addToast(`Đã gửi lời mời tới ${friend.fullName}!`, 'success');
    } catch (err) {
      addToast(err.message || 'Lỗi khi gửi lời mời', 'error');
    } finally {
      setInvitingIds(prev => ({ ...prev, [friend.userId]: false }));
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5200, padding: '12px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '380px', maxHeight: '70vh', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-glow)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Mời bạn bè vào nhóm</h3>
            <p style={{ margin: '3px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              {group.name} · Bạn bè cần chấp nhận lời mời mới vào được
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4, marginLeft: 8, flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', flex: 1, padding: '12px 16px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.2) transparent' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}></div>Đang tải...
            </div>
          ) : friends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 12px' }}>
              
              <p style={{ fontSize: 14, margin: 0, color: 'var(--text-secondary)' }}>Tất cả bạn bè đã trong nhóm rồi!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {friends.map(friend => {
                const initials = friend.fullName?.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || '?';
                const isPending = inviteStatus[friend.userId] === 'pending';
                const isInviting = invitingIds[friend.userId];
                const isGroupAdmin = String(friend.userId) === String(group.creatorId);
                return (
                  <div key={friend.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: isPending ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isPending ? 'rgba(0,0,0,0.15)' : 'var(--border)'}`, transition: 'all 0.2s' }}>
                    {friend.avatar ? (
                      <img src={friend.avatar} alt={friend.fullName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,var(--primary),var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>
                        {initials}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {friend.fullName}
                        {isGroupAdmin && (
                          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', background: 'rgba(17, 24, 39, 0.04)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', verticalAlign: 'middle' }}>
                            Trưởng nhóm
                          </span>
                        )}
                      </div>
                      {friend.university && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{friend.university}</div>}
                    </div>
                    {isGroupAdmin ? (
                      <span style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 8, background: 'rgba(17, 24, 39, 0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                        Trưởng nhóm
                      </span>
                    ) : isPending ? (
                      <span style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.06)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
                        Đã mời
                      </span>
                    ) : (
                      <button
                        onClick={() => handleInvite(friend)}
                        disabled={isInviting}
                        style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: isInviting ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.06)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 12, cursor: isInviting ? 'not-allowed' : 'pointer', opacity: isInviting ? 0.6 : 1, transition: 'all 0.15s', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        {isInviting ? '...' : '+ Mời'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ── NEARBY GROUPS MODAL ──────────────────────────────────────────────────
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function NearbyGroupsModal({ groups, user, onClose, addToast, joinRequestStatus, handleJoin }) {
  const navigate = useNavigate();
  const [userCoords, setUserCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const RADIUS = 50;

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('failed');
      addToast('Trình duyệt không hỗ trợ định vị GPS.', 'warning');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('success');
        addToast('Đã định vị thành công vị trí của bạn!', 'success');
      },
      (err) => {
        if (import.meta.env.DEV) console.warn('GPS failed:', err);
        setGpsStatus('failed');
        addToast('Không thể định vị GPS. Vui lòng cho phép quyền định vị.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [addToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { detectLocation(); }, [detectLocation]);

  const filtered = useMemo(() => {
    const eligible = groups.filter(g => {
      if (g.meetingMode === 'offline') return !!g.location;
      return true;
    });

    const userMajor = user?.major || null;

    const results = eligible.map(g => {
      let distance = null;
      if (g.meetingMode === 'offline' && g.location) {
        if (userCoords && g.location.lat && g.location.lng) {
          distance = getDistance(userCoords.lat, userCoords.lng, g.location.lat, g.location.lng);
        }
      }
      const sameMajor = !!(userMajor && g.major && g.major === userMajor);
      return { ...g, distance, sameMajor };
    });

    return results.filter(g => {
      if (g.meetingMode === 'online') return true;
      if (userCoords && g.distance !== null) return g.distance <= RADIUS;
      return false;
    }).sort((a, b) => {
      // Ưu tiên 1: cùng ngành học
      if (a.sameMajor && !b.sameMajor) return -1;
      if (!a.sameMajor && b.sameMajor) return 1;
      // Ưu tiên 2: khoảng cách
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return 0;
    });
  }, [groups, userCoords, user?.major]);

  const gpsColor = gpsStatus === 'success' ? '#10b981' : gpsStatus === 'locating' ? '#f59e0b' : '#ef4444';
  const gpsLabel = gpsStatus === 'locating' ? 'Đang định vị...' : gpsStatus === 'success' ? 'Đã xác định vị trí' : 'Chưa có vị trí';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '540px', maxHeight: 'calc(100vh - 80px)', borderRadius: '22px', border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.03), rgba(0,0,0,0.01))' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Khám phá nhóm học lân cận</h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Tìm nhóm online hoặc offline đang hoạt động · Bán kính {RADIUS} km
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 15, cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >✕</button>
        </div>

        {/* Location Bar */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: gpsColor, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 6px ${gpsColor}` }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: gpsColor }}>{gpsLabel}</span>
          </div>
          <button type="button" onClick={detectLocation} disabled={gpsStatus === 'locating'}
            style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: gpsStatus === 'locating' ? 'not-allowed' : 'pointer', opacity: gpsStatus === 'locating' ? 0.6 : 1, fontFamily: 'inherit', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (gpsStatus !== 'locating') { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; }}}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            Định vị lại
          </button>
        </div>

        {/* Groups List */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.15) transparent' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--text-muted)' }}>?</div>
              <span style={{ fontSize: 13 }}>Không tìm thấy nhóm học nào trong phạm vi {RADIUS} km.</span>
            </div>
          ) : (
            filtered.map(group => {
              const isMember = group?.members?.some(m => Number(m) === Number(user?.id));
              const isOnline = group.meetingMode === 'online';
              const distanceText = group.distance !== null ? `${group.distance.toFixed(1)} km` : group.matchedByText ? 'Gần bạn' : '';
              const modeColor = isOnline ? 'var(--text-primary)' : 'var(--text-primary)';
              const modeBg = isOnline ? 'rgba(0,0,0,0.06)' : 'rgba(16,185,129,0.1)';
              const modeBorder = isOnline ? 'var(--border)' : 'rgba(16,185,129,0.25)';

              return (
                <div key={group.id}
                  style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '13px 15px', borderRadius: 13, background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)', transition: 'border-color 0.2s, background 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</h4>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{group.subject}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: modeColor, background: modeBg, border: `1px solid ${modeBorder}`, borderRadius: 20, padding: '2px 9px' }}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                      {group.sameMajor && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', background: 'rgba(17, 24, 39, 0.04)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 9px' }}>
                          ✨ Cùng ngành
                        </span>
                      )}
                      {distanceText && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{distanceText}</span>
                      )}
                    </div>
                  </div>

                  {!isOnline && group.location && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6 }}>
                      <span style={{ flexShrink: 0, color: 'var(--text-muted)', fontWeight: 600 }}>Địa điểm:</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.location.name} — {group.location.address}</span>
                    </div>
                  )}

                  {group.description && (
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.description}</p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {group.members.length}/{group.maxMembers} thành viên
                    </span>
                    {isMember ? (
                      <button onClick={() => { onClose(); navigate(`/groups/${group.id}`); }}
                        style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >Vào nhóm</button>
                    ) : (() => {
                      const reqStatus = joinRequestStatus[group.id];
                      if (group.isPrivate && reqStatus === 'pending') {
                        return <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>Đang chờ duyệt</span>;
                      }
                      return (
                        <button onClick={() => handleJoin(group)}
                          style={{ padding: '5px 14px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', background: 'var(--text-primary)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '0.82'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                          {group.isPrivate ? 'Yêu cầu tham gia' : 'Tham gia'}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function Groups() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inviteGroup, setInviteGroup] = useState(null);

  const [reviewGroup, setReviewGroup] = useState(null);
  const [reviewGroupFiles, setReviewGroupFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [formData, setFormData] = useState({ name: '', subject: '', description: '', maxMembers: 10 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meetingMode, setMeetingMode] = useState('online');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [joinRequestStatus, setJoinRequestStatus] = useState({}); // { groupId: 'pending'|'approved'|null }

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllGroups();
      setGroups(data);
    } catch (err) {
      addToast(err.message || 'Lỗi tải danh sách nhóm', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroups();
  }, [fetchGroups]);

  // Realtime: tự cập nhật danh sách nhóm khi có nhóm mới/bị xóa/đổi thông tin
  // Channel 'groups-list-realtime' — tên TĨNH, chỉ mount khi user đang ở trang /groups
  useEffect(() => {
    const channel = supabase
      .channel('groups-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_groups' }, () => {
        fetchGroups();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => {
        fetchGroups(); // cập nhật số thành viên trên mỗi card nhóm
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGroups]);

  // Tải trạng thái join request của user cho các nhóm riêng tư
  useEffect(() => {
    if (!user?.id || groups.length === 0) return;
    const privateGroups = groups.filter(g => g.isPrivate);
    if (privateGroups.length === 0) return;
    const fetchStatuses = async () => {
      const results = {};
      await Promise.all(privateGroups.map(async g => {
        const isMember = g.members.some(m => Number(m) === Number(user.id));
        if (!isMember) {
          results[g.id] = await getMyJoinRequestStatus(user.id, g.id).catch(() => null);
        }
      }));
      setJoinRequestStatus(prev => ({ ...prev, ...results }));
    };
    fetchStatuses();
  }, [groups, user?.id]);

  const handleCreate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name || !formData.subject) {
      return addToast('Vui lòng nhập tên nhóm và môn học!', 'error');
    }
    try {
      setIsSubmitting(true);
      const userMajor = user?.major || null;
      await createGroup(user.id, {
        ...formData,
        meetingMode,
        isPrivate,
        location: selectedLocation,
        major: userMajor,
      });
      // Lưu môn học mới vào DB nếu user có ngành và môn chưa có sẵn
      if (userMajor && formData.subject) {
        await saveSubjectForMajor(userMajor, formData.subject);
      }
      addToast('Tạo nhóm thành công!', 'success');
      setShowModal(false);
      setFormData({ name: '', subject: '', description: '', maxMembers: 10 });
      setMeetingMode('online');
      setIsPrivate(false);
      setSelectedLocation(null);
      fetchGroups();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (group) => {
    setReviewGroup(group);
    setLoadingFiles(true);
    try {
      const { data, error } = await supabase
        .from('files')
        .select('file_name, file_size')
        .eq('group_id', parseInt(group.id, 10))
        .order('created_at', { ascending: false })
        .limit(5);
      if (!error && data) {
        setReviewGroupFiles(data);
      } else {
        setReviewGroupFiles([]);
      }
    } catch {
      setReviewGroupFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!reviewGroup) return;
    const group = reviewGroup;
    setReviewGroup(null);
    try {
      const result = await joinGroup(user.id, group.id);
      if (result?.requested) {
        addToast('Đã gửi yêu cầu tham gia! Chờ trưởng nhóm duyệt.', 'success');
        setJoinRequestStatus(prev => ({ ...prev, [group.id]: 'pending' }));
      } else {
        addToast('Đã tham gia nhóm!', 'success');
        fetchGroups();
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleLeave = (group) => {
    if (group.creatorId === user.id) {
      const isOnlyMember = (group.members?.length || 0) <= 1;

      if (isOnlyMember) {
        // Chỉ còn 1 mình → chỉ cho phép xóa nhóm
        setConfirmConfig({
          title: 'Xóa nhóm học',
          message: 'Bạn là thành viên duy nhất trong nhóm. Nếu rời, nhóm sẽ bị xóa hoàn toàn. Bạn có muốn tiếp tục không?',
          confirmText: 'Xóa nhóm',
          cancelText: 'Giữ lại',
          variant: 'danger',
          onConfirm: async () => {
            setConfirmConfig(null);
            try { await deleteGroup(group.id); addToast('Đã xóa nhóm học!', 'success'); fetchGroups(); }
            catch (err) { addToast(err.message, 'error'); }
          },
          onCancel: () => setConfirmConfig(null),
        });
      } else {
        // Còn nhiều thành viên → hỏi xóa hay nhường quyền
        setConfirmConfig({
          title: 'Bạn là Trưởng nhóm',
          message: 'Bạn muốn làm gì với nhóm này? Chọn "Xóa nhóm" để xóa hoàn toàn, hoặc "Để lại nhóm" để nhường quyền trưởng nhóm cho người khác rồi rời.',
          confirmText: 'Xóa nhóm',
          cancelText: 'Để lại nhóm',
          variant: 'danger',
          onConfirm: async () => {
            setConfirmConfig(null);
            try { await deleteGroup(group.id); addToast('Đã xóa nhóm học!', 'success'); fetchGroups(); }
            catch (err) { addToast(err.message, 'error'); }
          },
          onCancel: async () => {
            setConfirmConfig(null);
            try {
              sessionStorage.setItem('leaving_group', 'true');
              await transferAdminAndLeave(user.id, group.id);
              addToast('Đã rời nhóm và chuyển quyền trưởng nhóm!', 'success');
              fetchGroups();
            }
            catch (err) {
              sessionStorage.removeItem('leaving_group');
              addToast(err.message, 'error');
            }
          },
        });
      }
    } else {
      setConfirmConfig({
        title: 'Rời nhóm',
        message: 'Bạn có chắc chắn muốn rời nhóm này không? Bạn có thể tham gia lại bất cứ lúc nào.',
        confirmText: 'Rời nhóm',
        cancelText: 'Giữ lại',
        variant: 'warning',
        onConfirm: async () => {
          setConfirmConfig(null);
          try {
            sessionStorage.setItem('leaving_group', 'true');
            await leaveGroup(user.id, group.id);
            addToast('Đã rời nhóm!', 'success');
            fetchGroups();
          }
          catch (err) {
            sessionStorage.removeItem('leaving_group');
            addToast(err.message, 'error');
          }
        },
        onCancel: () => setConfirmConfig(null),
      });
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.fullName?.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || '?';

  const filteredGroups = (() => {
    const q = searchQuery.trim();
    if (q === '') return groups;
    if (q.length < 6) return [];
    return groups.filter(g => g.id.toString() === q);
  })();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-primary)' }}>
        Đang tải danh sách nhóm...
      </div>
    );
  }

  return (
    <>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 200 }}
        />
      )}

      <aside style={{ position: 'fixed', top: 0, left: 0, height: '100%', width: '260px', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 300, display: 'flex', flexDirection: 'column', boxShadow: sidebarOpen ? 'var(--shadow-glow)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, var(--text-primary), var(--text-primary))', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px' }}>
              📚
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, fontFamily: "'Fraunces', serif", fontStyle: 'italic', background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--text-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.3px' }}>StudyConnect</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '2px 6px', borderRadius: 6, transition: 'var(--transition)' }}>✕</button>
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          {user?.avatar
            ? <img src={user.avatar} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--text-primary)' }} />
            : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--text-primary), var(--text-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', border: '2px solid var(--text-primary)' }}>{initials}</div>
          }
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.fullName || 'Người dùng'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 12px' }}>
          {SIDEBAR_ITEMS.map(item => (
            <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, textDecoration: 'none', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500, transition: 'var(--transition)', marginBottom: 4 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
          <button onClick={handleLogout} className="btn-logout" style={{ width: '100%', justifyContent: 'center' }}>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Button to open sidebar drawer (Mobile Only) */}
      <div className="mobile-only" style={{ maxWidth: '1100px', margin: '40px auto 0', padding: '0 24px' }}>
        <button onClick={() => setSidebarOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.06)', border: '1.5px solid var(--border)', color: 'var(--text-primary)', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          ☰ Menu Tiện ích
        </button>
      </div>

      <div className="groups-page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2 className="page-title">Nhóm Học Tập</h2>
            <p className="page-subtitle">Khám phá và tham gia các nhóm học phù hợp với bạn</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn"
              onClick={() => setShowModal(true)}
              style={{
                padding: '10px 22px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                width: 'auto',
                minWidth: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-primary) 100%)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.35)';
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="16" y1="11" x2="22" y2="11" />
              </svg>
              Tạo nhóm mới
            </button>
            <button
              className="btn"
              onClick={() => setShowNearbyModal(true)}
              style={{
                padding: '10px 22px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                width: 'auto',
                minWidth: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'transparent',
                border: '1.5px solid #1A1A1A',
                color: '#1A1A1A',
                fontWeight: 700,
                borderRadius: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.background = '#FAFAFA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Nhóm học lân cận
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', height: '48px' }}>
          {!isSearchExpanded ? (
            <button
              onClick={() => setIsSearchExpanded(true)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: 'var(--shadow)',
              }}
              onMouseEnter={e => { 
                e.currentTarget.style.color = 'var(--text-primary)'; 
                e.currentTarget.style.borderColor = 'var(--border-hover)'; 
                setIsSearchExpanded(true);
              }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
            </button>
          ) : (
            <div 
              className="premium-panel search-panel" 
              style={{ flex: 1, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}
              onMouseLeave={() => { if (!searchQuery.trim()) setIsSearchExpanded(false); }}
            >
              <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.3-4.3"/>
                </svg>
              </span>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Nhập ID phòng học để tìm kiếm..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                autoFocus
              />
              <button 
                onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {filteredGroups.length === 0 ? (
          <div className="sc-card-animated" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: '16px', padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <svg width="72" height="56" viewBox="0 0 72 56">
                {/* Left Person */}
                <circle cx="23" cy="25" r="5.5" fill="var(--bg-input)" stroke="var(--border)" strokeWidth="1.5" />
                <path d="M15 44c0-5 4-8 9-8" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
                
                {/* Right Person */}
                <circle cx="49" cy="25" r="5.5" fill="var(--bg-input)" stroke="var(--border)" strokeWidth="1.5" />
                <path d="M48 36c5 0 9 3 9 8" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
                
                {/* Center Person */}
                <circle cx="36" cy="20" r="7" fill="var(--bg-input)" stroke="var(--primary)" strokeWidth="1.5" />
                <path d="M24 44c0-6 5-10 12-10s12 4 12 10" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ color: 'var(--text-primary)', fontSize: '14.5px', fontWeight: 700, marginBottom: '6px', marginTop: '4px' }}>
              {searchQuery.trim().length > 0 && searchQuery.trim().length < 6
                ? 'Vui lòng nhập chính xác 6 chữ số ID phòng học...'
                : searchQuery.trim().length >= 6
                  ? 'Không tìm thấy nhóm nào phù hợp với ID này!'
                  : 'Chưa có nhóm học nào. Hãy là người đầu tiên tạo nhóm!'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
              {searchQuery.trim().length === 0 && 'Tạo nhóm để kết nối và học tập cùng bạn bè ngay.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredGroups.map(group => {
              const isMember = group?.members?.some(m => Number(m) === Number(user?.id));
              const isCreator = group.creatorId === user?.id;
              const isDeputy = group.deputyId === user?.id;

              return (
                <div key={group.id} className="group-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '12px' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{group.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span className="badge-outline" style={{ borderColor: 'var(--text-primary)', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.04)', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '10px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, border: '1.5px solid var(--text-primary)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        {group?.members?.length || 0}/{group.maxMembers || 10}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 10, whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.04)', color: 'var(--text-primary)', border: '1.5px solid var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {group.meetingMode === 'offline' ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            Offline
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="23 7 16 12 23 17 23 7" />
                              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                            Online
                          </>
                        )}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 10, whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.04)', color: 'var(--text-primary)', border: '1.5px solid var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {group.isPrivate ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            Riêng tư
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                            </svg>
                            Công khai
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" y1="9" x2="20" y2="9" />
                        <line x1="4" y1="15" x2="20" y2="15" />
                        <line x1="10" y1="3" x2="8" y2="21" />
                        <line x1="16" y1="3" x2="14" y2="21" />
                      </svg>
                      ID: <strong style={{ color: 'var(--text-primary)' }}>{group.id}</strong>
                    </span>
                    {isCreator && <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(17, 24, 39, 0.04)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)' }}>Trưởng nhóm</span>}
                    {isDeputy && <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(0,0,0,0.04)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)' }}>Phó nhóm</span>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', marginBottom: '8px', marginTop: '4px', padding: '6px 12px', borderRadius: '10px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)', flexShrink: 0 }}>
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Môn học:</strong> {group.subject}
                    </span>
                  </div>

                  {group.meetingMode === 'offline' && group.location && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(16, 185, 129, 0.04)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.15)', marginBottom: '8px' }}>
                      <span style={{ fontSize: 13, flexShrink: 0, display: 'inline-flex', alignItems: 'center', color: 'var(--text-primary)', marginTop: '1px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.location.name}</span>
                        {group.location.address && <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.location.address}</span>}
                      </div>
                    </div>
                  )}

                  {group.description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', flex: 1, marginBottom: 0, marginTop: '4px', lineHeight: 1.4, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      "{group.description}"
                    </p>
                  )}

                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                    {isMember ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <Link 
                            to={`/groups/${group.id}`} 
                            style={{ 
                              flex: 1, 
                              padding: '9px', 
                              textAlign: 'center', 
                              textDecoration: 'none', 
                              fontSize: '13px', 
                              fontWeight: 700, 
                              borderRadius: '8px', 
                              color: '#fff', 
                              background: 'var(--text-primary)', 
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)', 
                              transition: 'all 0.2s ease',
                              display: 'inline-block'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.35)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                            }}
                          >
                            Vào nhóm
                          </Link>
                          <button 
                            style={{ 
                              padding: '9px 18px', 
                              fontSize: '13px', 
                              fontWeight: 600, 
                              borderRadius: '8px', 
                              background: 'var(--bg-card)', 
                              color: 'var(--text-primary)', 
                              border: '1px solid var(--border)', 
                              cursor: 'pointer', 
                              transition: 'all 0.2s ease' 
                            }} 
                            onClick={() => handleLeave(group)}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'var(--bg-input)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'var(--bg-card)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            Rời
                          </button>
                        </div>
                        <button onClick={() => setInviteGroup(group)}
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            fontSize: '12px', 
                            fontWeight: 600, 
                            borderRadius: '8px', 
                            border: '1px solid var(--text-primary)', 
                            background: 'rgba(0, 0, 0, 0.06)', 
                            color: 'var(--text-primary)', 
                            cursor: 'pointer', 
                            fontFamily: 'inherit', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '6px', 
                            transition: 'all 0.2s ease' 
                          }}
                          onMouseEnter={e => { 
                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.15)'; 
                            e.currentTarget.style.borderColor = 'var(--text-primary)'; 
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={e => { 
                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)'; 
                            e.currentTarget.style.borderColor = 'var(--text-primary)'; 
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="19" y1="8" x2="19" y2="14" />
                            <line x1="16" y1="11" x2="22" y2="11" />
                          </svg>
                          Mời bạn bè vào nhóm
                        </button>
                      </div>
                    ) : (() => {
                      const reqStatus = joinRequestStatus[group.id];
                      if (group.isPrivate && reqStatus === 'pending') {
                        return (
                          <div style={{ width: '100%', padding: '9px', borderRadius: '8px', background: 'rgba(17, 24, 39, 0.04)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700, textAlign: 'center' }}>
                            ⏳ Đang chờ trưởng nhóm duyệt...
                          </div>
                        );
                      }
                      return (
                        <button 
                          style={{ 
                            width: '100%', 
                            padding: '9px', 
                            fontSize: '13px', 
                            fontWeight: 700, 
                            borderRadius: '8px', 
                            border: 'none', 
                            background: 'var(--text-primary)', 
                            color: '#fff', 
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)', 
                            cursor: 'pointer', 
                            transition: 'all 0.2s ease' 
                          }} 
                          onClick={() => handleJoin(group)}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.35)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                          }}
                        >
                          {group.isPrivate ? '🔒 Gửi yêu cầu tham gia' : 'Tham gia nhóm'}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`
        .groups-page-container {
          padding: 24px 16px;
          max-width: 1100px;
          margin: 0 auto;
          font-family: 'Inter', sans-serif;
        }
        .page-title {
          font-family: 'Fraunces', serif;
          font-size: 24px;
          font-weight: 900;
          color: var(--text-primary);
          margin: 0 0 6px 0;
          line-height: 1.2;
        }
        .page-subtitle {
          color: var(--text-secondary);
          font-size: 14px;
          margin: 0;
        }
        .premium-panel {
          background: var(--bg-card);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow);
        }
        .search-panel {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          margin-bottom: 24px;
          max-width: 500px;
          transition: all 0.3s;
          background: var(--bg-card);
          border: 1.5px solid var(--border);
        }
        .search-panel:focus-within {
          border-color: var(--text-primary);
          background: var(--bg-card);
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.15);
        }
        .search-input {
          background: none; border: none; outline: none; flex: 1;
          color: var(--text-primary); font-size: 14px; font-family: inherit;
        }
        .search-input::placeholder {
          color: var(--text-secondary);
        }
        .group-card {
          background: var(--bg-card);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 0;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
          box-shadow: var(--shadow);
        }
        .group-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.06), transparent);
          transform: skewX(-25deg);
          transition: 0.75s;
          pointer-events: none;
        }
        .group-card:hover {
          background: rgba(0, 0, 0, 0.04);
          border-color: rgba(0, 0, 0, 0.3);
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
        }
        .group-card:hover::before {
          left: 125%;
        }
        .badge-outline {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          white-space: nowrap;
          border: 1px solid;
        }
      `}</style>

    {inviteGroup && (
      <InviteFriendsModal group={inviteGroup} currentUser={user} onClose={() => setInviteGroup(null)} onInvited={fetchGroups} addToast={addToast} />
    )}

    {showModal && (
      <CreateGroupModal
        formData={formData} setFormData={setFormData}
        meetingMode={meetingMode} setMeetingMode={setMeetingMode}
        isPrivate={isPrivate} setIsPrivate={setIsPrivate}
        isSubmitting={isSubmitting}
        onClose={() => { setShowModal(false); setMeetingMode('online'); setIsPrivate(false); setSelectedLocation(null); setFormData({ name: '', subject: '', description: '', maxMembers: 10 }); }}
        onSubmit={handleCreate}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        userMajor={user?.major || null}
      />
    )}

    {showNearbyModal && (
      <NearbyGroupsModal
        groups={groups}
        user={user}
        onClose={() => setShowNearbyModal(false)}
        addToast={addToast}
        joinRequestStatus={joinRequestStatus}
        handleJoin={handleJoin}
      />
    )}

    {reviewGroup && (
      <div onClick={() => setReviewGroup(null)} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          width: '100%', maxWidth: '420px', maxHeight: '85vh',
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px',
          padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column',
          color: 'var(--text-primary)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) ease',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Thông tin nhóm học
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Đọc kỹ thông tin trước khi tham gia
              </p>
            </div>
            <button 
              onClick={() => setReviewGroup(null)}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '2px'
              }}
            >
              ✕
            </button>
          </div>

          {/* Body content scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }} className="no-scrollbar">
            {/* Tên nhóm */}
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Tên nhóm
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {reviewGroup.name}
              </div>
            </div>

            {/* Môn học & Thành viên */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Môn học
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  {reviewGroup.subject}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Thành viên
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  {reviewGroup.members?.length || 0} / {reviewGroup.maxMembers || 10}
                </div>
              </div>
            </div>

            {/* Mô tả */}
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Mô tả
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, fontStyle: reviewGroup.description ? 'normal' : 'italic' }}>
                {reviewGroup.description ? `"${reviewGroup.description}"` : 'Không có mô tả.'}
              </p>
            </div>

            {/* Tài liệu của các thành viên */}
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
                Tài liệu đã tải lên ({loadingFiles ? '...' : reviewGroupFiles.length})
              </div>
              {loadingFiles ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 0' }}>
                  Đang tải danh sách tài liệu...
                </div>
              ) : reviewGroupFiles.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                  Nhóm chưa có tài liệu nào được tải lên.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {reviewGroupFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)', flexShrink: 0 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {file.file_name}
                      </span>
                      {file.file_size && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {formatBytes(file.file_size)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => setReviewGroup(null)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Hủy
            </button>
            <button 
              onClick={handleConfirmJoin}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {reviewGroup.isPrivate ? 'Đồng ý gửi yêu cầu' : 'Đồng ý tham gia'}
            </button>
          </div>
        </div>
      </div>
    )}

    <ConfirmModal
      isOpen={!!confirmConfig}
      title={confirmConfig?.title}
      message={confirmConfig?.message}
      confirmText={confirmConfig?.confirmText}
      cancelText={confirmConfig?.cancelText}
      variant={confirmConfig?.variant}
      onConfirm={confirmConfig?.onConfirm}
      onCancel={confirmConfig?.onCancel || (() => setConfirmConfig(null))}
    />
  </>
);
}