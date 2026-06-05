// src/pages/Chat.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import AppLayout from '../layouts/AppLayout';
import { getFriends } from '../services/friendService.js';
import {
  sendMessage,
  getConversation,
  markAsRead,
  getUnreadCount,
  getLastMessages,
  refreshCache,
  deleteMessage,
} from '../services/chatServiceTEMP.js';
import { supabase } from '../config/supabaseClient';

// ── Avatar ──────────────────────────────────────────────────────────
function Avatar({ src, initial, color = '#6c63ff', size = 40 }) {
  if (src) return (
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}, ${color}88)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: 'white',
    }}>
      {initial}
    </div>
  );
}

const AVATAR_COLORS = ['#6c63ff', '#ff6b9d', '#3ecfcf', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6'];
const colorOf = (str) => AVATAR_COLORS[(str || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d;
  if (diff < 60000) return 'vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function fmtFull(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

// ── Emoji list ───────────────────────────────────────────────────
const EMOJI_LIST = [
  '😀','😂','😍','🥰','😎','🤩','😢','😭','😡','🤔',
  '😅','😇','🥳','😴','🤯','🥺','😏','😬','🤗','😤',
  '👍','👎','👏','🙏','🤝','✌️','🤞','💪','🫶','❤️',
  '🧡','💛','💚','💙','💜','🖤','🤍','💔','💯','🔥',
  '⭐','🌟','✨','🎉','🎊','🎁','🏆','🥇','🚀','💡',
  '😺','😸','🐶','🐱','🐸','🦄','🐼','🦊','🍎','🍕',
];

const QUICK_REACTIONS = ['❤️','😂','😮','😢','😡','👍'];

// ── Emoji Picker (có scroll, khung cố định) ───────────────────────
function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'absolute', bottom: '60px', left: 0,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '16px', padding: '10px',
      width: '300px', height: '220px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      zIndex: 20, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        overflowY: 'auto', overflowX: 'hidden', flex: 1,
        display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '2px',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
        overscrollBehavior: 'contain',
      }}>
        {EMOJI_LIST.map(em => (
          <button key={em} onClick={() => onSelect(em)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '20px', padding: '4px', borderRadius: '6px',
            transition: 'background 0.12s', lineHeight: 1,
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >{em}</button>
        ))}
      </div>
    </div>
  );
}

// ── Camera Modal ────────────────────────────────────────────────
function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Request HD resolutions for high quality pixels
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setReady(true);
        }
      })
      .catch(() => setError('Không thể truy cập camera hoặc quyền bị từ chối.'));

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleCapture = () => {
    const canvas = canvasRef.current, video = videoRef.current;
    if (!canvas || !video) return;

    // Use actual stream resolution for maximum sharpness
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Mirror the canvas draw to match the user preview exactly
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Save with 98% super crisp quality
    onCapture(canvas.toDataURL('image/jpeg', 0.98));
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 10, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#15152a',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '24px',
          width: '680px',
          maxWidth: '100%',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
          animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>Chụp ảnh trực tiếp</h3>
            {ready && (
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#4ade80',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  animation: 'pulse 1.5s infinite',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ● LIVE HD
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
            ✕
          </button>
        </div>

        {/* Video stream container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            borderRadius: '16px',
            background: '#000',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          {error ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b', fontSize: '14px', fontWeight: 600, padding: '20px', textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)' // Mirror to display beautifully and naturally like a phone
              }}
            />
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              color: '#a0aec0',
              fontFamily: 'inherit',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#a0aec0'; }}
          >
            Hủy bỏ
          </button>
          {ready && (
            <button
              onClick={handleCapture}
              style={{
                flex: 2,
                padding: '12px',
                background: 'linear-gradient(135deg, #6c63ff, #5b53e0)',
                border: 'none',
                borderRadius: '14px',
                color: 'white',
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              📷 Bắt đầu chụp ảnh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Share Modal ─────────────────────────────────────────────────
function ShareModal({ message, friends, onSend, onClose }) {
  const [selected, setSelected] = useState([]);
  const [sent, setSent] = useState(false);

  const toggle = (uid) => setSelected(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);

  const handleSend = async () => {
    if (selected.length === 0) return;
    await Promise.all(selected.map(uid => onSend(uid, message)));
    setSent(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: '20px', width: '340px', maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>↗️ Chia sẻ tin nhắn</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }}></button>
        </div>

        {/* Preview */}
        <div style={{ background: 'var(--bg-input)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--text-secondary)', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {message.type === 'image' || message.content?.startsWith('data:image') ? '️ Ảnh' : message.content}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
          {friends.map(f => (
            <button key={f.userId} onClick={() => toggle(String(f.userId))} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
              borderRadius: '10px', border: `1px solid ${selected.includes(String(f.userId)) ? 'var(--primary)' : 'var(--border)'}`,
              background: selected.includes(String(f.userId)) ? 'rgba(108,99,255,0.1)' : 'none',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            }}>
              <Avatar src={f.avatar} initial={f.initial} color={colorOf(f.fullName)} size={36} />
              <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.fullName}</span>
              {selected.includes(String(f.userId)) && <span style={{ fontSize: '16px' }}></span>}
            </button>
          ))}
        </div>

        <button onClick={handleSend} disabled={selected.length === 0 || sent} style={{
          padding: '11px', background: sent ? 'var(--success)' : selected.length > 0 ? 'linear-gradient(135deg, var(--primary), #5b53e0)' : 'var(--bg-input)',
          border: 'none', borderRadius: '10px', color: selected.length > 0 || sent ? 'white' : 'var(--text-muted)',
          fontWeight: 700, fontFamily: 'inherit', cursor: selected.length > 0 ? 'pointer' : 'default', fontSize: '14px', transition: 'all 0.2s',
        }}>
          {sent ? ' Đã gửi!' : `Gửi${selected.length > 0 ? ` (${selected.length})` : ''}`}
        </button>
      </div>
    </div>
  );
}

