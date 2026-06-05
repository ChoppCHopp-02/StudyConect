// src/services/groupInviteService.js
import { supabase } from '@/config/supabaseClient';

export const sendGroupInvite = async ({ groupId, fromUserId, toUserId }) => {
  const gId = parseInt(groupId, 10);
  const fromId = parseInt(fromUserId, 10);
  const toId = parseInt(toUserId, 10);

  // Check if pending invite already exists
  const { data: existing, error: checkError } = await supabase
    .from('group_invites')
    .select('id')
    .eq('group_id', gId)
    .eq('invitee_id', toId)
    .eq('status', 'pending')
    .maybeSingle();

  if (checkError) throw new Error('Lỗi kiểm tra lời mời.');
  if (existing) throw new Error('Đã gửi lời mời cho người này rồi!');

  const { data: newInvite, error: insertError } = await supabase
    .from('group_invites')
    .insert([
      {
        group_id: gId,
        inviter_id: fromId,
        invitee_id: toId,
        status: 'pending'
      }
    ])
    .select()
    .single();

  if (insertError) {
    throw new Error(`Gửi lời mời thất bại: ${insertError.message}`);
  }

  return {
    id: newInvite.id.toString(),
    groupId: newInvite.group_id.toString(),
    fromUserId: newInvite.inviter_id,
    toUserId: newInvite.invitee_id,
    status: newInvite.status,
    createdAt: newInvite.created_at
  };
};

export const getGroupInvitesSent = async (groupId, fromUserId) => {
  const gId = parseInt(groupId, 10);
  const fromId = parseInt(fromUserId, 10);

  const { data, error } = await supabase
    .from('group_invites')
    .select('*')
    .eq('group_id', gId)
    .eq('inviter_id', fromId);

  if (error) return [];

  return (data || []).map(inv => ({
    id: inv.id.toString(),
    groupId: inv.group_id.toString(),
    fromUserId: inv.inviter_id,
    toUserId: inv.invitee_id,
    status: inv.status,
    createdAt: inv.created_at
  }));
};

export const getMyPendingInvites = async (userId) => {
  const uid = parseInt(userId, 10);

  const { data: invites, error } = await supabase
    .from('group_invites')
    .select('*')
    .eq('invitee_id', uid)
    .eq('status', 'pending');

  if (error || !invites || invites.length === 0) return [];

  const groupIds = invites.map(i => i.group_id);
  const inviterIds = invites.map(i => i.inviter_id);

  // Fetch groups and inviters details
  const { data: groups } = await supabase.from('study_groups').select('id, name').in('id', groupIds);
  const { data: users } = await supabase.from('users').select('id, full_name').in('id', inviterIds);

  return invites.map(inv => {
    const group = groups?.find(g => g.id === inv.group_id);
    const inviter = users?.find(u => u.id === inv.inviter_id);

    return {
      id: inv.id.toString(),
      groupId: inv.group_id.toString(),
      groupName: group ? group.name : 'Nhóm học',
      fromUserId: inv.inviter_id,
      fromUserName: inviter ? inviter.full_name : 'Thành viên',
      toUserId: inv.invitee_id,
      status: inv.status,
      createdAt: inv.created_at
    };
  });
};

export const acceptGroupInvite = async (inviteId) => {
  const invId = parseInt(inviteId, 10);

  // 1. Fetch invite details
  const { data: invite, error: fetchError } = await supabase
    .from('group_invites')
    .select('*')
    .eq('id', invId)
    .single();

  if (fetchError || !invite) throw new Error('Lời mời không tồn tại!');
  if (invite.status !== 'pending') throw new Error('Lời mời đã được xử lý rồi!');

  // 2. Update invite status to accepted
  const { error: updateError } = await supabase
    .from('group_invites')
    .update({ status: 'accepted' })
    .eq('id', invId);

  if (updateError) throw new Error('Lỗi chấp nhận lời mời.');

  // 3. Add user to group_members
  const { error: memberError } = await supabase
    .from('group_members')
    .insert([
      {
        group_id: invite.group_id,
        user_id: invite.invitee_id,
        role: 'member'
      }
    ]);

  if (memberError) {
    // If they already are in the group, we ignore this error
    if (!memberError.message.includes('unique')) {
      throw new Error(`Không thể gia nhập nhóm: ${memberError.message}`);
    }
  }

  return {
    id: invite.id.toString(),
    groupId: invite.group_id.toString(),
    fromUserId: invite.inviter_id,
    toUserId: invite.invitee_id,
    status: 'accepted'
  };
};

export const declineGroupInvite = async (inviteId) => {
  const invId = parseInt(inviteId, 10);

  const { data: invite, error: updateError } = await supabase
    .from('group_invites')
    .update({ status: 'declined' })
    .eq('id', invId)
    .select()
    .single();

  if (updateError) throw new Error(`Từ chối lời mời thất bại: ${updateError.message}`);

  return {
    id: invite.id.toString(),
    groupId: invite.group_id.toString(),
    fromUserId: invite.inviter_id,
    toUserId: invite.invitee_id,
    status: invite.status
  };
};