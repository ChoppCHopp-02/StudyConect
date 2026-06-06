import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../config/supabaseClient';
import AppLayout from '../layouts/AppLayout';

export default function Pomodoro() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState(null);
  const [newRoomTime, setNewRoomTime] = useState(25);
  const [timerMode, setTimerMode] = useState('pomodoro');
  const [customHours, setCustomHours] = useState(3);
  const [customMinutes, setCustomMinutes] = useState(0);
  const [roomToDelete, setRoomToDelete] = useState(null);

  // Timer states (moved inside here for when in a room)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [initialSeconds, setInitialSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerInterval = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    if (!activeRoom) {
      // eslint-disable-next-line react-hooks/immutability
      fetchRooms();
      // Setup realtime subscription for rooms
      const channel = supabase
        .channel('public:pomodoro_rooms')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pomodoro_rooms' }, () => {
         
          fetchRooms();
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeRoom]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pomodoro_rooms')
        .select(`
          id, name, focus_time, status, created_at, creator_id,
          users ( full_name )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (err) {
      console.error(err);
      addToast('Không thể tải danh sách phòng', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      addToast('Vui lòng nhập tên phòng', 'error');
      return;
    }
    
    let finalTime = 25;
    if (timerMode === 'pomodoro') {
      finalTime = Number(newRoomTime);
    } else if (timerMode === 'custom') {
      finalTime = (Number(customHours) * 60) + Number(customMinutes);
      if (finalTime <= 0) {
        addToast('Vui lòng chọn thời gian hợp lệ', 'error');
        return;
      }
    } else if (timerMode === 'stopwatch') {
      finalTime = 0; // 0 means count up
    }

    try {
      const { data, error } = await supabase.from('pomodoro_rooms').insert([{
        name: newRoomName.trim(),
        creator_id: user.id,
        focus_time: finalTime,
        status: 'active'
      }]).select().single();

      if (error) throw error;
      
      addToast('Tạo phòng thành công!', 'success');
      setShowCreateModal(false);
      setNewRoomName('');
      joinRoom(data);
    } catch (err) {
      console.error(err);
      addToast('Lỗi khi tạo phòng', 'error');
    }
  };

  const joinRoom = async (room) => {
    try {
      // Add user to room members
      await supabase.from('pomodoro_room_members').upsert({
        room_id: room.id,
        user_id: user.id,
        status: 'studying'
      });
      
      setActiveRoom(room);
      const isStopwatch = room.focus_time === 0;
      const secs = isStopwatch ? 0 : room.focus_time * 60;
      setSecondsLeft(secs);
      setInitialSeconds(secs);
      setIsRunning(false);
    } catch (err) {
      console.error(err);
      addToast('Không thể tham gia phòng lúc này', 'error');
    }
  };

  const leaveRoom = async () => {
    if (activeRoom) {
      try {
        await supabase.from('pomodoro_room_members').delete()
          .match({ room_id: activeRoom.id, user_id: user.id });
      } catch (err) {
        console.error(err);
      }
    }
    setIsRunning(false);
    if (timerInterval.current) clearInterval(timerInterval.current);
    setActiveRoom(null);
  };

  const handleDeleteRoom = (roomId) => {
    setRoomToDelete(roomId);
  };

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      await supabase.from('pomodoro_rooms').delete().eq('id', roomToDelete);
      addToast('Đã xóa phòng', 'success');
      if (activeRoom?.id === roomToDelete) {
        leaveRoom();
      } else {
        fetchRooms();
      }
    } catch (err) {
      addToast('Lỗi khi xóa phòng', 'error');
    } finally {
      setRoomToDelete(null);
    }
  };

  // --- Timer Logic ---
  const playBeep = (type) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'start') {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.stop(ctx.currentTime + 0.12);
      } else {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch { /* ignore */ }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    playBeep('start');
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(initialSeconds);
  };

  useEffect(() => {
    if (isRunning) {
      const isStopwatch = activeRoom?.focus_time === 0;
      timerInterval.current = setInterval(() => {
        setSecondsLeft((prev) => isStopwatch ? prev + 1 : prev - 1);
      }, 1000);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [isRunning, activeRoom]);

  useEffect(() => {
    const isStopwatch = activeRoom?.focus_time === 0;
    if (!isStopwatch && secondsLeft <= 0 && isRunning) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRunning(false);
      playBeep('alarm');
      addToast('⏰ Đã hết thời gian! Hãy nghỉ ngơi chút nhé.', 'success');
    }
  }, [secondsLeft, isRunning, addToast, activeRoom]);

  const fmtTime = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    if (h !== '00') return `${h}:${m}:${s}`;
    return `${m}:${s}`;
  };

  const progressPercent = initialSeconds > 0 ? ((initialSeconds - secondsLeft) / initialSeconds) * 100 : (activeRoom?.focus_time === 0 ? 0 : 0);

  // Render Timer View
  if (activeRoom) {
    return (
      <AppLayout>
        <div className="pomodoro-container">
          <style>{`
            .pomodoro-container { display: flex; flex-direction: column; align-items: center; padding: 20px 12px; width: 100%; min-height: calc(100vh - 80px); font-family: 'Inter', sans-serif; position: relative; }
            .premium-card { background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 32px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); text-align: center; width: 100%; max-width: 380px; }
            .timer-display-circle { width: 220px; height: 220px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto 30px; position: relative; background: radial-gradient(circle, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.2) 100%); box-shadow: inset 0 0 20px rgba(255,255,255,0.05), 0 0 30px rgba(239,68,68,0.1); transition: box-shadow 0.5s ease; }
            .timer-display-circle.running-glow { box-shadow: inset 0 0 20px rgba(255,255,255,0.05), 0 0 40px rgba(255,122,0,0.2); }
            .btn-action { padding: 12px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; border: none; transition: all 0.2s; }
            .btn-primary-play { background: linear-gradient(135deg, #FF6B6B, #FF8E53); color: white; box-shadow: 0 8px 24px rgba(255,107,107,0.3); }
            .btn-primary-play:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(255,107,107,0.4); }
            .btn-secondary-action { background: rgba(255,255,255,0.05); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); }
            .btn-secondary-action:hover { background: rgba(255,255,255,0.1); }
            .leave-btn { position: absolute; top: 16px; left: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; alignItems: center; gap: 6px; transition: all 0.2s; }
            .leave-btn:hover { background: rgba(244,63,94,0.1); color: #f43f5e; border-color: rgba(244,63,94,0.3); }
          `}</style>
          
          <button className="leave-btn" onClick={leaveRoom}>
            <span>←</span> Rời phòng
          </button>
          
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            {activeRoom.creator_id === user?.id && (
              <button 
                onClick={() => handleDeleteRoom(activeRoom.id)}
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                🗑 Xóa phòng
              </button>
            )}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '20px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.2)', padding: '6px 14px', borderRadius: '30px', fontSize: '13px', fontWeight: 700, color: '#FF6B6B', marginBottom: '12px' }}>
              🔴 Đang trong phòng học
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {activeRoom.name}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Tập trung cao độ để hoàn thành mục tiêu!
            </p>
          </div>

          <div className="premium-card">
            <div className={`timer-display-circle ${isRunning ? 'running-glow' : ''}`}>
              <svg style={{ position: 'absolute', transform: 'rotate(-90deg)', width: '220px', height: '220px' }}>
                <circle cx="110" cy="110" r="100" stroke="rgba(255,255,255,0.03)" strokeWidth="8" fill="transparent" />
                <circle
                  cx="110" cy="110" r="100"
                  stroke={isRunning ? '#FF8E53' : '#FF6B6B'}
                  strokeWidth="8" fill="transparent"
                  strokeDasharray={2 * Math.PI * 100}
                  strokeDashoffset={2 * Math.PI * 100 * (1 - progressPercent / 100)}
                  style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s', strokeLinecap: 'round' }}
                />
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 800, color: isRunning ? '#FF8E53' : '#FF6B6B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', zIndex: 1 }}>
                ⏳ {activeRoom.focus_time === 0 ? 'TÍNH GIỜ' : `${activeRoom.focus_time} Phút`}
              </span>
              <span style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', zIndex: 1, letterSpacing: '-1px' }}>
                {fmtTime(secondsLeft)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={toggleTimer} className={`btn-action ${isRunning ? 'btn-secondary-action' : 'btn-primary-play'}`}>
                {isRunning ? '⏸ Tạm dừng' : '▶ Bắt đầu'}
              </button>
              <button onClick={resetTimer} className="btn-action btn-secondary-action">
                🔄 Đặt lại
              </button>
            </div>
          </div>
          
          {/* Delete Confirmation Modal for Active Room */}
          {roomToDelete && (
            <div className="modal-overlay" style={{ zIndex: 10000 }}>
              <div className="modal-content" style={{ maxWidth: '360px', textAlign: 'center', padding: '24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0' }}>Xóa phòng học?</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                  Phòng học này sẽ bị xóa vĩnh viễn và không thể khôi phục. Mọi người trong phòng sẽ bị đẩy ra ngoài.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button onClick={() => setRoomToDelete(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#e2e8f0', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                    Hủy
                  </button>
                  <button onClick={confirmDeleteRoom} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)', transition: 'background 0.2s' }}>
                    Xóa ngay
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // Render Rooms List View
  return (
    <AppLayout>
      <div className="pomodoro-list-container">
        <style>{`
          .pomodoro-list-container { display: flex; flex-direction: column; align-items: center; padding: 60px 12px 20px 12px; width: 100%; min-height: calc(100vh - 80px); font-family: 'Inter', sans-serif; position: relative; }
          .header-section { text-align: center; margin-bottom: 32px; width: 100%; max-width: 600px; }
          .header-badge { display: inline-flex; alignItems: center; gap: 6px; background: rgba(255, 107, 107, 0.1); border: 1px solid rgba(255, 107, 107, 0.2); padding: 6px 14px; border-radius: 30px; font-size: 13px; font-weight: 700; color: #FF6B6B; margin-bottom: 12px; }
          .header-title { font-size: 26px; font-weight: 800; color: #fff; margin-bottom: 8px; }
          .header-subtitle { color: #94a3b8; font-size: 14px; line-height: 1.5; }
          
          .rooms-section { width: 100%; max-width: 700px; display: flex; flex-direction: column; gap: 16px; }
          .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          .section-title { font-size: 18px; font-weight: 700; color: #fff; display: flex; alignItems: center; gap: 8px; }
          
          .btn-create { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 4px 15px rgba(99,102,241,0.3); transition: all 0.2s; }
          .btn-create:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99,102,241,0.4); }

          .room-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; cursor: pointer; }
          .room-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
          .room-info h3 { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px; }
          .room-info p { font-size: 13px; color: #94a3b8; display: flex; gap: 12px; }
          .room-info span { display: flex; align-items: center; gap: 4px; }
          
          .empty-state { background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 20px; padding: 48px 20px; text-align: center; }
          .empty-state h3 { color: #e2e8f0; font-size: 16px; margin: 16px 0 8px; }
          .empty-state p { color: #64748b; font-size: 14px; margin-bottom: 24px; }

          .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.8); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
          .modal-content { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; width: 100%; max-width: 400px; box-shadow: 0 24px 48px rgba(0,0,0,0.5); }
          .modal-content h2 { font-size: 20px; color: #fff; margin-bottom: 20px; font-weight: 700; }
          .form-group { margin-bottom: 20px; text-align: left; }
          .form-group label { display: block; font-size: 13px; color: #94a3b8; margin-bottom: 8px; font-weight: 600; }
          .form-input { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px 16px; border-radius: 12px; outline: none; font-size: 14px; transition: border 0.2s; }
          .form-input:focus { border-color: #6366f1; }
          .modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 32px; }
        `}</style>

        <div className="rooms-section">
          <div className="section-header">
            <div className="section-title">🔥 Các phòng đang hoạt động</div>
            <button className="btn-create" onClick={() => setShowCreateModal(true)}>
              + Tạo phòng mới
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          ) : rooms.length > 0 ? (
            rooms.map(room => (
              <div key={room.id} className="room-card" onClick={() => joinRoom(room)}>
                <div className="room-info">
                  <h3>{room.name}</h3>
                  <p>
                    <span>{room.focus_time === 0 ? '⏱ Tính giờ học' : `⏱ ${room.focus_time} Phút`}</span>
                    <span>👑 {room.users?.full_name || 'Người dùng'}</span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {room.creator_id === user?.id && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      Xóa
                    </button>
                  )}
                  <button style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Tham gia
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div style={{ fontSize: '48px' }}>📫</div>
              <h3>Chưa có phòng học nào hoạt động.</h3>
              <p>Hãy là người đầu tiên mở phòng để mọi người cùng tham gia nhé!</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                style={{ background: 'transparent', color: '#6366f1', border: '1px solid #6366f1', padding: '10px 24px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                Tạo phòng học đầu tiên
              </button>
            </div>
          )}
        </div>

        {/* Create Room Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Tạo phòng Pomodoro</h2>
              <div className="form-group">
                <label>Tên phòng học</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Nhập tên phòng hoặc mục tiêu học tập..."
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Chế độ đếm giờ</label>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
                  <button style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: timerMode === 'pomodoro' ? '#6366f1' : 'transparent', color: timerMode === 'pomodoro' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setTimerMode('pomodoro')}>Pomodoro</button>
                  <button style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: timerMode === 'custom' ? '#6366f1' : 'transparent', color: timerMode === 'custom' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setTimerMode('custom')}>Tự chọn</button>
                  <button style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: timerMode === 'stopwatch' ? '#6366f1' : 'transparent', color: timerMode === 'stopwatch' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setTimerMode('stopwatch')}>Bấm giờ</button>
                </div>
                
                {timerMode === 'pomodoro' && (
                  <>
                    <label>Thời gian tập trung (Phút)</label>
                    <select 
                      className="form-input"
                      value={newRoomTime}
                      onChange={e => setNewRoomTime(parseInt(e.target.value))}
                    >
                      <option value={10}>10 Phút</option>
                      <option value={15}>15 Phút</option>
                      <option value={20}>20 Phút</option>
                      <option value={25}>25 Phút (Khuyên dùng)</option>
                    </select>
                  </>
                )}
                {timerMode === 'custom' && (
                  <>
                    <label>Thời gian mong muốn</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <select className="form-input" value={customHours} onChange={e => setCustomHours(parseInt(e.target.value))}>
                          {[0, 1, 2, 3, 4, 5, 6].map(h => <option key={h} value={h}>{h} Giờ</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <select className="form-input" value={customMinutes} onChange={e => setCustomMinutes(parseInt(e.target.value))}>
                          {[0, 10, 15, 20, 30, 40, 45, 50].map(m => <option key={m} value={m}>{m} Phút</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}
                {timerMode === 'stopwatch' && (
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                      ⏱ Chế độ bấm giờ: Đồng hồ sẽ chạy tiến để theo dõi xem bạn đã học được bao lâu.
                    </p>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', padding: '10px 16px' }}
                >
                  Hủy
                </button>
                <button className="btn-create" onClick={handleCreateRoom}>
                  Tạo phòng ngay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal for Rooms List */}
        {roomToDelete && !activeRoom && (
          <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-content" style={{ maxWidth: '360px', textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0' }}>Xóa phòng học?</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                Phòng học này sẽ bị xóa vĩnh viễn và không thể khôi phục. Mọi người trong phòng sẽ bị đẩy ra ngoài.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => setRoomToDelete(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#e2e8f0', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                  Hủy
                </button>
                <button onClick={confirmDeleteRoom} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)', transition: 'background 0.2s' }}>
                  Xóa ngay
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
