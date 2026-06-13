// src/services/groupService.js
import { supabase } from '@/config/supabaseClient';
import { SUBJECTS_BY_MAJOR } from '@/constants/educationData';

// Map database group schema to frontend model
const mapGroup = (g) => {
  const members = g.group_members || [];
  const deputy = members.find(m => m.role === 'admin');

  return {
    id: g.id.toString(),
    name: g.name,
    subject: g.subject,
    major: g.major || null,
    description: g.description,
    meetingMode: g.meeting_mode || 'online',
    isPrivate: g.is_private || false,
    maxMembers: g.max_members || 10,
    location: g.location || null,
    creatorId: g.creator_id,
    deputyId: deputy ? deputy.user_id : null,
    members: members.map(m => m.user_id),
    createdAt: g.created_at
  };
};

export const getAllGroups = async () => {
  const { data, error } = await supabase
    .from('study_groups')
    .select(`
      id, name, subject, major, description,
      meeting_mode, is_private, max_members,
      location, creator_id, created_at,
      group_members (user_id, role)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Lỗi tải danh sách nhóm: ${error.message}`);
  }

  return (data || []).map(mapGroup);
};

export const createGroup = async (userId, { name, subject, description, meetingMode, isPrivate, maxMembers, location, major }) => {
  // Count how many active (non-expired) groups this user is currently the creator of
  const { data: existingGroups, error: fetchErr } = await supabase
    .from('study_groups')
    .select('id, created_at')
    .eq('creator_id', userId);

  if (!fetchErr && existingGroups) {
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const activeCreatorGroups = existingGroups.filter(g => {
      const ageInMs = now - new Date(g.created_at).getTime();
      return ageInMs < oneWeekMs;
    });

    if (activeCreatorGroups.length >= 3) {
      throw new Error('Bạn đã đạt giới hạn làm trưởng nhóm tối đa 3 nhóm học hoạt động.');
    }
  }
  // Generate a unique 6-digit ID
  let uniqueId = null;
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    const randomId = Math.floor(100000 + Math.random() * 900000); // 100000 to 999999
    const { data } = await supabase.from('study_groups').select('id').eq('id', randomId).maybeSingle();
    if (!data) {
      uniqueId = randomId;
      isUnique = true;
    }
    attempts++;
  }

  if (!uniqueId) {
    throw new Error('Không thể tạo ID nhóm. Vui lòng thử lại.');
  }

  // 1. Insert into study_groups
  const { data: group, error: groupError } = await supabase
    .from('study_groups')
    .insert([
      {
        id: uniqueId,
        name,
        subject,
        major: major || null,
        description: description || '',
        creator_id: userId,
        max_members: maxMembers ? parseInt(maxMembers, 10) : 10,
        meeting_mode: meetingMode || 'online',
        is_private: isPrivate || false,
        location: location || null
      }
    ])
    .select()
    .single();

  if (groupError) {
    throw new Error(`Tạo nhóm thất bại: ${groupError.message}`);
  }

  // 2. Insert creator into group_members
  const { error: memberError } = await supabase
    .from('group_members')
    .insert([
      {
        group_id: group.id,
        user_id: userId,
        role: 'creator'
      }
    ]);

  if (memberError) {
    // Attempt cleanup if member insertion fails
    await supabase.from('study_groups').delete().eq('id', group.id);
    throw new Error(`Thêm thành viên nhóm thất bại: ${memberError.message}`);
  }

  // Fetch fully resolved group details
  return getGroupById(group.id.toString());
};

export const joinGroup = async (userId, groupId) => {
  // Check if group exists
  const group = await getGroupById(groupId);
  if (!group) throw new Error('Nhóm không tồn tại!');

  if (group.members.some(m => Number(m) === Number(userId))) {
    throw new Error('Bạn đã ở trong nhóm này rồi.');
  }

  // Check if group is full
  if (group.members.length >= group.maxMembers) {
    throw new Error('Nhóm đã đạt số lượng thành viên tối đa.');
  }

  // Nếu nhóm riêng tư → tạo join request thay vì join thẳng
  if (group.isPrivate) {
    return requestJoinGroup(userId, groupId);
  }

  // Insert into group_members
  const { error } = await supabase
    .from('group_members')
    .insert([
      {
        group_id: parseInt(groupId, 10),
        user_id: userId,
        role: 'member'
      }
    ]);

  if (error) {
    throw new Error(`Tham gia nhóm thất bại: ${error.message}`);
  }

  return getGroupById(groupId);
};

