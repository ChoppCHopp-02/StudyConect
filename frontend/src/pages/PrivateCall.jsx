/* eslint-disable no-undef */
// src/pages/PrivateCall.jsx
// Trang gọi video riêng tư 1-1 — hoàn toàn khác với Meetroom
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import { sendMessage } from '../services/chatServiceTEMP.js';
import { useCall } from '../context/CallContext';

/* ─── Màu avatar ──────────────────────────────────────────── */
const COLORS = ['#1A1A1A','#3A3A3A','#2E2E2E','#4A4A4A','#222222','#383838','#2A2A2A'];
const colorOf = s => COLORS[(s||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0) % COLORS.length];

/* ─── Avatar ─────────────────────────────────────────────── */
function Avatar({ src, name = '', size = 80 }) {
  const initial = (name || '?')[0].toUpperCase();
  const color = colorOf(name);
  if (src) return (
    <img src={src} alt={name} style={{
      width: size, height: size, borderRadius: '50%',
      objectFit: 'cover', border: '3px solid rgba(255,255,255,0.15)',
    }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}, ${color}99)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff',
      border: '3px solid rgba(255,255,255,0.15)',
    }}>{initial}</div>
  );
}


/* ─── ICE Servers — STUN + TURN (cross-network support) ── */
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

