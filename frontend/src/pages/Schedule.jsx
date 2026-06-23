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
    const key = `sc_submissions_${groupId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return 0;
    const all = JSON.parse(stored);
    const list = all[deadlineId] || [];
    return list.length;
  } catch (e) {
    console.error('Error loading submissions count:', e);
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

  return (
    <AppLayout hideSidebar={true}>
      <div className="schedule-container">
        {/* Page Header */}
        <div>
          <h1 className="page-title">Lịch học và Deadline</h1>
          <p className="page-subtitle">Quản lý buổi học nhóm và thời hạn nộp bài tập của bạn</p>
        </div>

        {/* Urgent Banner */}
        {!loading && urgentCount > 0 && (
          <div className="urgent-banner">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '16px' }}>
                {urgentCount} deadline sắp đến hạn trong 24 giờ!
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
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
            <div id="schedules-section" className="sc-card-animated" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="section-header" style={{ borderBottomColor: 'rgba(42, 117, 118, 0.3)' }}>
                <h2 className="section-title">Buổi học sắp diễn ra</h2>
              </div>

              {schedules.length === 0 ? (
                <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: '16px', padding: '24px 16px', textAlign: 'center' }}>
                  <svg width="72" height="56" viewBox="0 0 72 56" style={{ marginBottom: '8px' }}>
                    <rect x="8" y="10" width="56" height="40" rx="6" fill="var(--bg-input)" stroke="var(--primary)" strokeWidth="1.5" />
                    <line x1="8" y1="22" x2="64" y2="22" stroke="var(--primary)" strokeWidth="1.5" />
                    <line x1="20" y1="4" x2="20" y2="16" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
                    <line x1="52" y1="4" x2="52" y2="16" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="22" cy="32" r="2.5" fill="var(--border)" />
                    <circle cx="36" cy="32" r="2.5" fill="var(--border)" />
                    <circle cx="50" cy="32" r="2.5" fill="var(--border)" />
                    <circle cx="22" cy="42" r="2.5" fill="var(--border)" />
                  </svg>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Chưa có lịch học nhóm nào sắp tới.</p>
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
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{sched.topic}</h4>
                        {countdown && !isPast && (
                          <span style={{ background: 'rgba(0, 0, 0, 0.06)', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            {countdown}
                          </span>
                        )}
                        {isPast && (
                          <span style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', flexShrink: 0 }}>
                            Đã qua
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-primary)' }}>
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                            <line x1="16" x2="16" y1="2" y2="6"/>
                            <line x1="8" x2="8" y1="2" y2="6"/>
                            <line x1="3" x2="21" y1="10" y2="10"/>
                          </svg>
                          {formatDate(sched.dateTime)}
                        </div>
                        {sched.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-primary)' }}>
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            {isLink ? (
                              <a href={sched.location} target="_blank" rel="noreferrer" 
                                onClick={(e) => e.stopPropagation()}
                                style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>Tham gia online →</a>
                            ) : (
                              sched.location
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                          </svg>
                          Nhóm: {sched.groupName}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* RIGHT: Deadlines */}
            <div id="deadlines-section" className="sc-card-animated" style={{ display: 'flex', flexDirection: 'column', animationDelay: '0.1s' }}>
              <div className="section-header" style={{ borderBottomColor: 'rgba(239,68,68,0.3)' }}>
                <h2 className="section-title">Deadline chưa hoàn thành</h2>
              </div>

              {incompleteDeadlines.length === 0 ? (
                <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: '16px', padding: '24px 16px', textAlign: 'center' }}>
                  <svg width="72" height="56" viewBox="0 0 72 56" style={{ marginBottom: '8px' }}>
                    <rect x="18" y="12" width="36" height="38" rx="5" fill="var(--bg-input)" stroke="var(--primary)" strokeWidth="1.5" />
                    <rect x="30" y="7" width="12" height="5" rx="1.5" fill="var(--border)" stroke="var(--primary)" strokeWidth="1.5" />
                    <line x1="24" y1="20" x2="48" y2="20" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="24" y1="28" x2="40" y2="28" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="24" y1="36" x2="34" y2="36" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="48" cy="38" r="9" fill="var(--bg-card)" stroke="var(--primary)" strokeWidth="1.5" />
                    <polyline points="44 38 47 41 52 35" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>Tuyệt vời! Không còn deadline nào chưa làm.</p>
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
                          <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{d.title}</h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                            </svg>
                            {d.groupName}
                          </span>
                        </div>
                        {d.description && (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 10px 0', lineHeight: 1.5 }}>{d.description}</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            {new Date(d.dueDate).toLocaleString('vi-VN')}
                          </span>
                          {d.dueSoon && <span style={{ background: 'rgba(239,68,68,0.2)', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>&lt; 24h</span>}
                          {d.overdue && <span style={{ background: 'rgba(100,100,120,0.3)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>Quá hạn</span>}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/groups/${d.groupId}?tab=deadlines`);
                        }}
                        style={{
                          background: 'rgba(42, 117, 118, 0.08)',
                          border: '1px solid rgba(42, 117, 118, 0.35)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          borderRadius: '12px',
                          padding: '10px 16px',
                          fontSize: '13px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s',
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(42, 117, 118, 0.18)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(42, 117, 118, 0.08)'; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                        </svg>
                        Bài nộp ({subCount})
                      </button>
                    </div>
                  );
                })
              )}

              {completedDeadlines.length > 0 && (
                <div id="completed-deadlines-section" style={{ marginTop: '24px' }}>
                  <div className="section-header" style={{ borderBottomColor: 'var(--border)', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>Đã hoàn thành ({completedDeadlines.length})</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: 0.6 }}>
                    {completedDeadlines.map(d => (
                      <div key={d.id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input type="checkbox" checked={d.completed} onChange={() => handleDeadlineToggle(d.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '14px', textDecoration: 'line-through', color: 'var(--text-secondary)', fontWeight: 500 }}>{d.title}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>{d.groupName}</span>
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
          font-family: 'Fraunces', serif;
          font-size: 24px;
          font-weight: 900;
          color: var(--primary);
          margin: 0 0 6px 0;
          line-height: 1.2;
        }
        .page-subtitle {
          color: var(--text-secondary);
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
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s;
          box-shadow: var(--shadow);
        }
        .stat-card:hover {
          background: rgba(42, 117, 118, 0.04);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(42, 117, 118, 0.08);
        }
        .stat-value {
          font-size: 28px;
          font-weight: 800;
          line-height: 1;
        }
        .stat-label {
          font-size: 12px;
          color: var(--text-secondary);
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
        @media (max-width: 991px) {
          .grid-responsive { grid-template-columns: 1fr; }
        }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .badge-count {
          background: var(--bg-input);
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          margin-left: auto;
        }
        
        .item-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px;
          transition: all 0.3s;
          cursor: pointer;
          margin-bottom: 12px;
          box-shadow: var(--shadow);
        }
        .item-card:hover {
          background: rgba(42, 117, 118, 0.04);
          border-color: rgba(42, 117, 118, 0.25);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(42, 117, 118, 0.08);
        }
        
        .item-card.is-past {
          opacity: 0.5;
        }
        .item-card.is-past:hover {
          transform: none;
          box-shadow: none;
          background: var(--bg-card);
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