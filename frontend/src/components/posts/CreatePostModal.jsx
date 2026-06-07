import { useState, useRef, useEffect } from 'react';
import Avatar from '@/components/common/Avatar';
import { createPost } from '@/services/interactionService';


export default function CreatePostModal({ user, onClose, onSubmit }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);


  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);

    try {
      const newPost = await createPost(null, {
        content: text.trim(),
        userId: user.id,
        tag: null
      });
      setLoading(false);
      onSubmit(newPost);
      onClose();
    } catch (err) {
      alert(`Đăng bài thất bại: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '560px',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar src={user?.avatar} initial={user?.fullName || 'U'} size={40} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{user?.fullName}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                Đăng bài công khai
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-input)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '16px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`${user?.fullName?.split(' ').pop() || 'Bạn'} đang nghĩ gì?`}
            rows={5}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontFamily: 'inherit',
              lineHeight: 1.7,
              boxSizing: 'border-box',
            }}
          />
        </div>


        {/* Footer */}
        <div
          style={{
            padding: '12px 20px 18px',
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '14px',
              color: 'var(--text-secondary)',
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            style={{
              padding: '10px 24px',
              background:
                text.trim() && !loading
                  ? 'linear-gradient(135deg, var(--primary), #5b53e0)'
                  : 'var(--bg-input)',
              border: 'none',
              borderRadius: '12px',
              cursor: text.trim() && !loading ? 'pointer' : 'default',
              fontFamily: 'inherit',
              fontSize: '14px',
              fontWeight: 700,
              color: text.trim() && !loading ? 'white' : 'var(--text-muted)',
              transition: 'var(--transition)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {loading ? '⏳ Đang đăng...' : 'Đăng bài'}
          </button>
        </div>
      </div>
    </div>
  );
}
