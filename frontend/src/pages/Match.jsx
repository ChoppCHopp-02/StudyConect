import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../config/supabaseClient';
import { sendMessage } from '../services/chatServiceTEMP';
import AppLayout from '../layouts/AppLayout';

const COLORS = ['#6c63ff', '#3ecfcf', '#f59e0b', '#8b5cf6', '#22c55e', '#ec4899'];
const getAvatarColor = (id) => COLORS[id % COLORS.length];

export default function Match() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null); // 'left' | 'right'
  const [matchData, setMatchData] = useState(null); // The user we just matched with
  const [loading, setLoading] = useState(true);
  const [myMajor, setMyMajor] = useState(user?.major || '');

  // Fetch real users from Supabase matching the user's major
  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const uid = parseInt(user?.id, 10);
        
        const { data: latestCurrentUser } = await supabase
          .from('users')
          .select('major')
          .eq('id', uid)
          .single();

        const currentMajor = latestCurrentUser?.major || user?.major || '';
        setMyMajor(currentMajor);

        // Get existing friendship IDs to filter them out
        const { data: friendships } = await supabase
          .from('friendships')
          .select('from_user_id, to_user_id')
          .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`);
        
        const excludedIds = new Set([uid]);
        if (friendships) {
          friendships.forEach(f => {
            excludedIds.add(f.from_user_id);
            excludedIds.add(f.to_user_id);
          });
        }

        // Build Supabase query with database-side filtering
        let query = supabase.from('users').select('*');

        // Filter by major case-insensitively on database side if user has a major
        if (currentMajor.trim()) {
          query = query.ilike('major', `%${currentMajor.trim()}%`);
        }

        // Exclude current user and friends directly on database query
        const excludedList = Array.from(excludedIds);
        if (excludedList.length > 0) {
          query = query.not('id', 'in', `(${excludedList.join(',')})`);
        }

        const { data: dbUsers, error } = await query.limit(100);

        if (error) throw error;

        const mappedCandidates = (dbUsers || []).map(u => ({
          id: u.id,
          full_name: u.full_name,
          university: u.university || 'Chưa cập nhật',
          major: u.major || 'Chưa cập nhật',
          bio: u.bio || 'Tìm kiếm bạn học tập tại StudyConnect!',
          avatar: u.avatar,
          avatar_color: getAvatarColor(u.id)
        }));

        setCandidates(mappedCandidates);
      } catch (err) {
        console.error('Error fetching match candidates:', err);
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchCandidates();
    }
  }, [user]);

  const currentCandidate = candidates[currentIndex];

  const handleSwipe = async (direction) => {
    if (swipeDirection || !currentCandidate) return;

    setSwipeDirection(direction);

    // After animation finishes (300ms)
    setTimeout(async () => {
      if (direction === 'right') {
        const isMatch = Math.random() < 0.85;

        if (isMatch) {
          try {
            const fid = parseInt(user.id, 10);
            const tid = parseInt(currentCandidate.id, 10);

            await supabase.from('friendships').insert([
              {
                from_user_id: fid,
                to_user_id: tid,
                status: 'accepted',
                accepted_at: new Date().toISOString()
              }
            ]);
            
            await sendMessage(fid, tid, 'Chào bạn! Chúng ta đã ghép đôi học tập thành công trên StudyConnect. Hãy cùng học nhé! 🤝');
            setMatchData(currentCandidate);
          } catch (err) {
            console.error('Failed saving match:', err);
            addToast('Lỗi ghép đôi học tập, vui lòng thử lại.', 'error');
          }
        } else {
          addToast(`Đã gửi tín hiệu ghép học với ${currentCandidate.full_name}!`, 'info');
        }
      }

      setCurrentIndex(prev => prev + 1);
      setSwipeDirection(null);
    }, 300);
  };

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '0 8px', width: '100%', position: 'relative' }}>
        <style>{`
          .premium-match-wrapper {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
            backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 16px;
            padding: 20px 16px;
            box-shadow: 0 10px 32px rgba(0,0,0,0.2);
            text-align: center;
          }
          .match-tinder-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 16px;
            padding: 20px 16px;
            box-shadow: 0 10px 28px rgba(0,0,0,0.16);
            position: relative;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 290px;
            justify-content: space-between;
            width: 100%;
            margin-top: 12px;
          }
          .swipe-left-anim {
            transform: translate3d(-150%, 40px, 0) rotate(-20deg);
            opacity: 0;
          }
          .swipe-right-anim {
            transform: translate3d(150%, 40px, 0) rotate(20deg);
            opacity: 0;
          }
          .action-btn-circle {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow: 0 6px 18px rgba(0,0,0,0.2);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .action-btn-circle:hover {
            transform: scale(1.12) translateY(-1px);
          }
          .action-btn-circle:active {
            transform: scale(0.95);
          }
          @keyframes pulseMatchOverlay {
            0% { transform: scale(0.9); opacity: 0.5; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1); }
          }
          .match-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(8, 10, 18, 0.75);
            backdrop-filter: blur(10px);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
        `}</style>

        <div style={{ width: '100%', maxWidth: '340px', marginTop: '8px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)', padding: '4px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700, color: 'var(--primary-light)', marginBottom: '8px' }}>
              🤝 Ghép Đôi Học Tập
            </div>
            <h1 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.3px' }}>
              Tìm Bạn Đồng Hành
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', maxWidth: '300px', margin: '0 auto', lineHeight: 1.35 }}>
              Hệ thống tự động đề xuất những bạn có cùng chuyên ngành để học tập cùng nhau.
            </p>

            <div style={{ marginTop: '8px' }}>
              {myMajor ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 122, 0, 0.08)', border: '1px solid rgba(255, 122, 0, 0.15)', padding: '3px 10px', borderRadius: '20px', fontSize: '10.5px', fontWeight: 700, color: 'var(--secondary)' }}>
                  🎯 Chuyên ngành: {myMajor}
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '3px 10px', borderRadius: '20px', fontSize: '10.5px', fontWeight: 700, color: '#ef4444' }}>
                  ⚠️ Chưa thiết lập chuyên ngành trong hồ sơ
                </span>
              )}
            </div>
          </div>

          {/* Tinder Stack */}
          <div style={{ position: 'relative', minHeight: '320px' }}>
            {loading ? (
              <div className="premium-match-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px' }}>
                <div className="spinner" style={{ marginBottom: '12px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Đang tìm kiếm bạn học...</p>
              </div>
            ) : currentCandidate ? (
              <div>
                {/* Tinder Card */}
                <div className={`match-tinder-card ${swipeDirection === 'left' ? 'swipe-left-anim' : swipeDirection === 'right' ? 'swipe-right-anim' : ''}`}>
                  
                  {/* Profile Header */}
                  <div style={{ width: '100%' }}>
                    <div style={{
                      width: '72px', height: '72px', borderRadius: '50%',
                      background: `linear-gradient(135deg, ${currentCandidate.avatar_color || '#6c63ff'}, #2563eb)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '24px', fontWeight: 800, color: '#fff',
                      margin: '0 auto 12px',
                      boxShadow: '0 6px 18px rgba(99, 102, 241, 0.2)',
                      overflow: 'hidden',
                      border: '2px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      {currentCandidate.avatar ? (
                        <img src={currentCandidate.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        currentCandidate.full_name.split(' ').slice(-1)[0][0]
                      )}
                    </div>

                    <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      {currentCandidate.full_name}
                    </h2>

                    <p style={{
                      fontSize: '12.5px', color: 'var(--text-secondary)',
                      lineHeight: 1.45, padding: '0 8px', margin: '0 auto 16px',
                      maxWidth: '280px', fontStyle: 'italic'
                    }}>
                      "{currentCandidate.bio}"
                    </p>
                  </div>

                  {/* College Info & Actions */}
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '16px' }}>
                      <span style={{
                        background: 'rgba(99, 102, 241, 0.08)',
                        color: 'var(--primary-light)',
                        border: '1px solid rgba(99, 102, 241, 0.12)',
                        padding: '4px 8px', borderRadius: '8px', fontSize: '10.5px', fontWeight: 700
                      }}>
                        🏫 {currentCandidate.university}
                      </span>
                      <span style={{
                        background: 'rgba(62, 207, 207, 0.08)',
                        color: 'var(--secondary)',
                        border: '1px solid rgba(62, 207, 207, 0.12)',
                        padding: '4px 8px', borderRadius: '8px', fontSize: '10.5px', fontWeight: 700
                      }}>
                        📚 {currentCandidate.major}
                      </span>
                    </div>

                    {/* Yes/No Swipe Buttons */}
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleSwipe('left')}
                        className="action-btn-circle"
                        style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                        title="Bỏ qua"
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => handleSwipe('right')}
                        className="action-btn-circle"
                        style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', color: 'white', boxShadow: '0 6px 18px rgba(108, 99, 255, 0.25)' }}
                        title="Muốn học cùng!"
                      >
                        🤝
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="premium-match-wrapper" style={{ padding: '32px 16px' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎉</div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px', fontWeight: 800, fontSize: '16px' }}>Đã duyệt hết danh sách!</h3>
                <p style={{ maxWidth: '280px', margin: '0 auto 16px', fontSize: '12.5px', lineHeight: 1.45, color: 'var(--text-muted)' }}>
                  Không tìm thấy bạn học cùng chuyên ngành "{myMajor}" lúc này. Bạn có thể xem lại từ đầu.
                </p>
                <button className="btn btn-secondary" onClick={() => setCurrentIndex(0)} style={{ borderRadius: '10px', padding: '8px 20px', fontWeight: 700, fontSize: '12.5px' }}>
                  Xem lại từ đầu
                </button>
              </div>
            )}
          </div>

          {/* Matched Dialog overlay */}
          {matchData && (
            <div className="match-modal-overlay">
              <div style={{
                textAlign: 'center',
                maxWidth: '320px',
                width: '100%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '24px 20px',
                boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
                animation: 'pulseMatchOverlay 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '12px', filter: 'drop-shadow(0 0 8px rgba(255,122,0,0.3))' }}>⚡ MATCHED! ⚡</div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Ghép Đôi Thành Công!
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', marginBottom: '20px', lineHeight: 1.45 }}>
                  Bạn và <strong>{matchData.full_name}</strong> đã bắt cặp học cùng nhau trên hệ thống.
                </p>

                {/* Connecting Avatar visuals */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div style={{
                    width: '54px', height: '54px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    border: '2px solid var(--secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff',
                    boxShadow: '0 5px 12px rgba(99,102,241,0.25)',
                    overflow: 'hidden'
                  }}>
                    {user?.avatar ? <img src={user.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" /> : user?.fullName?.[0]}
                  </div>
                  <span style={{ fontSize: '20px', animation: 'pulse 1.5s infinite' }}>🤝</span>
                  <div style={{
                    width: '54px', height: '54px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${matchData.avatar_color}, #2563eb)`,
                    border: '2px solid var(--secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff',
                    boxShadow: '0 5px 12px rgba(255,107,157,0.25)',
                    overflow: 'hidden'
                  }}>
                    {matchData.avatar ? <img src={matchData.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : matchData.full_name.split(' ').slice(-1)[0][0]}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <button
                    onClick={() => {
                      setMatchData(null);
                      navigate('/chat');
                    }}
                    className="btn btn-primary"
                    style={{ borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontWeight: 700, width: '100%', boxShadow: '0 5px 15px rgba(108,99,255,0.2)' }}
                  >
                    💬 Trò chuyện ngay
                  </button>
                  <button
                    onClick={() => setMatchData(null)}
                    className="btn btn-secondary"
                    style={{ borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, width: '100%' }}
                  >
                    Tiếp tục ghép đôi
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}
