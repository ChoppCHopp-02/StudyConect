import { useState, useEffect, useRef } from 'react';
import { useToast } from '../components/Toast';
import AppLayout from '../layouts/AppLayout';

export default function Pomodoro() {
  const { addToast } = useToast();

  const [timerMode, setTimerMode] = useState('preset'); // 'preset' | 'custom' | 'stopwatch'
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [initialSeconds, setInitialSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [customHours, setCustomHours] = useState(1);
  const [customMinutes, setCustomMinutes] = useState(30);

  const timerInterval = useRef(null);
  const audioCtxRef = useRef(null);

  const playBeep = (type) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
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

  const handleModeChange = (mode) => {
    setIsRunning(false);
    setTimerMode(mode);
    if (mode === 'preset') {
      setSecondsLeft(25 * 60);
      setInitialSeconds(25 * 60);
    } else if (mode === 'custom') {
      const targetSecs = (customHours * 3600) + (customMinutes * 60);
      setSecondsLeft(targetSecs);
      setInitialSeconds(targetSecs);
    } else if (mode === 'stopwatch') {
      setSecondsLeft(0);
      setInitialSeconds(0);
    }
  };

  const handleCustomTimeChange = (h, m) => {
    const hours = Math.max(0, parseInt(h, 10) || 0);
    const mins = Math.max(0, Math.min(59, parseInt(m, 10) || 0));
    setCustomHours(hours);
    setCustomMinutes(mins);
    if (timerMode === 'custom' && !isRunning) {
      const targetSecs = (hours * 3600) + (mins * 60);
      setSecondsLeft(targetSecs);
      setInitialSeconds(targetSecs);
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    playBeep('start');
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (timerMode === 'preset') {
      setSecondsLeft(25 * 60);
      setInitialSeconds(25 * 60);
    } else if (timerMode === 'custom') {
      const targetSecs = (customHours * 3600) + (customMinutes * 60);
      setSecondsLeft(targetSecs);
      setInitialSeconds(targetSecs);
    } else {
      setSecondsLeft(0);
      setInitialSeconds(0);
    }
  };

  // Timer Countdown / Countup
  useEffect(() => {
    if (isRunning) {
      timerInterval.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (timerMode === 'stopwatch') {
            return prev + 1;
          } else {
            return prev - 1;
          }
        });
      }, 1000);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [isRunning, timerMode]);

  // Handle countdown finished
  useEffect(() => {
    if (timerMode !== 'stopwatch' && secondsLeft <= 0 && isRunning) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRunning(false);
      playBeep('alarm');
      addToast('⏰ Đã hoàn thành thời gian học tập của bạn! Hãy nghỉ ngơi chút nhé.', 'success');
    }
  }, [secondsLeft, isRunning, timerMode, addToast]);

  const fmtTime = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const progressPercent = timerMode === 'stopwatch'
    ? 100
    : initialSeconds > 0
      ? ((initialSeconds - secondsLeft) / initialSeconds) * 100
      : 0;

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '0 8px', width: '100%' }}>
        <style>{`
          .premium-card {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
            backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 10px 32px rgba(0,0,0,0.2);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: center;
          }
          .premium-card:hover {
            border-color: rgba(255, 255, 255, 0.12);
            box-shadow: 0 14px 40px rgba(0,0,0,0.26);
          }
          .timer-display-circle {
            width: 160px;
            height: 160px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            position: relative;
            background: radial-gradient(circle, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.25) 100%);
            box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.05), 0 0 24px rgba(239, 68, 68, 0.05);
            transition: box-shadow 0.5s ease;
          }
          .timer-display-circle.running-glow {
            box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.05), 0 0 24px rgba(255, 122, 0, 0.12);
          }
          .mode-btn {
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            font-size: 12px;
            font-weight: 600;
            padding: 7px 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.25s ease;
            flex: 1;
            text-align: center;
          }
          .mode-btn.active {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            border-color: transparent;
            box-shadow: 0 3px 10px rgba(255, 122, 0, 0.2);
          }
          .mode-btn:hover:not(.active) {
            background: rgba(255,255,255,0.06);
            color: var(--text-primary);
          }
          .time-input {
            background: var(--bg-input);
            border: 1.5px solid var(--border);
            color: var(--text-primary);
            border-radius: 6px;
            padding: 4px 8px;
            width: 48px;
            text-align: center;
            font-size: 13.5px;
            font-weight: 700;
            outline: none;
            transition: border-color 0.2s;
          }
          .time-input:focus {
            border-color: var(--secondary);
          }
        `}</style>

        <div style={{ width: '100%', maxWidth: '340px', marginTop: '8px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 122, 0, 0.08)', border: '1px solid rgba(255, 122, 0, 0.15)', padding: '4px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700, color: 'var(--secondary)', marginBottom: '8px' }}>
              🍅 Pomodoro Focus
            </div>
            <h1 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.3px' }}>
              Không Gian Tập Trung
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', maxWidth: '300px', margin: '0 auto', lineHeight: 1.35 }}>
              Tự chọn thời gian phù hợp để đạt hiệu suất cao nhất.
            </p>
          </div>

          <div className="premium-card">
            {/* Mode Selector */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', justifyContent: 'space-between' }}>
              <button
                className={`mode-btn ${timerMode === 'preset' ? 'active' : ''}`}
                onClick={() => handleModeChange('preset')}
              >
                25 Phút
              </button>
              <button
                className={`mode-btn ${timerMode === 'custom' ? 'active' : ''}`}
                onClick={() => handleModeChange('custom')}
              >
                Tùy chọn
              </button>
              <button
                className={`mode-btn ${timerMode === 'stopwatch' ? 'active' : ''}`}
                onClick={() => handleModeChange('stopwatch')}
              >
                Bấm giờ
              </button>
            </div>

            {/* Custom Time Selector Panel */}
            {timerMode === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border)', borderRadius: '10px', padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    className="time-input"
                    value={customHours}
                    disabled={isRunning}
                    onChange={(e) => handleCustomTimeChange(e.target.value, customMinutes)}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Giờ</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    className="time-input"
                    value={customMinutes}
                    disabled={isRunning}
                    onChange={(e) => handleCustomTimeChange(customHours, e.target.value)}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Phút</span>
                </div>
              </div>
            )}

            {/* Timer Display Ring */}
            <div className={`timer-display-circle ${isRunning ? 'running-glow' : ''}`}>
              <svg style={{ position: 'absolute', transform: 'rotate(-90deg)', width: '160px', height: '160px' }}>
                <circle cx="80" cy="80" r="72" stroke="rgba(255,255,255,0.02)" strokeWidth="5" fill="transparent" />
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  stroke={timerMode === 'stopwatch' ? '#3ecfcf' : '#ef4444'}
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 72}
                  strokeDashoffset={2 * Math.PI * 72 * (1 - progressPercent / 100)}
                  style={{ transition: 'stroke-dashoffset 0.3s linear', strokeLinecap: 'round' }}
                />
              </svg>

              <span style={{ fontSize: '10px', fontWeight: 800, color: timerMode === 'stopwatch' ? '#3ecfcf' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px', zIndex: 1 }}>
                {timerMode === 'preset' && '⏳ 25 Phút'}
                {timerMode === 'custom' && '⏳ Tự chọn'}
                {timerMode === 'stopwatch' && '⏱️ Bấm giờ'}
              </span>
              <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', zIndex: 1, letterSpacing: '-0.5px' }}>
                {fmtTime(secondsLeft)}
              </span>
            </div>

            {/* Control Buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={toggleTimer}
                className="btn btn-primary"
                style={{
                  borderRadius: '10px',
                  padding: '10px 24px',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  background: isRunning 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : (timerMode === 'stopwatch' ? '#3ecfcf' : '#ef4444'),
                  border: isRunning ? '1.5px solid var(--border)' : 'none',
                  color: isRunning ? 'var(--text-primary)' : 'white',
                  boxShadow: isRunning 
                    ? 'none' 
                    : (timerMode === 'stopwatch' ? '0 5px 15px rgba(62, 207, 207, 0.25)' : '0 5px 15px rgba(239, 68, 68, 0.25)'),
                }}
              >
                {isRunning ? '⏸ Tạm dừng' : '▶ Bắt đầu'}
              </button>
              <button
                onClick={resetTimer}
                className="btn btn-secondary"
                style={{ borderRadius: '10px', padding: '10px 16px', fontWeight: 700, fontSize: '12.5px' }}
              >
                🔄 Đặt lại
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