// ── Message Context Menu ─────────────────────────────────────────
function MessageMenu({ x, y, onReact, onSaveImage, isImage, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: y, left: x });

  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  useEffect(() => {
    if (!ref.current) return;
    const parent = ref.current.offsetParent;
    const menuW = ref.current.offsetWidth || 200;
    const menuH = ref.current.offsetHeight || 170;
    const containerW = parent ? parent.offsetWidth : window.innerWidth;
    const containerH = parent ? parent.offsetHeight : window.innerHeight;
    const PADDING = 8;

    let left = x;
    let top = y;

    if (left + menuW + PADDING > containerW) left = containerW - menuW - PADDING;
    if (left < PADDING) left = PADDING;
    if (top + menuH + PADDING > containerH) top = containerH - menuH - PADDING;
    if (top < PADDING) top = PADDING;

    setPos({ top, left });
  }, [x, y]);

  const hasBottomMenu = !!isImage;

  return (
    <div ref={ref} style={{
      position: 'absolute', top: pos.top, left: pos.left,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '8px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 100, minWidth: hasBottomMenu ? '180px' : 'fit-content',
      animation: 'fadeIn 0.12s ease',
    }}>
      {/* Quick reactions */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: hasBottomMenu ? '4px 6px 8px' : '4px 6px',
        borderBottom: hasBottomMenu ? '1px solid var(--border)' : 'none',
        marginBottom: hasBottomMenu ? '4px' : '0'
      }}>
        {QUICK_REACTIONS.map(em => (
          <button key={em} className="reaction-btn-pop" onClick={(e) => { onReact(em, e); onClose(); }} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '20px', padding: '3px 4px', borderRadius: '6px', lineHeight: 1,
          }}>{em}</button>
        ))}
      </div>

      {/* Actions */}
      {isImage && <MenuBtn icon="⬇️" label="Lưu ảnh" onClick={() => { onSaveImage(); onClose(); }} />}
    </div>
  );
}

function MenuBtn({ icon, label, onClick, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
        background: hov ? (danger ? 'rgba(239,68,68,0.1)' : 'var(--bg-input)') : 'none',
        color: danger ? '#ef4444' : 'var(--text-primary)',
        fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', textAlign: 'left',
        transition: 'background 0.12s',
      }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      {label}
    </button>
  );
}

