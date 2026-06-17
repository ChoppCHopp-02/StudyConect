import { useState, useRef, useEffect, useCallback } from 'react';
import Avatar from '@/components/common/Avatar';
import { createPost } from '@/services/interactionService';

// ── tiny avatar for suggestion rows ───────────────────────────────
function SuggestAvatar({ src, initial }) {
  if (src) return <img src={src} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  const firstChar = (initial || '?')[0];
  const colors = ['#6c63ff', '#ff6b9d', '#3ecfcf', '#f59e0b', '#22c55e'];
  const color = colors[(firstChar.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {firstChar.toUpperCase()}
    </div>
  );
}

export default function CreatePostModal({ user, friends = [], myLeaderGroups = [], onClose, onSubmit }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  // ── tag state ──────────────────────────────────────────────────
  // tags: Array<{ id, name, type: 'friend'|'group', avatar?, members? }>
  const [tags, setTags] = useState([]);

  // ── @ mention dropdown state ───────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState(null);   // null = closed, string = query
  const [mentionStart, setMentionStart] = useState(-1);     // caret position of '@'
  const [suggestIdx, setSuggestIdx] = useState(0);

  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  // ── build suggestion list ──────────────────────────────────────
  const suggestions = useCallback(() => {
    const q = (mentionQuery || '').toLowerCase();
    const taggedIds = new Set(tags.map(t => `${t.type}:${t.id}`));

    const friendSugs = friends
      .filter(f => f.status === 'accepted' || !f.status)
      .filter(f => !taggedIds.has(`friend:${f.userId}`))
      .filter(f => !q || f.fullName.toLowerCase().includes(q))
      .slice(0, 5)
      .map(f => ({ id: f.userId, name: f.fullName, type: 'friend', avatar: f.avatar, initial: f.initial }));

    const groupSugs = myLeaderGroups
      .filter(g => !taggedIds.has(`group:${g.id}`))
      .filter(g => !q || g.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map(g => ({ id: g.id, name: g.name, type: 'group', members: g.members }));

    return [...friendSugs, ...groupSugs];
  }, [mentionQuery, friends, myLeaderGroups, tags]);

  // ── handle textarea change ─────────────────────────────────────
  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);

    const cursor = e.target.selectionStart;
    // find the last @ before cursor
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@(\S*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursor - atMatch[0].length);
      setSuggestIdx(0);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  };

  // ── pick suggestion ────────────────────────────────────────────
  const pickSuggestion = (sug) => {
    // Replace the @query in textarea
    const before = text.slice(0, mentionStart);
    const after = text.slice(textareaRef.current.selectionStart);
    const newText = `${before}@${sug.name} ${after}`;
    setText(newText);
    setMentionQuery(null);
    setMentionStart(-1);

    // Add to tags if not already there
    setTags(prev => {
      if (prev.some(t => t.type === sug.type && t.id === sug.id)) return prev;
      return [...prev, sug];
    });

    textareaRef.current?.focus();
  };

  // ── keyboard nav in dropdown ───────────────────────────────────
  const handleKeyDown = (e) => {
    const sugs = suggestions();
    if (mentionQuery !== null && sugs.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestIdx(i => Math.min(i + 1, sugs.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSuggestIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickSuggestion(sugs[suggestIdx]); return; }
      if (e.key === 'Escape')    { setMentionQuery(null); return; }
    }
  };

  // ── remove a tag chip ──────────────────────────────────────────
  const removeTag = (type, id) => {
    setTags(prev => prev.filter(t => !(t.type === type && t.id === id)));
    // Also remove @name from text
    const removed = tags.find(t => t.type === type && t.id === id);
    if (removed) {
      setText(prev => prev.replace(new RegExp(`@${removed.name}\\s?`, 'g'), ''));
    }
  };

  // ── submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const newPost = await createPost(null, {
        content: text.trim(),
        userId: user.id,
        tag: null,
        taggedUsers: tags.filter(t => t.type === 'friend').map(t => t.id),
        taggedGroups: tags.filter(t => t.type === 'group').map(t => t.id),
        taggedUserNames: tags.filter(t => t.type === 'friend').map(t => t.name),
        taggedGroupNames: tags.filter(t => t.type === 'group').map(t => t.name),
        taggerName: user.fullName,
      });
      alert('Bài viết đã được gửi và đang chờ admin phê duyệt.');
      setLoading(false);
      onSubmit(newPost);
      onClose();
    } catch (err) {
      alert(`Đăng bài thất bại: ${err.message}`);
      setLoading(false);
    }
  };

  const sugs = suggestions();

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-card)', borderRadius: '20px', width: '100%', maxWidth: '580px', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', overflow: 'visible', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar src={user?.avatar} initial={user?.fullName || 'U'} size={40} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{user?.fullName}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>Chia sẻ với mọi người</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-input)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={`${user?.fullName || 'Bạn'} đang nghĩ gì? Gõ @ để tag bạn bè hoặc nhóm...`}
            rows={5}
            style={{ width: '100%', background: 'none', border: 'none', outline: 'none', resize: 'none', color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'inherit', lineHeight: 1.7, boxSizing: 'border-box' }}
          />

          {/* @ Mention Dropdown */}
          {mentionQuery !== null && sugs.length > 0 && (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute',
                left: '20px', right: '20px',
                background: 'var(--bg-card)',
                border: '1px solid rgba(108,99,255,0.35)',
                borderRadius: '14px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                zIndex: 1000,
                overflow: 'hidden',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {/* Section header friends */}
              {sugs.some(s => s.type === 'friend') && (
                <div style={{ padding: '6px 14px 4px', fontSize: '10px', fontWeight: 700, color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(108,99,255,0.05)' }}>
                  👤 Bạn bè
                </div>
              )}
              {sugs.filter(s => s.type === 'friend').map((sug) => {
                const realIdx = sugs.indexOf(sug);
                return (
                  <div
                    key={`f:${sug.id}`}
                    onMouseDown={(e) => { e.preventDefault(); pickSuggestion(sug); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 14px', cursor: 'pointer',
                      background: realIdx === suggestIdx ? 'rgba(108,99,255,0.12)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={() => setSuggestIdx(realIdx)}
                  >
                    <SuggestAvatar src={sug.avatar} initial={sug.name} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{sug.name}</span>
                  </div>
                );
              })}

              {/* Section header groups */}
              {sugs.some(s => s.type === 'group') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px 4px', fontSize: '10px', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(255,122,0,0.05)', borderTop: sugs.some(s => s.type === 'friend') ? '1px solid var(--border)' : 'none' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--secondary)' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>Nhóm học (trưởng nhóm)</span>
                </div>
              )}
              {sugs.filter(s => s.type === 'group').map((sug) => {
                const realIdx = sugs.indexOf(sug);
                return (
                  <div
                    key={`g:${sug.id}`}
                    onMouseDown={(e) => { e.preventDefault(); pickSuggestion(sug); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 14px', cursor: 'pointer',
                      background: realIdx === suggestIdx ? 'rgba(255,122,0,0.1)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={() => setSuggestIdx(realIdx)}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(255,122,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{sug.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Nhóm học • {sug.members?.length || 0} thành viên</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tag chips */}
        {tags.length > 0 && (
          <div style={{ padding: '0 20px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tags.map(t => (
              <span key={`${t.type}:${t.id}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 10px 4px 8px',
                borderRadius: '20px',
                background: t.type === 'friend' ? 'rgba(108,99,255,0.15)' : 'rgba(255,122,0,0.12)',
                border: t.type === 'friend' ? '1px solid rgba(108,99,255,0.35)' : '1px solid rgba(255,122,0,0.3)',
                color: t.type === 'friend' ? 'var(--primary-light)' : 'var(--secondary)',
                fontSize: '12px', fontWeight: 700,
              }}>
                {t.type === 'friend' ? (
                  <SuggestAvatar src={t.avatar} initial={t.name} />
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                )}
                @{t.name}
                <button
                  onClick={() => removeTag(t.type, t.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '13px', lineHeight: 1, padding: '0 0 0 2px', display: 'flex', alignItems: 'center' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Hint */}
        <div style={{ padding: '0 20px 8px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fbbf24', flexShrink: 0 }}>
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
            <line x1="9" y1="18" x2="15" y2="18" />
            <line x1="10" y1="22" x2="14" y2="22" />
          </svg>
          <span>Gõ <strong style={{ color: 'var(--primary-light)' }}>@</strong> để tag bạn bè hoặc nhóm học bạn đang làm trưởng nhóm</span>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 18px', display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', color: 'var(--text-secondary)' }}>
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            style={{
              padding: '10px 24px',
              background: text.trim() && !loading ? 'linear-gradient(135deg, var(--primary), #5b53e0)' : 'var(--bg-input)',
              border: 'none', borderRadius: '12px',
              cursor: text.trim() && !loading ? 'pointer' : 'default',
              fontFamily: 'inherit', fontSize: '14px', fontWeight: 700,
              color: text.trim() && !loading ? 'white' : 'var(--text-muted)',
              transition: 'var(--transition)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" fill="none" />
                </svg>
                <span>Đang đăng...</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-45deg)' }}>
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                <span>Đăng bài</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