/* ─── Hook WebRTC cho cuộc gọi 1-1 ─────────────────────── */
function usePrivateWebRTC({ callId, user, mode, micOn, camOn, onHangup }) {
  const [localStream, setLocalStream]   = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connected, setConnected]       = useState(false);
  const [error, setError]               = useState(null);

  const pcRef             = useRef(null);
  const localRef          = useRef(null);
  const channelRef        = useRef(null);
  const micOnRef          = useRef(micOn);
  const camOnRef          = useRef(camOn);
  const readyIntervalRef  = useRef(null);
  const iceCandidateQueue = useRef([]); // Queue ICE trước khi setRemoteDescription

  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { camOnRef.current = camOn; }, [camOn]);

  // Unique peer ID
  const myId = useMemo(
    // eslint-disable-next-line react-hooks/purity
    () => `${user?.id || 'u'}_${Math.random().toString(36).slice(2, 6)}`,
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Bắt đầu media
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });
      localRef.current = stream;
      setLocalStream(stream);
      stream.getAudioTracks().forEach(t => { t.enabled = micOnRef.current; });
      stream.getVideoTracks().forEach(t => { t.enabled = camOnRef.current; });
      return stream;
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[PrivateCall] Full media failed, trying audio only:', err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        localRef.current = stream;
        setLocalStream(stream);
        stream.getAudioTracks().forEach(t => { t.enabled = micOnRef.current; });
        return stream;
      } catch (err2) {
        if (import.meta.env.DEV) console.error('[PrivateCall] Audio-only also failed:', err2);
        setError(err.name === 'NotAllowedError' || err2.name === 'NotAllowedError'
          ? 'Vui lòng cấp quyền camera và microphone để gọi video.'
          : 'Không thể truy cập camera/microphone.');
        return null;
      }
    }
  }, []);

  // Toggle mic/cam
  useEffect(() => {
    if (!localRef.current) return;
    localRef.current.getAudioTracks().forEach(t => { t.enabled = micOn; });
    channelRef.current?.send({
      type: 'broadcast', event: 'pc_signal',
      payload: { type: 'state', from: myId, micOn, camOn: camOnRef.current }
    });
  }, [micOn]); // eslint-disable-line

  useEffect(() => {
    if (!localRef.current) return;
    localRef.current.getVideoTracks().forEach(t => { t.enabled = camOn; });
    channelRef.current?.send({
      type: 'broadcast', event: 'pc_signal',
      payload: { type: 'state', from: myId, camOn, micOn: micOnRef.current }
    });
  }, [camOn]); // eslint-disable-line

  // Main signaling
  useEffect(() => {
    if (!callId || !user?.id) return;

    let cancelled = false;
    let ch = null;

    const startCall = async () => {
      // 1. Khởi động camera và mic trước
      const stream = await startMedia();
      if (!stream || cancelled) return;

      // 2. Sau khi đã có local stream, mới kết nối kênh Supabase
      ch = supabase.channel(`private_call_${callId}`, {
        config: { broadcast: { self: false } }
      });
      channelRef.current = ch;

      const createPC = (localStreamObj) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        if (localStreamObj) {
          localStreamObj.getTracks().forEach(t => pc.addTrack(t, localStreamObj));
        }

        const rs = new MediaStream();
        pc.ontrack = (e) => {
          rs.getTracks().forEach(t => { if (t.kind === e.track.kind) rs.removeTrack(t); });
          rs.addTrack(e.track);
          setRemoteStream(new MediaStream(rs.getTracks()));
          setConnected(true);
          if (readyIntervalRef.current) {
            clearInterval(readyIntervalRef.current);
            readyIntervalRef.current = null;
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            ch.send({
              type: 'broadcast', event: 'pc_signal',
              payload: { type: 'ice', from: myId, candidate: e.candidate }
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
            setConnected(false);
            setRemoteStream(null);
          }
          if (pc.connectionState === 'connected') {
            if (readyIntervalRef.current) {
              clearInterval(readyIntervalRef.current);
              readyIntervalRef.current = null;
            }
          }
        };

        return pc;
      };

      ch.on('broadcast', { event: 'pc_signal' }, async ({ payload: msg }) => {
        if (!msg || msg.from === myId || cancelled) return;

        if (msg.type === 'ready') {
          if (mode === 'caller' && !pcRef.current) {
            const currentStream = localRef.current;
            const pc = createPC(currentStream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ch.send({
              type: 'broadcast', event: 'pc_signal',
              payload: { type: 'offer', from: myId, offer }
            });
          }
        }

        if (msg.type === 'offer') {
          const currentStream = localRef.current;
          const pc = createPC(currentStream);
          await pc.setRemoteDescription(msg.offer);
          // Flush ICE candidates đã queue trước khi setRemoteDescription
          while (iceCandidateQueue.current.length > 0) {
            const c = iceCandidateQueue.current.shift();
            await pc.addIceCandidate(c).catch(() => {});
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ch.send({
            type: 'broadcast', event: 'pc_signal',
            payload: { type: 'answer', from: myId, answer }
          });
          setConnected(true);
          if (readyIntervalRef.current) {
            clearInterval(readyIntervalRef.current);
            readyIntervalRef.current = null;
          }
        }

        if (msg.type === 'answer') {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(msg.answer);
            // Flush ICE candidates đã queue trước khi setRemoteDescription
            while (iceCandidateQueue.current.length > 0) {
              const c = iceCandidateQueue.current.shift();
              await pcRef.current.addIceCandidate(c).catch(() => {});
            }
            setConnected(true);
            if (readyIntervalRef.current) {
              clearInterval(readyIntervalRef.current);
              readyIntervalRef.current = null;
            }
          }
        }

        if (msg.type === 'ice') {
          const pc = pcRef.current;
          if (pc && pc.remoteDescription) {
            // Remote description đã set → thêm ngay
            pc.addIceCandidate(msg.candidate).catch(() => {});
          } else {
            // Chưa có remote description → queue lại
            iceCandidateQueue.current.push(msg.candidate);
          }
        }

        if (msg.type === 'hangup') {
          setConnected(false);
          setRemoteStream(null);
          if (onHangup) onHangup();
        }
      });

      ch.subscribe(async (status) => {
        if (status !== 'SUBSCRIBED' || cancelled) return;

        // Gửi ready ngay khi subscribe xong
        ch.send({
          type: 'broadcast', event: 'pc_signal',
          payload: { type: 'ready', from: myId }
        });

        // Gửi lại mỗi 3s nếu chưa kết nối (tăng từ 1.5s để tránh Supabase Broadcast rate limit)
        readyIntervalRef.current = setInterval(() => {
          if (pcRef.current?.connectionState === 'connected' || pcRef.current?.iceConnectionState === 'connected') {
            clearInterval(readyIntervalRef.current);
            readyIntervalRef.current = null;
            return;
          }
          ch.send({
            type: 'broadcast', event: 'pc_signal',
            payload: { type: 'ready', from: myId }
          });
        }, 3000);
      });
    };

    startCall();

    return () => {
      cancelled = true;
      if (readyIntervalRef.current) {
        clearInterval(readyIntervalRef.current);
        readyIntervalRef.current = null;
      }
      if (ch) {
        ch.send({
          type: 'broadcast', event: 'pc_signal',
          payload: { type: 'hangup', from: myId }
        });
        supabase.removeChannel(ch);
      }
      pcRef.current?.close();
      pcRef.current = null;
      localRef.current?.getTracks().forEach(t => t.stop());
      localRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  const hangup = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast', event: 'pc_signal',
        payload: { type: 'hangup', from: myId }
      });
    }
  }, [myId]);

  return { localStream, remoteStream, connected, error, hangup };
}

