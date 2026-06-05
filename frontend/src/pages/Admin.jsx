import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../layouts/AppLayout';
import { adminLogin } from '../services/authService';
import { adminGetUsers, adminCreateUser, adminUpdateUser, adminDeleteUser, adminGetGroups, adminCreateGroup, adminUpdateGroup, adminDeleteGroup } from '../services/adminService';
import AdminStats    from '@/components/admin/AdminStats';
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '640px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '30px', boxShadow: 'var(--shadow-glow)', maxHeight: '90vh', overflowY: 'auto', overscrollBehavior: 'contain' }}>
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

// ── Default user/group form shapes ─────────────────────────────────
const EMPTY_USER_FORM  = { fullName: '', email: '', password: '', role: 'user', university: '', major: '', bio: '' };
const EMPTY_GROUP_FORM = { name: '', subject: '', description: '', creatorId: '', deputyId: '', meetingMode: 'online' };

export default function Admin() {
  const { admin, adminLogout, setAdmin } = useAuth();

  // Auth
  const [loginForm,    setLoginForm]    = useState({ email: '', password: '' });
  const [loginError,   setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Data
  const [activeTab, setActiveTab] = useState('users');
  const [users,     setUsers]     = useState([]);
  const [groups,    setGroups]    = useState([]);
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
      const [allUsers, allGroups] = await Promise.all([adminGetUsers(), adminGetGroups()]);
      setUsers(allUsers);
      setGroups(allGroups);
    } catch (err) {
      showToast(err.message || 'Lỗi tải dữ liệu hệ thống', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (admin) {
      const timer = setTimeout(() => {
        loadData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [loadData, admin]);

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
        <div className="auth-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-glow)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🛡️</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Studyconect Admin</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Hệ thống quản trị và giám sát</span>
          </div>
          {loginError && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: '13.5px', marginBottom: '16px' }}>⚠️ {loginError}</div>}
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">EMAIL ADMIN *</label>
              <div className="form-input-wrap">
                <input type="email" className="form-input no-icon" placeholder="Nhập email Admin của bạn" value={loginForm.email} onChange={(e) => { setLoginForm({ ...loginForm, email: e.target.value }); setLoginError(''); }} required />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">MẬT KHẨU *</label>
              <div className="form-input-wrap">
                <input type="password" className="form-input no-icon" placeholder="••••••••" value={loginForm.password} onChange={(e) => { setLoginForm({ ...loginForm, password: e.target.value }); setLoginError(''); }} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '8px' }} disabled={loginLoading}>
              {loginLoading ? 'Đang xác thực...' : 'Đăng nhập Quản trị'}
            </button>
          </form>
          <div style={{ marginTop: '24px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <strong>Tài khoản Admin mặc định:</strong><br />- Email: admin@studyconect.com<br />- Mật khẩu: admin123
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────
  return (
    <AppLayout hideSidebar={true}>
      <AdminToast toasts={toasts} remove={removeToast} />

      <div style={{ maxWidth: '1280px', margin: '24px auto', padding: '0 16px' }}>
        {/* Tab bar + stats */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', padding: '0 24px', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px 16px 0 0', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex' }}>
            {[
              { key: 'users',  label: '👤 Quản lý tài khoản', count: users.length },
              { key: 'groups', label: '🏠 Quản lý phòng học',  count: groups.length },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500, color: activeTab === tab.key ? 'var(--primary-light)' : 'var(--text-muted)', borderBottom: activeTab === tab.key ? '2px solid var(--primary-light)' : '2px solid transparent', marginBottom: -1, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                {tab.label}
                <span style={{ background: activeTab === tab.key ? 'rgba(108,99,255,0.18)' : 'rgba(255,255,255,0.06)', color: activeTab === tab.key ? 'var(--primary-light)' : 'var(--text-muted)', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{tab.count}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '10px 0' }}>
            <AdminStats totalUsersCount={users.length} totalGroupsCount={groups.length} totalAdminsCount={totalAdmins} />
            <button 
              onClick={adminLogout} 
              style={{ 
                padding: '8px 16px', 
                fontSize: '12px', 
                fontWeight: 700,
                background: 'rgba(239,68,68,0.08)', 
                border: '1px solid rgba(239,68,68,0.2)', 
                color: '#f87171', 
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#f87171'; }}
            >
              🔒 Đăng xuất Quản trị
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 40px' }}>
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
            </div>
          )}
        </div>
      </div>

      <UserFormModal show={showUserModal} onClose={() => setShowUserModal(false)} currentEditUser={currentEditUser} userForm={userForm} setUserForm={setUserForm} onSubmit={handleUserSubmit} submitting={submittingUser} />
      <GroupFormModal show={showGroupModal} onClose={() => setShowGroupModal(false)} currentEditGroup={currentEditGroup} groupForm={groupForm} setGroupForm={setGroupForm} locationSearchVal={locationSearchVal} setLocationSearchVal={setLocationSearchVal} onSubmit={handleGroupSubmit} submitting={submittingGroup} />
      <MembersModal group={selectedGroupMembers} users={users} onClose={() => setSelectedGroupMembers(null)} />
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