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
    <div className="flex-responsive" style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '16px',
      transition: 'var(--transition)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(108,99,255,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius-sm)', flexShrink: 0,
        background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
      }}>
        {fileIconSvg(file.fileType)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)',
          marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {file.fileName}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span> {file.groupName}</span>
          <span> {formatFileSize(file.fileSize)}</span>
          <span> {new Date(file.createdAt).toLocaleDateString('vi-VN')}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
        {file.fileData && file.fileType?.startsWith('image/') && (
          <button onClick={() => onPreview(file)} style={{
            background: 'rgba(62,207,207,0.12)', border: '1px solid rgba(62,207,207,0.25)',
            color: 'var(--secondary)', padding: '6px 14px', borderRadius: '20px',
            cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
            transition: 'var(--transition)',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
             Xem
          </button>
        )}
        <button onClick={handleDownload} disabled={!file.fileData} style={{
          background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)',
          color: 'var(--primary-light)', padding: '6px 14px', borderRadius: '20px',
          cursor: file.fileData ? 'pointer' : 'default', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
          transition: 'var(--transition)', opacity: file.fileData ? 1 : 0.4,
        }}
          onMouseEnter={e => { if (file.fileData) e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={e => e.currentTarget.style.opacity = file.fileData ? '1' : '0.4'}
        >
           Tải về
        </button>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button onClick={() => setMenuOpen(v => !v)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '20px', padding: '4px 6px',
            borderRadius: '8px', fontFamily: 'inherit',
            transition: 'var(--transition)',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >···</button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '34px', zIndex: 50,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', overflow: 'hidden', minWidth: '140px',
              boxShadow: 'var(--shadow)',
            }}>
              <Link to={`/groups/${file.groupId}?tab=files`} style={{
                display: 'block', padding: '10px 16px', fontSize: '14px', fontWeight: 500,
                color: 'var(--text-primary)', textDecoration: 'none', transition: 'var(--transition)',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                 Đến nhóm
              </Link>
              <button onClick={() => { setMenuOpen(false); onDelete(file); }} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
                fontSize: '14px', fontWeight: 500, color: 'var(--error)',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'var(--transition)',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
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
      <main style={{ minWidth: 0 }}>
          {/* Header + Stats */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: '20px'
          }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}> Tài liệu của tôi</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Tất cả tài liệu bạn đã tải lên trong các nhóm học.
            </p>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'Tổng tài liệu', value: files.length },
                { label: 'Nhóm đã chia sẻ', value: new Set(files.map(f => f.groupId)).size },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '12px 20px',
                  display: 'flex', flexDirection: 'column', gap: '4px', flex: 1,
                }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary-light)' }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '10px 18px',
              transition: 'var(--transition)'
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: '15px' }}></span>
              <input
                placeholder="Tìm tài liệu"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none', flex: 1,
                  color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
            {typeOptions.map(opt => (
              <button key={opt.value} onClick={() => setFilterType(opt.value)} style={{
                padding: '7px 16px', borderRadius: '20px', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, flexShrink: 0,
                background: filterType === opt.value ? 'var(--primary)' : 'var(--bg-card)',
                color: filterType === opt.value ? 'white' : 'var(--text-secondary)',
                border: filterType === opt.value ? 'none' : '1px solid var(--border)',
                boxShadow: filterType === opt.value ? '0 4px 12px rgba(108,99,255,0.3)' : 'none',
                transition: 'var(--transition)',
              }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* File list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}></div>
              Đang tải tài liệu...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)',
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{files.length === 0 ? '' : ''}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                {files.length === 0 ? 'Chưa có tài liệu nào' : 'Không tìm thấy tài liệu'}
              </div>
              <div style={{ fontSize: '14px' }}>
                {files.length === 0
                  ? 'Vào các nhóm học để tải lên tài liệu đầu tiên của bạn.'
                  : 'Thử thay đổi từ khóa hoặc bộ lọc.'}
              </div>
              {files.length === 0 && (
                <Link to="/groups" style={{
                  display: 'inline-block', marginTop: '16px',
                  padding: '10px 24px', borderRadius: '20px',
                  background: 'var(--primary)', color: 'white',
                  textDecoration: 'none', fontSize: '14px', fontWeight: 600,
                }}>Đến nhóm học</Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
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