// ── ConversationView ───────────────────────────────────────────────
function ConversationView({ user, friend, friends, onBack, onlineUserIds, onNicknameChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, msg }
  const [shareMsg, setShareMsg] = useState(null);
  const [reactions, setReactions] = useState({}); // msgId -> emoji[]
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [particles, setParticles] = useState([]); // { id, x, y, char, delay, leftOffset }
  const bottomRef = useRef(null);
  const msgsContainerRef = useRef(null);
  const chatOuterRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const prevMsgCount = useRef(0);

  const { initiateCall, callStatus } = useCall();

  const spawnParticles = (emoji, clientX, clientY) => {
    if (!chatOuterRef.current) return;
    const rect = chatOuterRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    // Spawn 6 particles with random drift and staggered delays
    const newParticles = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + Math.random() + i,
      x: relX,
      y: relY - 10,
      char: emoji,
      delay: i * 0.05,
      leftOffset: (Math.random() - 0.5) * 100
    }));

    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1500);
  };

  const [nickname, setNickname] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [chatBg, setChatBg] = useState('');
  const [showBgModal, setShowBgModal] = useState(false);
  const [bgInputVal, setBgInputVal] = useState('');
  const [bgFilePreview, setBgFilePreview] = useState('');

  useEffect(() => {
    const n = localStorage.getItem(`sc_nickname_${user.id}_${friend.userId}`) || '';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNickname(n);
  }, [user.id, friend.userId]);

  const handleRenameClick = () => {
    setRenameVal(nickname);
    setShowRenameModal(true);
  };

  const handleSaveRename = () => {
    const cleanName = renameVal.trim();
    if (cleanName === '') {
      localStorage.removeItem(`sc_nickname_${user.id}_${friend.userId}`);
      setNickname('');
    } else {
      localStorage.setItem(`sc_nickname_${user.id}_${friend.userId}`, cleanName);
      setNickname(cleanName);
    }
    setShowRenameModal(false);
    if (onNicknameChange) onNicknameChange();
  };

  const handleClearChat = async () => {
    try {
      const uid = parseInt(user.id, 10);
      const fid = parseInt(friend.userId, 10);
      
      const { error } = await supabase
        .from('messages')
        .delete()
        .is('group_id', null)
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${fid}),and(sender_id.eq.${fid},receiver_id.eq.${uid})`);

      if (error) {
        console.error('Error clearing chat:', error);
        return;
      }

      setMessages([]);
      setShowClearConfirm(false);
      if (onNicknameChange) onNicknameChange();
    } catch (err) {
      console.error('Exception clearing chat:', err);
    }
  };

  const compressImage = (base64Str, maxWidth = 800, maxHeight = 800) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleBgFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result);
      setBgFilePreview(compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveBg = async (bgValue) => {
    try {
      await sendMessage(user.id, friend.userId, `[chat_background]:${bgValue}`, 'text');
      setChatBg(bgValue);
      setShowBgModal(false);
    } catch (err) {
      console.error('Error saving background:', err);
    }
  };

  const REACTIONS_KEY = `sc_reactions_${user.id}`;
  const loadReactions = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(REACTIONS_KEY) || '{}'); } catch { return {}; }
  }, [REACTIONS_KEY]);
  const saveReactions = (r) => localStorage.setItem(REACTIONS_KEY, JSON.stringify(r));

  const load = useCallback(async () => {
    const res = await getConversation(user.id, friend.userId);
    setMessages(res.messages || []);
    setChatBg(res.background || '');
    setReactions(loadReactions());
    await markAsRead(user.id, friend.userId);
  }, [user.id, friend.userId, loadReactions]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [load]);

  // Only auto-scroll when NEW messages arrive (not on initial load or poll refresh without new msgs)
  useEffect(() => {
    const container = msgsContainerRef.current;
    if (!container) return;
    const newCount = messages.length;
    if (newCount > prevMsgCount.current) {
      // Check if user is near bottom (within 120px)
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
      if (isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowScrollBtn(false);
      } else {
        setShowScrollBtn(true);
      }
    }
    prevMsgCount.current = newCount;
  }, [messages]);

  const handleScroll = () => {
    const container = msgsContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    setShowScrollBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  };

  const handleSendText = async (text) => {
    if (!text?.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(user.id, friend.userId, text.trim());
      setInput('');
      await load();
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const handleSendImage = async (dataUrl, caption) => {
    if (!dataUrl || sending) return;
    setSending(true);
    setImgPreview(null);
    try {
      await sendMessage(user.id, friend.userId, dataUrl, 'image');
      if (caption?.trim()) {
        await sendMessage(user.id, friend.userId, caption.trim());
        setInput('');
      }
      await load();
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(input); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgPreview(ev.target.result);
      // Scroll to bottom so preview bar is visible
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addEmoji = (em) => {
    setInput(prev => prev + em);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // Delete message
  const handleDelete = async (msgId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tin nhắn này?')) return;
    try {
      await deleteMessage(msgId);
      await load();
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  // React to message
  const handleReact = (msgId, emoji, e) => {
    const updated = { ...loadReactions() };
    const existing = updated[msgId] || [];
    if (existing.includes(emoji)) {
      updated[msgId] = existing.filter(e => e !== emoji);
    } else {
      updated[msgId] = [...existing, emoji];
    }
    saveReactions(updated);
    setReactions(updated);

    if (e && e.clientX && e.clientY) {
      spawnParticles(emoji, e.clientX, e.clientY);
    } else if (contextMenu && contextMenu.x && contextMenu.y) {
      spawnParticles(emoji, contextMenu.x, contextMenu.y);
    }
  };

  // Share message to other friends
  const handleShare = async (toUserId, msg) => {
    const content = msg.type === 'image' || msg.content?.startsWith('data:image')
      ? msg.content : `↗️ "${msg.content}"`;
    const type = msg.type === 'image' || msg.content?.startsWith('data:image') ? 'image' : 'text';
    await sendMessage(user.id, toUserId, content, type);
  };

  // Save image to disk
  const handleSaveImage = (msg) => {
    const url = msg.content;
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyconect_img_${msg.id || Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const openContextMenu = (e, msg) => {
    e.preventDefault();
    const outer = chatOuterRef.current;
    if (!outer) return;
    const rect = outer.getBoundingClientRect();

    const menuW = 200;
    const menuH = 170;
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    if (x + menuW + 8 > rect.width) x = rect.width - menuW - 8;
    if (x < 8) x = 8;
    if (y + menuH + 8 > rect.height) y = y - menuH - 8;
    if (y < 4) y = 4;

    setContextMenu({ x, y, msg });
  };

  // Group messages by date
  const groupedMsgs = [];
  let lastDate = null;
  messages.forEach(m => {
    const d = new Date(m.createdAt).toLocaleDateString('vi-VN');
    if (d !== lastDate) { groupedMsgs.push({ type: 'date', label: d }); lastDate = d; }
    groupedMsgs.push({ type: 'msg', data: m });
  });

  return (
    <div ref={chatOuterRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <style>{`
        @keyframes floatEmojiUp {
          0% {
            transform: translate3d(0, 0, 0) scale(0.3) rotate(0deg);
            opacity: 0;
          }
          12% {
            transform: translate3d(0, -20px, 0) scale(1.4) rotate(15deg);
            opacity: 1;
          }
          50% {
            transform: translate3d(calc(var(--dx) * 0.5), -80px, 0) scale(1.1) rotate(-15deg);
            opacity: 0.95;
          }
          100% {
            transform: translate3d(var(--dx), -160px, 0) scale(0.6) rotate(35deg);
            opacity: 0;
          }
        }
        .emoji-particle {
          position: absolute;
          pointer-events: none;
          font-size: 32px;
          z-index: 9999;
          animation: floatEmojiUp 1.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          user-select: none;
        }
        .reaction-btn-pop {
          transition: all 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }
        .reaction-btn-pop:hover {
          transform: scale(1.45) translateY(-5px) !important;
          text-shadow: 0 8px 16px rgba(0,0,0,0.3) !important;
        }
        .reaction-btn-pop:active {
          transform: scale(0.9) translateY(0) !important;
        }
        .reaction-bubble-pop {
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
          animation: popInReaction 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .reaction-bubble-pop:hover {
          transform: scale(1.22) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.22) !important;
        }
        @keyframes popInReaction {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .msg-container {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 12px;
          transition: background 0.15s ease;
        }
        .msg-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease, transform 0.15s ease;
          transform: scale(0.95);
        }
        .msg-container:hover .msg-actions {
          opacity: 1;
          pointer-events: auto;
          transform: scale(1);
        }
        .msg-action-btn {
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 13px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          padding: 0;
          line-height: 1;
        }
        .msg-action-btn:hover {
          transform: scale(1.18);
          background: var(--bg-input);
          color: var(--text-primary);
          border-color: var(--primary-light);
        }
        .msg-action-btn.danger:hover {
          color: #ff4d4d;
          border-color: #ff4d4d;
        }
      `}</style>

      {particles.map(p => (
        <span
          key={p.id}
          className="emoji-particle"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            animationDelay: `${p.delay}s`,
            '--dx': `${p.leftOffset}px`
          }}
        >
          {p.char}
        </span>
      ))}
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: '20px', padding: '4px 8px',
          borderRadius: '8px', transition: 'var(--transition)', lineHeight: 1,
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/>
                  <polyline points="12 19 5 12 12 5"/>
                </svg>
              </button>
        <Avatar src={friend.avatar} initial={friend.initial} color={colorOf(friend.fullName)} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{nickname || friend.fullName}</div>
          </div>
          {(() => {
            const isOnline = onlineUserIds.includes(String(friend.userId));
            return (
              <div style={{ fontSize: '12px', color: isOnline ? '#10b981' : '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? '#10b981' : '#ef4444' }} />
                {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
              </div>
            );
          })()}
        </div>

        {/* Cụm nút chức năng bên phải */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          {/* Nút gọi video */}
          <button
            onClick={() => initiateCall(friend)}
            title="Gọi video"
            style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6c63ff, #5b53e0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(108,99,255,0.4)', transition: 'all 0.2s', flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4zm-2 8H4a2 2 0 01-2-2V8a2 2 0 012-2h9a2 2 0 012 2v8a2 2 0 01-2 2z"/>
            </svg>
          </button>

          {/* Nút menu 3 gạch */}
          <button
            onClick={() => setShowMenuDropdown(prev => !prev)}
            title="Tùy chọn"
            style={{
              width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0,
              color: 'var(--text-primary)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showMenuDropdown && (
            <>
              {/* Overlay click to close */}
              <div 
                onClick={() => setShowMenuDropdown(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 999 }}
              />
              <div style={{
                position: 'absolute',
                top: '48px',
                right: '0',
                background: '#15152a',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                width: '160px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease-out'
              }}>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    handleRenameClick();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Đổi tên
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    setBgInputVal(chatBg.startsWith('data:') ? '' : chatBg);
                    setBgFilePreview(chatBg.startsWith('data:') ? chatBg : '');
                    setShowBgModal(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    fontFamily: 'inherit',
                    borderTop: '1px solid rgba(255, 255, 255, 0.04)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Đổi hình nền
                </button>
                <button
                  onClick={() => {
                    setShowMenuDropdown(false);
                    setShowClearConfirm(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    color: '#ff4d4d',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    fontFamily: 'inherit',
                    borderTop: '1px solid rgba(255, 255, 255, 0.04)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Xóa tin nhắn
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Popup thông báo từ chối / nhỡ máy */}
      {(callStatus === 'rejected' || callStatus === 'missed') && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: callStatus === 'rejected' ? 'rgba(239,68,68,0.95)' : 'rgba(100,100,120,0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '14px', padding: '12px 20px',
          fontSize: '13px', fontWeight: 600, color: '#fff',
          zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.25s ease',
        }}>
          {callStatus === 'rejected' ? '📵 Cuộc gọi bị từ chối' : '📵 Cuộc gọi nhỡ'}
        </div>
      )}

      {/* Messages */}
      <div
        ref={msgsContainerRef}
        onScroll={handleScroll}
        className="msgs-no-scrollbar"
        style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: '4px',
          scrollbarWidth: 'none', // hide scrollbar Firefox
          msOverflowStyle: 'none', // hide scrollbar IE
          position: 'relative',
          overscrollBehavior: 'contain',
          background: chatBg 
            ? `linear-gradient(rgba(10, 10, 20, 0.6), rgba(10, 10, 20, 0.6)), url(${chatBg}) center/cover no-repeat`
            : undefined,
          transition: 'background 0.3s ease',
        }}>
        {groupedMsgs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
            Bắt đầu nhắn tin với <strong>{nickname || friend.fullName}</strong>!
          </div>
        )}
        {groupedMsgs.map((item, idx) => {
          if (item.type === 'date') return (
            <div key={`date-${idx}`} style={{ textAlign: 'center', margin: '12px 0 8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ background: 'var(--bg)', padding: '2px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>{item.label}</span>
            </div>
          );
          const m = item.data;
          const isMine = String(m.fromUserId) === String(user.id);
          const isImage = m.type === 'image' || m.content?.startsWith('data:image');
          const msgReactions = reactions[m.id] || [];

          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>
              {!isMine && (
                <div style={{ marginRight: '8px', alignSelf: 'flex-end', marginBottom: '18px' }}>
                  <Avatar src={friend.avatar} initial={friend.initial} color={colorOf(friend.fullName)} size={28} />
                </div>
              )}
              <div className="msg-container" style={{
                flexDirection: isMine ? 'row' : 'row-reverse',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                maxWidth: '75%'
              }}>
                {/* Actions group */}
                <div className="msg-actions" style={{ display: 'flex', gap: '4px' }}>
                  <button className="msg-action-btn" title="Thả cảm xúc" onClick={(e) => openContextMenu(e, m)}>
                    😊
                  </button>
                  <button className="msg-action-btn" title="Chia sẻ" onClick={() => setShareMsg(m)}>
                    ↗️
                  </button>
                  {isMine && (
                    <button className="msg-action-btn danger" title="Xóa tin nhắn" onClick={() => handleDelete(m.id)}>
                      🗑️
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', gap: '2px' }}>
                  <div
                    onContextMenu={(e) => openContextMenu(e, m)}
                    onDoubleClick={(e) => openContextMenu(e, m)}
                    style={{
                      background: isMine ? 'linear-gradient(135deg, var(--primary), #5b53e0)' : 'var(--bg-input)',
                      color: isMine ? 'white' : 'var(--text-primary)',
                      padding: isImage ? '4px' : '9px 14px',
                      borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      fontSize: '14px', lineHeight: 1.5, wordBreak: 'break-word',
                      border: isMine ? 'none' : '1px solid var(--border)',
                      cursor: 'context-menu', position: 'relative',
                    }}>
                    {isImage ? (
                      <img src={m.content} alt="Ảnh" style={{ maxWidth: '220px', maxHeight: '220px', borderRadius: '12px', display: 'block', objectFit: 'cover' }} />
                    ) : m.content}
                  </div>

                  {/* Reactions */}
                  {msgReactions.length > 0 && (
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
                      {msgReactions.map((em, i) => (
                        <span key={i} className="reaction-bubble-pop" onClick={(e) => handleReact(m.id, em, e)} style={{
                          background: 'var(--bg-card)', border: '1px solid var(--border)',
                          borderRadius: '10px', padding: '1px 6px', fontSize: '14px', cursor: 'pointer',
                          display: 'inline-block',
                        }}>{em}</span>
                      ))}
                    </div>
                  )}

                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '0 2px' }}>
                    {fmtFull(m.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button onClick={scrollToBottom} style={{
          position: 'absolute',
          bottom: imgPreview ? '160px' : '80px',
          right: '24px',
          width: '40px', height: '40px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), #5b53e0)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(108,99,255,0.5)',
          color: 'white', fontSize: '18px',
          zIndex: 10, transition: 'transform 0.15s',
          animation: 'fadeIn 0.2s ease',
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          title="Cuộn xuống dưới"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      )}

      {/* Image preview + caption */}
      {imgPreview && (
        <div style={{ padding: '10px 20px 0', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img src={imgPreview} alt="preview" style={{ height: '60px', width: '60px', borderRadius: '8px', objectFit: 'cover', display: 'block' }} />
              <button onClick={() => setImgPreview(null)} style={{
                position: 'absolute', top: '-6px', right: '-6px',
                background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                width: '18px', height: '18px', cursor: 'pointer', color: 'white',
                fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}>✕</button>
            </div>
            <div style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)' }}>
              Thêm chú thích (tuỳ chọn) hoặc gửi ảnh riêng
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingBottom: '10px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendImage(imgPreview, input); }}
              placeholder="Thêm chú thích..."
              style={{
                flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: '20px', padding: '8px 14px',
                color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit',
                outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => handleSendImage(imgPreview, null)}
              disabled={sending}
              title="Gửi ảnh riêng"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', fontSize: '12px', flexShrink: 0 }}>
              Chỉ gửi ảnh
            </button>
            <button
              onClick={() => handleSendImage(imgPreview, input)}
              disabled={sending}
              title="Gửi ảnh + tin nhắn"
              style={{ background: 'linear-gradient(135deg, var(--primary), #5b53e0)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '12px', flexShrink: 0 }}>
              Gửi {input.trim() ? '+ tin nhắn' : 'ảnh'}
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: '12px 20px', borderTop: '1px solid var(--border)',
        background: 'var(--bg-card)', flexShrink: 0, position: 'relative',
      }}>
        {showEmoji && <EmojiPicker onSelect={addEmoji} onClose={() => setShowEmoji(false)} />}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <button onClick={() => setShowEmoji(v => !v)} title="Biểu cảm" style={{
            background: showEmoji ? 'rgba(108,99,255,0.15)' : 'var(--bg-input)',
            border: '1px solid var(--border)', borderRadius: '12px',
            width: '40px', height: '40px', cursor: 'pointer', fontSize: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'var(--transition)', flexShrink: 0,
            color: showEmoji ? 'var(--primary-light)' : 'var(--text-muted)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()} title="Gửi ảnh" style={{
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: '12px', width: '40px', height: '40px', cursor: 'pointer', fontSize: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'var(--transition)', flexShrink: 0, color: 'var(--text-muted)',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          <button onClick={() => setShowCamera(true)} title="Chụp ảnh" style={{
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: '12px', width: '40px', height: '40px', cursor: 'pointer', fontSize: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'var(--transition)', flexShrink: 0, color: 'var(--text-muted)',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nhập tin nhắn..."
            rows={1}
            style={{
              flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '10px 16px', resize: 'none',
              color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit',
              outline: 'none', lineHeight: 1.5, maxHeight: '100px', overflowY: 'auto',
              overscrollBehavior: 'contain',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />

          <button onClick={() => handleSendText(input)} disabled={!input.trim() || sending} title="Gửi (Enter)" style={{
            background: input.trim() ? 'linear-gradient(135deg, var(--primary), #5b53e0)' : 'var(--bg-input)',
            border: 'none', borderRadius: '50%', width: '40px', height: '40px',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', flexShrink: 0, transition: 'var(--transition)',
            opacity: input.trim() ? 1 : 0.4, color: input.trim() ? 'white' : 'var(--text-muted)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <MessageMenu
          x={contextMenu.x} y={contextMenu.y}
          isImage={contextMenu.msg.type === 'image' || contextMenu.msg.content?.startsWith('data:image')}
          onReact={(em, e) => handleReact(contextMenu.msg.id, em, e)}
          onSaveImage={() => handleSaveImage(contextMenu.msg)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Share modal */}
      {shareMsg && (
        <ShareModal
          message={shareMsg}
          friends={friends.filter(f => String(f.userId) !== String(friend.userId))}
          onSend={handleShare}
          onClose={() => setShareMsg(null)}
        />
      )}

      {showCamera && <CameraModal onCapture={(d) => {
        setShowCamera(false);
        setImgPreview(d);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }} onClose={() => setShowCamera(false)} />}

      {showRenameModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 10, 20, 0.75)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={() => setShowRenameModal(false)}
        >
          <div
            style={{
              background: '#15152a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '28px',
              width: '400px',
              maxWidth: '100%',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#fff' }}>Đổi biệt danh</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Đặt biệt danh cho <strong>{friend.fullName}</strong>. Biệt danh này sẽ hiển thị thay thế cho tên thật trong tin nhắn và thông báo.
            </p>
            
            <input
              type="text"
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              placeholder="Nhập biệt danh..."
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveRename();
                if (e.key === 'Escape') setShowRenameModal(false);
              }}
              style={{
                width: '100%',
                background: 'var(--bg-input, #0e0e1e)',
                border: '1px solid var(--border, rgba(255,255,255,0.1))',
                borderRadius: '14px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                marginBottom: '24px',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--primary, #6c63ff)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border, rgba(255,255,255,0.1))'}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowRenameModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  color: '#a0aec0',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#a0aec0'; }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveRename}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, var(--primary, #6c63ff), #5b53e0)',
                  border: 'none',
                  borderRadius: '14px',
                  color: 'white',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '14px',
                  boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 10, 20, 0.75)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            style={{
              background: '#15152a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '28px',
              width: '400px',
              maxWidth: '100%',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#fff' }}>Xóa tin nhắn?</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa toàn bộ lịch sử tin nhắn với <strong>{nickname || friend.fullName}</strong> không? Hành động này không thể hoàn tác.
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  color: '#a0aec0',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#a0aec0'; }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleClearChat}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: '14px',
                  color: 'white',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '14px',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Xóa sạch
              </button>
            </div>
          </div>
        </div>
      )}

      {showBgModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 10, 20, 0.75)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={() => setShowBgModal(false)}
        >
          <div
            style={{
              background: '#15152a',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '28px',
              width: '420px',
              maxWidth: '100%',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#fff' }}>Đổi hình nền</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Thay đổi hình nền trò chuyện giữa bạn và <strong>{nickname || friend.fullName}</strong>. Thay đổi này sẽ hiển thị ở cả hai bên thiết bị.
            </p>

            {/* Vùng chọn ảnh từ thiết bị */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '2px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'var(--primary, #6c63ff)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                Chọn ảnh từ thiết bị
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBgFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Vùng dán URL ảnh */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>
                Hoặc nhập liên kết ảnh
              </label>
              <input
                type="text"
                value={bgInputVal}
                onChange={e => {
                  setBgInputVal(e.target.value);
                  setBgFilePreview('');
                }}
                placeholder="https://example.com/image.jpg"
                style={{
                  width: '100%',
                  background: 'var(--bg-input, #0e0e1e)',
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--primary, #6c63ff)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border, rgba(255,255,255,0.1))'}
              />
            </div>

            {/* Xem trước ảnh nền */}
            {(bgFilePreview || bgInputVal) && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>
                  Xem trước hình nền
                </label>
                <div
                  style={{
                    width: '100%',
                    height: '120px',
                    borderRadius: '14px',
                    background: `linear-gradient(rgba(10, 10, 20, 0.5), rgba(10, 10, 20, 0.5)), url(${bgFilePreview || bgInputVal}) center/cover no-repeat`,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleSaveBg('')}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'none',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '14px',
                  color: '#ef4444',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '4px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'none';
                }}
              >
                Khôi phục mặc định
              </button>
              
              <button
                onClick={() => setShowBgModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  color: '#a0aec0',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#a0aec0';
                }}
              >
                Hủy bỏ
              </button>
              
              <button
                onClick={() => handleSaveBg(bgFilePreview || bgInputVal)}
                disabled={!bgFilePreview && !bgInputVal}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, var(--primary, #6c63ff), #5b53e0)',
                  border: 'none',
                  borderRadius: '14px',
                  color: 'white',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '14px',
                  boxShadow: '0 4px 15px rgba(108, 99, 255, 0.3)',
                  transition: 'all 0.2s',
                  opacity: (!bgFilePreview && !bgInputVal) ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  if (bgFilePreview || bgInputVal) e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={e => {
                  if (bgFilePreview || bgInputVal) e.currentTarget.style.opacity = '1';
                }}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .msgs-no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ── FriendList ─────────────────────────────────────────────────────
function FriendList({ user, friends, onSelect, lastMessages, onlineUserIds }) {
  const [search, setSearch] = useState('');
  const filtered = friends.filter(f =>
    !search.trim() || f.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: '12px 16px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '10px 16px', transition: 'border-color 0.2s',
        }}>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}></span>
          <input
            placeholder="Tìm kiếm bạn bè..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'none', border: 'none', outline: 'none', flex: 1, color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
            {friends.length === 0 ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>Chưa có bạn bè nào</div>
                <Link to="/friends" style={{ color: 'var(--primary-light)', textDecoration: 'none', fontSize: '13px' }}>Tìm bạn bè ngay</Link>
              </>
            ) : 'Không tìm thấy kết quả.'}
          </div>
        ) : (() => {
          const sortedFiltered = [...filtered].sort((a, b) => {
            const aOn = onlineUserIds.includes(String(a.userId)) ? 1 : 0;
            const bOn = onlineUserIds.includes(String(b.userId)) ? 1 : 0;
            return bOn - aOn; // Online first
          });
          return sortedFiltered.map(f => {
            const last = lastMessages[String(f.userId)];
            const unread = getUnreadCount(user.id, f.userId);
            const isOnline = onlineUserIds.includes(String(f.userId));
            const nickname = localStorage.getItem(`sc_nickname_${user.id}_${f.userId}`) || f.fullName;
            return (
              <button key={f.requestId} onClick={() => onSelect(f)} style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', textAlign: 'left', transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar src={f.avatar} initial={f.initial} color={colorOf(f.fullName)} size={48} />
                  <div style={{
                    position: 'absolute',
                    bottom: 1,
                    right: 1,
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isOnline ? '#10b981' : '#ef4444',
                    border: '2px solid var(--bg-card)',
                    boxShadow: isOnline ? '0 0 6px #10b981' : 'none'
                  }} />
                </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <span style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nickname}</span>
                  {last && <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{fmtTime(last.createdAt)}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span style={{ fontSize: '13px', color: unread > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', fontWeight: unread > 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {last
                      ? (last.type === 'image' || last.content?.startsWith('data:image')
                        ? (String(last.fromUserId) === String(user.id) ? 'Bạn đã gửi ảnh ️' : 'Đã gửi ảnh ️')
                        : (String(last.fromUserId) === String(user.id) ? 'Bạn: ' : '') + last.content)
                      : 'Bắt đầu nhắn tin...'}
                  </span>
                  {unread > 0 && (
                    <span style={{ background: 'var(--primary)', color: 'white', fontSize: '11px', fontWeight: 800, padding: '2px 7px', borderRadius: '10px', flexShrink: 0, minWidth: '20px', textAlign: 'center' }}>{unread}</span>
                  )}
                </div>
              </div>
            </button>
          );
        });
      })()}
      </div>
    </div>
  );
}

// ── Main Chat Page ─────────────────────────────────────────────────
export default function Chat() {
  const { isAuth, user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  // Subscribe to real-time presence channel
  useEffect(() => {
    if (!user?.id) return;
    // eslint-disable-next-line no-undef
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id.toString(),
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.keys(state);
        setOnlineUserIds(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id.toString(),
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  const [selectedFriend, setSelectedFriend] = useState(null);

  useEffect(() => {
    if (selectedFriend?.userId) {
      sessionStorage.setItem('active_chat_friend_id', String(selectedFriend.userId));
    } else {
      sessionStorage.removeItem('active_chat_friend_id');
    }
    return () => {
      sessionStorage.removeItem('active_chat_friend_id');
    };
  }, [selectedFriend]);

  const [lastMessages, setLastMessages] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { if (!isAuth) { navigate('/login'); } }, [isAuth, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    const refresh = async () => {
      try {
        await refreshCache(user.id);
        const list = await getFriends(String(user.id));
        setFriends(list);
        const lm = getLastMessages(user.id);
        setLastMessages(lm);
        const total = list.reduce((acc, f) => acc + getUnreadCount(user.id, f.userId), 0);
        setTotalUnread(total);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [user]);

  if (!isAuth || !user) return null;

  return (
    <AppLayout hideSidebar={true}>
      <div style={{
        flex: 1, maxWidth: '1000px', width: '100%', margin: isMobile ? '0 auto' : '16px auto',
        padding: isMobile ? '0' : '0 16px', display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : (selectedFriend ? '320px 1fr' : '1fr'),
        gap: '0', height: isMobile ? 'calc(100vh - 64px)' : 'calc(100vh - 100px)',
      }}>
        {(!isMobile || !selectedFriend) && (
          <div style={{
            background: 'var(--bg-card)', border: isMobile ? 'none' : '1px solid var(--border)',
            borderRadius: isMobile ? '0' : (selectedFriend ? '16px 0 0 16px' : '16px'),
            overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg-input)', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <Link to="/" style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 122, 0, 0.08)',
                border: '1px solid rgba(255, 122, 0, 0.25)',
                color: 'var(--secondary)',
                fontSize: '12px',
                fontWeight: 700,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 122, 0, 0.18)';
                e.currentTarget.style.borderColor = 'var(--secondary)';
                e.currentTarget.style.transform = 'translateX(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 122, 0, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 122, 0, 0.25)';
                e.currentTarget.style.transform = 'none';
              }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/>
                  <polyline points="12 19 5 12 12 5"/>
                </svg>
                Quay lại
              </Link>
              <span style={{ flex: 1, fontWeight: 700, fontSize: '16px' }}>Tin nhắn</span>
              {totalUnread > 0 && (
                <span style={{
                  background: 'linear-gradient(135deg, var(--primary), #5b53e0)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  boxShadow: '0 2px 8px rgba(108,99,255,0.45)',
                  letterSpacing: '0.3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}>
                  <span style={{ fontSize: '10px' }}>🔴</span>
                  {totalUnread} tin mới
                </span>
              )}
            </div>

            {loading ? (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '8px' }} />
                  Đang tải...
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <FriendList user={user} friends={friends} onSelect={setSelectedFriend} lastMessages={lastMessages} onlineUserIds={onlineUserIds} />
              </div>
            )}
          </div>
        )}

        {selectedFriend && (
          <div style={{
            background: 'var(--bg-card)',
            borderTop: isMobile ? 'none' : '1px solid var(--border)',
            borderRight: isMobile ? 'none' : '1px solid var(--border)',
            borderBottom: isMobile ? 'none' : '1px solid var(--border)',
            borderLeft: 'none',
            borderRadius: isMobile ? '0' : '0 16px 16px 0',
            overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%',
          }}>
            <ConversationView
              user={user}
              friend={selectedFriend}
              friends={friends}
              onBack={() => setSelectedFriend(null)}
              onlineUserIds={onlineUserIds}
              onNicknameChange={() => setFriends([...friends])}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}