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
      *,
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
  const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type?.startsWith('image/'))
    return <svg {...base} stroke="#3ecfcf"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
  if (type === 'application/pdf')
    return <svg {...base} stroke="#ef4444"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
  if (type?.includes('word') || type?.startsWith('text/'))
    return <svg {...base} stroke="#6c63ff"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
  if (type?.includes('zip') || type?.includes('rar') || type?.includes('7z'))
    return <svg {...base} stroke="#f59e0b"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
  return <svg {...base} stroke="var(--primary-light)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
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
    a.click();
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
          fontWeight: 700, fontSize: '15px', color: '#fff',
          marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {file.fileName}
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span>📂 {file.groupName}</span>
          <span>💾 {formatFileSize(file.fileSize)}</span>
          <span>📅 {new Date(file.createdAt).toLocaleDateString('vi-VN')}</span>
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
              background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', overflow: 'hidden', minWidth: '150px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            }}>
              <Link to={`/groups/${file.groupId}?tab=files`} style={{
                display: 'block', padding: '12px 16px', fontSize: '14px', fontWeight: 500,
                color: '#fff', textDecoration: 'none', transition: 'background 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
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
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
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

  // Type filter options
  const typeOptions = [
    { value: 'all', label: ' Tất cả' },
    { value: 'image', label: '️ Hình ảnh' },
    { value: 'pdf', label: ' PDF' },
    { value: 'doc', label: ' Văn bản' },
    ];

  const typeMatch = (file) => {
    if (filterType === 'all') return true;
    if (filterType === 'image') return file.fileType?.startsWith('image/');
    if (filterType === 'pdf') return file.fileType === 'application/pdf';
    if (filterType === 'doc') return file.fileType?.includes('word') || file.fileType?.startsWith('text/');
    if (filterType === 'sheet') return file.fileType?.includes('sheet') || file.fileType?.includes('excel') || file.fileType?.includes('csv');
    if (filterType === 'video') return file.fileType?.startsWith('video/');
    return true;
  };

  const filtered = files.filter(f =>
    typeMatch(f) &&
    (!search.trim() || f.fileName.toLowerCase().includes(search.toLowerCase()) ||
      f.groupName.toLowerCase().includes(search.toLowerCase()))
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
      <AppLayout>


      {/* Main content */}
      <main className="document-page-container">
          {/* Header + Stats */}
          <div className="premium-panel">
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px', color: '#fff' }}>Tài liệu của tôi</h1>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>
              Tất cả tài liệu bạn đã tải lên trong các nhóm học.
            </p>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { label: 'Tổng tài liệu', value: files.length },
                { label: 'Nhóm đã chia sẻ', value: new Set(files.map(f => f.groupId)).size },
              ].map(s => (
                <div key={s.label} className="stat-box">
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#818cf8' }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="search-container">
              <span style={{ fontSize: '16px' }}>🔍</span>
              <input
                className="search-input"
                placeholder="Tìm tên tài liệu hoặc tên nhóm..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px', width: '100%' }}>
            {typeOptions.map(opt => (
              <button key={opt.value} onClick={() => setFilterType(opt.value)} className={`filter-btn ${filterType === opt.value ? 'active' : ''}`}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* File list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', width: '100%' }}>
              Đang tải tài liệu...
            </div>
          ) : filtered.length === 0 ? (
            <div className="premium-panel" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📫</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                {files.length === 0 ? 'Chưa có tài liệu nào' : 'Không tìm thấy tài liệu'}
              </div>
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                {files.length === 0
                  ? 'Vào các nhóm học để tải lên tài liệu đầu tiên của bạn.'
                  : 'Thử thay đổi từ khóa hoặc bộ lọc khác.'}
              </div>
              {files.length === 0 && (
                <Link to="/groups" style={{
                  display: 'inline-block', marginTop: '24px',
                  padding: '12px 28px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                  textDecoration: 'none', fontSize: '14px', fontWeight: 700,
                  boxShadow: '0 4px 15px rgba(99,102,241,0.3)', transition: 'all 0.2s'
                }}>Đến nhóm học</Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', width: '100%' }}>
              {filtered.map(file => (
                <FileCard
                  key={file.id}
                  file={file}
                  onDelete={setDeleteConfirm}
                  onPreview={setPreviewFile}
                />
              ))}
            </div>
          )}
        </main>

      <style>{`
        .document-page-container {
          padding: 24px 16px;
          max-width: 1000px;
          margin: 0 auto;
          font-family: 'Inter', sans-serif;
        }
        .premium-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 20px 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05);
          margin-bottom: 20px;
        }
        .stat-box {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 12px;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: all 0.3s;
        }
        .stat-box:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(99, 102, 241, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }
        .search-container {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 12px 20px;
          transition: all 0.3s;
        }
        .search-container:focus-within {
          border-color: #6366f1;
          background: rgba(0,0,0,0.3);
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
        }
        .search-input {
          background: none; border: none; outline: none; flex: 1;
          color: #fff; font-size: 14px; font-family: inherit;
        }
        .filter-btn {
          padding: 8px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
          border: 1px solid rgba(255,255,255,0.1);
          white-space: nowrap;
        }
        .filter-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
        .filter-btn.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          box-shadow: 0 4px 15px rgba(99,102,241,0.3);
        }
        .file-card-item {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s;
          margin-bottom: 10px;
        }
        .file-card-item:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(108,99,255,0.3);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(108,99,255,0.15);
        }
        .file-icon-box {
          width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
          background: rgba(108,99,255,0.15); border: 1px solid rgba(108,99,255,0.25);
          display: flex; align-items: center; justify-content: center;
        }
        .file-action-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #e2e8f0;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .file-action-btn:hover {
          background: rgba(108,99,255,0.15);
          color: #818cf8;
          border-color: rgba(108,99,255,0.3);
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
      <div style={{
        position: 'fixed', inset: 0, zIndex: 5000,
        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '28px 32px',
          maxWidth: '420px', width: '100%', border: '1px solid var(--border)', textAlign: 'center',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
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