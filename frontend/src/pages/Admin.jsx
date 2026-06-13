import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../layouts/AppLayout';
import { adminLogin } from '../services/authService';
import { adminGetUsers, adminCreateUser, adminUpdateUser, adminDeleteUser, adminGetGroups, adminCreateGroup, adminUpdateGroup, adminDeleteGroup } from '../services/adminService';
import { getPendingFiles, approveFile, deleteFile as adminDeleteFile } from '../services/interactionService';
import { supabase } from '../config/supabaseClient';
import UserTable     from '@/components/admin/UserTable';
import GroupTable    from '@/components/admin/GroupTable';
import UserFormModal from '@/components/admin/UserFormModal';
import GroupFormModal from '@/components/admin/GroupFormModal';
import ConfirmModal from '@/components/ConfirmModal';

// ── Inline toast (Admin is outside AppLayout) ──────────────────────
function AdminToast({ toasts, remove }) {
  return (
    <div style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 9999 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: 'var(--shadow)', borderLeft: `4px solid ${t.type === 'success' ? 'var(--success)' : 'var(--error)'}`, minWidth: '280px', maxWidth: '360px', fontSize: '14px', marginBottom: '10px' }}>
          <span style={{ flex: 1, color: 'var(--text-primary)' }}>{t.msg}</span>
          <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Members-of-group view modal ─────────────────────────────────────
