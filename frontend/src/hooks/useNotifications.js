/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabaseClient';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { acceptGroupInvite, declineGroupInvite } from '@/services/groupInviteService';
import { acceptFriendRequest as acceptRealFriend, removeFriend as declineRealFriend } from '@/services/friendService';
import { approveJoinRequest, rejectJoinRequest } from '@/services/groupService';

export default function useNotifications(userId) {
  const [notifs, setNotifs] = useState([]);
  const [seen, setSeen] = useState(new Set());
  const [processing, setProcessing] = useState({});

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const uid = parseInt(userId, 10);
      const now = new Date();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const notifsList = [];
      const userGroupIds = new Set();

      // 1. Fetch friend requests from Supabase
      const { data: friendReqs, error: fError } = await supabase
        .from('friendships')
        .select(`
          id,
          from_user_id,
          status,
          created_at,
          users:users!from_user_id (
            full_name
          )
        `)
        .eq('to_user_id', uid)
        .eq('status', 'pending');

      if (!fError && friendReqs) {
        friendReqs
          .filter(f => (now - new Date(f.created_at)) < ONE_DAY_MS)
          .forEach(f => {
            const senderName = f.users?.full_name || 'Ai đó';
            notifsList.push({
              key: `friendreq:${f.id}`,
              type: 'friendreq',
              title: '🤝 Lời mời kết bạn',
              body: `${senderName} muốn kết bạn với bạn`,
              createdAt: f.created_at,
              requestId: f.id.toString(),
              fromUserId: f.from_user_id,
              fromUserName: senderName,
            });
          });
      }

      // 1b. Fetch accepted friend requests from Supabase
      const { data: acceptedReqs } = await supabase
        .from('friendships')
        .select(`
          id,
          to_user_id,
          accepted_at,
          users:users!to_user_id (
            full_name
          )
        `)
        .eq('from_user_id', uid)
        .eq('status', 'accepted');

      if (acceptedReqs) {
        acceptedReqs
          .filter(ar => ar.accepted_at && (now - new Date(ar.accepted_at)) < ONE_DAY_MS)
          .forEach(ar => {
            const userName = ar.users?.full_name || 'Người dùng';
            notifsList.push({
              key: `friendaccept:${ar.id}`,
              type: 'friendaccept',
              title: '🎉 Kết bạn thành công',
              body: `${userName} đã đồng ý lời mời kết bạn của bạn`,
              createdAt: ar.accepted_at,
            });
          });
      }

      // 2. Fetch group invites from Supabase
      const { data: invites, error: iError } = await supabase
        .from('group_invites')
        .select(`
          id,
          group_id,
          inviter_id,
          status,
          created_at,
          study_groups (
            name
          ),
          users:users!inviter_id (
            full_name
          )
        `)
        .eq('invitee_id', uid)
        .eq('status', 'pending');

      if (!iError && invites) {
        invites
          .filter(inv => (now - new Date(inv.created_at)) < ONE_DAY_MS)
          .forEach(inv => {
            const inviterName = inv.users?.full_name || 'Thành viên';
            const groupName = inv.study_groups?.name || 'Nhóm học';
            notifsList.push({
              key: `groupinvite:${inv.id}`,
              type: 'groupinvite',
              title: '👥 Lời mời vào nhóm',
              body: `${inviterName} mời bạn tham gia nhóm "${groupName}"`,
              createdAt: inv.created_at,
              inviteId: inv.id.toString(),
              groupId: inv.group_id.toString(),
              groupName: groupName,
            });
          });
      }

      // 3. Fetch joined groups to filter schedules, deadlines, and group messages
      const { data: joinedMembers, error: mError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          role,
          joined_at,
          study_groups (
            name
          )
        `)
        .eq('user_id', uid);

      if (!mError && joinedMembers && joinedMembers.length > 0) {
        const joinedIds = joinedMembers.map(m => m.group_id);
        joinedIds.forEach(id => userGroupIds.add(Number(id)));

        // Notify user about group joins and role upgrades in the notification bell
        joinedMembers.forEach(m => {
          if (m.joined_at && (now - new Date(m.joined_at)) < ONE_DAY_MS) {
            const groupName = m.study_groups?.name || 'Nhóm học';
            if (m.role === 'member') {
              notifsList.push({
                key: `groupjoin:${m.group_id}`,
                type: 'groupjoin',
                title: '🔔 Gia nhập nhóm thành công',
                body: `Bạn đã tham gia nhóm học tập "${groupName}"`,
                createdAt: m.joined_at,
                groupId: m.group_id.toString(),
              });
            } else if (m.role === 'admin') {
              notifsList.push({
                key: `groupdeputy:${m.group_id}`,
                type: 'groupdeputy',
                title: '👑 Bổ nhiệm phó nhóm',
                body: `Bạn đã được bổ nhiệm làm Phó nhóm của "${groupName}"`,
                createdAt: m.joined_at,
                groupId: m.group_id.toString(),
              });
            }
          }
        });

        // Fetch other members who joined recently
        const { data: otherJoinedMembers } = await supabase
          .from('group_members')
          .select(`
            group_id,
            user_id,
            joined_at,
            users:users (
              full_name
            ),
            study_groups (
              name
            )
          `)
          .in('group_id', joinedIds)
          .neq('user_id', uid);

        if (otherJoinedMembers) {
          otherJoinedMembers
            .filter(om => om.joined_at && (now - new Date(om.joined_at)) < ONE_DAY_MS)
            .forEach(om => {
              const userName = om.users?.full_name || 'Người dùng';
              const groupName = om.study_groups?.name || 'Nhóm';
              notifsList.push({
                key: `othergroupjoin:${om.group_id}:${om.user_id}`,
                type: 'othergroupjoin',
                title: '👥 Thành viên mới gia nhập',
                body: `${userName} đã tham gia nhóm "${groupName}"`,
                createdAt: om.joined_at,
                groupId: om.group_id.toString(),
              });
            });
        }

        // Fetch schedules
        const { data: schedules } = await supabase
          .from('schedules')
          .select(`
            *,
            study_groups (
              name
            )
          `)
          .in('group_id', joinedIds)
          .gte('date_time', now.toISOString());

        if (schedules) {
          schedules
            .filter(s => (now - new Date(s.created_at)) < ONE_DAY_MS)
            .forEach(s => {
              notifsList.push({
                key: `schedule:${s.id}`,
                type: 'schedule',
                title: `📅 Lịch học mới: "${s.topic}"`,
                body: `Nhóm ${s.study_groups?.name || 'học'} • ${new Date(s.date_time).toLocaleString('vi-VN')}`,
                createdAt: s.created_at,
                groupId: s.group_id.toString(),
              });
            });
        }

        // Fetch deadlines
        const { data: deadlines } = await supabase
          .from('deadlines')
          .select(`
            *,
            study_groups (
              name
            )
          `)
          .in('group_id', joinedIds)
          .eq('completed', false);

        if (deadlines) {
          deadlines
            .filter(d => {
              if ((now - new Date(d.created_at)) >= ONE_DAY_MS) return false;
              if (d.assignee_id) {
                return String(d.assignee_id) === String(uid);
              }
              return true;
            })
            .forEach(d => {
              const isPersonal = d.assignee_id;
              notifsList.push({
                key: `deadline:${d.id}`,
                type: 'deadline',
                title: `⏰ Deadline mới: "${d.title}"`,
                body: `${isPersonal ? '👤 Giao cho bạn' : '👥 Cả nhóm'} • Nhóm ${d.study_groups?.name || 'học'} • Hạn: ${new Date(d.due_date).toLocaleString('vi-VN')}`,
                createdAt: d.created_at,
                groupId: d.group_id.toString(),
              });
            });

          // Fetch urgent deadlines (due in 24 hours)
          deadlines
            .filter(d => {
              const due = new Date(d.due_date).getTime();
              const timeLeft = due - now.getTime();
              if (!(timeLeft > 0 && timeLeft <= ONE_DAY_MS)) return false;
              if (d.assignee_id) {
                return String(d.assignee_id) === String(uid);
              }
              return true;
            })
            .forEach(d => {
              const due = new Date(d.due_date).getTime();
              const timeLeft = due - now.getTime();
              const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
              const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
              const timeStr = hoursLeft > 0 ? `${hoursLeft} giờ ${minutesLeft} phút` : `${minutesLeft} phút`;
              const isPersonal = d.assignee_id;
              notifsList.push({
                key: `deadline-urgent:${d.id}`,
                type: 'deadline-urgent',
                title: `🚨 ${isPersonal ? 'Deadline của bạn' : 'Deadline nhóm'} sắp đến: "${d.title}"`,
                body: `${isPersonal ? '👤 Giao cho bạn' : '👥 Cả nhóm'} • Nhóm ${d.study_groups?.name || 'học'} • Còn ${timeStr} • Hạn: ${new Date(d.due_date).toLocaleString('vi-VN')}`,
                createdAt: new Date(new Date(d.due_date).getTime() - ONE_DAY_MS).toISOString(),
                groupId: d.group_id.toString(),
                deadlineId: d.id.toString(),
                dueDate: d.due_date,
              });
            });
        }

        // Fetch group messages (excluding current user's messages)
        const { data: groupMsgs } = await supabase
          .from('messages')
          .select(`
            id,
            group_id,
            sender_id,
            content,
            created_at,
            users:users!sender_id (
              full_name
            ),
            study_groups (
              name
            )
          `)
          .in('group_id', joinedIds)
          .neq('sender_id', uid)
          .order('created_at', { ascending: false })
          .limit(20);

        if (groupMsgs) {
          groupMsgs
            .filter(m => (now - new Date(m.created_at)) < ONE_DAY_MS)
            .forEach(m => {
              const rawContent = m.content || '';
              const groupName = m.study_groups?.name || 'Nhóm';
              if (rawContent.startsWith('[meetroom:')) {
                const cleanText = rawContent.replace(/^\[meetroom:[^\]]+\]\s*/, '');
                notifsList.push({
                  key: `groupcall:${m.id}`,
                  type: 'groupcall',
                  title: `📞 Cuộc gọi trong "${groupName}"`,
                  body: cleanText,
                  createdAt: m.created_at,
                  groupId: m.group_id.toString(),
                });
                return;
              }

              const senderName = m.users?.full_name || 'Thành viên';
              notifsList.push({
                key: `groupmsg:${m.id}`,
                type: 'groupmsg',
                title: `👥 Tin nhắn mới trong "${groupName}"`,
                body: `${senderName}: ${rawContent}`,
                createdAt: m.created_at,
                groupId: m.group_id.toString(),
              });
            });
        }

        // Fetch shared documents/files in groups
        const { data: recentFiles } = await supabase
          .from('files')
          .select(`
            id,
            group_id,
            file_name,
            created_at,
            users:users (
              full_name
            ),
            study_groups (
              name
            )
          `)
          .in('group_id', joinedIds)
          .neq('user_id', uid);

        if (recentFiles) {
          recentFiles
            .filter(rf => rf.created_at && (now - new Date(rf.created_at)) < ONE_DAY_MS)
            .forEach(rf => {
              const userName = rf.users?.full_name || 'Thành viên';
              const groupName = rf.study_groups?.name || 'Nhóm';
              notifsList.push({
                key: `file:upload:${rf.id}`,
                type: 'fileupload',
                title: '📎 Tài liệu nhóm mới',
                body: `${userName} đã tải lên tài liệu "${rf.file_name}" trong nhóm "${groupName}"`,
                createdAt: rf.created_at,
                groupId: rf.group_id.toString(),
              });
            });
        }
      }

      // Custom deadline reminders from LocalStorage removed to comply with quota limits

      // 5. Fetch user's posts to get comments & reactions on them
      const { data: myPosts } = await supabase
        .from('posts')
        .select('id, content, likes, created_at')
        .eq('user_id', uid);

      if (myPosts && myPosts.length > 0) {
        const myPostIds = myPosts.map(p => p.id);

        // Fetch comments on user's posts
        const { data: postComments } = await supabase
          .from('comments')
          .select(`
            id,
            post_id,
            user_id,
            content,
            created_at,
            users:users (
              full_name
            )
          `)
          .in('post_id', myPostIds)
          .neq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(20);

        if (postComments) {
          postComments
            .filter(c => (now - new Date(c.created_at)) < ONE_DAY_MS)
            .forEach(c => {
              const commenterName = c.users?.full_name || 'Người dùng';
              notifsList.push({
                key: `comment:${c.id}`,
                type: 'comment',
                title: `💬 Bình luận bài viết`,
                body: `${commenterName} đã bình luận: "${c.content}"`,
                createdAt: c.created_at,
                postId: c.post_id.toString(),
              });
            });
        }
        
        // Fetch all comments by this user to find replies to them
        const { data: myComments } = await supabase
          .from('comments')
          .select('id')
          .eq('user_id', uid);

        if (myComments && myComments.length > 0) {
          const myCommentIds = myComments.map(c => c.id);
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              id,
              post_id,
              user_id,
              content,
              created_at,
              users:users (
                full_name
              )
            `)
            .in('parent_id', myCommentIds)
            .neq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(20);

          if (replies) {
            replies
              .filter(r => (now - new Date(r.created_at)) < ONE_DAY_MS)
              .forEach(r => {
                // Tránh duplicate nếu bình luận này cũng nằm trên bài viết của chính user
                if (notifsList.some(n => n.key === `comment:${r.id}`)) return;

                const replierName = r.users?.full_name || 'Người dùng';
                notifsList.push({
                  key: `reply:${r.id}`,
                  type: 'comment',
                  title: `💬 Trả lời bình luận`,
                  body: `${replierName} đã trả lời bình luận của bạn: "${r.content}"`,
                  createdAt: r.created_at,
                  postId: r.post_id.toString(),
                });
              });
          }
        }

        // Fetch user information for likes
        const likerIds = [];
        myPosts.forEach(p => {
          if (Array.isArray(p.likes)) {
            p.likes.forEach(lk => {
              const lkId = typeof lk === 'object' ? parseInt(lk.userId, 10) : parseInt(lk, 10);
              if (lkId && lkId !== uid) {
                likerIds.push(lkId);
              }
            });
          }
        });

        if (likerIds.length > 0) {
          const uniqueLikerIds = [...new Set(likerIds)];
          const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', uniqueLikerIds);

          const likersMap = {};
          if (usersData) {
            usersData.forEach(u => {
              likersMap[String(u.id)] = u.full_name;
            });
          }

          myPosts.forEach(p => {
            if (Array.isArray(p.likes)) {
              p.likes.forEach(lk => {
                const lkId = typeof lk === 'object' ? String(lk.userId) : String(lk);
                const emoji = typeof lk === 'object' ? (lk.emoji || '❤️') : '❤️';
                if (lkId && lkId !== String(uid)) {
                  const likerName = likersMap[lkId] || 'Người dùng';
                  notifsList.push({
                    key: `like:${p.id}:${lkId}`,
                    type: 'like',
                    title: `${emoji} Tương tác bài viết`,
                    body: `${likerName} đã thả cảm xúc vào bài viết của bạn`,
                    createdAt: p.created_at, // Approximation of time
                    postId: p.id.toString(),
                  });
                }
              });
            }
          });
        }
      }

      // 1c. Fetch recent private messages
      const { data: privateMsgs } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          content,
          created_at,
          users:users!sender_id (
            full_name
          )
        `)
        .eq('receiver_id', uid)
        .neq('sender_id', uid)
        .is('group_id', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (privateMsgs) {
        privateMsgs
          .filter(m => (now - new Date(m.created_at)) < ONE_DAY_MS)
          .forEach(m => {
            // Bỏ qua hoàn toàn tin nhắn đổi hình nền - không hiện toast
            if (m.content?.startsWith('[chat_background]:')) return;

            const senderName = m.users?.full_name || 'Người dùng';
            const displayContent = (m.content?.startsWith('data:image') || (m.content?.startsWith('http') && m.content?.match(/\.(jpeg|jpg|gif|png)/i)))
              ? '📷 Đã gửi một ảnh'
              : m.content || '';
            notifsList.push({
              key: `privatemsg:${m.id}`,
              type: 'privatemsg',
              title: `💬 Tin nhắn từ ${senderName}`,
              body: displayContent,
              createdAt: m.created_at,
              senderId: m.sender_id.toString(),
            });
          });
      }

      // 2b. Fetch pending group join requests for groups created by current user
      const { data: myCreatedGroups } = await supabase
        .from('study_groups')
        .select('id, name')
        .eq('creator_id', uid);

      if (myCreatedGroups && myCreatedGroups.length > 0) {
        const myGroupIds = myCreatedGroups.map(g => g.id);
        const { data: pendingRequests } = await supabase
          .from('group_join_requests')
          .select(`
            id,
            group_id,
            user_id,
            created_at,
            users:users (
              full_name
            ),
            study_groups (
              name
            )
          `)
          .in('group_id', myGroupIds)
          .eq('status', 'pending');

        if (pendingRequests) {
          pendingRequests
            .filter(r => (now - new Date(r.created_at)) < ONE_DAY_MS)
            .forEach(r => {
              const requesterName = r.users?.full_name || 'Thành viên';
              const groupName = r.study_groups?.name || 'Nhóm';
              notifsList.push({
                key: `joinrequest:${r.id}`,
                type: 'joinrequest',
                title: '👥 Yêu cầu tham gia nhóm',
                body: `${requesterName} xin tham gia nhóm học tập "${groupName}"`,
                createdAt: r.created_at,
                requestId: r.id.toString(),
                groupId: r.group_id.toString(),
                fromUserId: r.user_id,
                requesterName: requesterName,
              });
            });
        }
      }

      // 2c. Fetch local group kicks
      try {
        const localKicks = JSON.parse(localStorage.getItem('studyconect_kicked_notifications') || '[]');
        localKicks
          .filter(k => (now - new Date(k.createdAt)) < ONE_DAY_MS)
          .forEach(k => {
            notifsList.push({
              key: `kick:${k.id}`,
              type: 'groupkick',
              title: '⚠️ Bị xóa khỏi nhóm',
              body: `Bạn đã bị xóa khỏi nhóm học tập "${k.groupName}"`,
              createdAt: k.createdAt,
            });
          });
      } catch (err) {
        console.warn('Error reading local kicks:', err);
      }

      // 4b. Fetch messages, comments, reactions, and files from localStorage (as fallback/offline/fast sync)
      // Local Private Messages
      try {
        const localChats = JSON.parse(localStorage.getItem('sc_chats') || '[]');
        if (Array.isArray(localChats)) {
          localChats.forEach(m => {
            if (String(m.receiver_id) === String(uid) && String(m.sender_id) !== String(uid)) {
              const age = now - new Date(m.created_at);
              if (age > 0 && age < 5 * 60 * 1000) { // 5 minutes
                const key = `privatemsg:local:${m.id || m.created_at}`;
                if (!notifsList.some(n => n.key === key)) {
                  notifsList.push({
                    key,
                    type: 'privatemsg',
                    title: `💬 Tin nhắn từ ${m.sender_name || 'Người dùng'}`,
                    body: m.content || '',
                    createdAt: m.created_at,
                    senderId: String(m.sender_id)
                  });
                }
              }
            }
          });
        }
      } catch (err) {
        console.warn('Error parsing local messages:', err);
      }



      // Local Reactions
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const lKey = localStorage.key(i);
          if (lKey && lKey.startsWith('reactions_')) {
            const postId = lKey.replace('reactions_', '');
            const localReactions = JSON.parse(localStorage.getItem(lKey) || '[]');
            if (Array.isArray(localReactions)) {
              localReactions.forEach(r => {
                const age = now - new Date(r.createdAt || r.created_at);
                if (age > 0 && age < 60 * 60 * 1000) { // 1 hour
                  if (String(r.postOwnerId || r.post_owner_id) === String(uid) && String(r.userId || r.user_id) !== String(uid)) {
                    const key = `like:local:${postId}:${r.userId || r.user_id}`;
                    if (!notifsList.some(n => n.key === key)) {
                      const emoji = r.emoji || '❤️';
                      notifsList.push({
                        key,
                        type: 'like',
                        title: `${emoji} Tương tác bài viết`,
                        body: `${r.userName || r.user_name || 'Người dùng'} đã thả cảm xúc vào bài viết của bạn`,
                        createdAt: r.createdAt || r.created_at,
                        postId: postId
                      });
                    }
                  }
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn('Error parsing local reactions:', err);
      }

      // Local Files
      try {
        const localFiles = JSON.parse(localStorage.getItem('sc_files') || '[]');
        if (Array.isArray(localFiles)) {
          localFiles.forEach(f => {
            const age = now - new Date(f.created_at);
            if (age > 0 && age < 24 * 60 * 60 * 1000) { // 24 hours
              if (String(f.user_id) !== String(uid) && userGroupIds.has(Number(f.group_id))) {
                const key = `file:local:${f.id || f.created_at}`;
                if (!notifsList.some(n => n.key === key)) {
                  notifsList.push({
                    key,
                    type: 'fileupload',
                    title: '📎 Tài liệu nhóm mới',
                    body: `${f.user_name || 'Thành viên'} đã tải lên tài liệu "${f.file_name}" trong nhóm "${f.group_name || 'học'}"`,
                    createdAt: f.created_at,
                    groupId: String(f.group_id)
                  });
                }
              }
            }
          });
        }
      } catch (err) {
        console.warn('Error parsing local files:', err);
      }
      // Post Tag Notifications (from Supabase post_tags)
      try {
        const joinedGroupIdsStr = Array.from(userGroupIds).map(String);
        let orFilter = `and(target_type.eq.user,target_id.eq.${uid})`;
        if (joinedGroupIdsStr.length > 0) {
          orFilter += `,and(target_type.eq.group,target_id.in.(${joinedGroupIdsStr.join(',')}))`;
        }

        const { data: dbTags, error: dbTagsError } = await supabase
          .from('post_tags')
          .select(`
            id,
            post_id,
            target_type,
            target_id,
            created_at,
            posts (
              user_id,
              users (
                full_name
              )
            )
          `)
          .or(orFilter);

        if (!dbTagsError && dbTags) {
          dbTags
            .filter(t => (now - new Date(t.created_at)) < ONE_DAY_MS)
            .forEach(t => {
              const taggerName = t.posts?.users?.full_name || 'Ai đó';
              const isCreator = String(t.posts?.user_id) === String(uid);
              if (isCreator) return; // don't notify self

              if (t.target_type === 'user' && String(t.target_id) === String(uid)) {
                const key = `posttag:db:${t.id}`;
                if (!notifsList.some(x => x.key === key)) {
                  notifsList.push({
                    key,
                    type: 'posttag_user',
                    title: '🏷️ Bạn được tag trong một bài viết',
                    body: `${taggerName} đã tag bạn trong một bài viết`,
                    createdAt: t.created_at,
                    postId: String(t.post_id),
                  });
                }
              }

              if (t.target_type === 'group' && userGroupIds.has(Number(t.target_id))) {
                const key = `posttagg:db:${t.id}`;
                if (!notifsList.some(x => x.key === key)) {
                  const gMem = joinedMembers && joinedMembers.find(m => Number(m.group_id) === Number(t.target_id));
                  const gName = gMem?.study_groups?.name || 'Nhóm học';
                  notifsList.push({
                    key,
                    type: 'posttag_group',
                    title: `🏷️ Nhóm "${gName}" được tag`,
                    body: `${taggerName} đã tag nhóm "${gName}" trong một bài viết`,
                    createdAt: t.created_at,
                    postId: String(t.post_id),
                    groupId: String(t.target_id),
                  });
                }
              }
            });
        }
      } catch (err) {
        console.warn('Error fetching post tag notifications:', err);
      }

      notifsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifs(notifsList);


      // Refresh seen set from localStorage just in case
      try {
        setSeen(new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIF_SEEN)) || []));
      } catch {
        setSeen(new Set());
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 45000);
    return () => clearInterval(interval);
  }, [refresh]);

  const markAllRead = useCallback(() => {
    const newSeen = new Set([...seen, ...notifs.map(n => n.key)]);
    setSeen(newSeen);
  }, [seen, notifs]);

  const acceptInvite = useCallback(async (inviteId) => {
    setProcessing(p => ({ ...p, [inviteId]: 'accepting' }));
    try {
      await acceptGroupInvite(inviteId);
    } catch (err) {
      console.error('Error accepting group invite:', err);
    } finally {
      setProcessing(p => ({ ...p, [inviteId]: null }));
      refresh();
    }
  }, [refresh]);

  const declineInvite = useCallback(async (inviteId) => {
    setProcessing(p => ({ ...p, [inviteId]: 'declining' }));
    try {
      await declineGroupInvite(inviteId);
    } catch (err) {
      console.error('Error declining group invite:', err);
    } finally {
      setProcessing(p => ({ ...p, [inviteId]: null }));
      refresh();
    }
  }, [refresh]);

  const acceptFriendRequest = useCallback(async (requestId) => {
    setProcessing(p => ({ ...p, [requestId]: 'accepting' }));
    try {
      await acceptRealFriend(requestId);
    } catch (err) {
      console.error('Error accepting friend request:', err);
    } finally {
      setProcessing(p => ({ ...p, [requestId]: null }));
      refresh();
    }
  }, [refresh]);

  const declineFriendRequest = useCallback(async (requestId) => {
    setProcessing(p => ({ ...p, [requestId]: 'declining' }));
    try {
      await declineRealFriend(requestId);
    } catch (err) {
      console.error('Error declining friend request:', err);
    } finally {
      setProcessing(p => ({ ...p, [requestId]: null }));
      refresh();
    }
  }, [refresh]);

  const acceptJoinReq = useCallback(async (requestId, groupId, requesterId) => {
    setProcessing(p => ({ ...p, [requestId]: 'accepting' }));
    try {
      await approveJoinRequest(requestId, groupId, requesterId);
    } catch (err) {
      console.error('Error approving join request:', err);
    } finally {
      setProcessing(p => ({ ...p, [requestId]: null }));
      refresh();
    }
  }, [refresh]);

  const declineJoinReq = useCallback(async (requestId) => {
    setProcessing(p => ({ ...p, [requestId]: 'declining' }));
    try {
      await rejectJoinRequest(requestId);
    } catch (err) {
      console.error('Error declining join request:', err);
    } finally {
      setProcessing(p => ({ ...p, [requestId]: null }));
      refresh();
    }
  }, [refresh]);

  const unreadCount = notifs.filter(n => !seen.has(n.key)).length;

  return {
    notifs,
    seen,
    unreadCount,
    processing,
    refresh,
    markAllRead,
    acceptInvite,
    declineInvite,
    acceptFriendRequest,
    declineFriendRequest,
    acceptJoinReq,
    declineJoinReq
  };
}
