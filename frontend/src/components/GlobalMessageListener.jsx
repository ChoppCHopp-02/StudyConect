import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function GlobalMessageListener() {
  const { user } = useAuth();
  const { addToast: originalAddToast } = useToast();
  const location = useLocation();

  // Cache lookups to prevent N+1 queries during real-time updates
  const senderCache = useRef({});
  const groupCache = useRef({});

  const addToast = useCallback((...args) => {
    // Không xuất hiện thông báo bên phải (toast popup) khi đang họp hoặc đang gọi điện
    const isInsideCallOrMeet = 
      location.pathname.startsWith('/room/') || 
      location.pathname.startsWith('/call/');

    if (isInsideCallOrMeet) {
      return; // Chặn hiển thị Toast bên phải
    }

    if (localStorage.getItem('studyconect_toast_enabled') !== 'false') {
      originalAddToast(...args);
    }
  }, [location.pathname, originalAddToast]);

  useEffect(() => {
    if (!user?.id) return;

    const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/admin-login';
    if (isAdminRoute) return;

    const uid = parseInt(user.id, 10);

    // Track groups user belongs to
    let userGroupIds = new Set();
    // Track group_ids where user is creator or admin (for join request notifications)
    let managedGroupIds = new Set();

    const fetchUserGroups = async () => {
      try {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('group_id, role')
          .eq('user_id', uid);

        if (memberships) {
          userGroupIds = new Set(memberships.map(g => Number(g.group_id)));
          managedGroupIds = new Set(
            memberships
              .filter(g => g.role === 'owner' || g.role === 'admin')
              .map(g => Number(g.group_id))
          );
        }

        // Also include groups where user is creator
        const { data: createdGroups } = await supabase
          .from('study_groups')
          .select('id')
          .eq('creator_id', uid);
        if (createdGroups) {
          createdGroups.forEach(g => managedGroupIds.add(Number(g.id)));
        }
      } catch (err) {
        console.error('[Realtime] Lỗi tải danh sách nhóm:', err);
      }
    };

    fetchUserGroups();

    // ──────────────────────────────────────────────────
    // Single channel — all table listeners bundled
    // ──────────────────────────────────────────────────
    const channel = supabase
      .channel(`notif-user-${uid}`)

      // ① Tin nhắn cá nhân & nhóm
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new;
        if (String(msg.sender_id) === String(uid)) return;

        if (msg.group_id != null) {
          // Group message
          if (!userGroupIds.has(Number(msg.group_id))) return;

          const isViewingChat =
            location.pathname.includes(`/groups/${msg.group_id}`) &&
            sessionStorage.getItem('active_group_tab') === 'chat';
          if (isViewingChat) return;

          try {
            const [senderName, groupName] = await Promise.all([
              (async () => {
                if (senderCache.current[msg.sender_id]) return senderCache.current[msg.sender_id];
                const { data } = await supabase.from('users').select('full_name').eq('id', msg.sender_id).single();
                if (data?.full_name) senderCache.current[msg.sender_id] = data.full_name;
                return data?.full_name || 'Thành viên';
              })(),
              (async () => {
                if (groupCache.current[msg.group_id]) return groupCache.current[msg.group_id];
                const { data } = await supabase.from('study_groups').select('name').eq('id', msg.group_id).single();
                if (data?.name) groupCache.current[msg.group_id] = data.name;
                return data?.name || 'Nhóm';
              })()
            ]);

            const raw = msg.content || '';
            if (raw.startsWith('[meetroom:')) {
              const match = raw.match(/^\[meetroom:([^\]]+)\]/);
              const rId = match ? match[1] : null;
              if (rId && location.pathname.startsWith(`/room/${rId}`)) return;

              const text = raw.replace(/^\[meetroom:[^\]]+\]\s*/, '');
              addToast(`[Phòng họp] ${senderName}: ${text}`, 'info', 6000, `/groups/${msg.group_id}?tab=chat`, '📞');
              return;
            }
            addToast(
              `[${groupName}] ${senderName}: ${raw}`,
              'message', 6000,
              `/groups/${msg.group_id}?tab=chat`,
              '👥'
            );
          } catch { /* ignore */ }
        } else {
          // Private message
          if (String(msg.receiver_id) !== String(uid)) return;
          const openChat = sessionStorage.getItem('active_chat_friend_id');
          if (location.pathname === '/chat' && String(openChat) === String(msg.sender_id)) return;

          try {
            const senderName = await (async () => {
              const nickname = localStorage.getItem(`sc_nickname_${uid}_${msg.sender_id}`);
              if (nickname) return nickname;
              if (senderCache.current[msg.sender_id]) return senderCache.current[msg.sender_id];
              const { data } = await supabase.from('users').select('full_name').eq('id', msg.sender_id).single();
              if (data?.full_name) senderCache.current[msg.sender_id] = data.full_name;
              return data?.full_name || 'Người dùng';
            })();

            const text = (msg.content?.startsWith('data:image') || msg.content?.match(/\.(jpeg|jpg|gif|png|webp)(\?|$)/i))
              ? 'Đã gửi một ảnh'
              : (msg.content || '');
            addToast(`${senderName}: ${text}`, 'message', 6000, '/chat', '💬');
          } catch { /* ignore */ }
        }
      })

      // ② Bình luận bài viết
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
        const c = payload.new;
        if (String(c.user_id) === String(uid)) return;
        try {
          const [postOwnerId, commenterName] = await Promise.all([
            (async () => {
              const { data } = await supabase.from('posts').select('user_id').eq('id', c.post_id).single();
              return data?.user_id;
            })(),
            (async () => {
              if (senderCache.current[c.user_id]) return senderCache.current[c.user_id];
              const { data } = await supabase.from('users').select('full_name').eq('id', c.user_id).single();
              if (data?.full_name) senderCache.current[c.user_id] = data.full_name;
              return data?.full_name || 'Người dùng';
            })()
          ]);

          if (!postOwnerId || String(postOwnerId) !== String(uid)) return;
          addToast(`${commenterName} bình luận: "${c.content}"`, 'notification', 6000, '/', '💬');
        } catch { /* ignore */ }
      })

      // ③ Thả cảm xúc bài viết
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, async (payload) => {
        if (payload.eventType === 'DELETE') return;
        const r = payload.new;
        if (String(r.user_id) === String(uid)) return;
        try {
          const [postOwnerId, reactorName] = await Promise.all([
            (async () => {
              const { data } = await supabase.from('posts').select('user_id').eq('id', r.post_id).single();
              return data?.user_id;
            })(),
            (async () => {
              if (senderCache.current[r.user_id]) return senderCache.current[r.user_id];
              const { data } = await supabase.from('users').select('full_name').eq('id', r.user_id).single();
              if (data?.full_name) senderCache.current[r.user_id] = data.full_name;
              return data?.full_name || 'Người dùng';
            })()
          ]);

          if (!postOwnerId || String(postOwnerId) !== String(uid)) return;
          const emoji = r.emoji || '❤️';
          addToast(`${reactorName} đã bày tỏ cảm xúc với bài viết của bạn`, 'notification', 6000, '/', emoji);
        } catch { /* ignore */ }
      })

      // ④ Lời mời kết bạn & Chấp nhận kết bạn
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const f = payload.new;
          if (String(f.to_user_id) !== String(uid)) return;
          if (f.status !== 'pending') return;
          try {
            const senderName = await (async () => {
              if (senderCache.current[f.from_user_id]) return senderCache.current[f.from_user_id];
              const { data } = await supabase.from('users').select('full_name').eq('id', f.from_user_id).single();
              if (data?.full_name) senderCache.current[f.from_user_id] = data.full_name;
              return data?.full_name || 'Ai đó';
            })();
            addToast(`${senderName} muốn kết bạn với bạn`, 'notification', 7000, '/friends', '🤝');
          } catch { /* ignore */ }

        } else if (payload.eventType === 'UPDATE') {
          const newF = payload.new;
          const oldF = payload.old;
          if (newF.status === 'accepted' && oldF?.status !== 'accepted') {
            if (String(newF.from_user_id) === String(uid)) {
              try {
                const accepterName = await (async () => {
                  if (senderCache.current[newF.to_user_id]) return senderCache.current[newF.to_user_id];
                  const { data } = await supabase.from('users').select('full_name').eq('id', newF.to_user_id).single();
                  if (data?.full_name) senderCache.current[newF.to_user_id] = data.full_name;
                  return data?.full_name || 'Bạn mới';
                })();
                addToast(`${accepterName} đã đồng ý kết bạn`, 'notification', 7000, '/friends', '🎉');
              } catch { /* ignore */ }
            }
          }
        }
      })

      // ⑤ Lời mời vào nhóm
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_invites' }, async (payload) => {
        const inv = payload.new;
        if (String(inv.invitee_id) !== String(uid)) return;
        if (inv.status !== 'pending') return;
        try {
          const [inviterName, groupName] = await Promise.all([
            (async () => {
              if (senderCache.current[inv.inviter_id]) return senderCache.current[inv.inviter_id];
              const { data } = await supabase.from('users').select('full_name').eq('id', inv.inviter_id).single();
              if (data?.full_name) senderCache.current[inv.inviter_id] = data.full_name;
              return data?.full_name || 'Ai đó';
            })(),
            (async () => {
              if (groupCache.current[inv.group_id]) return groupCache.current[inv.group_id];
              const { data } = await supabase.from('study_groups').select('name').eq('id', inv.group_id).single();
              if (data?.name) groupCache.current[inv.group_id] = data.name;
              return data?.name || 'nhóm học';
            })()
          ]);
          addToast(
            `${inviterName} mời bạn vào nhóm "${groupName}"`,
            'notification', 7000, '/groups', '👥'
          );
        } catch { /* ignore */ }
      })

      // ⑥ Lịch học nhóm mới
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'schedules' }, async (payload) => {
        const s = payload.new;
        if (String(s.creator_id) === String(uid)) return;
        if (!userGroupIds.has(Number(s.group_id))) return;
        try {
          const groupName = await (async () => {
            if (groupCache.current[s.group_id]) return groupCache.current[s.group_id];
            const { data } = await supabase.from('study_groups').select('name').eq('id', s.group_id).single();
            if (data?.name) groupCache.current[s.group_id] = data.name;
            return data?.name || 'học';
          })();
          addToast(
            `Lịch học mới: "${s.topic}" — Nhóm "${groupName}"`,
            'notification', 7000, `/groups/${s.group_id}?tab=schedule`, '📅'
          );
        } catch { /* ignore */ }
      })

      // ⑦ Deadline mới
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deadlines' }, async (payload) => {
        const d = payload.new;
        if (!userGroupIds.has(Number(d.group_id))) return;
        if (d.assignee_id && String(d.assignee_id) !== String(uid)) return;
        try {
          const groupName = await (async () => {
            if (groupCache.current[d.group_id]) return groupCache.current[d.group_id];
            const { data } = await supabase.from('study_groups').select('name').eq('id', d.group_id).single();
            if (data?.name) groupCache.current[d.group_id] = data.name;
            return data?.name || 'học';
          })();
          const personal = d.assignee_id ? ' (Giao cho bạn)' : '';
          addToast(
            `Deadline mới: "${d.title}" — ${groupName}${personal}`,
            'notification', 7000, `/groups/${d.group_id}?tab=deadlines`, '⏰'
          );
        } catch { /* ignore */ }
      })

      // ⑧ Thành viên nhóm
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const m = payload.new;

          if (String(m.user_id) === String(uid)) {
            await fetchUserGroups();
            try {
              const groupName = await (async () => {
                if (groupCache.current[m.group_id]) return groupCache.current[m.group_id];
                const { data } = await supabase.from('study_groups').select('name').eq('id', m.group_id).single();
                if (data?.name) groupCache.current[m.group_id] = data.name;
                return data?.name || 'học';
              })();
              addToast(`Bạn đã gia nhập nhóm "${groupName}"`, 'success', 6000, `/groups/${m.group_id}`, '🔔');
            } catch { /* ignore */ }
          } else if (userGroupIds.has(Number(m.group_id))) {
            try {
              const [newUserName, groupName] = await Promise.all([
                (async () => {
                  if (senderCache.current[m.user_id]) return senderCache.current[m.user_id];
                  const { data } = await supabase.from('users').select('full_name').eq('id', m.user_id).single();
                  if (data?.full_name) senderCache.current[m.user_id] = data.full_name;
                  return data?.full_name || 'Thành viên mới';
                })(),
                (async () => {
                  if (groupCache.current[m.group_id]) return groupCache.current[m.group_id];
                  const { data } = await supabase.from('study_groups').select('name').eq('id', m.group_id).single();
                  if (data?.name) groupCache.current[m.group_id] = data.name;
                  return data?.name || 'học';
                })()
              ]);
              addToast(`${newUserName} đã tham gia nhóm "${groupName}"`, 'info', 5000, `/groups/${m.group_id}`, '👥');
            } catch { /* ignore */ }
          }

        } else if (payload.eventType === 'UPDATE') {
          const m = payload.new;
          const old = payload.old;
          if (String(m.user_id) === String(uid)) {
            if (m.role === 'admin' && old?.role !== 'admin') {
              try {
                const groupName = await (async () => {
                  if (groupCache.current[m.group_id]) return groupCache.current[m.group_id];
                  const { data } = await supabase.from('study_groups').select('name').eq('id', m.group_id).single();
                  if (data?.name) groupCache.current[m.group_id] = data.name;
                  return data?.name || 'nhóm';
                })();
                await fetchUserGroups();
                addToast(`Bạn được bổ nhiệm làm Phó nhóm "${groupName}"`, 'success', 7000, `/groups/${m.group_id}`, '👑');
              } catch { /* ignore */ }
            } else if (m.role === 'member' && (old?.role === 'admin' || !old || old.role === undefined)) {
              try {
                const groupName = await (async () => {
                  if (groupCache.current[m.group_id]) return groupCache.current[m.group_id];
                  const { data } = await supabase.from('study_groups').select('name').eq('id', m.group_id).single();
                  if (data?.name) groupCache.current[m.group_id] = data.name;
                  return data?.name || 'nhóm';
                })();
                await fetchUserGroups();
                addToast(`Bạn đã bị tước quyền phó nhóm của "${groupName}"`, 'error', 7000, `/groups/${m.group_id}`, '⚠️');
                try {
                  const demotions = JSON.parse(localStorage.getItem('studyconect_demoted_notifications') || '[]');
                  demotions.push({ id: Date.now().toString(), groupName, createdAt: new Date().toISOString() });
                  localStorage.setItem('studyconect_demoted_notifications', JSON.stringify(demotions));
                } catch { /* ignore */ }
              } catch { /* ignore */ }
            }
          }

        } else if (payload.eventType === 'DELETE') {
          const m = payload.old;
          if (String(m.user_id) === String(uid)) {
            if (sessionStorage.getItem('leaving_group') === 'true') {
              sessionStorage.removeItem('leaving_group');
              return;
            }
            try {
              const groupName = await (async () => {
                if (groupCache.current[m.group_id]) return groupCache.current[m.group_id];
                const { data } = await supabase.from('study_groups').select('name').eq('id', m.group_id).single();
                if (data?.name) groupCache.current[m.group_id] = data.name;
                return data?.name || 'Nhóm';
              })();
              addToast(`Bạn đã bị rời khỏi nhóm "${groupName}"`, 'error', 8000, '/groups', '⚠️');
              try {
                const kicks = JSON.parse(localStorage.getItem('studyconect_kicked_notifications') || '[]');
                kicks.push({ id: Date.now().toString(), groupName, createdAt: new Date().toISOString() });
                localStorage.setItem('studyconect_kicked_notifications', JSON.stringify(kicks));
              } catch { /* ignore */ }
              await fetchUserGroups();
            } catch { /* ignore */ }
          }
        }
      })

      // ⑨ Tài liệu học tập mới (được duyệt)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, async (payload) => {
        const f = payload.new;
        if (!f || !f.approved) return;

        // Chỉ xử lý nếu chuyển từ chưa duyệt sang đã duyệt (đối với sự kiện UPDATE)
        if (payload.eventType === 'UPDATE' && payload.old && payload.old.approved) {
          return;
        }

        // Trường hợp A: Người đăng tài liệu nhận thông báo được phê duyệt
        if (String(f.user_id) === String(uid)) {
          addToast(
            `Tài liệu "${f.file_name}" của bạn đã được Admin phê duyệt! 🎉`,
            'success', 7000, `/groups/${f.group_id}?tab=documents`, '📁'
          );
          return;
        }

        // Trường hợp B: Thành viên khác trong nhóm nhận thông báo có tài liệu mới
        if (!userGroupIds.has(Number(f.group_id))) return;

        try {
          const [uploaderName, groupName] = await Promise.all([
            (async () => {
              if (senderCache.current[f.user_id]) return senderCache.current[f.user_id];
              const { data } = await supabase.from('users').select('full_name').eq('id', f.user_id).single();
              if (data?.full_name) senderCache.current[f.user_id] = data.full_name;
              return data?.full_name || 'Thành viên';
            })(),
            (async () => {
              if (groupCache.current[f.group_id]) return groupCache.current[f.group_id];
              const { data } = await supabase.from('study_groups').select('name').eq('id', f.group_id).single();
              if (data?.name) groupCache.current[f.group_id] = data.name;
              return data?.name || 'Nhóm';
            })()
          ]);
          addToast(
            `Tài liệu mới được duyệt: "${f.file_name}" — Đăng bởi ${uploaderName} trong nhóm ${groupName}`,
            'notification', 7000, `/groups/${f.group_id}?tab=documents`, '📎'
          );
        } catch { /* ignore */ }
      })

      // ⑩ Yêu cầu xin vào nhóm
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_join_requests' }, async (payload) => {
        const req = payload.new;
        if (req.status !== 'pending') return;
        if (!managedGroupIds.has(Number(req.group_id))) return;
        try {
          const [requesterName, groupName] = await Promise.all([
            (async () => {
              if (senderCache.current[req.user_id]) return senderCache.current[req.user_id];
              const { data } = await supabase.from('users').select('full_name').eq('id', req.user_id).single();
              if (data?.full_name) senderCache.current[req.user_id] = data.full_name;
              return data?.full_name || 'Ai đó';
            })(),
            (async () => {
              if (groupCache.current[req.group_id]) return groupCache.current[req.group_id];
              const { data } = await supabase.from('study_groups').select('name').eq('id', req.group_id).single();
              if (data?.name) groupCache.current[req.group_id] = data.name;
              return data?.name || 'học';
            })()
          ]);
          addToast(
            `${requesterName} xin tham gia nhóm "${groupName}"`,
            'notification', 8000, `/groups/${req.group_id}`, '🔔'
          );
        } catch { /* ignore */ }
      })

      // ⑪ Tag trong bài viết (mentions)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_tags' }, async (payload) => {
        const t = payload.new;
        try {
          const { data: post } = await supabase.from('posts').select('user_id').eq('id', t.post_id).single();
          if (!post) return;
          if (String(post.user_id) === String(uid)) return;

          const taggerName = await (async () => {
            if (senderCache.current[post.user_id]) return senderCache.current[post.user_id];
            const { data } = await supabase.from('users').select('full_name').eq('id', post.user_id).single();
            if (data?.full_name) senderCache.current[post.user_id] = data.full_name;
            return data?.full_name || 'Ai đó';
          })();

          if (t.target_type === 'user' && String(t.target_id) === String(uid)) {
            addToast(
              `${taggerName} đã tag bạn trong bài viết`,
              'notification', 6000, '/', '🏷️'
            );
          } else if (t.target_type === 'group' && userGroupIds.has(Number(t.target_id))) {
            const groupName = await (async () => {
              if (groupCache.current[t.target_id]) return groupCache.current[t.target_id];
              const { data } = await supabase.from('study_groups').select('name').eq('id', t.target_id).single();
              if (data?.name) groupCache.current[t.target_id] = data.name;
              return data?.name || 'nhóm';
            })();
            addToast(
              `${taggerName} đã tag nhóm "${groupName}" trong bài viết`,
              'notification', 6000, '/', '🏷️'
            );
          }
        } catch { /* ignore */ }
      })

      .subscribe((status) => {
        if (import.meta.env.DEV) console.log('[Realtime] Kênh thông báo:', status);
      });

    // Lắng nghe broadcast từ Admin panel
    const adminChannel = supabase.channel('admin-broadcasts');
    adminChannel.on('broadcast', { event: 'file_approved' }, async ({ payload }) => {
      if (!payload) return;
      const { userId, fileName, groupId, groupName, userFullName } = payload;
      
      // Trường hợp A: Người đăng tài liệu
      if (String(userId) === String(uid)) {
        addToast(
          `Tài liệu "${fileName}" của bạn đã được Admin phê duyệt! 🎉`,
          'success', 7000, `/groups/${groupId}?tab=documents`, '📁'
        );
        return;
      }

      // Trường hợp B: Thành viên khác trong nhóm
      if (!userGroupIds.has(Number(groupId))) return;
      
      addToast(
        `Tài liệu mới được duyệt: "${fileName}" — Đăng bởi ${userFullName || 'Thành viên'} trong nhóm ${groupName || 'Nhóm học'}`,
        'notification', 7000, `/groups/${groupId}?tab=documents`, '📎'
      );
    });

    adminChannel.on('broadcast', { event: 'file_rejected' }, async ({ payload }) => {
      if (!payload) return;
      const { userId, fileName, groupName } = payload;
      
      // Chỉ thông báo cho người đăng tài liệu bị từ chối
      if (String(userId) === String(uid)) {
        addToast(
          `Tài liệu "${fileName}" của bạn trong nhóm "${groupName || 'Nhóm học'}" đã bị Admin từ chối phê duyệt và xóa bỏ. ❌`,
          'error', 8000, null, '📁'
        );
      }
    });

    adminChannel.on('broadcast', { event: 'post_approved' }, async ({ payload }) => {
      if (!payload) return;
      const { userId } = payload;
      if (String(userId) === String(uid)) {
        addToast(
          'Bài viết của bạn đã được Admin phê duyệt! 🎉',
          'success', 7000, '/', '📝'
        );
      }
    });

    adminChannel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(adminChannel);
    };
  }, [user?.id, location.pathname, addToast]);

  return null;
}
