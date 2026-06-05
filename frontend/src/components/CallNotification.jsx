// src/components/CallNotification.jsx
// Popup thông báo cuộc gọi đến — hiển thị overlay trên MỌI trang
import { useEffect, useRef } from 'react';
import { useCall } from '../context/CallContext';

const AVATAR_COLORS = ['#6c63ff','#ff6b9d','#3ecfcf','#f59e0b','#22c55e','#ef4444','#8b5cf6'];
const colorOf = (str) => AVATAR_COLORS[(str||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0) % AVATAR_COLORS.length];

function Avatar({ src, name = '', size = 80 }) {
  const initial = (name || '?')[0].toUpperCase();
  const color = colorOf(name);
  if (src) return (
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.2)' }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}, ${color}99)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 800, color: '#fff',
      border: '3px solid rgba(255,255,255,0.2)',
      flexShrink: 0,
    }}>{initial}</div>
  );
}

// Nhạc chuông bằng Web Audio API
function useRingTone(active) {
  const audioCtxRef = useRef(null);
  const nodesRef = useRef([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active) {
      nodesRef.current.forEach(n => { try { n.stop(); } catch { /* empty */ } });
      nodesRef.current = [];
      clearInterval(intervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      return;
    }

    const playRing = () => {
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        // Tạo âm thanh chuông điện thoại 2 nốt
        const notes = [880, 1100];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
          gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.15 + 0.05);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.12);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.13);
          nodesRef.current.push(osc);
        });
      } catch { /* ignore */ }
    };

    playRing();
    intervalRef.current = setInterval(playRing, 1800);

    return () => {
      clearInterval(intervalRef.current);
      nodesRef.current.forEach(n => { try { n.stop(); } catch { /* empty */ } });
      nodesRef.current = [];
    };
  }, [active]);
}

export default function CallNotification() {
  const { incomingCall, acceptCall, rejectCall } = useCall();
  useRingTone(!!incomingCall);

  if (!incomingCall) return null;

  return (
    <>
      {/* Style animations */}
      <style>{`
        @keyframes cn-slideIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes cn-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
          50%       { box-shadow: 0 0 0 18px rgba(34, 197, 94, 0); }
        }
        @keyframes cn-reject-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
          50%       { box-shadow: 0 0 0 18px rgba(239, 68, 68, 0); }
        }
        @keyframes cn-avatar-glow {
          0%, 100% { box-shadow: 0 0 0 4px rgba(108,99,255,0.3), 0 0 30px rgba(108,99,255,0.2); }
          50%       { box-shadow: 0 0 0 8px rgba(108,99,255,0.5), 0 0 50px rgba(108,99,255,0.35); }
        }
        @keyframes cn-wave {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      {/* Overlay backdrop + căn giữa tuyệt đối — LUÔN CHÍNH GIỮA MÀN HÌNH */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}>
        {/* Wrapper animation */}
        <div style={{
          width: '340px',
          maxWidth: '95vw',
          flexShrink: 0,
          animation: 'cn-slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}>
          {/* Card nội dung */}
          <div style={{
            background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f1b35 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '28px',
            padding: '36px 28px 28px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(108,99,255,0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0',
            textAlign: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Decorative gradient top */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
              background: 'linear-gradient(90deg, #6c63ff, #ff6b9d, #3ecfcf)',
            }} />

            {/* Status label */}
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
              marginBottom: '20px',
            }}>
              📹 Gọi Video Đến
            </div>

            {/* Avatar với sóng động */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  position: 'absolute', inset: '-12px',
                  borderRadius: '50%',
                  border: '2px solid rgba(108,99,255,0.4)',
                  animation: `cn-wave 2s ease-out ${i * 0.6}s infinite`,
                }} />
              ))}
              <div style={{
                borderRadius: '50%',
                animation: 'cn-avatar-glow 2s ease-in-out infinite',
              }}>
                <Avatar src={incomingCall.callerAvatar} name={incomingCall.callerName} size={88} />
              </div>
            </div>

            {/* Tên người gọi */}
            <div style={{
              fontSize: '22px', fontWeight: 800,
              color: '#ffffff',
              marginBottom: '6px',
              letterSpacing: '-0.02em',
            }}>
              {incomingCall.callerName}
            </div>

            <div style={{
              fontSize: '13px', color: 'rgba(255,255,255,0.5)',
              marginBottom: '32px', fontWeight: 500,
            }}>
              Đang gọi video cho bạn...
            </div>

            {/* Nút hành động */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              {/* Từ chối */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <button
                  id="btn-reject-call"
                  onClick={rejectCall}
                  style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'cn-reject-pulse 1.5s ease-in-out infinite',
                    transition: 'transform 0.15s',
                    fontSize: '26px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Từ chối"
                >
                  📵
                </button>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Từ chối</span>
              </div>

              {/* Chấp nhận */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <button
                  id="btn-accept-call"
                  onClick={acceptCall}
                  style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'cn-ring-pulse 1.5s ease-in-out infinite',
                    transition: 'transform 0.15s',
                    fontSize: '26px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  title="Chấp nhận"
                >
                  📹
                </button>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Chấp nhận</span>
              </div>
            </div>
          </div>{/* end card */}
        </div>{/* end animation wrapper */}
      </div>{/* end overlay */}
    </>
  );
}