function MembersModal({ group, users, onClose }) {
  if (!group) return null;
  const list = users.filter((u) => (group.members || []).includes(u.id));
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '640px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '30px', boxShadow: 'var(--shadow-glow)', maxHeight: '90vh', overflowY: 'auto', overscrollBehavior: 'contain' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 750, color: 'var(--text-primary)', margin: 0 }}>👥 Thành viên phòng học</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
              Phòng: <strong style={{ color: 'var(--primary-light)' }}>{group.name}</strong> ({group.subject})
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ maxHeight: '50vh', overflowY: 'auto', overscrollBehavior: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '10px 14px' }}>Họ và tên</th>
                <th style={{ padding: '10px 14px' }}>Email</th>
                <th style={{ padding: '10px 14px' }}>Vai trò</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Không có thành viên nào.</td></tr>
              ) : list.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '13.5px' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {m.fullName}
                    {m.id === group.creatorId && <span style={{ fontSize: '11px', color: 'var(--secondary)', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>Trưởng nhóm</span>}
                    {m.id === group.deputyId  && <span style={{ fontSize: '11px', color: '#34d399',         background: 'rgba(52,211,153,0.1)',  padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>Phó nhóm</span>}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>{m.email}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 650, padding: '2px 8px', borderRadius: '4px', background: m.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(108,99,255,0.1)', color: m.role === 'admin' ? 'var(--error)' : 'var(--primary-light)' }}>
                      {m.role === 'admin' ? 'Admin' : 'Học sinh'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="btn btn-secondary" style={{ padding: '10px 24px' }} onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ── File Preview Modal ──────────────────────────────────────────────
function FilePreviewModal({ file, onClose }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewText, setPreviewText] = useState('');

  const isImage = file?.fileType?.includes('image/') || file?.fileData?.startsWith('data:image/');
  const isPdf = file?.fileType?.includes('pdf') || file?.fileData?.startsWith('data:application/pdf');
  const isText = file?.fileType?.includes('text/') || file?.fileName?.endsWith('.txt') || file?.fileName?.endsWith('.json') || file?.fileName?.endsWith('.md') || file?.fileName?.endsWith('.js') || file?.fileName?.endsWith('.css');
  const isExcel = file?.fileName?.endsWith('.xlsx') || file?.fileName?.endsWith('.xls') || file?.fileType?.includes('sheet') || file?.fileType?.includes('excel');
  const isWord = file?.fileName?.endsWith('.docx') || file?.fileName?.endsWith('.doc') || file?.fileType?.includes('officedocument.wordprocessingml') || file?.fileType?.includes('msword');

  useEffect(() => {
    if (!file) return;
    setPreviewHtml('');
    setPreviewText('');
    setErrorMsg('');

    const loadFileContent = async () => {
      setLoading(true);
      try {
        let fileDataStr = file.fileData;
        
        // Nếu là URL trực tiếp từ Supabase Storage
        if (fileDataStr?.startsWith('http://') || fileDataStr?.startsWith('https://')) {
          const res = await fetch(fileDataStr);
          const blob = await res.blob();
          
          if (isText) {
            const text = await blob.text();
            setPreviewText(text);
          } else {
            const arrayBuffer = await blob.arrayBuffer();
            if (isExcel) {
              if (!window.XLSX) {
                await new Promise((resolve, reject) => {
                  const script = document.createElement('script');
                  script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                  script.onload = resolve;
                  script.onerror = () => reject(new Error('Không thể tải thư viện đọc Excel từ CDN'));
                  document.body.appendChild(script);
                });
              }
              const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const html = window.XLSX.utils.sheet_to_html(worksheet);
              setPreviewHtml(html);
            } else if (isWord) {
              if (!window.mammoth) {
                await new Promise((resolve, reject) => {
                  const script = document.createElement('script');
                  script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
                  script.onload = resolve;
                  script.onerror = () => reject(new Error('Không thể tải thư viện đọc Word từ CDN'));
                  document.body.appendChild(script);
                });
              }
              const result = await window.mammoth.convertToHtml({ arrayBuffer });
              setPreviewHtml(result.value);
            }
          }
          setLoading(false);
          return;
        }

        // Hỗ trợ Base64 (legacy files)
        if (isExcel) {
          if (!window.XLSX) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
              script.onload = resolve;
              script.onerror = () => reject(new Error('Không thể tải thư viện đọc Excel từ CDN'));
              document.body.appendChild(script);
            });
          }
          const base64Data = fileDataStr.split(',')[1] || fileDataStr;
          const workbook = window.XLSX.read(base64Data, { type: 'base64' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const html = window.XLSX.utils.sheet_to_html(worksheet);
          setPreviewHtml(html);
        } else if (isWord) {
          if (!window.mammoth) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
              script.onload = resolve;
              script.onerror = () => reject(new Error('Không thể tải thư viện đọc Word từ CDN'));
              document.body.appendChild(script);
            });
          }
          const base64Data = fileDataStr.split(',')[1] || fileDataStr;
          const arrayBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
          const result = await window.mammoth.convertToHtml({ arrayBuffer });
          setPreviewHtml(result.value);
        } else if (isText) {
          const parts = fileDataStr.split(',');
          const base64 = parts[1] || parts[0];
          const binString = atob(base64);
          const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
          const decoded = new TextDecoder().decode(bytes);
          setPreviewText(decoded);
        }
      } catch (e) {
        setErrorMsg(e.message || 'Lỗi khi đọc file.');
      } finally {
        setLoading(false);
      }
    };

    loadFileContent();
  }, [file, isExcel, isWord, isText]);

  if (!file) return null;

  const textContent = previewText;

  const customStyles = `
    .excel-preview table {
      border-collapse: collapse;
      width: 100%;
      color: #e2e8f0;
      font-size: 13px;
    }
    .excel-preview th, .excel-preview td {
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      text-align: left;
    }
    .excel-preview tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.02);
    }
    .excel-preview tr:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    .word-preview {
      color: #e2e8f0;
      text-align: left;
      line-height: 1.6;
      font-size: 14px;
    }
    .word-preview p {
      margin-bottom: 12px;
    }
    .word-preview h1, .word-preview h2, .word-preview h3 {
      color: #fff;
      margin-top: 20px;
      margin-bottom: 10px;
      font-weight: 700;
    }
  `;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-glow)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Xem trước tài liệu
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{file.fileName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0d16', minHeight: '300px' }}>
          <style dangerouslySetInnerHTML={{ __html: customStyles }} />
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary-light)', borderRadius: '50%', animation: 'spinPreviewModal 1s linear infinite', margin: '0 auto 16px auto' }} />
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spinPreviewModal {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}} />
              <p style={{ fontSize: '14px', margin: 0 }}>Đang chuẩn bị xem trước tài liệu...</p>
            </div>
          ) : errorMsg ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>⚠️</span>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Lỗi xem trước trực tiếp</p>
              <p style={{ fontSize: '13px', margin: '4px 0 16px 0' }}>{errorMsg}</p>
              <a href={file.fileData} download={file.fileName} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--primary-light)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '13.5px' }}>
                📥 Tải xuống tài liệu để xem thủ công
              </a>
            </div>
          ) : isImage ? (
            <img src={file.fileData} alt={file.fileName} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px' }} />
          ) : isPdf ? (
            <iframe src={file.fileData} title={file.fileName} style={{ width: '100%', height: '60vh', border: 'none', borderRadius: '8px' }} />
          ) : isText ? (
            <pre style={{ width: '100%', maxHeight: '60vh', margin: 0, padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'auto', color: '#e2e8f0', fontFamily: 'Courier New, monospace', fontSize: '13.5px', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
              {textContent}
            </pre>
          ) : isExcel ? (
            <div className="excel-preview" style={{ width: '100%', maxHeight: '60vh', overflow: 'auto', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : isWord ? (
            <div className="word-preview" style={{ width: '100%', maxHeight: '60vh', overflow: 'auto', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px', padding: '24px' }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>📦</span>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Không hỗ trợ xem trước trực tiếp</p>
              <p style={{ fontSize: '13px', margin: '4px 0 16px 0' }}>Định dạng file này cần được tải xuống để xem thủ công</p>
              <a href={file.fileData} download={file.fileName} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--primary-light)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '13.5px' }}>
                📥 Tải xuống tài liệu
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(255,255,255,0.01)' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13.5px' }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Default user/group form shapes ─────────────────────────────────
const EMPTY_USER_FORM  = { fullName: '', email: '', password: '', role: 'user', university: '', major: '', bio: '' };
const EMPTY_GROUP_FORM = { name: '', subject: '', description: '', creatorId: '', deputyId: '', meetingMode: 'online' };

export default function Admin() {
  const { admin, adminLogout, setAdmin } = useAuth();

  const adminChannelRef = useRef(null);

  useEffect(() => {
    if (admin) {
      const ch = supabase.channel('admin-broadcasts');
      ch.subscribe();
      adminChannelRef.current = ch;
      
      return () => {
        ch.unsubscribe();
      };
    }
  }, [admin]);

  // Auth
  const [loginForm,    setLoginForm]    = useState({ email: '', password: '' });
  const [loginError,   setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Data
  const [activeTab, setActiveTab] = useState('users');
  const [users,     setUsers]     = useState([]);
  const [groups,    setGroups]    = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [previewingFile, setPreviewingFile] = useState(null);
  const [loading,   setLoading]   = useState(true);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  const removeToast = (id) => setToasts((p) => p.filter((t) => t.id !== id));

  // Search
  const [userSearch,  setUserSearch]  = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  // User modal
  const [showUserModal,    setShowUserModal]    = useState(false);
  const [currentEditUser,  setCurrentEditUser]  = useState(null);
  const [userForm,         setUserForm]         = useState(EMPTY_USER_FORM);
  const [submittingUser,   setSubmittingUser]   = useState(false);

  // Group modal
  const [showGroupModal,    setShowGroupModal]    = useState(false);
  const [currentEditGroup,  setCurrentEditGroup]  = useState(null);
  const [groupForm,         setGroupForm]         = useState(EMPTY_GROUP_FORM);
  const [locationSearchVal, setLocationSearchVal] = useState('');
  const [submittingGroup,   setSubmittingGroup]   = useState(false);

  // Members viewer
  const [selectedGroupMembers, setSelectedGroupMembers] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // ── Data loading ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allUsers, allGroups, allPendingFiles] = await Promise.all([
        adminGetUsers(),
        adminGetGroups(),
        getPendingFiles()
      ]);
      setUsers(allUsers);
      setGroups(allGroups);
      setPendingFiles(allPendingFiles);
    } catch (err) {
      showToast(err.message || 'Không thể tải dữ liệu admin', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // ── Admin login ──────────────────────────────────────────────────
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) { setLoginError('Vui lòng nhập đầy đủ email và mật khẩu.'); return; }
    setLoginLoading(true); setLoginError('');
    try {
      const { admin: a } = await adminLogin(loginForm);
      setAdmin(a);
      showToast('Đăng nhập Quản trị viên thành công!');
    } catch (err) {
      setLoginError(err.message || 'Email hoặc mật khẩu không đúng.');
    } finally { setLoginLoading(false); }
  };

  useEffect(() => {
    if (admin) {
      const timer = setTimeout(() => {
        loadData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [loadData, admin]);

  // ── User handlers ────────────────────────────────────────────────
  const openCreateUser = () => { setCurrentEditUser(null); setUserForm(EMPTY_USER_FORM); setShowUserModal(true); };
  const openEditUser   = (u) => { setCurrentEditUser(u); setUserForm({ fullName: u.fullName || '', email: u.email || '', password: '', role: u.role || 'user', university: u.university || '', major: u.major || '', bio: u.bio || '' }); setShowUserModal(true); };

  const handleUserSubmit = async () => {
    if (!userForm.fullName || !userForm.email) return showToast('Vui lòng điền họ tên và email!', 'error');
    if (!currentEditUser && !userForm.password) return showToast('Vui lòng điền mật khẩu khởi tạo!', 'error');
    const finalForm = { ...userForm, university: userForm.university === 'Trường khác...' ? (userForm.universityCustom || '') : userForm.university, major: userForm.major === 'Ngành khác...' ? (userForm.majorCustom || '') : userForm.major };
    try {
      setSubmittingUser(true);
      if (currentEditUser) { const p = { ...finalForm }; if (!p.password) delete p.password; await adminUpdateUser(currentEditUser.id, p); showToast('Cập nhật tài khoản thành công!'); }
      else { await adminCreateUser(finalForm); showToast('Tạo tài khoản thành công!'); }
      setShowUserModal(false); loadData();
    } catch (err) { showToast(err.message || 'Thao tác thất bại', 'error'); }
    finally { setSubmittingUser(false); }
  };

  const handleUserDelete = (userId, name) => {
    if (userId === admin.id) return showToast('Bạn không thể tự xóa tài khoản của chính mình!', 'error');
    setConfirmConfig({
      title: 'Xóa tài khoản',
      message: `Bạn có chắc chắn muốn xóa tài khoản "${name}"? Hành động này không thể hoàn tác.`,
      confirmText: 'Xóa tài khoản',
      cancelText: 'Giữ lại',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        try { setLoading(true); await adminDeleteUser(userId); showToast(`Đã xóa tài khoản "${name}"!`); loadData(); }
        catch (err) { showToast(err.message || 'Xóa thất bại', 'error'); setLoading(false); }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  // ── Group handlers ───────────────────────────────────────────────
  const openCreateGroup = () => { setCurrentEditGroup(null); setGroupForm({ ...EMPTY_GROUP_FORM, creatorId: users[0]?.id || '' }); setLocationSearchVal(''); setShowGroupModal(true); };
  const openEditGroup   = (g) => { setCurrentEditGroup(g); setGroupForm({ name: g.name || '', subject: g.subject || '', description: g.description || '', creatorId: g.creatorId || '', deputyId: g.deputyId || '', meetingMode: g.meetingMode || 'online' }); setLocationSearchVal(g.location ? (g.location.name + (g.location.address ? ` — ${g.location.address}` : '')) : ''); setShowGroupModal(true); };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupForm.name || !groupForm.subject) return showToast('Vui lòng nhập tên nhóm và môn học!', 'error');
    const payload = { ...groupForm, creatorId: groupForm.creatorId ? Number(groupForm.creatorId) : admin.id, deputyId: groupForm.deputyId ? Number(groupForm.deputyId) : null, location: groupForm.meetingMode === 'offline' && locationSearchVal.trim() ? { name: locationSearchVal.trim(), address: '', lat: null, lng: null } : null };
    try {
      setSubmittingGroup(true);
      if (currentEditGroup) { await adminUpdateGroup(currentEditGroup.id, payload); showToast('Cập nhật phòng học thành công!'); }
      else { await adminCreateGroup(payload); showToast('Tạo phòng học thành công!'); }
      setShowGroupModal(false); loadData();
    } catch (err) { showToast(err.message || 'Thao tác thất bại', 'error'); }
    finally { setSubmittingGroup(false); }
  };

  const handleGroupDelete = (groupId, name) => {
    setConfirmConfig({
      title: 'Xóa phòng học',
      message: `Bạn có chắc chắn muốn xóa phòng học "${name}"? Toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn.`,
      confirmText: 'Xóa phòng học',
      cancelText: 'Giữ lại',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        try { setLoading(true); await adminDeleteGroup(groupId); showToast(`Đã xóa phòng học "${name}"!`); loadData(); }
        catch (err) { showToast(err.message || 'Xóa thất bại', 'error'); setLoading(false); }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  // ── Filters ──────────────────────────────────────────────────────
  const filteredUsers  = users.filter((u) => u.fullName.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredGroups = (() => { const q = groupSearch.trim(); if (!q) return groups; if (q.length < 6) return []; return groups.filter((g) => g.id.toString() === q); })();
  const totalAdmins    = users.filter((u) => u.role === 'admin').length;

  // ── Login screen ─────────────────────────────────────────────────
  if (!admin) {
    return (
      <div className="auth-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <AdminToast toasts={toasts} remove={removeToast} />
        <div className="auth-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow), var(--shadow-glow)', backdropFilter: 'blur(16px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              marginBottom: '16px'
            }}>
              🛡️
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, var(--text-primary) 40%, var(--primary-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0
            }}>
              StudyConnect Admin
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>Đăng nhập hệ thống quản trị độc lập</span>
          </div>
          {loginError && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: '13.5px', marginBottom: '16px' }}>⚠️ {loginError}</div>}
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">EMAIL ADMIN *</label>
              <div className="form-input-wrap">
                <input type="email" className="form-input no-icon" placeholder="Nhập email Admin của bạn" value={loginForm.email} onChange={(e) => { setLoginForm({ ...loginForm, email: e.target.value }); setLoginError(''); }} required style={{ borderRadius: '10px' }} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">MẬT KHẨU *</label>
              <div className="form-input-wrap">
                <input type="password" className="form-input no-icon" placeholder="••••••••" value={loginForm.password} onChange={(e) => { setLoginForm({ ...loginForm, password: e.target.value }); setLoginError(''); }} required style={{ borderRadius: '10px' }} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '10px' }} disabled={loginLoading}>
              {loginLoading ? 'Đang xác thực...' : 'Đăng nhập Quản trị'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────
  return (
    <AppLayout hideSidebar={true} hideNavbar={true}>
      <AdminToast toasts={toasts} remove={removeToast} />
      
      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        .admin-pill-tab {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .admin-pill-tab:hover {
          color: var(--primary-light) !important;
          background: rgba(99, 102, 241, 0.06) !important;
          transform: translateY(-1px);
        }
        .admin-pill-tab:active {
          transform: translateY(0);
        }
      `}</style>

      <div style={{ maxWidth: '1280px', margin: '24px auto', padding: '0 16px' }}>
        {/* Admin Header Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 32px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow), var(--shadow-glow)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)'
            }}>
              🛡️
            </div>
            <div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--primary-light))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                BẢNG ĐIỀU HÀNH QUẢN TRỊ
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>Hệ thống quản lý tài khoản, phòng học và kiểm duyệt tài liệu độc lập</span>
                {pendingFiles.length > 0 && (
                  <span style={{
                    background: 'rgba(244,63,94,0.12)',
                    color: 'var(--error)',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid rgba(244,63,94,0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--error)', animation: 'pulseGlow 1.8s infinite' }} />
                    Có {pendingFiles.length} tài liệu chờ duyệt
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tab bar + logout */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          padding: '12px 24px',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 'var(--radius)',
          marginBottom: '28px',
          boxShadow: 'var(--shadow), var(--shadow-glow)',
          backdropFilter: 'blur(16px)',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { key: 'users',  label: 'Quản lý tài khoản', icon: '👤', count: users.length },
              { key: 'groups', label: 'Quản lý phòng học', icon: '🏠', count: groups.length },
              { key: 'pendingFiles', label: 'Kiểm duyệt tài liệu', icon: '📁', count: pendingFiles.length },
              { key: 'stats', label: 'Thống kê hệ thống', icon: '📊', count: null },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="admin-pill-tab"
                  style={{
                    padding: '10px 18px',
                    background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    border: isActive ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '13.5px',
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? 'var(--primary-light)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 0 15px rgba(99, 102, 241, 0.1)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '15px' }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span style={{
                      background: tab.key === 'pendingFiles' && tab.count > 0
                        ? 'rgba(239,68,68,0.2)'
                        : (isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.06)'),
                      color: tab.key === 'pendingFiles' && tab.count > 0
                        ? '#f87171'
                        : (isActive ? 'var(--primary-light)' : 'var(--text-muted)'),
                      borderRadius: '8px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: tab.key === 'pendingFiles' && tab.count > 0 ? '1px solid rgba(239,68,68,0.3)' : 'none'
                    }}>{tab.count}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={adminLogout} 
              style={{ 
                padding: '10px 20px', 
                fontSize: '12.5px', 
                fontWeight: 700,
                background: 'rgba(239,68,68,0.08)', 
                border: '1px solid rgba(239,68,68,0.2)', 
                color: '#f87171', 
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#f87171'; }}
            >
              🔒 Đăng xuất Quản trị
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '0 8px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0', color: 'var(--primary-light)' }}>
              <span style={{ fontSize: '18px', fontWeight: 600 }}>Đang cập nhật dữ liệu quản trị...</span>
            </div>
          ) : (
            <div style={{ animation: 'slideUp 0.3s ease' }}>
              {activeTab === 'users' && (
                <UserTable filteredUsers={filteredUsers} admin={admin} userSearch={userSearch} setUserSearch={setUserSearch} onEdit={openEditUser} onDelete={handleUserDelete} onCreateNew={openCreateUser} />
              )}
              {activeTab === 'groups' && (
                <GroupTable filteredGroups={filteredGroups} groupSearch={groupSearch} setGroupSearch={setGroupSearch} users={users} onEdit={openEditGroup} onDelete={handleGroupDelete} onViewMembers={(g) => setSelectedGroupMembers(g)} onCreateNew={openCreateGroup} />
              )}
              {activeTab === 'pendingFiles' && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 32px', boxShadow: 'var(--shadow), var(--shadow-glow)', backdropFilter: 'blur(16px)' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Danh sách tài liệu chờ kiểm duyệt</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Tài liệu cần được admin phê duyệt trước khi xuất hiện trong nhóm học</p>
                    </div>
                  </div>
                  {pendingFiles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'inline-flex', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(52,211,153,0.1)', alignItems: 'center', justifyContent: 'center', color: '#34d399', marginBottom: '16px', border: '1px solid rgba(52,211,153,0.2)', boxShadow: '0 0 15px rgba(52,211,153,0.1)' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Không có tài liệu nào đang chờ duyệt</p>
                      <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>Tất cả tài liệu đăng lên đã được xử lý sạch sẽ.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>TÊN TÀI LIỆU</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>NHÓM HỌC</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>NGƯỜI ĐĂNG</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>THỜI GIAN ĐĂNG</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600, whiteSpace: 'nowrap' }}>DUNG LƯỢNG</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600, whiteSpace: 'nowrap', width: '1%' }}>HÀNH ĐỘNG</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingFiles.map((f) => (
                            <tr key={f.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                              <td style={{ padding: '16px', fontWeight: 600 }}>
                                <a href={f.fileData} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                  </svg>
                                  {f.fileName}
                                </a>
                              </td>
                              <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{f.groupName}</td>
                              <td style={{ padding: '16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{f.userFullName}</td>
                              <td style={{ padding: '16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(f.createdAt).toLocaleString('vi-VN')}</td>
                              <td style={{ padding: '16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{(f.fileSize / 1024 / 1024).toFixed(2)} MB</td>
                              <td style={{ padding: '16px', width: '1%', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => setPreviewingFile(f)}
                                    style={{ padding: '5px 10px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', color: 'var(--primary-light)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}
                                  >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                      </svg>
                                      Xem trước
                                    </span>
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await approveFile(f.id);
                                        if (adminChannelRef.current) {
                                          adminChannelRef.current.send({
                                            type: 'broadcast',
                                            event: 'file_approved',
                                            payload: {
                                              fileId: f.id,
                                              userId: f.userId,
                                              fileName: f.fileName,
                                              groupId: f.groupId,
                                              groupName: f.groupName,
                                              userFullName: f.userFullName
                                            }
                                          });
                                        }
                                        showToast('Phê duyệt tài liệu thành công!');
                                        loadData();
                                      } catch (err) {
                                        showToast(err.message || 'Lỗi duyệt tài liệu', 'error');
                                      }
                                    }}
                                    style={{ padding: '5px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}
                                  >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                      </svg>
                                      Duyệt
                                    </span>
                                  </button>
                                  <button
                                    onClick={async () => {
                                      setConfirmConfig({
                                        title: 'Từ chối tài liệu',
                                        message: `Bạn có chắc chắn muốn từ chối và xóa tài liệu "${f.fileName}"?`,
                                        confirmText: 'Từ chối & Xóa',
                                        cancelText: 'Giữ lại',
                                        variant: 'danger',
                                        onConfirm: async () => {
                                          setConfirmConfig(null);
                                          try {
                                            await adminDeleteFile(f.id);
                                            if (adminChannelRef.current) {
                                              adminChannelRef.current.send({
                                                type: 'broadcast',
                                                event: 'file_rejected',
                                                payload: {
                                                  fileId: f.id,
                                                  userId: f.userId,
                                                  fileName: f.fileName,
                                                  groupId: f.groupId,
                                                  groupName: f.groupName,
                                                  userFullName: f.userFullName
                                                }
                                              });
                                            }
                                            showToast('Đã từ chối và xóa tài liệu thành công!');
                                            loadData();
                                          } catch (err) {
                                            showToast(err.message || 'Lỗi xóa tài liệu', 'error');
                                          }
                                        },
                                        onCancel: () => setConfirmConfig(null),
                                      });
                                    }}
                                    style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}
                                  >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"/>
                                        <line x1="6" y1="6" x2="18" y2="18"/>
                                      </svg>
                                      Xóa
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'stats' && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '36px 40px', boxShadow: 'var(--shadow), var(--shadow-glow)', backdropFilter: 'blur(16px)' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Báo cáo & Thống kê hệ thống</h3>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '0 0 32px 0' }}>Biểu đồ phân tích tương quan giữa số lượng tài khoản người dùng, phòng học và quản trị viên</p>

                  <div style={{ display: 'flex', gap: '48px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* SVG Bar Chart */}
                    <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <svg viewBox="0 0 400 300" style={{ width: '100%', maxHeight: '300px', overflow: 'visible' }}>
                        {/* Grid lines */}
                        <line x1="50" y1="50" x2="380" y2="50" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="50" y1="125" x2="380" y2="125" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="50" y1="200" x2="380" y2="200" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="50" y1="250" x2="380" y2="250" stroke="var(--border)" strokeWidth="1.5" />

                        {/* Y-Axis labels */}
                        <text x="35" y="55" fill="var(--text-muted)" fontSize="11" textAnchor="end">Max</text>
                        <text x="35" y="130" fill="var(--text-muted)" fontSize="11" textAnchor="end">50%</text>
                        <text x="35" y="205" fill="var(--text-muted)" fontSize="11" textAnchor="end">25%</text>
                        <text x="35" y="255" fill="var(--text-muted)" fontSize="11" textAnchor="end">0</text>

                        {/* Calculated heights (Max val to scale bars) */}
                        {(() => {
                          const maxVal = Math.max(users.length, groups.length, totalAdmins, 1);
                          const getPercentHeight = (val) => (val / maxVal) * 200; // max height is 200px (from y=250 to y=50)
                          
                          const uHeight = getPercentHeight(users.length);
                          const gHeight = getPercentHeight(groups.length);
                          const aHeight = getPercentHeight(totalAdmins);

                          return (
                            <>
                              {/* Column 1: Users */}
                              <defs>
                                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#818cf8" />
                                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.6" />
                                </linearGradient>
                                <linearGradient id="groupGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#2dd4bf" />
                                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0.6" />
                                </linearGradient>
                                <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#fb7185" />
                                  <stop offset="100%" stopColor="#e11d48" stopOpacity="0.6" />
                                </linearGradient>
                              </defs>

                              {/* User Bar */}
                              <rect x="90" y={250 - uHeight} width="50" height={uHeight} rx="6" fill="url(#userGrad)" style={{ transition: 'all 0.3s ease', cursor: 'pointer' }} />
                              <text x="115" y={250 - uHeight - 8} fill="#818cf8" fontSize="13" fontWeight="700" textAnchor="middle">{users.length}</text>
                              <text x="115" y="272" fill="var(--text-primary)" fontSize="12" fontWeight="600" textAnchor="middle">Người dùng</text>

                              {/* Group Bar */}
                              <rect x="195" y={250 - gHeight} width="50" height={gHeight} rx="6" fill="url(#groupGrad)" style={{ transition: 'all 0.3s ease', cursor: 'pointer' }} />
                              <text x="220" y={250 - gHeight - 8} fill="#2dd4bf" fontSize="13" fontWeight="700" textAnchor="middle">{groups.length}</text>
                              <text x="220" y="272" fill="var(--text-primary)" fontSize="12" fontWeight="600" textAnchor="middle">Phòng học</text>

                              {/* Admin Bar */}
                              <rect x="300" y={250 - aHeight} width="50" height={aHeight} rx="6" fill="url(#adminGrad)" style={{ transition: 'all 0.3s ease', cursor: 'pointer' }} />
                              <text x="325" y={250 - aHeight - 8} fill="#fb7185" fontSize="13" fontWeight="700" textAnchor="middle">{totalAdmins}</text>
                              <text x="325" y="272" fill="var(--text-primary)" fontSize="12" fontWeight="600" textAnchor="middle">Quản trị</text>
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Detailed Data Table */}
                    <div style={{ flex: '1 1 300px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Bảng chi tiết số liệu</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                          { label: 'Người dùng hoạt động', value: users.length, percent: ((users.length / (users.length + groups.length + totalAdmins || 1)) * 100).toFixed(1) + '%', color: '#6c63ff' },
                          { label: 'Phòng học đã tạo', value: groups.length, percent: ((groups.length / (users.length + groups.length + totalAdmins || 1)) * 100).toFixed(1) + '%', color: '#3ecfcf' },
                          { label: 'Quản trị viên hệ thống', value: totalAdmins, percent: ((totalAdmins / (users.length + groups.length + totalAdmins || 1)) * 100).toFixed(1) + '%', color: '#ff6b9d' }
                        ].map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color }} />
                              <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>{item.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '45px', textAlign: 'right' }}>({item.percent})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <UserFormModal show={showUserModal} onClose={() => setShowUserModal(false)} currentEditUser={currentEditUser} userForm={userForm} setUserForm={setUserForm} onSubmit={handleUserSubmit} submitting={submittingUser} />
      <GroupFormModal show={showGroupModal} onClose={() => setShowGroupModal(false)} currentEditGroup={currentEditGroup} groupForm={groupForm} setGroupForm={setGroupForm} locationSearchVal={locationSearchVal} setLocationSearchVal={setLocationSearchVal} onSubmit={handleGroupSubmit} submitting={submittingGroup} />
      <MembersModal group={selectedGroupMembers} users={users} onClose={() => setSelectedGroupMembers(null)} />
      <FilePreviewModal file={previewingFile} onClose={() => setPreviewingFile(null)} />
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
    </AppLayout>
  );
}