// Gửi yêu cầu tham gia nhóm riêng tư
export const requestJoinGroup = async (userId, groupId) => {
  const gId = parseInt(groupId, 10);
  const uId = parseInt(userId, 10);

  // Kiểm tra xem đã có request pending chưa
  const { data: existing } = await supabase
    .from('group_join_requests')
    .select('id, status')
    .eq('group_id', gId)
    .eq('user_id', uId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) throw new Error('Bạn đã gửi yêu cầu tham gia rồi, hãy chờ trưởng nhóm duyệt!');

  const { error } = await supabase
    .from('group_join_requests')
    .insert([{ group_id: gId, user_id: uId, status: 'pending' }]);

  if (error) throw new Error(`Gửi yêu cầu thất bại: ${error.message}`);

  return { requested: true };
};

// Trưởng nhóm lấy danh sách yêu cầu tham gia
export const getJoinRequests = async (groupId) => {
  const { data, error } = await supabase
    .from('group_join_requests')
    .select(`
      *,
      users:users!user_id (
        id,
        full_name,
        avatar,
        email
      )
    `)
    .eq('group_id', parseInt(groupId, 10))
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return [];

  return (data || []).map(r => ({
    id: r.id,
    groupId: r.group_id,
    userId: r.user_id,
    status: r.status,
    fullName: r.users?.full_name || 'Người dùng',
    avatar: r.users?.avatar || '',
    email: r.users?.email || '',
    createdAt: r.created_at
  }));
};

// Kiểm tra request status của user cho group
export const getMyJoinRequestStatus = async (userId, groupId) => {
  const { data } = await supabase
    .from('group_join_requests')
    .select('status')
    .eq('group_id', parseInt(groupId, 10))
    .eq('user_id', parseInt(userId, 10))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.status || null;
};

// Trưởng nhóm duyệt yêu cầu
export const approveJoinRequest = async (requestId, groupId, targetUserId) => {
  // Check if group is full before approving
  const group = await getGroupById(groupId);
  if (!group) throw new Error('Nhóm không tồn tại!');

  if (group.members.length >= group.maxMembers) {
    throw new Error('Nhóm đã đạt số lượng thành viên tối đa.');
  }

  // 1. Cập nhật status
  const { error: updateError } = await supabase
    .from('group_join_requests')
    .update({ status: 'approved' })
    .eq('id', requestId);

  if (updateError) throw new Error(`Duyệt thất bại: ${updateError.message}`);

  // 2. Thêm user vào group_members
  const { error: memberError } = await supabase
    .from('group_members')
    .insert([{ group_id: parseInt(groupId, 10), user_id: parseInt(targetUserId, 10), role: 'member' }]);

  if (memberError) throw new Error(`Thêm thành viên thất bại: ${memberError.message}`);
};