/* ─── Nút điều khiển ─────────────────────────────────────── */
function CtrlBtn({ onClick, title, active = true, danger = false, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: danger ? 64 : 56, height: danger ? 64 : 56,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '22px',
        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        background: danger
          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
          : active
            ? (hov ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)')
            : (hov ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.12)'),
        // eslint-disable-next-line no-dupe-keys
        border: danger ? 'none' : `1.5px solid ${active ? 'rgba(255,255,255,0.12)' : 'rgba(239,68,68,0.35)'}`,
        boxShadow: danger ? '0 4px 14px rgba(239,68,68,0.4)' : 'none',
        transform: hov ? (danger ? 'scale(1.15) rotate(-10deg)' : 'scale(1.1)') : 'scale(1)',
        color: danger ? '#fff' : active ? '#fff' : '#ef4444',
        animation: danger ? 'pc-reject-pulse 1.5s ease-in-out infinite' : 'none',
      }}
    >
      {children}
    </button>
  );
}

/* ─── VideoTile ──────────────────────────────────────────── */
function VideoTile({ stream, name, avatar, muted = false, camOff = false, mirrored = false, style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream && !camOff) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream, camOff]);

  const isConnecting = !stream;

  return (
    <div style={{
      position: 'relative',
      background: '#0a0a1a',
      borderRadius: '20px',
      overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>
      {stream && !camOff ? (
        <video
          ref={ref}
          autoPlay playsInline muted={muted}
          disablePictureInPicture
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: mirrored ? 'scaleX(-1)' : 'none',
          }}
        />
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '20px',
          background: `radial-gradient(circle at center, ${colorOf(name)}22 0%, #0a0a1a 70%)`,
          width: '100%', height: '100%',
          justifyContent: 'center',
        }}>
          <div style={{ position: 'relative', marginBottom: isConnecting ? '10px' : '0px' }}>
            {isConnecting && [0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute', inset: '-12px',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.4)',
                animation: `pc-wave 2s ease-out ${i * 0.6}s infinite`,
              }} />
            ))}
            <div style={{
              borderRadius: '50%',
              animation: isConnecting ? 'pc-avatar-glow 2s ease-in-out infinite' : 'none',
              border: '3px solid rgba(255,255,255,0.2)',
              display: 'inline-flex',
              overflow: 'hidden',
            }}>
              <Avatar src={avatar} name={name} size={isConnecting ? 88 : 80} />
            </div>
          </div>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            {camOff ? 'Camera tắt' : 'Đang kết nối...'}
          </span>
        </div>
      )}

      {/* Tên */}
      <div style={{
        position: 'absolute', bottom: '14px', left: '14px',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
        borderRadius: '10px', padding: '5px 12px',
        fontSize: '13px', fontWeight: 600, color: '#fff',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {name}
      </div>
    </div>
  );
}

