// src/services/adminService.js
import { supabase } from '@/config/supabaseClient';
import { hashPassword } from './authService';

const SESSION_KEY = 'sc_session';
const ADMIN_SESSION_KEY = 'sc_admin_session';

// CẦN NÂNG CẤP: dùng Supabase Auth để hash password đúng cách ở phía server
const mapUser = (u) => ({
  id: u.id,
  fullName: u.full_name,
  email: u.email,
  role: u.role,
  university: u.university || '',
  major: u.major || '',
  bio: u.bio || '',
  avatar: u.avatar || '',
  createdAt: u.created_at
});

const mapGroup = (g) => {
  const members = g.group_members || [];
  const deputies = members.filter(m => m.role === 'admin');
  const deputyIds = deputies.map(m => m.user_id);
  const deputy = deputies[0];

  return {
    id: g.id.toString(),
    name: g.name,
    subject: g.subject,
    description: g.description,
    meetingMode: 'online',
    location: null,
    creatorId: g.creator_id,
    deputyId: deputy ? deputy.user_id : null,
    deputyIds: deputyIds,
    members: members.map(m => m.user_id),
    createdAt: g.created_at
  };
};

// ─── QUẢN LÝ NGƯỜI DÙNG (USERS) ────────────────────────
export const adminGetUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, university, major, avatar, bio, created_at, is_banned')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Lỗi tải danh sách người dùng: ${error.message}`);
  return (data || []).map(mapUser);
};

export const adminCreateUser = async ({ fullName, email, password, role, university, major, bio }) => {
  // Check if email already exists
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (checkError) throw new Error('Lỗi kiểm tra email.');
  if (existingUser) throw new Error('Email này đã được sử dụng.');

  const hashedPassword = await hashPassword(password, email);

  const { data: user, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        full_name: fullName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'user',
        university: university || '',
        major: major || '',
        bio: bio || '',
        avatar: ''
      }
    ])
    .select('id, full_name, email, role, university, major, avatar, bio, created_at, is_banned')
    .single();

  if (insertError) throw new Error(`Thêm người dùng thất bại: ${insertError.message}`);
  return mapUser(user);
};

export const adminUpdateUser = async (userId, data) => {
  const uid = parseInt(userId, 10);

  // Check email conflict
  if (data.email) {
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email.toLowerCase())
      .neq('id', uid)
      .maybeSingle();

    if (checkError) throw new Error('Lỗi kiểm tra email trùng lặp.');
    if (existing) throw new Error('Email đã được sử dụng bởi tài khoản khác.');
  }

  // Build update payload
  const updateData = {};
  if (data.fullName !== undefined) updateData.full_name = data.fullName;
  if (data.email !== undefined) updateData.email = data.email.toLowerCase();
  
  if (data.password !== undefined && data.password.trim() !== '') {
    const emailToHash = data.email || (await supabase.from('users').select('email').eq('id', uid).single()).data?.email || '';
    updateData.password = await hashPassword(data.password, emailToHash);
  }
  
  if (data.role !== undefined) updateData.role = data.role;
  if (data.university !== undefined) updateData.university = data.university;
  if (data.major !== undefined) updateData.major = data.major;
  if (data.bio !== undefined) updateData.bio = data.bio;
  if (data.avatar !== undefined) updateData.avatar = data.avatar;

  const { data: user, error: updateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', uid)
    .select('id, full_name, email, role, university, major, avatar, bio, created_at, is_banned')
    .single();

  if (updateError) throw new Error(`Cập nhật người dùng thất bại: ${updateError.message}`);

  const updatedUser = mapUser(user);

  // Update sc_admin_session if self-editing
  try {
    const adminSession = JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY));
    if (adminSession && adminSession.id === updatedUser.id) {
      const safe = { ...updatedUser };
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(safe));
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('Error syncing admin session:', e);
    }
  }

  // Update sc_session if self-editing
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (session && session.id === updatedUser.id) {
      const safe = { ...updatedUser };
      localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('Error syncing user session:', e);
    }
  }

  return updatedUser;
};

export const adminDeleteUser = async (userId) => {
  const uid = parseInt(userId, 10);
  
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', uid);

  if (error) throw new Error(`Xóa người dùng thất bại: ${error.message}`);
};

// ─── QUẢN LÝ NHÓM HỌC ──────────────────────────────
export const adminGetGroups = async () => {
  const { data, error } = await supabase
    .from('study_groups')
    .select('id, name, subject, description, is_private, max_members, creator_id, created_at, group_members(user_id, role)');

  if (error) throw new Error(`Lỗi tải danh sách nhóm: ${error.message}`);
  
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const activeGroups = (data || []).filter(g => {
    const ageInMs = now - new Date(g.created_at).getTime();
    return ageInMs < oneWeekMs;
  });

  return activeGroups.map(mapGroup);
};