// Trưởng nhóm từ chối yêu cầu
export const rejectJoinRequest = async (requestId) => {
  const { error } = await supabase
    .from('group_join_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);

  if (error) throw new Error(`Từ chối thất bại: ${error.message}`);
};

// Cập nhật privacy setting của nhóm
export const updateGroupPrivacy = async (groupId, requesterId, isPrivate) => {
  const gId = parseInt(groupId, 10);
  const { data: group, error: getErr } = await supabase
    .from('study_groups')
    .select('creator_id')
    .eq('id', gId)
    .single();

  if (getErr || !group) throw new Error('Nhóm không tồn tại!');
  if (Number(group.creator_id) !== Number(requesterId)) throw new Error('Chỉ trưởng nhóm mới có thể thay đổi chế độ riêng tư!');

  const { error } = await supabase
    .from('study_groups')
    .update({ is_private: isPrivate })
    .eq('id', gId);

  if (error) throw new Error(`Cập nhật thất bại: ${error.message}`);
};

export const leaveGroup = async (userId, groupId) => {
  const gId = parseInt(groupId, 10);

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', gId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Rời nhóm thất bại: ${error.message}`);
  }

  // Auto-delete group if no members remain
  const { count } = await supabase
    .from('group_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('group_id', gId);

  if (count === 0) {
    await deleteGroup(groupId);
    return null; // group no longer exists
  }

  return getGroupById(groupId);
};

export const deleteGroup = async (groupId) => {
  const { error } = await supabase
    .from('study_groups')
    .delete()
    .eq('id', parseInt(groupId, 10));

  if (error) {
    throw new Error(`Xóa nhóm thất bại: ${error.message}`);
  }
};

// Trưởng nhóm phân quyền phó nhóm (role = 'admin' trong group_members)
export const assignDeputy = async (groupId, requesterId, targetUserId) => {
  const gId = parseInt(groupId, 10);
  
  // Verify requester is creator
  const { data: group, error: getError } = await supabase
    .from('study_groups')
    .select('creator_id')
    .eq('id', gId)
    .single();

  if (getError || !group) throw new Error('Nhóm không tồn tại!');
  if (Number(group.creator_id) !== Number(requesterId)) throw new Error('Chỉ trưởng nhóm mới có thể phân quyền phó nhóm!');
  if (Number(targetUserId) === Number(group.creator_id)) throw new Error('Trưởng nhóm không thể tự phân quyền phó nhóm cho bản thân!');

  // Update target member's role to 'admin'
  const { error: updateError } = await supabase
    .from('group_members')
    .update({ role: 'admin' })
    .eq('group_id', gId)
    .eq('user_id', parseInt(targetUserId, 10));

  if (updateError) {
    throw new Error(`Phân quyền thất bại: ${updateError.message}`);
  }

  return getGroupById(groupId);
};

// Trưởng nhóm thu hồi quyền phó nhóm
export const removeDeputy = async (groupId, requesterId) => {
  const gId = parseInt(groupId, 10);
  
  // Verify requester is creator
  const { data: group, error: getError } = await supabase
    .from('study_groups')
    .select('creator_id')
    .eq('id', gId)
    .single();

  if (getError || !group) throw new Error('Nhóm không tồn tại!');
  if (Number(group.creator_id) !== Number(requesterId)) throw new Error('Chỉ trưởng nhóm mới có thể thu hồi quyền phó nhóm!');

  // Update all 'admin' (deputy) roles back to 'member' for this group
  const { error: updateError } = await supabase
    .from('group_members')
    .update({ role: 'member' })
    .eq('group_id', gId)
    .eq('role', 'admin');

  if (updateError) {
    throw new Error(`Thu hồi quyền phó nhóm thất bại: ${updateError.message}`);
  }

  return getGroupById(groupId);
};

export const transferAdminAndLeave = async (userId, groupId) => {
  const gId = parseInt(groupId, 10);

  // Fetch all members of the group
  const { data: members, error: getError } = await supabase
    .from('group_members')
    .select('user_id, role')
    .eq('group_id', gId)
    .order('joined_at', { ascending: true });

  if (getError || !members || members.length === 0) {
    // If no members, just leave/delete group
    await deleteGroup(groupId);
    return;
  }

  const remainingMembers = members.filter(m => Number(m.user_id) !== Number(userId));

  if (remainingMembers.length > 0) {
    // Elect new creator: first deputy, or first joined member
    const newCreator = remainingMembers.find(m => m.role === 'admin') || remainingMembers[0];
    
    // Set new creator in study_groups
    const { error: groupUpdateError } = await supabase
      .from('study_groups')
      .update({ creator_id: Number(newCreator.user_id) })
      .eq('id', gId);

    if (groupUpdateError) throw new Error('Lỗi chuyển quyền trưởng nhóm.');

    // Set role in group_members to 'creator'
    await supabase
      .from('group_members')
      .update({ role: 'creator' })
      .eq('group_id', gId)
      .eq('user_id', Number(newCreator.user_id));
  }

  // Delete leaving user from group_members
  await leaveGroup(userId, groupId);
};

export const getGroupById = async (groupId) => {
  const { data, error } = await supabase
    .from('study_groups')
    .select(`
      id, name, subject, major, description,
      meeting_mode, is_private, max_members,
      location, creator_id, created_at,
      group_members (user_id, role)
    `)
    .eq('id', parseInt(groupId, 10))
    .maybeSingle();

  if (error || !data) return null;

  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const ageInMs = Date.now() - new Date(data.created_at).getTime();
  if (ageInMs >= oneWeekMs) {
    // Background deletion of the expired group
    (async () => {
      try {
        await supabase.from('study_groups').delete().eq('id', data.id);
      } catch (err) {
        console.warn('Expired group cleanup error:', err);
      }
    })();
    return null;
  }

  return mapGroup(data);
};

// Trưởng nhóm hoặc phó nhóm kick thành viên
export const kickMember = async (groupId, requesterId, targetUserId) => {
  const gId = parseInt(groupId, 10);
  const group = await getGroupById(groupId);
  if (!group) throw new Error('Nhóm không tồn tại!');

  // Fetch roles
  const { data: members, error: getError } = await supabase
    .from('group_members')
    .select('user_id, role')
    .eq('group_id', gId);

  if (getError || !members) throw new Error('Không thể tải danh sách thành viên.');

  const reqMem = members.find(m => Number(m.user_id) === Number(requesterId));
  const isLeader = reqMem?.role === 'creator';
  const isDeputy = reqMem?.role === 'admin';

  if (!isLeader && !isDeputy) {
    throw new Error('Chỉ trưởng nhóm hoặc phó nhóm mới có thể kick thành viên!');
  }

  const targetMem = members.find(m => Number(m.user_id) === Number(targetUserId));
  if (targetMem?.role === 'creator') throw new Error('Không thể kick trưởng nhóm!');
  if (isDeputy && Number(targetUserId) === Number(requesterId)) throw new Error('Phó nhóm không thể kick chính mình!');
  if (!targetMem) throw new Error('Người dùng không phải thành viên!');

  // Delete member
  const { error: deleteError } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', gId)
    .eq('user_id', parseInt(targetUserId, 10));

  if (deleteError) {
    throw new Error(`Kick thành viên thất bại: ${deleteError.message}`);
  }

  // Auto-delete group if no members remain
  const { count } = await supabase
    .from('group_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('group_id', gId);

  if (count === 0) {
    await deleteGroup(groupId);
    return null; // group no longer exists
  }

  return getGroupById(groupId);
};

// Lấy danh sách môn học theo ngành học
// Gộp: môn mặc định từ constants + môn user đã thêm từ DB
export const getSubjectsByMajor = async (major) => {
  if (!major) return [];

  const defaults = SUBJECTS_BY_MAJOR[major] || [];

  const { data, error } = await supabase
    .from('subjects_by_major')
    .select('subject_name')
    .eq('major', major)
    .order('subject_name', { ascending: true })
    .limit(20);

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('getSubjectsByMajor DB error:', error.message);
    }
    // Trả về fallback từ constants nếu DB lỗi hoặc bảng chưa tồn tại
    return [...defaults];
  }

  const fromDb = (data || []).map(r => r.subject_name);

  // Gộp constants + DB, loại bỏ trùng lặp, sắp xếp
  return Array.from(new Set([...defaults, ...fromDb])).sort((a, b) =>
    a.localeCompare(b, 'vi')
  );
};

// Lưu môn học mới vào bảng subjects_by_major (bỏ qua nếu đã tồn tại)
export const saveSubjectForMajor = async (major, subjectName) => {
  if (!major || !subjectName) return;

  const normalized = subjectName.trim().replace(/\s+/g, ' ');
  if (!normalized) return;

  const { error } = await supabase
    .from('subjects_by_major')
    .insert([{ major, subject_name: normalized }]);

  // Bỏ qua lỗi trùng lặp (unique constraint)
  if (error && !error.message?.includes('duplicate') && !error.code?.includes('23505')) {
    if (import.meta.env.DEV) {
      console.warn('saveSubjectForMajor error:', error.message);
    }
  }
};