/* ─── TRANG CHÍNH ────────────────────────────────────────── */
export default function PrivateCall() {
  const { callId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const mode = searchParams.get('mode') || 'caller';
  const friendName = (() => { try { return decodeURIComponent(searchParams.get('friendName') || ''); } catch { return ''; } })() || 'Người dùng';
  const friendAvatar = (() => { try { return decodeURIComponent(searchParams.get('friendAvatar') || ''); } catch { return ''; } })() || '';
  const friendId = searchParams.get('friendId') || null;



  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const localMirrored = true;
  const [showControls, setShowControls] = useState(true);
  const [pipSwapped, setPipSwapped] = useState(false);
  const hideTimer = useRef(null);

  // Theo dõi thời gian cuộc gọi ở cấp component
  const elapsedRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  const [partnerHungUp, setPartnerHungUp] = useState(false);
  const [callEndedMsg, setCallEndedMsg] = useState(null); // 'no_answer' | 'cancelled'

  // Đọc callStatus từ CallContext (hiển thị khi timeout / bị hủy)
  const { callStatus } = useCall();

  // Lắng nghe kênh global để bắt 'no_answer'/'cancel' khi người gọi timeout
  // QUAN TRỌNG: phải dùng đúng tên channel 'private_calls_global' — cùng channel CallContext dùng để broadcast
  useEffect(() => {
    if (!user?.id || !callId) return;
    const ch = supabase.channel('private_calls_global', {
      config: { broadcast: { self: false } }
    });
    ch.on('broadcast', { event: 'call_signal' }, ({ payload }) => {
      if (!payload) return;
      if (
        (payload.type === 'cancel' || payload.type === 'no_answer') &&
        payload.callId === callId
      ) {
        setCallEndedMsg('cancelled');
        setTimeout(() => navigate('/chat'), 1500);
      }
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, callId, navigate]);

  // Khi callStatus thay đổi trong context (bên caller)
  useEffect(() => {
    if (callStatus === 'no_answer') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCallEndedMsg('no_answer');
      setTimeout(() => navigate('/chat'), 2000);
    }
    if (callStatus === 'rejected') {
      setCallEndedMsg('rejected');
      setTimeout(() => navigate('/chat'), 2000);
    }
  }, [callStatus, navigate]);

  const { localStream, remoteStream, connected, error, hangup } = usePrivateWebRTC({
    callId, user, mode, micOn, camOn,
    onHangup: () => {
      setPartnerHungUp(true);
      setTimeout(() => navigate('/chat'), 1500);
    }
  });

  // Đếm thời gian khi connected
  useEffect(() => {
    if (!connected) return;
    const iv = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(iv);
  }, [connected]);

  // Auto-hide controls sau 5s
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 5000);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetHideTimer();
    return () => clearTimeout(hideTimer.current);
  }, [resetHideTimer]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleEndCall = useCallback(async () => {
    try {
      await hangup();
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Failed to send hangup signal:', err);
    }

    // Gửi tin nhắn tổng kết thời gian cuộc gọi vào chat nếu có kết nối
    if (elapsedRef.current > 0 && user?.id && friendId) {
      const mm = String(Math.floor(elapsedRef.current / 60)).padStart(2, '0');
      const ss = String(elapsedRef.current % 60).padStart(2, '0');
      const summary = `📹 Cuộc gọi video đã kết thúc · ${mm}:${ss}`;
      try { await sendMessage(user.id, friendId, summary); } catch { /* ignore */ }
    }
    navigate('/chat');
  }, [hangup, navigate, user?.id, friendId]);

  return (
    <>
      <style>{`
        @keyframes pc-pulse-ring {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes pc-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pc-connecting-dot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40%           { transform: scale(1); opacity: 1; }
        }
        @keyframes pc-reject-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
          50%       { box-shadow: 0 0 0 18px rgba(239, 68, 68, 0); }
        }
        @keyframes pc-avatar-glow {
          0%, 100% { box-shadow: 0 0 0 4px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2); }
          50%       { box-shadow: 0 0 0 8px rgba(255,255,255,0.5), 0 0 50px rgba(255,255,255,0.35); }
        }
        @keyframes pc-wave {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .pc-controls-bar {
          transition: opacity 0.35s ease, transform 0.35s ease;
        }
      `}</style>

      <div
        onMouseMove={resetHideTimer}
        onClick={resetHideTimer}
        style={{
          position: 'fixed', inset: 0,
          background: 'radial-gradient(ellipse at 30% 20%, #1a1a1a 0%, #0a0a0a 100%)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          color: '#fff',
          userSelect: 'none',
          cursor: showControls ? 'default' : 'none',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          zIndex: 10,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transform: showControls ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'opacity 0.35s, transform 0.35s',
        }}>
          {/* Tên + trạng thái */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Avatar src={friendAvatar} name={friendName} size={40} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px' }}>{friendName}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {connected ? (
                  <>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
                    <span>{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</span>
                  </>
                ) : (
                  <>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: '#D4D4D4', display: 'inline-block',
                        animation: `pc-connecting-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                      }} />
                    ))}
                    <span style={{ marginLeft: 4 }}>Đang kết nối...</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Label phòng */}
          <div style={{
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
          }}>
            Cuộc gọi riêng tư
          </div>
        </div>

        <div style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          display: 'flex', padding: 0,
        }}>
          {/* Video chính — chiếm toàn màn hình */}
          <VideoTile
            stream={pipSwapped ? localStream : remoteStream}
            name={pipSwapped ? (user?.fullName || 'Bạn') : friendName}
            avatar={pipSwapped ? user?.avatar : friendAvatar}
            muted={pipSwapped ? true : false}
            camOff={pipSwapped ? !camOn : !remoteStream}
            mirrored={pipSwapped ? localMirrored : false}
            style={{ position: 'absolute', inset: 0, borderRadius: 0 }}
          />

          {/* Video phụ — Picture in Picture (góc dưới phải) */}
          <div
            style={{
              position: 'absolute',
              bottom: showControls ? '120px' : '30px',
              right: '30px',
              width: '180px', height: '260px',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 40, cursor: 'pointer',
              animation: 'pc-fade-in 0.4s ease forwards',
            }}
            onClick={() => setPipSwapped(s => !s)}
            title="Nhấn để đổi màn hình chính"
          >
            <VideoTile
              stream={pipSwapped ? remoteStream : localStream}
              name={pipSwapped ? friendName : (user?.fullName || 'Bạn')}
              avatar={pipSwapped ? friendAvatar : user?.avatar}
              muted={pipSwapped ? false : true}
              camOff={pipSwapped ? !remoteStream : !camOn}
              mirrored={pipSwapped ? false : localMirrored}
              style={{ borderRadius: 0, width: '100%', height: '100%' }}
            />
            <div style={{
              position: 'absolute', top: '8px', right: '8px',
              background: 'rgba(0,0,0,0.65)', borderRadius: '6px',
              padding: '6px 10px', fontSize: '11px', color: '#fff',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.85)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.65)'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
              Phóng to
            </div>
          </div>

          {/* Lỗi */}
          {error && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.8)', zIndex: 15,
              flexDirection: 'column', gap: '16px', padding: '32px',
              textAlign: 'center',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.35))' }}>
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div style={{ fontWeight: 700, fontSize: '18px', color: '#fca5a5' }}>Không thể kết nối</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', maxWidth: '300px', lineHeight: 1.6 }}>{error}</div>
              <button onClick={handleEndCall} style={{
                padding: '10px 24px', background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                border: 'none', borderRadius: '12px', color: '#fff',
                fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
              }}>Quay lại</button>
            </div>
          )}

          {/* Đối phương cúp máy */}
          {partnerHungUp && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.85)', zIndex: 15,
              flexDirection: 'column', gap: '16px', padding: '32px',
              textAlign: 'center',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.35))' }}>
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.18 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
              <div style={{ fontWeight: 700, fontSize: '18px', color: '#fca5a5' }}>Cuộc gọi đã kết thúc</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', maxWidth: '300px', lineHeight: 1.6 }}>Đối phương đã gác máy. Đang quay lại phòng chat...</div>
            </div>
          )}

          {/* Timeout / bị hủy — hiển thị cho cả 2 bên */}
          {callEndedMsg && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.88)', zIndex: 16,
              flexDirection: 'column', gap: '20px', padding: '32px',
              textAlign: 'center',
              animation: 'pc-fade-in 0.3s ease',
            }}>
              {/* Premium icon container */}
              <div style={{
                position: 'relative',
                width: 80, height: 80,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Outer glow ring */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)',
                  animation: 'pc-pulse-ring 2s ease-in-out infinite',
                }} />
                {/* Icon circle */}
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(239,68,68,0.08) 100%)',
                  border: '1.5px solid rgba(239,68,68,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 24px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.5))' }}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    <line x1="17" y1="7" x2="7" y2="17" />
                  </svg>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '20px', color: '#fca5a5', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                  {callEndedMsg === 'no_answer' ? 'Người nhận không bắt máy' : callEndedMsg === 'rejected' ? 'Người nhận đang bận' : 'Cuộc gọi đã bị hủy'}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Đang quay lại phòng chat...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Thanh điều khiển ── */}
        <div
          className="pc-controls-bar"
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            padding: '24px 0 36px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '16px',
            zIndex: 10,
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transform: showControls ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Mic */}
            <CtrlBtn onClick={() => setMicOn(m => !m)} title={micOn ? 'Tắt mic' : 'Bật mic'} active={micOn}>
              {micOn ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="2" x2="22" y1="2" y2="22" />
                  <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                  <path d="M5 10v2a7 7 0 0 0 12 5.79" />
                  <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                  <path d="M9 9v3a3 3 0 0 0 4.3 2.72" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              )}
            </CtrlBtn>

            {/* Kết thúc cuộc gọi — nút lớn ở giữa */}
            <CtrlBtn onClick={handleEndCall} title="Kết thúc cuộc gọi" danger>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.18 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
            </CtrlBtn>

            {/* Camera */}
            <CtrlBtn onClick={() => setCamOn(c => !c)} title={camOn ? 'Tắt camera' : 'Bật camera'} active={camOn}>
              {camOn ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2" style={{ opacity: 0.5 }} />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
              )}
            </CtrlBtn>
          </div>

          {/* Trạng thái */}
          {!connected && !error && (
            <div style={{
              fontSize: '12px', color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.05em',
            }}>
              Đang chờ {friendName} kết nối...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
