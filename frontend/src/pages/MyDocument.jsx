// src/pages/MyDocuments.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../layouts/AppLayout';
import { useToast } from '../components/Toast';


import { supabase } from '@/config/supabaseClient';

const getAllUserFiles = async (userId) => {
  const uid = parseInt(userId, 10);
  const { data: files, error } = await supabase
    .from('files')
    .select(`
      id,
      group_id,
      user_id,
      file_name,
      file_size,
      file_type,
      file_url,
      created_at,
      study_groups (
        name
      )
    `)
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (error || !files) return [];

  return files.map(f => ({
    id: f.id.toString(),
    groupId: f.group_id.toString(),
    groupName: f.study_groups?.name || 'Nhóm học',
    userId: f.user_id,
    fileName: f.file_name,
    fileSize: f.file_size,
    fileType: f.file_type,
    fileData: f.file_url,
    createdAt: f.created_at
  }));
};

const deleteUserFile = async (fileId) => {
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', parseInt(fileId, 10));

  if (error) {
    throw new Error(`Xóa tài liệu thất bại: ${error.message}`);
  }
};

const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

function fileIconSvg(type) {
  const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', stroke: 'currentColor', style: { color: 'var(--text-primary)' } };
  if (type?.startsWith('image/'))
    return <svg {...base}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
  if (type === 'application/pdf')
    return <svg {...base}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
  if (type?.includes('word') || type?.startsWith('text/'))
    return <svg {...base}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
  if (type?.includes('zip') || type?.includes('rar') || type?.includes('7z'))
    return <svg {...base}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
  return <svg {...base}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}





