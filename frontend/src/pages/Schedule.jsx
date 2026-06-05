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
      {/* Main */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px', position: 'relative', zIndex: 1 }}>

        {/* Page Header */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' }}>
            
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                Lịch học &amp; Deadline
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
                Quản lý buổi học nhóm và thời hạn nộp bài tập của bạn
              </p>
            </div>
          </div>

          {/* Stats bar */}
          {!loading && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
              {stats.map((stat, i) => (
                <div key={i} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 20px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  flex: '1', minWidth: '160px',
                  transition: 'var(--transition)',
                }}>
                  <div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgent Banner */}
        {!loading && urgentCount > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.08))',
            border: '1.5px solid rgba(239,68,68,0.4)',
            borderRadius: 'var(--radius)',
            padding: '16px 22px',
            display: 'flex', alignItems: 'center', gap: '14px',
            marginBottom: '28px',
            boxShadow: '0 4px 20px rgba(239,68,68,0.1)'
          }}>
            
            <div>
              <div style={{ color: 'var(--error)', fontWeight: 800, fontSize: '15px' }}>
                {urgentCount} deadline sắp đến hạn trong 24 giờ!
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
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
            <div id="schedules-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '2px solid rgba(108,99,255,0.3)' }}>
                
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Buổi học sắp diễn ra
                </h2>
                <span style={{ marginLeft: 'auto', background: 'rgba(108,99,255,0.15)', color: 'var(--primary-light)', fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>
                  {schedules.length}
                </span>
              </div>

              {schedules.length === 0 ? (
                <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '48px 24px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Chưa có lịch học nhóm nào sắp tới.</p>
                </div>
              ) : (
                schedules.map(sched => {
                  const isLink = sched.location?.startsWith('http://') || sched.location?.startsWith('https://');
                  const isPast = new Date(sched.dateTime) < new Date();
                  const countdown = timeUntil(sched.dateTime);
                  return (
                    <div key={sched.id} 
                      onClick={() => navigate(`/groups/${sched.groupId}?tab=schedule`)}
                      style={{
                        background: isPast ? 'var(--bg-card)' : 'linear-gradient(135deg, rgba(108,99,255,0.07), rgba(62,207,207,0.04))',
                        border: isPast ? '1px solid var(--border)' : '1.5px solid rgba(108,99,255,0.35)',
                        borderRadius: 'var(--radius)',
                        padding: '18px 20px',
                        opacity: isPast ? 0.55 : 1,
                        transition: 'transform 0.2s, box-shadow 0.2s, opacity 0.2s',
                        boxShadow: isPast ? 'none' : '0 4px 20px rgba(108,99,255,0.12)',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!isPast) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 24px rgba(108,99,255,0.18)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isPast) {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,99,255,0.12)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{sched.topic}</h4>
                        {countdown && (
                          <span style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--primary-light)', fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', flexShrink: 0 }}>{countdown}</span>
                        )}
                        {isPast && (
                          <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', flexShrink: 0 }}>Đã qua</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(sched.dateTime)}</span>
                        </div>
                        {sched.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isLink ? (
                              <a href={sched.location} target="_blank" rel="noreferrer" 
                                onClick={(e) => e.stopPropagation()}
                                style={{ fontSize: '13px', color: 'var(--secondary)', textDecoration: 'none', fontWeight: 600 }}>Tham gia online →</a>
                            ) : (
                              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{sched.location}</span>
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--primary-light)', fontWeight: 600 }}>📂 {sched.groupName}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* RIGHT: Deadlines */}
            <div id="deadlines-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '2px solid rgba(239,68,68,0.35)' }}>
                
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Deadline chưa hoàn thành</h2>
                <span style={{ marginLeft: 'auto', background: incompleteDeadlines.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.12)', color: incompleteDeadlines.length > 0 ? 'var(--error)' : 'var(--success)', fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>
                  {incompleteDeadlines.length}
                </span>
              </div>

              {incompleteDeadlines.length === 0 ? (
                <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(62,207,207,0.05))', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius)', padding: '32px 24px', textAlign: 'center' }}>
                  
                  <p style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 600 }}>Tuyệt vời! Không còn deadline nào chưa làm.</p>
                </div>
              ) : (
                incompleteDeadlines.map(d => {
                  const subCount = getSubmissionsCount(d.groupId, d.id);
                  return (
                    <div key={d.id} 
                      onClick={() => navigate(`/groups/${d.groupId}?tab=deadlines`)}
                      style={{
                        background: d.dueSoon ? 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.05))' : d.overdue ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, rgba(62,207,207,0.05), rgba(108,99,255,0.04))',
                        border: d.dueSoon ? '1.5px solid rgba(239,68,68,0.5)' : d.overdue ? '1px solid rgba(100,100,120,0.3)' : '1.5px solid rgba(62,207,207,0.3)',
                        borderRadius: 'var(--radius)',
                        padding: '16px 18px',
                        display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between',
                        boxShadow: d.dueSoon ? '0 0 16px rgba(239,68,68,0.12)' : 'none',
                        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = d.dueSoon ? '0 6px 24px rgba(239,68,68,0.2)' : '0 6px 24px rgba(62,207,207,0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = d.dueSoon ? '0 0 16px rgba(239,68,68,0.12)' : 'none';
                      }}
                    >
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{d.title}</h4>
                          <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 600, flexShrink: 0 }}>📂 {d.groupName}</span>
                        </div>
                        {d.description && (
                          <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '0 0 6px 0', lineHeight: 1.4 }}>{d.description}</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', color: d.dueSoon ? 'var(--error)' : d.overdue ? 'var(--text-muted)' : 'var(--text-secondary)', fontWeight: 600 }}>
                            {new Date(d.dueDate).toLocaleString('vi-VN')}
                          </span>
                          {d.dueSoon && <span style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--error)', fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px' }}>&lt; 24h</span>}
                          {d.overdue && <span style={{ background: 'rgba(100,100,120,0.15)', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px' }}>Quá hạn</span>}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/groups/${d.groupId}?tab=deadlines`);
                        }}
                        style={{
                          background: 'rgba(62,207,207,0.12)',
                          border: '1.5px solid rgba(62,207,207,0.3)',
                          color: 'var(--secondary)',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'background 0.2s, border-color 0.2s',
                          flexShrink: 0
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(62,207,207,0.22)'; e.currentTarget.style.borderColor = 'var(--secondary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(62,207,207,0.12)'; e.currentTarget.style.borderColor = 'rgba(62,207,207,0.3)'; }}
                      >
                        📋 Bài nộp ({subCount})
                      </button>
                    </div>
                  );
                })
              )}

              {completedDeadlines.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px dashed var(--border)', marginBottom: '12px' }}>
                    
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>Đã hoàn thành ({completedDeadlines.length})</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.55 }}>
                    {completedDeadlines.map(d => (
                      <div key={d.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input type="checkbox" checked={d.completed} onChange={() => handleDeadlineToggle(d.id)}
                          style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '13px', textDecoration: 'line-through', color: 'var(--text-muted)', fontWeight: 500 }}>{d.title}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{d.groupName}</span>
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
    </AppLayout>
  );
}