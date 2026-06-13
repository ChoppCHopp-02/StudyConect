// src/context/CallContext.jsx
// Context toàn cục quản lý gọi video riêng tư — hoạt động trên mọi trang
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { useAuth } from './AuthContext';

const CallContext = createContext(null);

// Tạo callId ngẫu nhiên
const genCallId = () => `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Trạng thái cuộc gọi
  const [incomingCall, setIncomingCall] = useState(null);  // { callId, callerId, callerName, callerAvatar }
  const [outgoingCall, setOutgoingCall] = useState(null);  // { callId, receiverId, receiverName, receiverAvatar }
  const [callStatus, setCallStatus] = useState(null);      // 'ringing' | 'rejected' | 'missed' | 'ended'

  const channelRef = useRef(null);
  const ringTimerRef = useRef(null);
  const statusTimerRef = useRef(null);

  // Cập nhật refs để callback đọc được
  const outgoingCallRef = useRef(outgoingCall);
  useEffect(() => { outgoingCallRef.current = outgoingCall; }, [outgoingCall]);
  const incomingCallRef = useRef(incomingCall);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

  // ── Khởi tạo channel lắng nghe toàn cục ─────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/admin-login';
    if (isAdminRoute) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIncomingCall(null);
      setOutgoingCall(null);
      setCallStatus(null);
      return;
    }

    const ch = supabase.channel('private_calls_global', {
      config: { broadcast: { self: false } }
    });
    channelRef.current = ch;

    ch.on('broadcast', { event: 'call_signal' }, ({ payload }) => {
      if (!payload) return;

      // Nhận cuộc gọi đến
      if (payload.type === 'call' && String(payload.receiverId) === String(user.id)) {
        setIncomingCall({
          callId: payload.callId,
          callerId: payload.callerId,
          callerName: payload.callerName,
          callerAvatar: payload.callerAvatar,
        });
        // Tự động hủy sau 40s (missed call)
        clearTimeout(ringTimerRef.current);
        ringTimerRef.current = setTimeout(() => {
          setIncomingCall(null);
          setCallStatus('missed');
          clearTimeout(statusTimerRef.current);
          statusTimerRef.current = setTimeout(() => setCallStatus(null), 3000);
        }, 40000);
      }

      // Đối phương chấp nhận (người gọi nhận)
      if (payload.type === 'accept' && outgoingCallRef.current?.callId === payload.callId) {
        const outCall = outgoingCallRef.current;
        setOutgoingCall(null);
        setCallStatus(null);
        navigate(`/call/${payload.callId}?mode=caller&friendName=${encodeURIComponent(outCall?.receiverName || '')}&friendAvatar=${encodeURIComponent(outCall?.receiverAvatar || '')}&friendId=${outCall?.receiverId}`);
      }

      // Đối phương từ chối (người gọi nhận)
      if (payload.type === 'reject' && outgoingCallRef.current?.callId === payload.callId) {
        setOutgoingCall(null);
        setCallStatus('rejected');
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => setCallStatus(null), 4000);
      }

      // Cuộc gọi bị hủy bởi người gọi (người nhận đang thấy popup)
      if (payload.type === 'cancel' && incomingCallRef.current?.callId === payload.callId) {
        clearTimeout(ringTimerRef.current);
        setIncomingCall(null);
        setCallStatus('missed');
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => setCallStatus(null), 3000);
      }
    });

    ch.subscribe();

    return () => {
      clearTimeout(ringTimerRef.current);
      clearTimeout(statusTimerRef.current);
      ch.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, location.pathname]);

  // ── Bắt đầu gọi ─────────────────────────────────────────────────
  const initiateCall = useCallback(async (friend) => {
    if (!user?.id || !friend?.userId) return;

    const callId = genCallId();
    const payload = {
      type: 'call',
      callId,
      callerId: user.id,
      callerName: user.fullName || 'Người dùng',
      callerAvatar: user.avatar || '',
      receiverId: friend.userId,
    };

    setOutgoingCall({
      callId,
      receiverId: friend.userId,
      receiverName: friend.fullName,
      receiverAvatar: friend.avatar || '',
    });
    setCallStatus('ringing');

    await channelRef.current?.send({
      type: 'broadcast',
      event: 'call_signal',
      payload,
    });

    // Timeout 40s không ai bắt máy → missed
    clearTimeout(ringTimerRef.current);
    ringTimerRef.current = setTimeout(() => {
      // Gửi cancel để xóa popup bên kia
      channelRef.current?.send({
        type: 'broadcast',
        event: 'call_signal',
        payload: { type: 'cancel', callId },
      });
      setOutgoingCall(null);
      setCallStatus('missed');
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => setCallStatus(null), 3000);
    }, 40000);

    // Navigate người gọi đến trang chờ
    navigate(`/call/${callId}?mode=caller&friendName=${encodeURIComponent(friend.fullName)}&friendAvatar=${encodeURIComponent(friend.avatar || '')}&friendId=${friend.userId}`);
  }, [user, navigate]);

  // ── Chấp nhận cuộc gọi ──────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const call = incomingCallRef.current;
    if (!call) return;

    clearTimeout(ringTimerRef.current);

    await channelRef.current?.send({
      type: 'broadcast',
      event: 'call_signal',
      payload: { type: 'accept', callId: call.callId, receiverId: user?.id },
    });

    setIncomingCall(null);
    navigate(`/call/${call.callId}?mode=callee&friendName=${encodeURIComponent(call.callerName)}&friendAvatar=${encodeURIComponent(call.callerAvatar || '')}&friendId=${call.callerId}`);
  }, [user, navigate]);

  // ── Từ chối cuộc gọi ────────────────────────────────────────────
  const rejectCall = useCallback(async () => {
    const call = incomingCallRef.current;
    if (!call) return;

    clearTimeout(ringTimerRef.current);

    await channelRef.current?.send({
      type: 'broadcast',
      event: 'call_signal',
      payload: { type: 'reject', callId: call.callId },
    });

    setIncomingCall(null);
  }, []);

  // ── Hủy cuộc gọi đang đổ chuông (người gọi) ────────────────────
  const cancelCall = useCallback(async () => {
    const call = outgoingCallRef.current;
    if (!call) return;

    clearTimeout(ringTimerRef.current);

    await channelRef.current?.send({
      type: 'broadcast',
      event: 'call_signal',
      payload: { type: 'cancel', callId: call.callId },
    });

    setOutgoingCall(null);
    setCallStatus(null);
    navigate(-1);
  }, [navigate]);

  return (
    <CallContext.Provider value={{
      incomingCall,
      outgoingCall,
      callStatus,
      initiateCall,
      acceptCall,
      rejectCall,
      cancelCall,
      channel: channelRef,
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be inside CallProvider');
  return ctx;
};