// ── File card ────────────────────────────────────────────────
function FileCard({ file, onDelete, onPreview }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDownload = () => {
    if (!file.fileData) return;
    const a = document.createElement('a');
    a.href = file.fileData;
    a.download = file.fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="file-card-item">
      {/* Icon */}
      <div className="file-icon-box">
        {fileIconSvg(file.fileType)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)',
          marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {file.fileName}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}>
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
            {file.groupName}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {formatFileSize(file.fileSize)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {new Date(file.createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
        {file.fileData && file.fileType?.startsWith('image/') && (
          <button onClick={() => onPreview(file)} className="file-action-btn">
             Xem
          </button>
        )}
        <button onClick={handleDownload} disabled={!file.fileData} className="file-action-btn" style={{ opacity: file.fileData ? 1 : 0.4 }}>
           Tải về
        </button>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button onClick={() => setMenuOpen(v => !v)} className="file-action-btn" style={{ padding: '8px 12px' }}>
            ···
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '42px', zIndex: 50,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', overflow: 'hidden', minWidth: '150px',
              boxShadow: 'var(--shadow-lg)',
            }}>
              <Link to={`/groups/${file.groupId}?tab=files`} style={{
                display: 'block', padding: '12px 16px', fontSize: '14px', fontWeight: 500,
                color: 'var(--text-primary)', textDecoration: 'none', transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                 Đến nhóm
              </Link>
              <button onClick={() => { setMenuOpen(false); onDelete(file); }} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px',
                fontSize: '14px', fontWeight: 500, color: '#ef4444',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                 Xóa tài liệu
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────
export default function MyDocuments() {
  const { isAuth, user } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { addToast } = useToast();

  const loadFiles = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const list = await getAllUserFiles(user.id);
      setFiles(list);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleDelete = async (file) => {
    try {
      await deleteUserFile(file.id);
      addToast(`Đã xóa "${file.fileName}"`, 'success');
      await loadFiles();
    } catch (e) { addToast(e.message, 'error'); }
    setDeleteConfirm(null);
  };

  const handleDownload = (file) => {
    if (!file.fileData) return;
    const a = document.createElement('a');
    a.href = file.fileData;
    a.download = file.fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filtered = files.filter(f =>
    !search.trim() ||
    f.fileName.toLowerCase().includes(search.toLowerCase()) ||
    f.groupName.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAuth) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Vui lòng đăng nhập để xem tài liệu.</p>
          <Link to="/login" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '15px', width: 'auto', borderRadius: '24px' }}>Đăng nhập</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppLayout hideRightSidebar={true}>
        <main className="document-page-container">
          {/* Header Panel with search */}
          <div className="premium-panel sc-card-animated sc-card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px', padding: '16px 20px', animationDelay: '0s' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#000000', margin: 0, fontFamily: "'Fraunces', serif" }}>Tài liệu của tôi</h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Danh sách tài liệu bạn đã chia sẻ trong các nhóm học.</p>
            </div>
            
            <div className="search-container" style={{ width: '100%', margin: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                className="search-input"
                placeholder="Tìm tên tài liệu hoặc tên nhóm..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Main content table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)', width: '100%' }}>
              Đang tải tài liệu...
            </div>
          ) : files.length === 0 ? (
            <div className="premium-panel sc-card-animated" style={{ textAlign: 'center', padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animationDelay: '0.05s' }}>
              <div style={{ color: 'var(--text-secondary)', display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m9 15 3-3 3 3" />
                </svg>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                Chưa có tài liệu nào
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px 0', maxWidth: '400px' }}>
                Vào các nhóm học để tải lên tài liệu đầu tiên của bạn.
              </p>
              <Link to="/groups" style={{
                display: 'inline-block',
                padding: '12px 28px', borderRadius: 'var(--radius-md)',
                background: 'var(--primary)', color: 'white',
                textDecoration: 'none', fontSize: '14px', fontWeight: 700,
                boxShadow: '0 4px 15px rgba(42, 117, 118, 0.25)', transition: 'all 0.2s'
              }}>Đến nhóm học</Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="premium-panel" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7" />
                  <path d="M22 13a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4" />
                  <path d="M22 13h-4M4 13H2" />
                  <path d="M12 8v5" />
                  <path d="m9 11 3 3 3-3" />
                </svg>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Không tìm thấy tài liệu
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Thử thay đổi từ khóa tìm kiếm.
              </div>
            </div>
          ) : isMobile ? (
            <div className="file-cards-grid">
              {filtered.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onDelete={setDeleteConfirm}
                  onPreview={setPreviewFile}
                />
              ))}
            </div>
          ) : (
            <div className="premium-panel sc-card-animated sc-card-hover" style={{ padding: '16px 20px', overflowX: 'auto', animationDelay: '0.05s' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '10px 12px' }}>Tên tài liệu</th>
                    <th style={{ padding: '10px 12px' }}>Đã chia sẻ vào nhóm</th>
                    <th style={{ padding: '10px 12px' }}>Thời gian chia sẻ</th>
                    <th style={{ padding: '10px 12px' }}>Dung lượng</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', width: '1%', whiteSpace: 'nowrap' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((file) => (
                    <tr key={file.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '13.5px', transition: 'var(--transition)' }} className="table-row-hover">
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                          <div className="file-icon-box" style={{ width: '28px', height: '28px', margin: 0 }}>
                            {fileIconSvg(file.fileType)}
                          </div>
                          {file.fileData && file.fileType?.startsWith('image/') ? (
                            <span onClick={() => setPreviewFile(file)} style={{ color: 'var(--text-primary)', cursor: 'pointer' }} className="hover-link">
                              {file.fileName}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-primary)' }}>{file.fileName}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <Link to={`/groups/${file.groupId}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>
                          {file.groupName}
                        </Link>
                      </td>
                      <td style={{ padding: '12px 12px', color: 'var(--text-muted)' }}>
                        {new Date(file.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '12px 12px', color: 'var(--text-secondary)' }}>
                        {formatFileSize(file.fileSize)}
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'right', width: '1%', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleDownload(file)}
                            className="file-action-btn"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px' }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7 10 12 15 17 10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Tải về
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(file)}
                            className="file-action-btn"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              background: 'rgba(239,68,68,0.1)',
                              border: '1px solid rgba(239,68,68,0.2)',
                              color: '#f87171'
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        <style>{`
          .document-page-container {
            padding: 24px;
            max-width: 100%;
            width: 100%;
            box-sizing: border-box;
            font-family: 'Inter', sans-serif;
          }
          .file-cards-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            margin-top: 16px;
            margin-bottom: 24px;
          }
          @media (min-width: 640px) {
            .file-cards-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          .file-card-item {
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: var(--shadow);
            transition: all 0.2s;
          }
          .file-card-item:hover {
            border-color: rgba(42, 117, 118, 0.3);
            transform: translateY(-2px);
            background: rgba(42, 117, 118, 0.03);
          }
          .premium-panel {
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid #e5e7eb;
            border-radius: 20px;
            padding: 16px 20px;
            box-shadow: var(--shadow);
            margin-bottom: 24px;
          }
          .search-container {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #ffffff;
            border: 1px solid #d1d5db;
            border-radius: 24px;
            padding: 8px 16px;
            transition: all 0.3s;
          }
          .search-container:focus-within {
            border-color: #000000;
            background: #ffffff;
            box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
          }
          .search-input {
            background: none; border: none; outline: none; flex: 1;
            color: #000000; font-size: 13px; font-family: inherit;
          }
          .file-icon-box {
            width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
            background: rgba(42, 117, 118, 0.12); border: 1px solid rgba(42, 117, 118, 0.25);
            display: flex; align-items: center; justify-content: center;
          }
          .file-action-btn {
            background: var(--bg-input);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .file-action-btn:hover {
            background: rgba(42, 117, 118, 0.12);
            color: var(--primary);
            border-color: rgba(42, 117, 118, 0.3);
          }
          .table-row-hover:hover {
            background: var(--bg-input) !important;
          }
          .hover-link:hover {
            color: var(--primary) !important;
            text-decoration: underline !important;
          }
        `}</style>
      </AppLayout>

      {/* Image Preview Modal */}
      {previewFile && (
        <div onClick={() => setPreviewFile(null)} style={{
          position: 'fixed', inset: 0, zIndex: 5000,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '20px',
            maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto', overscrollBehavior: 'contain',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{previewFile.fileName}</span>
              <button onClick={() => setPreviewFile(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px',
                color: 'var(--text-muted)', padding: '4px',
              }}>✕</button>
            </div>
            <img src={previewFile.fileData} alt={previewFile.fileName} style={{ width: '100%', borderRadius: 'var(--radius-sm)' }} />
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div onClick={() => setDeleteConfirm(null)} style={{
          position: 'fixed', inset: 0, zIndex: 5000,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '28px 32px',
            maxWidth: '420px', width: '100%', border: '1px solid var(--border)', textAlign: 'center',
          }}>
            <div style={{ color: 'var(--error)', display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.4))' }}>
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Xóa tài liệu?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Bạn có chắc muốn xóa <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.fileName}</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{
                padding: '10px 24px', borderRadius: '20px', cursor: 'pointer',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
              }}>Hủy</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{
                padding: '10px 24px', borderRadius: '20px', cursor: 'pointer',
                background: 'var(--error)', border: 'none',
                color: 'white', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
              }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}