export const adminCreateGroup = async ({ name, subject, description, creatorId }) => {
  const cId = parseInt(creatorId, 10);

  // Check 3 active groups limit
  const { data: existingGroups, error: fetchErr } = await supabase
    .from('study_groups')
    .select('id, created_at')
    .eq('creator_id', cId);

  if (!fetchErr && existingGroups) {
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const activeCreatorGroups = existingGroups.filter(g => {
      const ageInMs = now - new Date(g.created_at).getTime();
      return ageInMs < oneWeekMs;
    });

    if (activeCreatorGroups.length >= 3) {
      throw new Error('Người dùng này đã đạt giới hạn làm trưởng nhóm tối đa 3 nhóm học hoạt động.');
    }
  }

  // 1. Create group
  const { data: group, error: groupError } = await supabase
    .from('study_groups')
    .insert([
      {
        name,
        subject,
        description: description || '',
        creator_id: cId,
        max_members: 10
      }
    ])
    .select()
    .single();

  if (groupError) throw new Error(`Tạo nhóm thất bại: ${groupError.message}`);

  // 2. Add creator to members
  const { error: memberError } = await supabase
    .from('group_members')
    .insert([
      {
        group_id: group.id,
        user_id: cId,
        role: 'creator'
      }
    ]);

  if (memberError) {
    // Cleanup group
    await supabase.from('study_groups').delete().eq('id', group.id);
    throw new Error(`Thêm thành viên nhóm thất bại: ${memberError.message}`);
  }

  // Return fully mapped group
  const { data: finalGroup } = await supabase
    .from('study_groups')
    .select(`
      *,
      group_members (
        user_id,
        role
      )
    `)
    .eq('id', group.id)
    .single();

  return mapGroup(finalGroup);
};

export const adminUpdateGroup = async (groupId, { name, subject, description, creatorId, deputyId }) => {
  const gId = parseInt(groupId, 10);
  
  // 1. Update general group info
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (subject !== undefined) updateData.subject = subject;
  if (description !== undefined) updateData.description = description || '';
  if (creatorId !== undefined) updateData.creator_id = parseInt(creatorId, 10);

  const { error: groupError } = await supabase
    .from('study_groups')
    .update(updateData)
    .eq('id', gId);

  if (groupError) throw new Error(`Cập nhật nhóm thất bại: ${groupError.message}`);

  // 2. Ensure creator is in membership and has creator role
  if (creatorId) {
    const cId = parseInt(creatorId, 10);
    // Check if member exists
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', gId)
      .eq('user_id', cId)
      .maybeSingle();

    if (existingMember) {
      await supabase
        .from('group_members')
        .update({ role: 'creator' })
        .eq('group_id', gId)
        .eq('user_id', cId);
    } else {
      await supabase
        .from('group_members')
        .insert([
          {
            group_id: gId,
            user_id: cId,
            role: 'creator'
          }
        ]);
    }
  }

  // 3. Update deputy
  if (deputyId !== undefined) {
    if (deputyId === null || deputyId === '' || deputyId === 'none') {
      // Remove all admin roles for this group (demuty)
      await supabase
        .from('group_members')
        .update({ role: 'member' })
        .eq('group_id', gId)
        .eq('role', 'admin');
    } else {
      const depId = parseInt(deputyId, 10);
      
      // Update role of deputy to 'admin'
      const { data: existingDep } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', gId)
        .eq('user_id', depId)
        .maybeSingle();

      if (existingDep) {
        await supabase
          .from('group_members')
          .update({ role: 'admin' })
          .eq('group_id', gId)
          .eq('user_id', depId);
      } else {
        await supabase
          .from('group_members')
          .insert([
            {
              group_id: gId,
              user_id: depId,
              role: 'admin'
            }
          ]);
      }
    }
  }

  // Fetch fully resolved group
  const { data: finalGroup } = await supabase
    .from('study_groups')
    .select(`
      *,
      group_members (
        user_id,
        role
      )
    `)
    .eq('id', gId)
    .single();

  return mapGroup(finalGroup);
};

export const adminDeleteGroup = async (groupId) => {
  const gId = parseInt(groupId, 10);
  
  const { error } = await supabase
    .from('study_groups')
    .delete()
    .eq('id', gId);

  if (error) throw new Error(`Xóa nhóm thất bại: ${error.message}`);
};