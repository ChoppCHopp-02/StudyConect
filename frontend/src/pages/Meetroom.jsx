// src/pages/Meetroom.jsx  — WebRTC Video Call (phòng học online thực sự)
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../layouts/AppLayout';
import { supabase } from '../config/supabaseClient';

// ── Avatar ───────────────────────────────────────────────────
const COLORS = ['#1A1A1A','#3A3A3A','#2E2E2E','#4A4A4A','#222222','#383838','#2A2A2A'];
const colorOf = s => COLORS[(s||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0) % COLORS.length];

function Avatar({ src, name = '', size = 36 }) {
  const initial = (name || '?')[0].toUpperCase();
  const color   = colorOf(name);
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}, ${color}99)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 800, color: '#fff',
    }}>{initial}</div>
  );
}

// ── VideoTile ────────────────────────────────────────────────
function VideoTile({ stream, name, avatar, muted: mutedProp = false, camOff = false, isLocal = false, speaking = false, mirrored = false, onToggleMirror = null, screenSharing = false, fullScreen = false, style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream, camOff, screenSharing]);

  // Khi đang share màn hình: không mirror, dùng contain để thấy full màn hình
  const effectiveMirrored = screenSharing ? false : mirrored;
  const objectFit = screenSharing ? 'contain' : 'cover';

  return (
    <div style={{
      position: 'relative',
      borderRadius: fullScreen ? '0' : '24px',
      overflow: 'hidden',
      background: '#0d0d18',
      border: speaking ? '2.5px solid #FFFFFF' : screenSharing ? '2px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
      aspectRatio: fullScreen ? 'auto' : '16/9',
      width: fullScreen ? '100%' : '100%',
      height: fullScreen ? '100%' : '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: speaking 
        ? '0 0 20px rgba(255,255,255,0.35), 0 12px 40px rgba(0,0,0,0.5)' 
        : '0 8px 30px rgba(0,0,0,0.35)',
      maxWidth: '100%',
      maxHeight: '100%',
      ...style
    }}>
      {isLocal && screenSharing ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.15) 0%, rgba(13, 13, 24, 1) 100%)',
        }}>
          <div style={{
            padding: '20px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.4)',
            color: '#D4D4D4',
            boxShadow: '0 8px 32px rgba(255,255,255,0.25)',
          }}>
            <MonitorSvg active={true} size={48} />
          </div>
          <span style={{ fontSize: '16px', color: 'white', fontWeight: 600 }}>
            Bạn đang chia sẻ màn hình
          </span>
        </div>
      ) : stream && !camOff ? (
        <>
          <video
            ref={ref}
            autoPlay
            playsInline
            disablePictureInPicture
            muted={mutedProp || isLocal}
            style={{
              width: '100%', height: '100%',
              objectFit: fullScreen ? 'cover' : objectFit,
              transform: effectiveMirrored ? 'scaleX(-1)' : 'none',
              background: '#000',
            }}
          />
          {/* Nút lật camera chỉ hiện khi là local và KHÔNG đang share màn hình */}
          {isLocal && onToggleMirror && !screenSharing && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleMirror(); }}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(15,15,26,0.75)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px',
                color: 'white', fontSize: '11px', padding: '6px 12px',
                cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', gap: '6px',
                fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,15,26,0.9)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(15,15,26,0.75)'}
              title="Lật/Không lật camera"
            >
              🔄 Lật camera
            </button>
          )}
          {/* Badge "Đang chia sẻ màn hình" */}
          {screenSharing && !isLocal && (
            <div style={{
              position: 'absolute', top: '16px', left: '16px',
              background: 'linear-gradient(135deg, #3A3A3A, #1A1A1A)',
              borderRadius: '8px', padding: '6px 12px',
              fontSize: '12px', fontWeight: 700, color: 'white',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 4px 12px rgba(255,255,255,0.15)',
              zIndex: 10,
            }}>
              <MonitorSvg active={true} size={14} />
              Đang chia sẻ màn hình
            </div>
          )}
        </>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.12) 0%, rgba(13, 13, 24, 1) 100%)',
        }}>
          <div style={{
            padding: '6px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            border: '1.5px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
            transition: 'transform 0.3s ease',
          }}>
            <Avatar src={avatar} name={name} size={fullScreen ? 110 : 76} />
          </div>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontWeight: 500, letterSpacing: '0.02em' }}>Camera tắt</span>
        </div>
      )}

      {/* Name tag */}
      <div style={{
        position: 'absolute', bottom: '16px', left: '16px',
        background: 'rgba(15,15,26,0.7)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '6px 14px',
        display: 'flex', alignItems: 'center', gap: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}>
        {speaking && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFFFFF', animation: 'pulse 1s infinite' }} />}
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'white', letterSpacing: '0.01em' }}>
          {name}{isLocal ? ' (Bạn)' : ''}
        </span>
      </div>

      {/* Muted icon */}
      {mutedProp && (
        <div style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(239,68,68,0.9)', backdropFilter: 'blur(8px)',
          borderRadius: '50%',
          width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
        }}>🔇</div>
      )}
    </div>
  );
}

// ── Pomodoro Timer ───────────────────────────────────────────
function StudyTimer() {
  const MODES = {
    pomodoro: { label: ' Pomodoro', sec: 25 * 60 },
    short:    { label: ' Nghỉ ngắn',  sec: 5 * 60  },
    long:     { label: '️ Nghỉ dài',   sec: 15 * 60 },
  };
  const [mode, setMode]       = useState('pomodoro');
  const [seconds, setSeconds] = useState(MODES.pomodoro.sec);
  const [running, setRunning] = useState(false);
  const ivRef = useRef(null);

  useEffect(() => {
    if (running) {
      ivRef.current = setInterval(() => setSeconds(s => {
        if (s <= 1) { setRunning(false); clearInterval(ivRef.current); return 0; }
        return s - 1;
      }), 1000);
    } else clearInterval(ivRef.current);
    return () => clearInterval(ivRef.current);
  }, [running]);

  const switchMode = (m) => { setMode(m); setSeconds(MODES[m].sec); setRunning(false); };
  const reset      = ()  => { setSeconds(MODES[mode].sec); setRunning(false); };
  const pct        = seconds / MODES[mode].sec;
  const r = 80, circ = 2 * Math.PI * r;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-input)', borderRadius: '20px', padding: '4px' }}>
        {Object.entries(MODES).map(([k, v]) => (
          <button key={k} onClick={() => switchMode(k)} style={{
            padding: '5px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '11px', fontWeight: 600,
            background: mode === k ? 'var(--primary)' : 'none',
            color: mode === k ? 'white' : 'var(--text-muted)',
            transition: 'var(--transition)',
          }}>{v.label}</button>
        ))}
      </div>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
          <circle cx="90" cy="90" r={r} fill="none"
            stroke={pct > 0.5 ? 'var(--primary)' : pct > 0.2 ? '#f59e0b' : '#ef4444'}
            strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '38px', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{MODES[mode].label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => setRunning(r => !r)} style={{
          padding: '10px 24px', borderRadius: '20px', cursor: 'pointer',
          background: running ? 'rgba(239,68,68,0.15)' : 'var(--primary)',
          color: running ? '#ef4444' : 'white',
          border: running ? '1px solid rgba(239,68,68,0.3)' : 'none',
          fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, transition: 'var(--transition)',
        }}>{running ? '⏸ Dừng' : seconds === MODES[mode].sec ? '▶ Bắt đầu' : '▶ Tiếp tục'}</button>
        <button onClick={reset} style={{
          padding: '10px 18px', borderRadius: '20px',
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 600,
        }}>↺</button>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '220px', lineHeight: 1.5 }}>
        Kỹ thuật Pomodoro: tập trung 25 phút, nghỉ 5 phút.
      </p>
    </div>
  );
}



