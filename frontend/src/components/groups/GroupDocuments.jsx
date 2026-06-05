import { formatBytes } from '@/utils';

export default function GroupDocuments({
  group,
  user,
  files,
  selectedFile,
  setSelectedFile,
  customFileName,
  setCustomFileName,
  isUploadingFile,
  handleFileUpload,
  handleFileDelete,
  addToast,
}) {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setCustomFileName(file.name);
    }
  };

  const handleFileDownload = (file) => {
    try {
      const link = document.createElement('a');
      link.href = file.fileData;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (addToast) addToast(`Đang tải xuống: ${file.fileName}`, 'success');
    } catch {
      if (addToast) addToast('Không thể tải xuống tài liệu này', 'error');
    }
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      <div
        className="document-share-card"
      >
        <h3 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-primary)' }}>
          Chia sẻ tài liệu học tập mới
        </h3>
        <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="document-upload-box"
            style={{
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            <input
              type="file"
              id="file-upload-input"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            <div
              className="document-upload-icon-wrap"
              style={{
                width: '40px',
                height: '40px',
                margin: '0 auto 10px',
                borderRadius: '10px',
                background: 'rgba(108,99,255,0.12)',
                border: '1px solid rgba(108,99,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--primary-light)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                />
              </svg>
            </div>
            {selectedFile ? (
              <div>
                <p style={{ fontWeight: 600, color: 'var(--primary-light)', fontSize: '13px' }}>Đã chọn: {selectedFile.name}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Dung lượng: {formatBytes(selectedFile.size)}
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 500, fontSize: '13px', margin: 0 }} className="upload-box-text">Chọn tài liệu học tập</p>
              </div>
            )}
          </div>
          {selectedFile && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tên tài liệu hiển thị</label>
              <div className="form-input-wrap">
                <input
                  type="text"
                  className="form-input no-icon"
                  placeholder="Đặt tên cho tài liệu dễ nhận biết..."
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                />
              </div>
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary responsive-btn-full"
            style={{ width: 'max-content', alignSelf: 'flex-end', padding: '10px 24px' }}
            disabled={isUploadingFile || !selectedFile}
          >
            {isUploadingFile ? 'Đang tải lên...' : 'Upload tài liệu'}
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Danh sách tài liệu ({files.length})</h3>
        {files.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ color: 'var(--text-muted)' }}>Chưa có tài liệu nào được chia sẻ trong nhóm.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {files.map((file) => {
              const canDelete = file.userId === user.id || group.creatorId === user.id;
              let icon = 'file';
              if (file.fileType?.includes('image/')) icon = 'img';
              else if (file.fileType?.includes('pdf')) icon = 'pdf';
              else if (file.fileType?.includes('zip') || file.fileType?.includes('rar')) icon = 'zip';
              return (
                <div
                  key={file.id}
                  className="document-file-row"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden', minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </span>
                    <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
                      <h4
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          margin: 0,
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          width: '100%'
                        }}
                      >
                        {file.fileName}
                      </h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', marginBottom: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 6px', alignItems: 'center' }}>
                        <span>Dung lượng: {formatBytes(file.fileSize)}</span>
                        <span style={{ color: 'var(--border)' }}>•</span>
                        <span>Chia sẻ bởi: {file.userFullName}</span>
                        <span style={{ color: 'var(--border)' }}>•</span>
                        <span>{new Date(file.createdAt).toLocaleDateString('vi-VN')}</span>
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleFileDownload(file)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      Tải xuống
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleFileDelete(file.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1.5px solid rgba(239, 68, 68, 0.2)',
                          color: 'var(--error)',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
