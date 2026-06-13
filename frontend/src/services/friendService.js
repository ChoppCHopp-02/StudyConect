// src/services/friendService.js
import { supabase } from '@/config/supabaseClient';

// ─── GỬI LỜI MỜI KẾT BẠN ────────────────────────────────
export const sendFriendRequest = async (fromUserId, toUserId) => {
  const fid = parseInt(fromUserId, 10);
  const tid = parseInt(toUserId, 10);

  // Check if relation already exists
  const { data: existing, error: checkError } = await supabase
    .from('friendships')
    .select('id')
    .or(`and(from_user_id.eq.${fid},to_user_id.eq.${tid}),and(from_user_id.eq.${tid},to_user_id.eq.${fid})`)
    .maybeSingle();

  if (checkError) throw new Error('Lỗi kiểm tra quan hệ bạn bè.');
  if (existing) throw new Error('Đã tồn tại mối quan hệ này rồi.');

  const { data: newRequest, error: insertError } = await supabase
    .from('friendships')
    .insert([
      {
        from_user_id: fid,
        to_user_id: tid,
        status: 'pending'
      }
    ])
    .select()
    .single();

  if (insertError) {
    throw new Error(`Gửi lời mời kết bạn thất bại: ${insertError.message}`);
  }

  return {
    id: newRequest.id.toString(),
    fromUserId: newRequest.from_user_id.toString(),
    toUserId: newRequest.to_user_id.toString(),
    status: newRequest.status,
    createdAt: newRequest.created_at
  };
};

// ─── CHẤP NHẬN LỜI MỜI ───────────────────────────────────
export const acceptFriendRequest = async (requestId) => {
  const { data: request, error: updateError } = await supabase
    .from('friendships')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString()
    })
    .eq('id', parseInt(requestId, 10))
    .select()
    .single();

  if (updateError) {
    throw new Error(`Chấp nhận kết bạn thất bại: ${updateError.message}`);
  }

  return {
    id: request.id.toString(),
    fromUserId: request.from_user_id.toString(),
    toUserId: request.to_user_id.toString(),
    status: request.status,
    createdAt: request.created_at,
    acceptedAt: request.accepted_at
  };
};

// ─── TỪ CHỐI / HỦY LỜI MỜI / HỦY KẾT BẠN ─────────────────
export const removeFriend = async (requestId) => {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', parseInt(requestId, 10));

  if (error) {
    throw new Error(`Xóa quan hệ bạn bè thất bại: ${error.message}`);
  }
};