// ── WEBRTC HOOK ──────────────────────────────────────────────
function useWebRTC({ roomId, user, micOn, camOn, onForceMute }) {
  const [localStream,  setLocalStream]  = useState(null);
  const [remoteFeeds,  setRemoteFeeds]  = useState({}); // { peerId: { stream, name, avatar, camOff, micMuted, screenSharing } }
  const [error,        setError]        = useState(null);
  const peersRef          = useRef({});
  const localRef          = useRef(null);
  const channelRef        = useRef(null);
  const iceCandidateQueues = useRef({}); // { peerId: RTCIceCandidate[] } — queue ICE trước khi setRemoteDescription

  // Dùng ref để các callbacks đọc được giá trị mới nhất mà không cần recreate effect
  const micOnRef        = useRef(micOn);
  const camOnRef        = useRef(camOn);
  const userRef         = useRef(user);
  const onForceMuteRef  = useRef(onForceMute);
  useEffect(() => { micOnRef.current       = micOn;       }, [micOn]);
  useEffect(() => { camOnRef.current       = camOn;       }, [camOn]);
  useEffect(() => { userRef.current        = user;        }, [user]);
  useEffect(() => { onForceMuteRef.current = onForceMute; }, [onForceMute]);

  const myIdValue = useMemo(
    // eslint-disable-next-line react-hooks/purity
    () => `${user?.id || 'guest'}_${Math.random().toString(36).slice(2, 7)}`,
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const myId = useRef(myIdValue);

  const getIceConfig = () => ({
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
    ]
  });

  // ── Start local media ────────────────────────────────────────
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
      if (import.meta.env.DEV) console.warn('Full media request failed in Meetroom, trying audio only...', err);
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
        if (import.meta.env.DEV) console.error('Audio-only media request failed too in Meetroom', err2);
        setError(err.name === 'NotAllowedError' || err2.name === 'NotAllowedError'
          ? 'Vui lòng cấp quyền camera/mic.'
          : 'Không thể truy cập camera/mic.');
        return null;
      }
    }
  }, []);

  // ── Toggle audio/video tracks khi state thay đổi (không recreate channel) ──
  useEffect(() => {
    if (!localRef.current) return;
    localRef.current.getAudioTracks().forEach(t => { t.enabled = micOn; });
    // Broadcast state change
    channelRef.current?.send({
      type: 'broadcast', event: 'signal',
      payload: { type: 'state-change', from: myId.current, room: roomId, camOn: camOnRef.current, micOn }
    });
  }, [micOn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!localRef.current) return;
    localRef.current.getVideoTracks().forEach(t => { t.enabled = camOn; });
    // Broadcast state change
    channelRef.current?.send({
      type: 'broadcast', event: 'signal',
      payload: { type: 'state-change', from: myId.current, room: roomId, camOn, micOn: micOnRef.current }
    });
  }, [camOn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create peer connection ───────────────────────────────────
  const createPeer = useCallback((peerId, peerName, peerAvatar, isInitiator, stream) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];

    const pc = new RTCPeerConnection(getIceConfig());

    if (stream) stream.getTracks().forEach(t => pc.addTrack(t, stream));

    // Dùng một MediaStream cố định cho mỗi peer để tránh mất stream khi replaceTrack
    const remoteStream = new MediaStream();
    pc.ontrack = (e) => {
      // Xoá track cũ cùng loại trước khi thêm track mới
      remoteStream.getTracks().forEach(t => {
        if (t.kind === e.track.kind) remoteStream.removeTrack(t);
      });
      remoteStream.addTrack(e.track);
      setRemoteFeeds(prev => ({
        ...prev,
        [peerId]: { ...prev[peerId], stream: remoteStream, name: peerName, avatar: peerAvatar }
      }));
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channelRef.current?.send({
          type: 'broadcast', event: 'signal',
          payload: { type: 'ice', from: myId.current, to: peerId, candidate: e.candidate, room: roomId }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setRemoteFeeds(prev => { const n = { ...prev }; delete n[peerId]; return n; });
        delete peersRef.current[peerId];
      }
    };

    peersRef.current[peerId] = pc;

    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        channelRef.current?.send({
          type: 'broadcast', event: 'signal',
          payload: {
            type: 'offer', from: myId.current, to: peerId,
            name: userRef.current?.fullName || 'Người dùng',
            avatar: userRef.current?.avatar || '',
            offer, room: roomId,
            camOn: camOnRef.current, micOn: micOnRef.current,
          }
        });
      });
    }

    return pc;
  }, [roomId]);

  // ── Replace video track (screen share) ──────────────────────
  const replaceVideoTrack = useCallback(async (newTrack, isScreenShare = false) => {
    const peers = Object.entries(peersRef.current);
    await Promise.all(
      peers.map(async ([peerId, pc]) => {
        const senders = pc.getSenders();
        const sender = senders.find(s => s.track && s.track.kind === 'video')
                    || senders.find(s => s.track === null);
        if (sender) {
          try { await sender.replaceTrack(newTrack); }
          catch (e) { if (import.meta.env.DEV) console.warn('replaceTrack error:', e); }
        } else if (newTrack) {
          // Trường hợp ban đầu không có camera (không có sender), ta thêm track mới và thương lượng lại
          try {
            pc.addTrack(newTrack, localRef.current);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channelRef.current?.send({
              type: 'broadcast', event: 'signal',
              payload: {
                type: 'offer', from: myId.current, to: peerId,
                name: userRef.current?.fullName || 'Người dùng',
                avatar: userRef.current?.avatar || '',
                offer, room: roomId,
                camOn: camOnRef.current, micOn: micOnRef.current,
              }
            });
          } catch (e) { if (import.meta.env.DEV) console.warn('addTrack renegotiation error:', e); }
        }
      })
    );
    channelRef.current?.send({
      type: 'broadcast', event: 'signal',
      payload: { type: 'screen-share', from: myId.current, room: roomId, sharing: isScreenShare }
    });
  }, [roomId]);

  // ── Main signaling effect — chỉ chạy lại khi roomId thay đổi ──
  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;
    let ch = null;

    const startRoom = async () => {
      // 1. Khởi động media trước
      await startMedia();
      if (cancelled) return;

      // 2. Sau khi đã có stream (hoặc kể cả null nếu không có mic/cam), mới kết nối kênh Supabase
      ch = supabase.channel(`studyconect_room_${roomId}`, {
        config: { broadcast: { self: false } }
      });
      channelRef.current = ch;

      const handleMsg = async (msg) => {
        if (!msg || msg.room !== roomId || cancelled) return;
        if (msg.to && msg.to !== myId.current) return;

        const currentStream = localRef.current;

        if (msg.type === 'join' && msg.from !== myId.current) {
          setRemoteFeeds(prev => ({
            ...prev,
            [msg.from]: {
              stream: prev[msg.from]?.stream || null,
              name: msg.name, avatar: msg.avatar,
              camOff: !msg.camOn, micMuted: !msg.micOn, screenSharing: false,
            }
          }));
          createPeer(msg.from, msg.name, msg.avatar, true, currentStream);
        }

        if (msg.type === 'offer') {
          setRemoteFeeds(prev => ({
            ...prev,
            [msg.from]: {
              stream: prev[msg.from]?.stream || null,
              name: msg.name, avatar: msg.avatar,
              camOff: !msg.camOn, micMuted: !msg.micOn, screenSharing: false,
            }
          }));
          const pc = createPeer(msg.from, msg.name, msg.avatar, false, currentStream);
          await pc.setRemoteDescription(msg.offer);
          // Flush ICE candidates đã queue trước khi setRemoteDescription
          const queuedOffer = iceCandidateQueues.current[msg.from] || [];
          iceCandidateQueues.current[msg.from] = [];
          for (const c of queuedOffer) await pc.addIceCandidate(c).catch(() => {});
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ch.send({
            type: 'broadcast', event: 'signal',
            payload: {
              type: 'answer', from: myId.current, to: msg.from,
              name: userRef.current?.fullName || 'Người dùng',
              avatar: userRef.current?.avatar || '',
              answer, room: roomId,
              camOn: camOnRef.current, micOn: micOnRef.current,
            }
          });
        }

        if (msg.type === 'answer') {
          setRemoteFeeds(prev => ({
            ...prev,
            [msg.from]: {
              stream: prev[msg.from]?.stream || null,
              name: msg.name, avatar: msg.avatar,
              camOff: !msg.camOn, micMuted: !msg.micOn, screenSharing: false,
            }
          }));
          const pc = peersRef.current[msg.from];
          if (pc) {
            await pc.setRemoteDescription(msg.answer);
            // Flush ICE candidates đã queue trước khi setRemoteDescription
            const queuedAnswer = iceCandidateQueues.current[msg.from] || [];
            iceCandidateQueues.current[msg.from] = [];
            for (const c of queuedAnswer) await pc.addIceCandidate(c).catch(() => {});
          }
        }

        if (msg.type === 'ice') {
          const pc = peersRef.current[msg.from];
          if (pc && pc.remoteDescription) {
            // remoteDescription đã set → thêm ngay
            pc.addIceCandidate(msg.candidate).catch(() => {});
          } else {
            // Chưa có remoteDescription → queue lại theo peerId
            if (!iceCandidateQueues.current[msg.from]) {
              iceCandidateQueues.current[msg.from] = [];
            }
            iceCandidateQueues.current[msg.from].push(msg.candidate);
          }
        }

        if (msg.type === 'force-mute') {
          if (msg.to === myId.current) {
            if (msg.muteCam) {
              if (localRef.current) {
                localRef.current.getVideoTracks().forEach(t => { t.enabled = false; });
              }
              camOnRef.current = false;
              channelRef.current?.send({
                type: 'broadcast', event: 'signal',
                payload: { type: 'state-change', from: myId.current, room: roomId, camOn: false, micOn: micOnRef.current }
              });
              if (onForceMuteRef.current) onForceMuteRef.current('cam');
            }
            if (msg.muteMic) {
              if (localRef.current) {
                localRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
              }
              micOnRef.current = false;
              channelRef.current?.send({
                type: 'broadcast', event: 'signal',
                payload: { type: 'state-change', from: myId.current, room: roomId, camOn: camOnRef.current, micOn: false }
              });
              if (onForceMuteRef.current) onForceMuteRef.current('mic');
            }
          }
        }

        if (msg.type === 'state-change') {
          setRemoteFeeds(prev => {
            if (!prev[msg.from]) return prev;
            return {
              ...prev,
              [msg.from]: {
                ...prev[msg.from],
                camOff:    msg.camOn !== undefined ? !msg.camOn   : prev[msg.from].camOff,
                micMuted:  msg.micOn !== undefined ? !msg.micOn   : prev[msg.from].micMuted,
              }
            };
          });
        }

        if (msg.type === 'screen-share') {
          setRemoteFeeds(prev => {
            if (!prev[msg.from]) return prev;
            const pc = peersRef.current[msg.from];
            const newState = {
              ...prev[msg.from],
              screenSharing: msg.sharing,
              camOff: msg.sharing ? false : prev[msg.from].camOff,
            };
            if (pc) {
              const receiver = pc.getReceivers().find(r => r.track && r.track.kind === 'video');
              if (receiver && receiver.track) {
                const freshStream = new MediaStream([receiver.track]);
                const audioReceiver = pc.getReceivers().find(r => r.track && r.track.kind === 'audio');
                if (audioReceiver?.track) freshStream.addTrack(audioReceiver.track);
                newState.stream = freshStream;
              }
            }
            return { ...prev, [msg.from]: newState };
          });
        }

        if (msg.type === 'leave') {
          const pc = peersRef.current[msg.from];
          if (pc) { pc.close(); delete peersRef.current[msg.from]; }
          setRemoteFeeds(prev => { const n = { ...prev }; delete n[msg.from]; return n; });
        }
      };

      ch.on('broadcast', { event: 'signal' }, (payload) => handleMsg(payload.payload));

      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED' && !cancelled) {
          ch.send({
            type: 'broadcast', event: 'signal',
            payload: {
              type: 'join', from: myId.current,
              name: userRef.current?.fullName || 'Người dùng',
              avatar: userRef.current?.avatar || '',
              room: roomId,
              camOn: camOnRef.current, micOn: micOnRef.current,
            }
          });
        }
      });
    };

    startRoom();

    return () => {
      cancelled = true;
      if (ch) {
        ch.send({
          type: 'broadcast', event: 'signal',
          payload: { type: 'leave', from: myId.current, room: roomId }
        });
        supabase.removeChannel(ch);
      }
      Object.values(peersRef.current).forEach(pc => pc.close());
      peersRef.current = {};
      localRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { localStream, remoteFeeds, error, replaceVideoTrack, channelRef };
}

