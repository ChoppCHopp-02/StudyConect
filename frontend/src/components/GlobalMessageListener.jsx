import { useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function GlobalMessageListener() {
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    const uid = parseInt(user.id, 10);

    // Track groups user belongs to (refreshed periodically)
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
    const groupInterval = setInterval(fetchUserGroups, 15000);

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
            window.location.pathname.includes(`/groups/${msg.group_id}`) &&
            sessionStorage.getItem('active_group_tab') === 'chat';
          if (isViewingChat) return;

          try {
            const [{ data: sender }, { data: group }] = await Promise.all([
              supabase.from('users').select('full_name').eq('id', msg.sender_id).single(),
              supabase.from('study_groups').select('name').eq('id', msg.group_id).single(),
            ]);
            const raw = msg.content || '';
            if (raw.startsWith('[meetroom:')) {
              const text = raw.replace(/^\[meetroom:[^\]]+\]\s*/, '');
              addToast(`📞 ${text} — Nhóm "${sender?.full_name || ''}"`, 'info', 6000, `/groups/${msg.group_id}?tab=chat`, '📞');
              return;
            }
            addToast(
              `[👥 ${group?.name || 'Nhóm'}] ${sender?.full_name || 'Thành viên'}: ${raw}`,
              'message', 6000,
              `/groups/${msg.group_id}?tab=chat`,
              '👥'
            );
          } catch { /* ignore */ }
        } else {
          // Private message
          if (String(msg.receiver_id) !== String(uid)) return;
          const openChat = sessionStorage.getItem('active_chat_friend_id');
          if (window.location.pathname === '/chat' && String(openChat) === String(msg.sender_id)) return;

          try {
            const { data: sender } = await supabase.from('users').select('full_name').eq('id', msg.sender_id).single();
            const name = localStorage.getItem(`sc_nickname_${uid}_${msg.sender_id}`) || sender?.full_name || 'Người dùng';
            const text = (msg.content?.startsWith('data:image') || msg.content?.match(/\.(jpeg|jpg|gif|png|webp)(\?|$)/i))
              ? '📷 Đã gửi một ảnh'
              : (msg.content || '');
            addToast(`💬 ${name}: ${text}`, 'message', 6000, '/chat', '💬');
          } catch { /* ignore */ }
        }
      })

      // ② Bình luận bài viết
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
        const c = payload.new;
        if (String(c.user_id) === String(uid)) return;
        try {
          const { data: post } = await supabase.from('posts').select('user_id').eq('id', c.post_id).single();
          if (!post || String(post.user_id) !== String(uid)) return;
          const { data: commenter } = await supabase.from('users').select('full_name').eq('id', c.user_id).single();
          const name = commenter?.full_name || 'Người dùng';
          addToast(`💬 ${name} đã bình luận bài viết của bạn: "${c.content}"`, 'notification', 6000, '/', '💬');
        } catch { /* ignore */ }
      })

      // ③ Thả cảm xúc bài viết (via post_reactions table — reliable)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, async (payload) => {
        if (payload.eventType === 'DELETE') return;
        const r = payload.new;
        if (String(r.user_id) === String(uid)) return;
        try {
          const { data: post } = await supabase.from('posts').select('user_id').eq('id', r.post_id).single();
          if (!post || String(post.user_id) !== String(uid)) return;
          const { data: reactor } = await supabase.from('users').select('full_name').eq('id', r.user_id).single();
          const emoji = r.emoji || '❤️';
          const name = reactor?.full_name || 'Người dùng';
          addToast(`${emoji} ${name} đã thả cảm xúc vào bài viết của bạn`, 'notification', 6000, '/', emoji);
        } catch { /* ignore */ }
      })

      // ④ Lời mời kết bạn & Chấp nhận kết bạn
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const f = payload.new;
          if (String(f.to_user_id) !== String(uid)) return;
          if (f.status !== 'pending') return;
          try {
            const { data: sender } = await supabase.from('users').select('full_name').eq('id', f.from_user_id).single();
            addToast(`🤝 ${sender?.full_name || 'Ai đó'} muốn kết bạn với bạn`, 'notification', 7000, '/friends', '🤝');
          } catch { /* ignore */ }

        } else if (payload.eventType === 'UPDATE') {
          const newF = payload.new;
          const oldF = payload.old;
          // Friend accepted: notify the sender of the original request
          if (newF.status === 'accepted' && oldF?.status !== 'accepted') {
            if (String(newF.from_user_id) === String(uid)) {
              try {
                const { data: accepter } = await supabase.from('users').select('full_name').eq('id', newF.to_user_id).single();
                addToast(`🎉 ${accepter?.full_name || 'Bạn mới'} đã chấp nhận lời mời kết bạn của bạn!`, 'notification', 7000, '/friends', '🎉');
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
          const [{ data: inviter }, { data: group }] = await Promise.all([
            supabase.from('users').select('full_name').eq('id', inv.inviter_id).single(),
            supabase.from('study_groups').select('name').eq('id', inv.group_id).single(),
          ]);
          addToast(
            `👥 ${inviter?.full_name || 'Ai đó'} mời bạn tham gia nhóm "${group?.name || 'học'}"`,
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
          const { data: group } = await supabase.from('study_groups').select('name').eq('id', s.group_id).single();
          addToast(
            `📅 Lịch học mới: "${s.topic}" — Nhóm "${group?.name || 'học'}"`,
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
          const { data: group } = await supabase.from('study_groups').select('name').eq('id', d.group_id).single();
          const personal = d.assignee_id ? ' (Giao cho bạn)' : '';
          addToast(
            `⏰ Deadline mới: "${d.title}" — ${group?.name || 'Nhóm'}${personal}`,
            'notification', 7000, `/groups/${d.group_id}?tab=deadlines`, '⏰'
          );
        } catch { /* ignore */ }
      })

      // ⑧ Thành viên nhóm: gia nhập / bổ nhiệm / bị xóa / thành viên mới
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const m = payload.new;

          if (String(m.user_id) === String(uid)) {
            // Current user just joined a group
            await fetchUserGroups();
            try {
              const { data: group } = await supabase.from('study_groups').select('name').eq('id', m.group_id).single();
              addToast(`🔔 Bạn đã gia nhập nhóm "${group?.name || 'học'}"!`, 'success', 6000, `/groups/${m.group_id}`, '🔔');
            } catch { /* ignore */ }
          } else if (userGroupIds.has(Number(m.group_id))) {
            // Another user joined a group you're in
            try {
              const [{ data: newUser }, { data: group }] = await Promise.all([
                supabase.from('users').select('full_name').eq('id', m.user_id).single(),
                supabase.from('study_groups').select('name').eq('id', m.group_id).single(),
              ]);
              addToast(`👥 ${newUser?.full_name || 'Thành viên mới'} đã gia nhập nhóm "${group?.name || 'học'}"!`, 'info', 5000, `/groups/${m.group_id}`, '👥');
            } catch { /* ignore */ }
          }

        } else if (payload.eventType === 'UPDATE') {
          const m = payload.new;
          const old = payload.old;
          // Role promoted to admin/deputy
          if (String(m.user_id) === String(uid) && m.role === 'admin' && old?.role !== 'admin') {
            try {
              const { data: group } = await supabase.from('study_groups').select('name').eq('id', m.group_id).single();
              await fetchUserGroups();
              addToast(`👑 Bạn đã được bổ nhiệm làm Phó nhóm của "${group?.name || 'nhóm'}"!`, 'success', 7000, `/groups/${m.group_id}`, '👑');
            } catch { /* ignore */ }
          }

        } else if (payload.eventType === 'DELETE') {
          const m = payload.old;
          if (String(m.user_id) === String(uid)) {
            // Skip if user voluntarily left
            if (sessionStorage.getItem('leaving_group') === 'true') {
              sessionStorage.removeItem('leaving_group');
              return;
            }
            try {
              const { data: group } = await supabase.from('study_groups').select('name').eq('id', m.group_id).single();
              const groupName = group?.name || 'Nhóm';
              addToast(`⚠️ Bạn đã bị xóa khỏi nhóm "${groupName}"!`, 'error', 8000, '/groups', '⚠️');
              // Persist to localStorage for bell notification on next login
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

      // ⑨ Tài liệu học tập mới
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'files' }, async (payload) => {
        const f = payload.new;
        if (String(f.user_id) === String(uid)) return;
        if (!userGroupIds.has(Number(f.group_id))) return;
        try {
          const [{ data: uploader }, { data: group }] = await Promise.all([
            supabase.from('users').select('full_name').eq('id', f.user_id).single(),
            supabase.from('study_groups').select('name').eq('id', f.group_id).single(),
          ]);
          addToast(
            `📎 ${uploader?.full_name || 'Thành viên'} đã tải lên "${f.file_name}" — ${group?.name || 'Nhóm'}`,
            'notification', 6000, `/groups/${f.group_id}?tab=documents`, '📎'
          );
        } catch { /* ignore */ }
      })

      // ⑩ Yêu cầu xin vào nhóm (dành cho nhóm trưởng/phó)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_join_requests' }, async (payload) => {
        const req = payload.new;
        if (req.status !== 'pending') return;
        if (!managedGroupIds.has(Number(req.group_id))) return;
        try {
          const [{ data: requester }, { data: group }] = await Promise.all([
            supabase.from('users').select('full_name').eq('id', req.user_id).single(),
            supabase.from('study_groups').select('name').eq('id', req.group_id).single(),
          ]);
          addToast(
            `👥 ${requester?.full_name || 'Ai đó'} xin tham gia nhóm "${group?.name || 'học'}"`,
            'notification', 8000, `/groups/${req.group_id}`, '🔔'
          );
        } catch { /* ignore */ }
      })

      .subscribe((status) => {
        console.log('[Realtime] Kênh thông báo:', status);
      });

    return () => {
      clearInterval(groupInterval);
      supabase.removeChannel(channel);
    };
  }, [user?.id, addToast]);

  return null;
}
