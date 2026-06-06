import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { getUserSchedulesAndDeadlines, toggleDeadline } from '../services/interactionService';
import AppLayout from '../layouts/AppLayout';

const getProcessedDeadlines = (deadList) => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return deadList.map(d => {
    const due = new Date(d.dueDate).getTime();
    return {
      ...d,
      dueSoon: !d.completed && due > now && (due - now) <= oneDayMs,
      overdue: !d.completed && due < now
    };
  });
};

const getSubmissionsCount = (groupId, deadlineId) => {
  try {
    const cached = localStorage.getItem(`studyconect_submissions_${groupId}`);
    if (!cached) return 0;
    const all = JSON.parse(cached);
    const list = all[deadlineId] || [];
    return list.length;
  } catch {
    return 0;
  }
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const timeUntil = (dateStr) => {
  const diff = new Date(dateStr) - Date.now();
  if (diff < 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)} ngày nữa`;
  if (h > 0) return `${h}h ${m}m nữa`;
  return `${m} phút nữa`;
};

export default function Schedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const [schedules, setSchedules] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urgentCount, setUrgentCount] = useState(0);

  const fetchAllData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { schedules: schedList, deadlines: deadList } = await getUserSchedulesAndDeadlines(user.id);
      setSchedules(schedList);
      const processed = getProcessedDeadlines(deadList);
      setDeadlines(processed);
      setUrgentCount(processed.filter(d => d.dueSoon).length);
    } catch (err) {
      addToast(err.message || 'Lỗi khi tải lịch học và deadline', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (!loading) {
      const hash = location.hash;
      if (hash === '#schedules') {
        const element = document.getElementById('schedules-section');
        if (element) {
          const timer = setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 150);
          return () => clearTimeout(timer);
        }
      } else if (hash === '#deadlines') {
        const element = document.getElementById('deadlines-section');
        if (element) {
          const timer = setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 150);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [loading, location.hash]);

  const handleDeadlineToggle = async (deadlineId) => {
    try {
      await toggleDeadline(deadlineId);
      addToast('Cập nhật trạng thái deadline thành công!', 'success');
      const { schedules: schedList, deadlines: deadList } = await getUserSchedulesAndDeadlines(user.id);
      setSchedules(schedList);
      const processed = getProcessedDeadlines(deadList);
      setDeadlines(processed);
      setUrgentCount(processed.filter(d => d.dueSoon).length);
    } catch (err) {
      addToast(err.message || 'Lỗi khi cập nhật deadline', 'error');
    }
  };

  const incompleteDeadlines = deadlines.filter(d => !d.completed);
  const completedDeadlines = deadlines.filter(d => d.completed);

  const stats = [
    { label: 'Buổi học sắp tới', value: schedules.length, color: 'var(--primary)', bg: 'rgba(108,99,255,0.12)' },
    { label: 'Deadline chờ xử lý', value: incompleteDeadlines.length, color: 'var(--warning)', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Đã hoàn thành', value: completedDeadlines.length, color: 'var(--success)', bg: 'rgba(34,197,94,0.12)' },
  ];

  return (
    <AppLayout hideSidebar={true}>
      <div className="schedule-container">
        {/* Page Header */}
        <div>
          <h1 className="page-title">Lịch học & Deadline</h1>
          <p className="page-subtitle">Quản lý buổi học nhóm và thời hạn nộp bài tập của bạn</p>

          {/* Stats bar */}
          {!loading && (
            <div className="stats-grid">
              {stats.map((stat, i) => (
                <div key={i} className="stat-card" style={{ borderColor: stat.color.replace(')', ', 0.3)').replace('rgb', 'rgba') }}>
                  <div>
                    <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgent Banner */}
        {!loading && urgentCount > 0 && (
          <div className="urgent-banner">
            <div style={{ fontSize: '28px' }}>⚠️</div>
            <div>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '16px' }}>
                {urgentCount} deadline sắp đến hạn trong 24 giờ!
              </div>
              <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
                Hãy hoàn thành trước khi quá muộn nhé.
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Đang tải lịch học của bạn...</p>
          </div>
        ) : (
          <div className="grid-responsive">
            {/* LEFT: Schedules */}
            <div id="schedules-section" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="section-header" style={{ borderBottomColor: 'rgba(108,99,255,0.3)' }}>
                <h2 className="section-title">Buổi học sắp diễn ra</h2>
              </div>

              {schedules.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px 16px', textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>Chưa có lịch học nhóm nào sắp tới.</p>
                </div>
              ) : (
                schedules.map(sched => {
                  const isLink = sched.location?.startsWith('http://') || sched.location?.startsWith('https://');
                  const isPast = new Date(sched.dateTime) < new Date();
                  const countdown = timeUntil(sched.dateTime);
                  return (
                    <div key={sched.id} 
                      onClick={() => navigate(`/groups/${sched.groupId}?tab=schedule`)}
                      className={`item-card ${isPast ? 'is-past' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>{sched.topic}</h4>
                        {countdown && !isPast && (
                          <span style={{ background: 'rgba(108,99,255,0.2)', color: '#a5b4fc', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', flexShrink: 0 }}>
                            ⏳ {countdown}
                          </span>
                        )}
                        {isPast && (
                          <span style={{ background: 'rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', flexShrink: 0 }}>
                            Đã qua
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '14px' }}>
                          📅 {formatDate(sched.dateTime)}
                        </div>
                        {sched.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '14px' }}>
                            📍 {isLink ? (
                              <a href={sched.location} target="_blank" rel="noreferrer" 
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: '#3ecfcf', textDecoration: 'none', fontWeight: 600 }}>Tham gia online →</a>
                            ) : (
                              sched.location
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a5b4fc', fontSize: '14px', fontWeight: 600 }}>
                          📂 Nhóm: {sched.groupName}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* RIGHT: Deadlines */}
            <div id="deadlines-section" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="section-header" style={{ borderBottomColor: 'rgba(239,68,68,0.3)' }}>
                <h2 className="section-title">Deadline chưa hoàn thành</h2>
              </div>

              {incompleteDeadlines.length === 0 ? (
                <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '16px', padding: '24px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎉</div>
                  <p style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600, margin: 0 }}>Tuyệt vời! Không còn deadline nào chưa làm.</p>
                </div>
              ) : (
                incompleteDeadlines.map(d => {
                  const subCount = getSubmissionsCount(d.groupId, d.id);
                  return (
                    <div key={d.id} 
                      onClick={() => navigate(`/groups/${d.groupId}?tab=deadlines`)}
                      className={`item-card ${d.dueSoon ? 'is-urgent' : ''}`}
                      style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#fff' }}>{d.title}</h4>
                          <span style={{ fontSize: '12px', color: '#3ecfcf', fontWeight: 600, flexShrink: 0 }}>📂 {d.groupName}</span>
                        </div>
                        {d.description && (
                          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 10px 0', lineHeight: 1.5 }}>{d.description}</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', color: d.dueSoon ? '#f87171' : d.overdue ? '#64748b' : '#cbd5e1', fontWeight: 600 }}>
                            ⏳ {new Date(d.dueDate).toLocaleString('vi-VN')}
                          </span>
                          {d.dueSoon && <span style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>&lt; 24h</span>}
                          {d.overdue && <span style={{ background: 'rgba(100,100,120,0.3)', color: '#94a3b8', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>Quá hạn</span>}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/groups/${d.groupId}?tab=deadlines`);
                        }}
                        style={{
                          background: 'rgba(62,207,207,0.1)',
                          border: '1px solid rgba(62,207,207,0.3)',
                          color: '#5eead4',
                          cursor: 'pointer',
                          borderRadius: '12px',
                          padding: '10px 16px',
                          fontSize: '13px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(62,207,207,0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(62,207,207,0.1)'; }}
                      >
                        📋 Bài nộp ({subCount})
                      </button>
                    </div>
                  );
                })
              )}

              {completedDeadlines.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <div className="section-header" style={{ borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#64748b', margin: 0 }}>Đã hoàn thành ({completedDeadlines.length})</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: 0.6 }}>
                    {completedDeadlines.map(d => (
                      <div key={d.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input type="checkbox" checked={d.completed} onChange={() => handleDeadlineToggle(d.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#6366f1', flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '14px', textDecoration: 'line-through', color: '#94a3b8', fontWeight: 500 }}>{d.title}</span>
                          <span style={{ fontSize: '12px', color: '#64748b', flexShrink: 0 }}>{d.groupName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .schedule-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px 16px;
          font-family: 'Inter', sans-serif;
          position: relative;
          z-index: 1;
        }
        .page-title {
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 6px 0;
          line-height: 1.2;
        }
        .page-subtitle {
          color: #94a3b8;
          font-size: 14px;
          margin: 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s;
        }
        .stat-card:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .stat-value {
          font-size: 28px;
          font-weight: 800;
          line-height: 1;
        }
        .stat-label {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 4px;
          font-weight: 500;
        }
        
        .urgent-banner {
          background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.05));
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          box-shadow: 0 8px 24px rgba(239,68,68,0.1);
        }
        
        .grid-responsive {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 24px;
        }
        @media (max-width: 768px) {
          .grid-responsive { grid-template-columns: 1fr; }
        }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }
        .badge-count {
          background: rgba(255,255,255,0.1);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          margin-left: auto;
        }
        
        .item-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 16px;
          transition: all 0.3s;
          cursor: pointer;
          margin-bottom: 12px;
        }
        .item-card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.15);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
        
        .item-card.is-past {
          opacity: 0.5;
        }
        .item-card.is-past:hover {
          transform: none;
          box-shadow: none;
          background: rgba(255,255,255,0.02);
        }
        
        .item-card.is-urgent {
          background: linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.03));
          border-color: rgba(239,68,68,0.3);
        }
        .item-card.is-urgent:hover {
          box-shadow: 0 8px 24px rgba(239,68,68,0.15);
        }
      `}</style>    </AppLayout>
  );
}