// ── SIDEBAR TABS ─────────────────────────────────────────────
const TABS = [
  {
    key: 'chat',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    label: 'Chat'
  },
  {
    key: 'timer',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    label: 'Đồng hồ'
  },
  {
    key: 'members',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: 'Thành viên'
  },
];

// ── MAIN COMPONENT ───────────────────────────────────────────
export default function MeetRoom() {
  const { roomId }       = useParams();
  const [searchParams]   = useSearchParams();
  const groupName        = (() => { try { return decodeURIComponent(searchParams.get('group') || ''); } catch { return searchParams.get('group') || ''; } })() || 'Phòng học';
  const groupId          = searchParams.get('groupId') || null;
  const { user } = useAuth();
  const navigate         = useNavigate();

  // Controls
  const [micOn,    setMicOn]    = useState(true);
  const [camOn,    setCamOn]    = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [tab,      setTab]      = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pipSwapped, setPipSwapped] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [fsChatOpen, setFsChatOpen] = useState(false);
  const [fsChatTab, setFsChatTab] = useState('chat');
  const hideTimerRef = useRef(null);
  const containerRef = useRef(null);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetHideTimer();
    return () => clearTimeout(hideTimerRef.current);
  }, [resetHideTimer]);

  // Fullscreen handlers
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
      } catch { /* fallback: just set state */ setIsFullscreen(true); }
    } else {
      try {
        await document.exitFullscreen();
      } catch { setIsFullscreen(false); }
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Chat
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [copied,   setCopied]   = useState(false);
  const msgEndRef  = useRef(null);

  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  useEffect(() => {
    if ((!isFullscreen && sidebarOpen && tab === 'chat') || (isFullscreen && fsChatOpen && fsChatTab === 'chat')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadChatCount(0);
    }
  }, [sidebarOpen, tab, fsChatOpen, fsChatTab, isFullscreen]);

  useEffect(() => {
    if (messages.length > lastMessageCount) {
      const isChatOpen = (!isFullscreen && sidebarOpen && tab === 'chat') || (isFullscreen && fsChatOpen && fsChatTab === 'chat');
      if (!isChatOpen) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUnreadChatCount(c => c + (messages.length - lastMessageCount));
      }
    }
    setLastMessageCount(messages.length);
  }, [messages, lastMessageCount, sidebarOpen, tab, isFullscreen, fsChatOpen, fsChatTab]);

  // WebRTC
  const { localStream, remoteFeeds, error, replaceVideoTrack, channelRef } = useWebRTC({
    roomId, user, micOn, camOn,
    onForceMute: (type) => {
      if (type === 'cam') setCamOn(false);
      if (type === 'mic') setMicOn(false);
    },
  });
  const screenStreamRef = useRef(null);
  const [screenStream, setScreenStream] = useState(null);

  // Lấy thông tin trưởng nhóm (Trưởng phòng) thực sự từ study_groups
  const [groupCreatorId, setGroupCreatorId] = useState(null);



  useEffect(() => {
    const fetchGroupCreator = async () => {
      try {
        let activeGroupId = groupId;
        if (!activeGroupId && roomId) {
          const { data: scheduleData, error: scheduleError } = await supabase
            .from('schedules')
            .select('group_id')
            .eq('location', `/room/${roomId}`)
            .limit(1);
          if (!scheduleError && scheduleData && scheduleData.length > 0) {
            activeGroupId = scheduleData[0].group_id;
          }
        }

        if (!activeGroupId) return;

        const { data, error } = await supabase
          .from('study_groups')
          .select('creator_id')
          .eq('id', parseInt(activeGroupId, 10))
          .single();
        if (!error && data) {
          setGroupCreatorId(data.creator_id);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Error fetching group creator:', err);
      }
    };
    fetchGroupCreator();
  }, [groupId, roomId]);

  const getParticipantRole = useCallback((feed) => {
    if (groupCreatorId) {
      const feedUserId = feed.isLocal ? user?.id : feed.id.split('_')[0];
      if (String(feedUserId) === String(groupCreatorId)) {
        return 'Trưởng phòng';
      }
      return 'Thành viên';
    }
    return feed.isLocal ? 'Trưởng phòng' : 'Thành viên';
  }, [groupCreatorId, user]);

  // Dọn dẹp screen share khi component unmount (rời phòng, đóng tab, v.v.)
  useEffect(() => {
    return () => {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    };
  }, []);

  // Lọc remote feeds: loại bỏ peer có cùng userId với mình (tránh duplicate khi reload) và loại bỏ trùng lặp cùng một user
  const myUserId = String(user?.id || '');
  const uniqueRemoteFeedsMap = {};
  Object.entries(remoteFeeds).forEach(([id, f]) => {
    const peerUserId = id.split('_')[0];
    if (myUserId !== '' && peerUserId === myUserId) return;
    if (!uniqueRemoteFeedsMap[peerUserId] || (f.stream && !uniqueRemoteFeedsMap[peerUserId].stream)) {
      uniqueRemoteFeedsMap[peerUserId] = { id, ...f };
    }
  });

  const allFeeds = [
    {
      id: 'local',
      name: user?.fullName || 'Bạn',
      avatar: user?.avatar,
      stream: screenOn ? screenStream : localStream,
      isLocal: true,
      camOff: !camOn && !screenOn,
      screenSharing: screenOn,
    },
    ...Object.values(uniqueRemoteFeedsMap).map((f) => ({
      id: f.id,
      name: f.name,
      avatar: f.avatar,
      stream: f.stream,
      isLocal: false,
      camOff: f.camOff ?? false,
      screenSharing: f.screenSharing ?? false,
      micMuted: f.micMuted ?? false,
    })),
  ];

  // Auto scroll chat
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Load meetroom messages from Supabase — dùng Realtime thay polling 5s
  useEffect(() => {
    if (!roomId) return;

    const formatMsg = (m) => {
      const rawContent = m.content || '';
      const prefix = `[meetroom:${roomId}] `;
      const text = rawContent.startsWith(prefix) ? rawContent.slice(prefix.length) : rawContent;
      return {
        id: m.id.toString(),
        text,
        sender: m.users?.full_name || 'Người dùng',
        senderId: m.sender_id,
        avatar: m.users?.avatar || '',
        time: new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
    };

    // 1. Fetch lần đầu
    const fetchMeetMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            id, sender_id, content, meetroom_id, created_at,
            users:users!sender_id (
              full_name,
              avatar
            )
          `)
          .or(`meetroom_id.eq.${roomId},content.like.[meetroom:${roomId}]%`)
          .order('created_at', { ascending: true })
          .limit(100);

        if (!error && data) {
          setMessages(data.map(formatMsg));
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Error fetching meetroom messages:', err);
      }
    };

    fetchMeetMessages();

    // 2. Lắng nghe INSERT real-time — không cần polling
    // Tên channel tĩnh (không dùng Date.now() để tránh rò rỉ channel)
    const channelUid = user?.id || 'guest';
    const channel = supabase
      .channel(`meetroom-chat-${roomId}-${channelUid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `meetroom_id=eq.${roomId}`
        },
        (payload) => {
          const m = payload.new;
          if (!m) return;
          // Dùng trực tiếp payload.new — không refetch để tránh N+1 query
          // Tên người gửi: nếu là mình thì dùng user object, nếu là người khác thì dùng cache
          const senderName = String(m.sender_id) === String(user?.id)
            ? (user?.fullName || 'Bạn')
            : 'Người dùng'; // Sẽ được cập nhật khi fetchMeetMessages() chạy lần đầu
          const rawContent = m.content || '';
          const prefix = `[meetroom:${roomId}] `;
          const text = rawContent.startsWith(prefix) ? rawContent.slice(prefix.length) : rawContent;
          const newMsg = {
            id: m.id.toString(),
            text,
            sender: senderName,
            senderId: m.sender_id,
            avatar: String(m.sender_id) === String(user?.id) ? (user?.avatar || '') : '',
            time: new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => {
            if (prev.some(x => x.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user?.id]);


  // Screen share — thay track video trong tất cả peer connections để remote peers thấy màn hình
  const toggleScreen = async () => {
    if (screenOn) {
      // Dừng share: trả về camera track gốc cho tất cả peers
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      setScreenOn(false);
      // Lấy camera track hiện tại và replace lại vào tất cả peer connections
      const camTrack = localStream?.getVideoTracks()[0] ?? null;
      await replaceVideoTrack(camTrack, false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        setScreenStream(stream);
        setScreenOn(true);
        // Thay video track trong tất cả peer connections bằng screen track
        const screenTrack = stream.getVideoTracks()[0];
        await replaceVideoTrack(screenTrack, true);
        // Khi người dùng bấm Stop trên trình duyệt
        screenTrack.onended = async () => {
          screenStreamRef.current = null;
          setScreenOn(false);
          setScreenStream(null);
          const camTrack = localStream?.getVideoTracks()[0] ?? null;
          await replaceVideoTrack(camTrack, false);
        };
      } catch { /* user cancelled */ }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !user?.id) return;
    const text = input.trim();
    setInput('');

    try {
      const payload = {
        sender_id: parseInt(user.id, 10),
        content: text,
        meetroom_id: roomId,
      };
      if (groupId && !isNaN(parseInt(groupId, 10))) {
        payload.group_id = parseInt(groupId, 10);
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([payload])
        .select(`
          *,
          users:users!sender_id (
            full_name,
            avatar
          )
        `);

      if (error) {
        if (import.meta.env.DEV) console.error('Error sending meetroom message:', error);
      } else if (data && data[0]) {
        const m = data[0];
        const newMsg = {
          id: m.id.toString(),
          text: text,
          sender: user.fullName || 'Bạn',
          senderId: user.id,
          avatar: user.avatar,
          time: new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => {
          if (prev.some(x => x.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Exception in sendMessage:', err);
    }
  };

  const copyLink = () => { navigator.clipboard?.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // Grid layout columns
  const n = allFeeds.length;
  const gridCols = n <= 1 ? '1fr' : n <= 2 ? '1fr 1fr' : n <= 4 ? '1fr 1fr' : 'repeat(3, 1fr)';

  return (
    <AppLayout hideSidebar={true} hideNavbar={true}>
      <div ref={containerRef} onMouseMove={resetHideTimer} style={{ height: '100vh', background: '#0a0a14', display: 'flex', flexDirection: 'column', fontFamily: 'inherit', overflow: 'hidden' }}>

        {/* ── Navbar ── */}
        <nav style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, zIndex: 50,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          background: 'rgba(10,10,20,0.75)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
          height: '64px',
          overflow: 'visible',
          gap: '16px',
          transition: 'opacity 0.3s ease',
        }}>
          {/* Left: room info */}
          {!isFullscreen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, pointerEvents: 'auto' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 750, fontSize: '15px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{groupName}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22c55e', fontWeight: 550 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
                    {allFeeds.length} trực tuyến
                  </span>
                </div>
              </div>

              {/* Stacked Avatars list */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px', flexWrap: 'nowrap', overflow: 'visible' }}>
                {allFeeds.map((f, i) => (
                  <div
                    key={f.id}
                    style={{
                      position: 'relative',
                      marginLeft: i > 0 ? '-10px' : '0',
                      zIndex: 10 - i,
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                    }}
                    title={f.name}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                  >
                    <Avatar src={f.avatar} name={f.name} size={32} />
                    <div style={{
                      position: 'absolute',
                      bottom: '-1px',
                      right: '-1px',
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: '#22c55e',
                      border: '1.5px solid #0a0a14',
                    }} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {isFullscreen && <div />}

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, pointerEvents: 'auto',
            ...(isFullscreen ? {
              position: 'absolute', top: '16px', right: '20px',
            } : {})
          }}>
            {/* Copy link */}
            {!isFullscreen && (
              <button onClick={copyLink} style={{
                background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px', padding: '8px 16px', cursor: 'pointer',
                color: copied ? '#4ade80' : 'rgba(255,255,255,0.85)',
                fontFamily: 'inherit', fontSize: '12.5px', fontWeight: 600, transition: 'all 0.2s',
                boxShadow: copied ? '0 4px 12px rgba(34,197,94,0.15)' : 'none',
              }}
              onMouseEnter={e => { if(!copied) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { if(!copied) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                {copied ? '✓ Đã sao chép link' : '🔗 Chia sẻ link'}
              </button>
            )}

            {/* Fullscreen toggle */}
            <button onClick={toggleFullscreen} title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'} style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              {isFullscreen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                  <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                  <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                </svg>
              )}
            </button>

            {/* Chat button (fullscreen) */}
            {isFullscreen && (
              <button onClick={() => setFsChatOpen(o => !o)} title="Chat & Thành viên" style={{
                height: '36px', borderRadius: '12px', flexShrink: 0,
                padding: '0 16px',
                background: fsChatOpen ? 'linear-gradient(135deg, #3A3A3A, #1A1A1A)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${fsChatOpen ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
                backdropFilter: 'blur(12px)',
                color: '#ffffff',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                boxShadow: fsChatOpen ? '0 4px 16px rgba(255,255,255,0.15)' : 'none',
              }}>
                <ChatSvg size={14} />
                Trò chuyện
              </button>
            )}
          </div>
        </nav>

        {/* ── Body ── */}
        <div className="meet-body" style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%', position: 'relative' }}>

          {/* ── Video Area ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: isFullscreen ? '0' : '20px', position: 'relative', height: '100%' }}>

            {/* Error banner */}
            {error && (
              <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 120, background: 'rgba(239,68,68,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '10px 20px', fontSize: '13px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{error} — Bạn chỉ ở chế độ nghe.</span>
              </div>
            )}

            {/* Main Video Viewport */}
            <div style={{ flex: 1, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {(() => {
                const activeScreenShare = allFeeds.find(f => f.screenSharing);
                const otherFeeds = allFeeds.filter(f => !f.screenSharing);

                // TRƯỜNG HỢP: Đang chia sẻ màn hình
                if (activeScreenShare) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'row', height: '100%', width: '100%', gap: '16px', position: 'relative' }}>
                      {/* Main focused screenshare */}
                      <div style={{ flex: 1, minWidth: 0, height: '100%', borderRadius: isFullscreen ? '0' : '24px', overflow: 'hidden' }}>
                        <VideoTile
                          key={`${activeScreenShare.id}-screen`}
                          stream={activeScreenShare.stream}
                          name={activeScreenShare.name}
                          avatar={activeScreenShare.avatar}
                          isLocal={activeScreenShare.isLocal}
                          camOff={activeScreenShare.camOff}
                          muted={!micOn && activeScreenShare.isLocal}
                          mirrored={activeScreenShare.isLocal}
                          screenSharing={true}
                          fullScreen={true}
                        />
                      </div>
                      
                      {/* Sidebar cameras column on the right */}
                      {otherFeeds.length > 0 && (
                        <div className="screenshare-sidebar" style={{
                          width: '220px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          overflowY: 'auto',
                          zIndex: 20,
                          paddingRight: '4px',
                          paddingBottom: '100px', // chừa chỗ cho control bar ở dưới
                        }}>
                          {otherFeeds.map(f => (
                            <div key={`${f.id}-cam`} style={{ width: '100%', flexShrink: 0 }}>
                              <VideoTile
                                stream={f.stream}
                                name={f.name}
                                avatar={f.avatar}
                                isLocal={f.isLocal}
                                camOff={f.camOff}
                                muted={!micOn && f.isLocal}
                                mirrored={f.isLocal}
                                screenSharing={false}
                                style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // TRƯỜNG HỢP: Phòng chỉ có 2 người, sử dụng giao diện PiP (1 to - 1 nhỏ)
                if (allFeeds.length === 2) {
                  const localFeed = allFeeds.find(f => f.isLocal);
                  const remoteFeed = allFeeds.find(f => !f.isLocal);

                  // Xác định feed nào to, feed nào nhỏ dựa trên pipSwapped
                  const mainFeed = pipSwapped ? localFeed : remoteFeed;
                  const pipFeed = pipSwapped ? remoteFeed : localFeed;

                  return (
                    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                      {/* Video chính — chiếm toàn màn hình */}
                      <div
                        style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
                        onClick={() => setPipSwapped(s => !s)}
                        title="Nhấn để đổi màn hình chính"
                      >
                        <VideoTile
                          key={`${mainFeed.id}-main`}
                          stream={mainFeed.stream}
                          name={mainFeed.name}
                          avatar={mainFeed.avatar}
                          isLocal={mainFeed.isLocal}
                          camOff={mainFeed.camOff}
                          muted={mainFeed.isLocal ? !micOn : mainFeed.micMuted}
                          mirrored={mainFeed.isLocal}
                          screenSharing={mainFeed.screenSharing}
                          fullScreen={true}
                          style={{ width: '100%', height: '100%', borderRadius: isFullscreen ? '0' : '24px' }}
                        />
                      </div>

                      {/* Video phụ — Picture in Picture (góc dưới phải) */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: showControls ? '120px' : '30px',
                          right: '30px',
                          width: '180px',
                          height: '260px',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          border: '2px solid rgba(255,255,255,0.2)',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          zIndex: 40,
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPipSwapped(s => !s);
                        }}
                        title="Nhấn để đổi màn hình chính"
                      >
                        <VideoTile
                          key={`${pipFeed.id}-pip`}
                          stream={pipFeed.stream}
                          name={pipFeed.name}
                          avatar={pipFeed.avatar}
                          isLocal={pipFeed.isLocal}
                          camOff={pipFeed.camOff}
                          muted={pipFeed.isLocal ? !micOn : pipFeed.micMuted}
                          mirrored={pipFeed.isLocal}
                          screenSharing={pipFeed.screenSharing}
                          style={{ width: '100%', height: '100%', borderRadius: 0 }}
                        />
                        <div style={{
                          position: 'absolute', top: '8px', right: '8px',
                          background: 'rgba(0,0,0,0.65)', borderRadius: '6px',
                          padding: '6px 10px', fontSize: '11px', color: '#fff',
                          fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          transition: 'all 0.2s',
                          zIndex: 50
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <polyline points="9 21 3 21 3 15"></polyline>
                            <line x1="21" y1="3" x2="14" y2="10"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                          </svg>
                          Đổi
                        </div>
                      </div>
                    </div>
                  );
                }

                // TRƯỜNG HỢP: Phòng chỉ có 1 người, hiển thị toàn bộ màn hình
                if (allFeeds.length === 1) {
                  const f = allFeeds[0];
                  return (
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: isFullscreen ? '0' : '24px' }}>
                      <VideoTile
                        key={`${f.id}-${f.screenSharing}`}
                        stream={f.stream}
                        name={f.name}
                        avatar={f.avatar}
                        isLocal={f.isLocal}
                        camOff={f.camOff}
                        muted={f.isLocal ? !micOn : f.micMuted}
                        mirrored={f.isLocal}
                        screenSharing={f.screenSharing}
                        fullScreen={true}
                      />
                    </div>
                  );
                }

                // TRƯỜNG HỢP: Phòng nhiều người (> 2), dùng Grid chuyên nghiệp
                return (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: gridCols,
                    gap: '16px',
                    height: '100%',
                    alignContent: 'center',
                    justifyContent: 'center',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    width: '100%'
                  }}>
                    {allFeeds.map(f => (
                      <VideoTile
                        key={`${f.id}-${f.screenSharing}`}
                        stream={f.stream}
                        name={f.name}
                        avatar={f.avatar}
                        isLocal={f.isLocal}
                        camOff={f.camOff}
                        muted={f.isLocal ? !micOn : f.micMuted}
                        mirrored={f.isLocal}
                        screenSharing={f.screenSharing}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* ── Fullscreen: Participants avatars top-left ── */}
            {isFullscreen && allFeeds.length > 0 && (
              <div style={{
                position: 'absolute', top: '20px', left: '20px',
                display: 'flex', gap: '6px', alignItems: 'center',
                zIndex: 150, pointerEvents: 'none',
              }}>
                {allFeeds.map((f, i) => (
                  <div key={f.id} style={{
                    position: 'relative',
                    marginLeft: i > 0 ? '-10px' : '0',
                  }}>
                    <Avatar src={f.avatar} name={f.name} size={32} />
                    <div style={{
                      position: 'absolute', bottom: '-1px', right: '-1px',
                      width: '9px', height: '9px', borderRadius: '50%',
                      background: '#22c55e', border: '1.5px solid #0a0a14',
                      background: '#525252', border: '1.5px solid #0a0a14',
                    }} />
                  </div>
                ))}
                <span style={{
                  fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 600,
                  background: 'rgba(10,10,20,0.6)', backdropFilter: 'blur(10px)',
                  padding: '4px 10px', borderRadius: '10px', marginLeft: '6px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>{allFeeds.length} trực tuyến</span>
              </div>
            )}

            {/* ── Fullscreen: Chat + Members overlay drawer ── */}
            {isFullscreen && fsChatOpen && (
              <div style={{
                position: 'absolute', top: '64px', right: '20px',
                width: '320px', height: '450px',
                background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)',
                border: '1px solid rgba(0,0,0,0.1)', borderRadius: '20px',
                display: 'flex', flexDirection: 'column', zIndex: 300,
                boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                overflow: 'hidden',
              }}>
                {/* Tab bar */}
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                  background: 'rgba(0,0,0,0.05)',
                  flexShrink: 0,
                  padding: '6px 6px 0',
                  gap: '4px',
                }}>
                  {TABS.map(t => (
                    <button key={t.key} onClick={() => setFsChatTab(t.key)} style={{
                      flex: 1,
                      padding: '8px 10px',
                      border: 'none',
                      cursor: 'pointer',
                      background: fsChatTab === t.key ? 'rgba(0,0,0,0.1)' : 'none',
                      borderBottom: fsChatTab === t.key ? '2px solid #171717' : '2px solid transparent',
                      borderRadius: '6px 6px 0 0',
                      color: fsChatTab === t.key ? '#171717' : 'rgba(0,0,0,0.4)',
                      fontFamily: 'inherit',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: '0.15s',
                      whiteSpace: 'nowrap',
                    }}>
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
                {/* Tab content */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {fsChatTab === 'chat' && (
                    <>
                      <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {messages.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '30px 12px', color: 'rgba(0,0,0,0.3)', fontSize: '12px' }}>
                            Chưa có tin nhắn nào.
                          </div>
                        )}
                        {messages.map(msg => {
                          const isMe = String(msg.senderId) === String(user?.id);
                          return (
                            <div key={msg.id} style={{ display: 'flex', gap: '6px', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                              {!isMe && <Avatar src={msg.avatar} name={msg.sender} size={22} />}
                              <div style={{ maxWidth: '78%' }}>
                                {!isMe && <div style={{ fontSize: '9px', color: 'rgba(0,0,0,0.4)', marginBottom: '2px', paddingLeft: '3px' }}>{msg.sender}</div>}
                                <div style={{
                                  background: isMe ? '#171717' : '#f5f5f5',
                                  color: isMe ? '#ffffff' : '#171717', border: isMe ? 'none' : '1px solid rgba(0,0,0,0.1)',
                                  borderRadius: isMe ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                                  padding: '7px 11px', fontSize: '12px', lineHeight: 1.4,
                                }}>{msg.text}</div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={msgEndRef} />
                      </div>
                      <div style={{ padding: '10px', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <input
                          value={input} onChange={e => setInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                          placeholder="Nhắn tin..."
                          style={{
                            flex: 1, background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '16px', padding: '7px 13px', color: '#171717',
                            fontSize: '12px', fontFamily: 'inherit', outline: 'none',
                          }} />
                        <button onClick={sendMessage} style={{
                          width: '32px', height: '32px', borderRadius: '50%', border: 'none',
                          background: input.trim() ? '#171717' : 'rgba(0,0,0,0.1)',
                          color: input.trim() ? '#ffffff' : '#888', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: '0.2s', flexShrink: 0,
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                  {fsChatTab === 'timer' && <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}><StudyTimer /></div>}
                  {fsChatTab === 'members' && (
                    <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {allFeeds.map(f => {
                        const role = getParticipantRole(f);
                        return (
                          <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ position: 'relative' }}>
                                <Avatar src={f.avatar} name={f.name} size={26} />
                                <div style={{
                                  position: 'absolute', bottom: '-1px', right: '-1px',
                                  width: '7px', height: '7px', borderRadius: '50%',
                                  background: '#525252', border: '1px solid #ffffff'
                                }} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#171717', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>{f.name}{f.isLocal ? ' (Bạn)' : ''}</span>
                                {role === 'Trưởng phòng' && (
                                  <span title="Trưởng phòng" style={{ display: 'inline-flex', alignItems: 'center', color: '#525252' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14a1 1 0 0 0 1-1v-1H4v1a1 1 0 0 0 1 1z" />
                                    </svg>
                                  </span>
                                )}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {(() => {
                                const isCamOn = f.isLocal ? camOn : !f.camOff;
                                const isMicOn = f.isLocal ? micOn : !f.micMuted;
                                const localFeed = allFeeds.find(x => x.isLocal);
                                const amLeader = localFeed && getParticipantRole(localFeed) === 'Trưởng phòng';
                                const canForce = amLeader && !f.isLocal;

                                const iconBtn = (active, type, Icon, titleOn, titleOff) => {
                                  const color = active ? '#171717' : '#888';
                                  const bg = active ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.05)';
                                  const border = active ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.1)';
                                  const payload = type === 'cam'
                                    ? { type: 'force-mute', to: f.id, room: roomId, muteCam: true, muteMic: false }
                                    : { type: 'force-mute', to: f.id, room: roomId, muteMic: true, muteCam: false };
                                  return (
                                    <button
                                      key={type}
                                      title={canForce ? (active ? `Click để tắt ${type === 'cam' ? 'camera' : 'mic'}` : (type === 'cam' ? 'Camera đang tắt' : 'Mic đang tắt')) : (active ? titleOn : titleOff)}
                                      onClick={canForce && active ? () => {
                                        // eslint-disable-next-line no-undef
                                        channelRef.current?.send({ type: 'broadcast', event: 'signal', payload });
                                      } : undefined}
                                      style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '30px', height: '30px', borderRadius: '50%',
                                        background: bg,
                                        border: `1px solid ${border}`,
                                        color: color,
                                        cursor: canForce && active ? 'pointer' : 'default',
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                        flexShrink: 0,
                                        padding: 0,
                                      }}
                                    >
                                      <Icon active={active} size={14} />
                                    </button>
                                  );
                                };

                                return (
                                  <>
                                    {iconBtn(isCamOn, 'cam', VideoSvg, 'Camera bật', 'Camera tắt')}
                                    {iconBtn(isMicOn, 'mic', MicSvg, 'Mic bật', 'Mic tắt')}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Control bar (Frosted Glass Floating Pill) ── */}
            <div style={{
              position: 'absolute',
              bottom: showControls ? '24px' : '-90px',
              left: '50%',
              transform: 'translateX(-50%)',
              transition: 'bottom 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '12px',
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '32px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.5)',
              whiteSpace: 'nowrap',
            }}>
              {/* Mic toggle */}
              <CtrlBtn
                active={micOn}
                onClick={() => setMicOn(m => !m)}
                danger={!micOn}
                icon={<MicSvg active={micOn} />}
                label={micOn ? "Tắt Mic" : "Bật Mic"}
              />

              {/* Camera toggle */}
              <CtrlBtn
                active={camOn}
                onClick={() => setCamOn(c => !c)}
                danger={!camOn}
                icon={<VideoSvg active={camOn} />}
                label={camOn ? "Tắt Camera" : "Bật Camera"}
              />

              {/* Screen share toggle */}
              <CtrlBtn
                active={screenOn}
                onClick={toggleScreen}
                highlight={screenOn}
                icon={<MonitorSvg active={screenOn} />}
                label={screenOn ? "Dừng chia sẻ" : "Chia sẻ màn hình"}
              />

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />

              {/* Chat Toggle (only when NOT fullscreen) */}
              {!isFullscreen && (
                <CtrlBtn
                  active={sidebarOpen && tab === 'chat'}
                  onClick={() => {
                    if (sidebarOpen && tab === 'chat') setSidebarOpen(false);
                    else { setTab('chat'); setSidebarOpen(true); }
                  }}
                  icon={<ChatSvg />}
                  label="Trò chuyện"
                  badge={unreadChatCount > 0 ? true : null}
                />
              )}

              {/* Members Toggle (only when NOT fullscreen) */}
              {!isFullscreen && (
                <CtrlBtn
                  active={sidebarOpen && tab === 'members'}
                  onClick={() => {
                    if (sidebarOpen && tab === 'members') setSidebarOpen(false);
                    else { setTab('members'); setSidebarOpen(true); }
                  }}
                  icon={<UsersSvg />}
                  label="Thành viên"
                />
              )}

              {/* Study clock Timer Toggle (only when NOT fullscreen) */}
              {!isFullscreen && (
                <CtrlBtn
                  active={sidebarOpen && tab === 'timer'}
                  onClick={() => {
                    if (sidebarOpen && tab === 'timer') setSidebarOpen(false);
                    else { setTab('timer'); setSidebarOpen(true); }
                  }}
                  icon={<ClockSvg />}
                  label="Đồng hồ học"
                />
              )}

              {/* Divider */}
              <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />

              {/* End call (Leave Room) */}
              <button
                onClick={() => {
                  screenStreamRef.current?.getTracks().forEach(t => t.stop());
                  screenStreamRef.current = null;
                  if (groupId) navigate(`/groups/${groupId}`);
                  else navigate('/groups');
                }}
                title="Rời phòng"
                style={{
                  background: '#171717',
                  border: 'none',
                  borderRadius: '50%',
                  width: '46px',
                  height: '46px',
                  cursor: 'pointer', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.2)'; }}
              >
                <PhoneOffSvg />
              </button>
            </div>
          </div>

          {/* ── Sidebar (Frosted Drawer) ── */}
          {!isFullscreen && sidebarOpen && (
            <div className="meet-sidebar" style={{
              width: '350px', flexShrink: 0,
              background: 'rgba(255,255,255,0.95)', borderLeft: '1px solid rgba(0,0,0,0.08)',
              display: 'flex', flexDirection: 'column', height: '100%',
              backdropFilter: 'blur(20px)',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.05)',
              animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }}>
              {/* Navbar spacer — đẩy nội dung xuống dưới thanh nav */}
              <div style={{
                height: '64px',
                flexShrink: 0,
                transition: 'height 0.3s ease',
              }} />

              {/* Tab bar */}
              <div style={{
                display: 'flex',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                background: 'rgba(0,0,0,0.02)',
                flexShrink: 0,
                padding: '8px 8px 0',
                gap: '4px',
              }}>
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)} style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: 'none',
                    cursor: 'pointer',
                    background: tab === t.key ? 'rgba(0,0,0,0.05)' : 'none',
                    borderBottom: tab === t.key ? '2px solid #171717' : '2px solid transparent',
                    borderRadius: '8px 8px 0 0',
                    color: tab === t.key ? '#171717' : 'rgba(0,0,0,0.4)',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    transition: '0.15s',
                    whiteSpace: 'nowrap',
                  }}>
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* Chat tab */}
                {tab === 'chat' && (
                  <>
                    <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {messages.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'rgba(0,0,0,0.3)', fontSize: '13px' }}>
                          Chưa có tin nhắn nào.
                        </div>
                      )}
                      {messages.map(msg => {
                        const isMe = String(msg.senderId) === String(user?.id);
                        return (
                          <div key={msg.id} style={{ display: 'flex', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: '4px' }}>
                            {!isMe && <Avatar src={msg.avatar} name={msg.sender} size={26} />}
                            <div style={{ maxWidth: '76%' }}>
                              {!isMe && <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.4)', marginBottom: '3px', paddingLeft: '4px' }}>{msg.sender}</div>}
                              <div style={{
                                background: isMe ? '#171717' : '#f5f5f5',
                                color: isMe ? '#ffffff' : '#171717', border: isMe ? 'none' : '1px solid rgba(0,0,0,0.05)',
                                borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                padding: '9px 13px', fontSize: '13px', lineHeight: 1.5,
                              }}>{msg.text}</div>
                              <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.25)', marginTop: '3px', textAlign: isMe ? 'right' : 'left', padding: '0 4px' }}>{msg.time}</div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={msgEndRef} />
                    </div>
                    <div style={{ padding: '12px', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <input
                        value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="Nhắn tin..."
                        style={{
                          flex: 1, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '20px', padding: '9px 16px', color: '#171717',
                          fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                        }} />
                      <button onClick={sendMessage} style={{
                        width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                        background: input.trim() ? '#171717' : 'rgba(0,0,0,0.08)',
                        color: input.trim() ? '#ffffff' : '#888', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s',
                        flexShrink: 0,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                      </button>
                    </div>
                  </>
                )}

                {/* Pomodoro Timer tab */}
                {tab === 'timer' && <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}><StudyTimer /></div>}

                {/* Members list tab */}
                {tab === 'members' && (
                  <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Danh sách trực tuyến</span>
                      <span style={{ background: 'rgba(255,255,255,0.15)', color: '#E5E5E5', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>{allFeeds.length}</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {allFeeds.map(f => {
                        const role = getParticipantRole(f);
                        return (
                          <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ position: 'relative' }}>
                                <Avatar src={f.avatar} name={f.name} size={34} />
                                <div style={{
                                  position: 'absolute', bottom: '-1px', right: '-1px',
                                  width: '8px', height: '8px', borderRadius: '50%',
                                  background: '#22c55e', border: '1.5px solid #0f0f1a'
                                }} />
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', maxWidth: '140px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {f.name}{f.isLocal ? ' (Bạn)' : ''}
                                  </span>
                                  {f.screenSharing && (
                                    <span title="Đang chia sẻ màn hình" style={{ display: 'flex', alignItems: 'center', color: '#D4D4D4', flexShrink: 0 }}>
                                      <MonitorSvg active={true} size={14} />
                                    </span>
                                  )}
                                </div>
                                <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  {role === 'Trưởng phòng' ? (
                                    <span style={{
                                      background: 'rgba(255,255,255,0.08)',
                                      color: 'rgba(255,255,255,0.85)',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '1px 7px',
                                      borderRadius: '5px',
                                      border: '1px solid rgba(255,255,255,0.15)',
                                      lineHeight: '16px',
                                      whiteSpace: 'nowrap',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle' }}>
                                        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14a1 1 0 0 0 1-1v-1H4v1a1 1 0 0 0 1 1z" />
                                      </svg>
                                      Trưởng phòng
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Thành viên</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {(() => {
                                const isCamOn = f.isLocal ? camOn : !f.camOff;
                                const isMicOn = f.isLocal ? micOn : !f.micMuted;
                                const localFeed = allFeeds.find(x => x.isLocal);
                                const amLeader = localFeed && getParticipantRole(localFeed) === 'Trưởng phòng';
                                const canForce = amLeader && !f.isLocal;

                                const iconBtn = (active, type, Icon, titleOn, titleOff) => {
                                  const color = active ? '#22c55e' : '#ef4444';
                                  const bg = active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
                                  const border = active ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)';
                                  const payload = type === 'cam'
                                    ? { type: 'force-mute', to: f.id, room: roomId, muteCam: true, muteMic: false }
                                    : { type: 'force-mute', to: f.id, room: roomId, muteMic: true, muteCam: false };
                                  return (
                                    <button
                                      key={type}
                                      title={canForce ? (active ? `Click để tắt ${type === 'cam' ? 'camera' : 'mic'}` : (type === 'cam' ? 'Camera đang tắt' : 'Mic đang tắt')) : (active ? titleOn : titleOff)}
                                      onClick={canForce && active ? () => {
                                        // eslint-disable-next-line no-undef
                                        channelRef.current?.send({ type: 'broadcast', event: 'signal', payload });
                                      } : undefined}
                                      style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '30px', height: '30px', borderRadius: '50%',
                                        background: bg,
                                        border: `1px solid ${border}`,
                                        color: color,
                                        cursor: canForce && active ? 'pointer' : 'default',
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                        flexShrink: 0,
                                        padding: 0,
                                        boxShadow: active ? '0 2px 8px rgba(34,197,94,0.12)' : '0 2px 8px rgba(239,68,68,0.12)',
                                      }}
                                      onMouseEnter={canForce && active ? e => {
                                        e.currentTarget.style.background = 'rgba(239,68,68,0.25)';
                                        e.currentTarget.style.borderColor = '#ef4444';
                                        e.currentTarget.style.color = '#ef4444';
                                        e.currentTarget.style.transform = 'scale(1.15)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(239,68,68,0.35)';
                                      } : undefined}
                                      onMouseLeave={canForce && active ? e => {
                                        e.currentTarget.style.background = bg;
                                        e.currentTarget.style.borderColor = border;
                                        e.currentTarget.style.color = color;
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = active ? '0 2px 8px rgba(34,197,94,0.12)' : '0 2px 8px rgba(239,68,68,0.12)';
                                      } : undefined}
                                    >
                                      <Icon active={active} size={14} />
                                    </button>
                                  );
                                };

                                return (
                                  <>
                                    {iconBtn(isCamOn, 'cam', VideoSvg, 'Camera bật', 'Camera tắt')}
                                    {iconBtn(isMicOn, 'mic', MicSvg, 'Mic bật', 'Mic tắt')}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%       { opacity: 0.5; transform: scale(0.85); }
          }
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0); opacity: 1; }
          }
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        `}</style>
      </div>
    </AppLayout>
  );
}

// ── SVG Icon Helpers ─────────────────────────────────────────
function MicSvg({ active, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {active ? (
        <>
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </>
      ) : (
        <>
          <line x1="2" x2="22" y1="2" y2="22" />
          <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
          <path d="M5 10v1.7a7 7 0 0 0 12 5" />
          <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </>
      )}
    </svg>
  );
}

function VideoSvg({ active, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {active ? (
        <>
          <path d="m22 8-6 4 6 4V8Z" />
          <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
        </>
      ) : (
        <>
          <line x1="2" x2="22" y1="2" y2="22" />
          <path d="m22 8-6 4 6 4V8Z" />
          <path d="M10.22 4.58A2 2 0 0 1 12 4h4a2 2 0 0 1 2 2v8a2 2 0 0 1-.58 1.42" />
          <path d="M4 8v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" />
        </>
      )}
    </svg>
  );
}

function MonitorSvg({ active, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {active ? (
        <>
          <rect width="20" height="14" x="2" y="3" rx="3" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </>
      ) : (
        <>
          <line x1="2" x2="22" y1="2" y2="22" />
          <path d="M12 17v4" />
          <path d="M8 21h8" />
          <path d="M22 6v8a3 3 0 0 1-3 3H9.83" />
          <path d="M5.17 3H19a3 3 0 0 1 3 3v2" />
          <path d="M2 9v5a3 3 0 0 0 3 3h1" />
        </>
      )}
    </svg>
  );
}

function ChatSvg({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  );
}

function UsersSvg({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PhoneOffSvg({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function ClockSvg({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ── Control Button helper ────────────────────────────────────
function CtrlBtn({ active, onClick, danger, highlight, icon, label, badge = null }) {
  const [hover, setHover] = useState(false);

  const bg = danger
    ? (hover ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.2)')
    : active || highlight
      ? (hover ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.14)')
      : hover
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(255, 255, 255, 0.06)';

  const border = danger
    ? '1px solid rgba(239, 68, 68, 0.45)'
    : active || highlight
      ? '1px solid rgba(255, 255, 255, 0.35)'
      : '1px solid rgba(255, 255, 255, 0.1)';

  const color = danger ? '#ff6b6b' : active || highlight ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';

  return (
    <button
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: bg,
        border,
        color,
        borderRadius: '50%',
        width: '46px',
        height: '46px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        boxShadow: active || highlight ? '0 0 14px rgba(255, 255, 255, 0.18)' : 'none',
        transform: hover ? 'scale(1.08)' : 'scale(1)',
      }}
    >
      {icon}
      {badge !== null && (
        typeof badge === 'boolean' && badge === true ? (
          <span style={{
            position: 'absolute',
            top: '0px',
            right: '0px',
            width: '10px',
            height: '10px',
            background: '#ef4444',
            borderRadius: '50%',
            border: '2px solid #0a0a14',
          }} />
        ) : badge > 0 ? (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#ef4444',
            color: 'white',
            fontSize: '9.5px',
            fontWeight: 700,
            borderRadius: '10px',
            padding: '2px 5.5px',
            border: '1.5px solid #0a0a14',
            lineHeight: 1,
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null
      )}
    </button>
  );
}