// ─── LẤY DANH SÁCH BẠN BÈ CỦA USER ─────────────────────
export const getFriends = async (userId, includePending = false) => {
  const uid = Number(userId);

  let query = supabase.from('friendships').select('id, from_user_id, to_user_id, status, created_at, accepted_at');
  if (includePending) {
    query = query.in('status', ['accepted', 'pending']);
  } else {
    query = query.eq('status', 'accepted');
  }

  const { data: friendships, error: fetchError } = await query
    .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`)
    .limit(50);

  if (fetchError || !friendships || friendships.length === 0) return [];

  const friendIds = friendships.map(f => Number(f.from_user_id) === uid ? Number(f.to_user_id) : Number(f.from_user_id));

  // Fetch users details (safety: no password)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, university, major, avatar, bio, created_at')
    .in('id', friendIds);

  if (usersError || !users) return [];

  return friendships.map(f => {
    const friendId = Number(f.from_user_id) === uid ? Number(f.to_user_id) : Number(f.from_user_id);
    const friendUser = users.find(u => Number(u.id) === friendId);
    if (!friendUser) return null;

    return {
      requestId: f.id.toString(),
      userId: friendId.toString(),
      fullName: friendUser.full_name,
      university: friendUser.university || '',
      major: friendUser.major || '',
      avatar: friendUser.avatar || '',
      initial: (friendUser.full_name || 'U')[0].toUpperCase(),
      friendSince: f.accepted_at || f.created_at,
      status: f.status,
      fromUserId: f.from_user_id.toString(),
      toUserId: f.to_user_id.toString()
    };
  }).filter(Boolean);
};

// ─── LỜI MỜI ĐÃ NHẬN (ĐANG CHỜ) ─────────────────────────
export const getPendingRequests = async (userId) => {
  const uid = Number(userId);

  const { data: friendships, error: fetchError } = await supabase
    .from('friendships')
    .select('id, from_user_id, to_user_id, status, created_at')
    .eq('status', 'pending')
    .eq('to_user_id', uid)
    .limit(20);

  if (fetchError || !friendships || friendships.length === 0) return [];

  const senderIds = friendships.map(f => Number(f.from_user_id));

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, university, major, avatar, bio, created_at')
    .in('id', senderIds);

  if (usersError || !users) return [];

  return friendships.map(f => {
    const sender = users.find(u => Number(u.id) === Number(f.from_user_id));
    if (!sender) return null;

    return {
      requestId: f.id.toString(),
      userId: f.from_user_id.toString(),
      fullName: sender.full_name,
      university: sender.university || '',
      major: sender.major || '',
      avatar: sender.avatar || '',
      initial: (sender.full_name || 'U')[0].toUpperCase(),
      sentAt: f.created_at
    };
  }).filter(Boolean);
};

// ─── LỜI MỜI ĐÃ GỬI (ĐANG CHỜ) ──────────────────────────
export const getSentRequests = async (userId) => {
  const uid = Number(userId);

  const { data: friendships, error: fetchError } = await supabase
    .from('friendships')
    .select('id, from_user_id, to_user_id, status, created_at')
    .eq('status', 'pending')
    .eq('from_user_id', uid)
    .limit(20);

  if (fetchError || !friendships || friendships.length === 0) return [];

  const receiverIds = friendships.map(f => Number(f.to_user_id));

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, university, major, avatar, bio, created_at')
    .in('id', receiverIds);

  if (usersError || !users) return [];

  return friendships.map(f => {
    const receiver = users.find(u => Number(u.id) === Number(f.to_user_id));
    if (!receiver) return null;

    return {
      requestId: f.id.toString(),
      userId: f.to_user_id.toString(),
      fullName: receiver.full_name,
      university: receiver.university || '',
      major: receiver.major || '',
      avatar: receiver.avatar || '',
      initial: (receiver.full_name || 'U')[0].toUpperCase(),
      sentAt: f.created_at
    };
  }).filter(Boolean);
};

// ─── GỢI Ý KẾT BẠN (người chưa kết bạn) ─────────────────
export const getSuggestions = async (userId) => {
  const uid = Number(userId);

  const { data: friendships } = await supabase
    .from('friendships')
    .select('from_user_id, to_user_id')
    .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`);

  const relatedIds = new Set(
    friendships ? friendships.flatMap(f => [Number(f.from_user_id), Number(f.to_user_id)]) : []
  );
  relatedIds.add(uid);

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, university, major, avatar')
    .neq('role', 'admin')
    .limit(30);

  if (usersError || !users) return [];

  return users
    .filter(u => !relatedIds.has(Number(u.id)))
    .slice(0, 10)
    .map(u => ({
      userId: u.id.toString(),
      fullName: u.full_name,
      university: u.university || '',
      major: u.major || '',
      avatar: u.avatar || '',
      initial: (u.full_name || 'U')[0].toUpperCase()
    }));
};

// ─── KIỂM TRA TRẠNG THÁI QUAN HỆ ─────────────────────────
export const getFriendshipStatus = async (userId, targetId) => {
  const uid = Number(userId);
  const tid = Number(targetId);

  const { data: rel, error } = await supabase
    .from('friendships')
    .select('id, from_user_id, to_user_id, status, created_at, accepted_at')
    .or(`and(from_user_id.eq.${uid},to_user_id.eq.${tid}),and(from_user_id.eq.${tid},to_user_id.eq.${uid})`)
    .maybeSingle();

  if (error || !rel) return null;

  return {
    id: rel.id.toString(),
    fromUserId: rel.from_user_id.toString(),
    toUserId: rel.to_user_id.toString(),
    status: rel.status,
    createdAt: rel.created_at,
    acceptedAt: rel.accepted_at
  };
};