// src/services/interactionService.js
import { supabase } from '@/config/supabaseClient';


// ─── CÂU HỎI (POSTS - BẢN TIN CHUNG) ───────────────────────────────────
export const getPosts = async (currentUserId) => {
  if (!currentUserId) return [];
  const uid = parseInt(currentUserId, 10);
  if (isNaN(uid)) {
    if (import.meta.env.DEV) console.error('[getPosts] userId không hợp lệ:', currentUserId);
    return [];
  }

  // 1. Fetch accepted friendships for the current user to filter posts
  const { data: friendships, error: friendError } = await supabase
    .from('friendships')
    .select('from_user_id, to_user_id')
    .eq('status', 'accepted')
    .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`)
    .limit(50);

  if (friendError) {
    if (import.meta.env.DEV) console.error('Error fetching friendships for feed filtering:', friendError);
  }

  const friendIds = friendships 
    ? friendships.map(f => {
        const fid = f.from_user_id === uid ? f.to_user_id : f.from_user_id;
        return parseInt(fid, 10);
      })
    : [];

  // Luôn có ít nhất uid trong array
  const allowedUserIds = [uid, ...friendIds.filter(id => !isNaN(id))];

  // Kiểm tra trước khi query
  if (allowedUserIds.length === 0) return [];

  // 2. Fetch posts
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`
      id, content, image, created_at, user_id,
      group_id, is_pinned, tag, likes,
      users (
        id,
        full_name,
        avatar,
        university
      )
    `)
    .in('user_id', allowedUserIds)
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(10);

  if (postsError) throw new Error(`Lỗi tải bài viết: ${postsError.message}`);

  if (!postsData || postsData.length === 0) return [];

  // 3. Fetch all comments and post_tags in parallel
  const postIds = postsData.map(p => p.id);
  
  const [commentsRes, tagsRes] = await Promise.all([
    supabase
      .from('comments')
      .select(`
        *,
        users!user_id (
          full_name,
          avatar
        )
      `)
      .in('post_id', postIds)
      .order('created_at', { ascending: true })
      .limit(50),
    supabase
      .from('post_tags')
      .select('post_id, target_type, target_id')
      .in('post_id', postIds)
      .limit(50)
  ]);

  const commentsData = commentsRes.data || [];
  const tagsData = tagsRes?.error ? [] : (tagsRes?.data || []);

  // 4. Fetch tag user/group names in parallel
  let tagsByPost = {};
  if (tagsData.length > 0) {
    const taggedUserIds = [...new Set(tagsData.filter(t => t.target_type === 'user').map(t => t.target_id))];
    const taggedGroupIds = [...new Set(tagsData.filter(t => t.target_type === 'group').map(t => t.target_id))];

    let userNames = {};
    let groupNames = {};

    const [usersRes, groupsRes] = await Promise.all([
      taggedUserIds.length > 0
        ? supabase.from('users').select('id, full_name').in('id', taggedUserIds.map(Number)).limit(50)
        : Promise.resolve({ data: [] }),
      taggedGroupIds.length > 0
        ? supabase.from('study_groups').select('id, name').in('id', taggedGroupIds.map(Number)).limit(50)
        : Promise.resolve({ data: [] })
    ]);

    (usersRes.data || []).forEach(u => { userNames[String(u.id)] = u.full_name; });
    (groupsRes.data || []).forEach(g => { groupNames[String(g.id)] = g.name; });

    tagsData.forEach(t => {
      if (!tagsByPost[t.post_id]) tagsByPost[t.post_id] = { users: [], groups: [], userNames: [], groupNames: [] };
      if (t.target_type === 'user') {
        tagsByPost[t.post_id].users.push(t.target_id);
        if (userNames[t.target_id]) tagsByPost[t.post_id].userNames.push(userNames[t.target_id]);
      }
      if (t.target_type === 'group') {
        tagsByPost[t.post_id].groups.push(t.target_id);
        if (groupNames[t.target_id]) tagsByPost[t.post_id].groupNames.push(groupNames[t.target_id]);
      }
    });
  }

  // Map comments to their respective posts
  return postsData.map(p => {
    const pCommentsRaw = commentsData.filter(c => c.post_id === p.id);
    const pComments = pCommentsRaw.map(c => {
      const parentComment = c.parent_id ? pCommentsRaw.find(pc => pc.id === c.parent_id) : null;
      return {
        id: c.id.toString(),
        postId: c.post_id.toString(),
        userId: c.user_id,
        parentId: c.parent_id ? c.parent_id.toString() : null,
        replyToName: parentComment ? (parentComment.users?.full_name || 'Người dùng') : null,
        userFullName: c.users?.full_name || 'Người dùng',
        userAvatar: c.users?.avatar || '',
        userInitial: (c.users?.full_name || 'U')[0].toUpperCase(),
        content: c.content,
        createdAt: c.created_at
      };
    });

    const tagInfo = tagsByPost[p.id] || {};

    return {
      id: p.id.toString(),
      groupId: p.group_id || null,
      userId: p.user_id,
      userFullName: p.users?.full_name || 'Người dùng',
      userAvatar: p.users?.avatar || '',
      userInitial: (p.users?.full_name || 'U')[0].toUpperCase(),
      university: p.users?.university || '',
      content: p.content,
      image: p.image || null,
      tag: p.tag || null,
      taggedUsers: tagInfo.users || [],
      taggedGroups: tagInfo.groups || [],
      taggedUserNames: tagInfo.userNames || [],
      taggedGroupNames: tagInfo.groupNames || [],
      likes: Array.isArray(p.likes) ? p.likes : [],
      comments: pComments,
      isPinned: p.is_pinned || false,
      createdAt: p.created_at
    };
  });
};


export const createPost = async (groupIdOrDetails, detailsObject) => {
  // eslint-disable-next-line no-useless-assignment
  let groupId = null;
  let details = {};

  if (detailsObject !== undefined) {
    groupId = groupIdOrDetails;
    details = detailsObject || {};
  } else if (groupIdOrDetails && typeof groupIdOrDetails === 'object') {
    details = groupIdOrDetails;
    groupId = groupIdOrDetails.groupId || null;
  } else {
    groupId = groupIdOrDetails;
  }

  const {
    content,
    userId,
    tag,
    taggedUsers = [],
    taggedGroups = [],
    taggedUserNames = [],
    taggedGroupNames = [],
    image = null
  } = details;

  const parsedGroupId = groupId ? parseInt(groupId, 10) : null;
  const safeGroupId = (parsedGroupId && !isNaN(parsedGroupId)) ? parsedGroupId : null;

  const { data: post, error } = await supabase
    .from('posts')
    .insert([
      {
        user_id: userId,
        content,
        tag: tag || null,
        likes_count: 0,
        comments_count: 0,
        likes: [],
        group_id: safeGroupId,
        image: image || null,
        approved: false
      }
    ])
    .select(`
      *,
      users (
        full_name,
        avatar,
        university
      )
    `)
    .single();

  if (error) {
    throw new Error(`Đăng câu hỏi thất bại: ${error.message}`);
  }

  const postId = post.id;

  // ── Lưu tags vào bảng post_tags ─────────────────────────────────
  const tagRows = [];
  const uniqueUsers = [...new Set(taggedUsers || [])];
  const uniqueGroups = [...new Set(taggedGroups || [])];
  uniqueUsers.forEach(uid => {
    tagRows.push({ post_id: postId, target_type: 'user', target_id: String(uid) });
  });
  uniqueGroups.forEach(gid => {
    tagRows.push({ post_id: postId, target_type: 'group', target_id: String(gid) });
  });
  if (tagRows.length > 0) {
    try { await supabase.from('post_tags').insert(tagRows); } catch { /* bảng chưa tồn tại thì bỏ qua */ }
  }

  // Notification via localStorage removed to comply with quota limits

  return {
    id: post.id.toString(),
    groupId: post.group_id ? post.group_id.toString() : null,
    userId: post.user_id,
    userFullName: post.users?.full_name || 'Người dùng',
    userAvatar: post.users?.avatar || '',
    userInitial: (post.users?.full_name || 'U')[0].toUpperCase(),
    university: post.users?.university || '',
    content: post.content,
    image: post.image || null,
    tag: post.tag || null,
    taggedUsers: uniqueUsers || [],
    taggedGroups: uniqueGroups || [],
    taggedUserNames: taggedUserNames || [],
    taggedGroupNames: taggedGroupNames || [],
    likes: [],
    comments: [],
    isPinned: post.is_pinned || false,
    createdAt: post.created_at
  };
};


export const toggleLikePost = async (postId, userId, emoji) => {
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('likes, user_id')
    .eq('id', parseInt(postId, 10))
    .single();

  if (fetchError) throw new Error(`Lỗi tải tương tác: ${fetchError.message}`);

  const postOwnerId = post?.user_id || null;
  let likes = Array.isArray(post.likes) ? [...post.likes] : [];
  const idx = likes.findIndex(l => (typeof l === 'object' ? String(l.userId) : String(l)) === String(userId));

  if (idx >= 0) {
    if (emoji) {
      likes[idx] = { userId, emoji };
    } else {
      likes.splice(idx, 1);
    }
  } else if (emoji) {
    likes.push({ userId, emoji });
  }

  const { error: updateError } = await supabase
    .from('posts')
    .update({ 
      likes,
      likes_count: likes.length
    })
    .eq('id', parseInt(postId, 10));

  if (updateError) throw new Error(`Lỗi lưu tương tác: ${updateError.message}`);

  try {
    if (emoji) {
      // Upsert: update emoji if exists, insert if not
      const { error: prError } = await supabase
        .from('post_reactions')
        .upsert(
          { post_id: parseInt(postId, 10), user_id: parseInt(userId, 10), emoji, post_owner_id: postOwnerId },
          { onConflict: 'post_id,user_id' }
        );
      if (prError) {
        if (import.meta.env.DEV) {
          console.error("[Realtime] Lỗi upsert post_reactions:", prError);
        }
      }
    } else {
      // Remove the reaction
      const { error: delError } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', parseInt(postId, 10))
        .eq('user_id', parseInt(userId, 10));
      if (delError) {
        if (import.meta.env.DEV) {
          console.error("[Realtime] Lỗi delete post_reactions:", delError);
        }
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[Realtime] Lỗi không xác định khi lưu post_reactions:", e);
    }
  }

  return likes;
};

export const deletePost = async (postId) => {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', parseInt(postId, 10));

  if (error) {
    throw new Error(`Xóa câu hỏi thất bại: ${error.message}`);
  }
};

export const getPendingPosts = async () => {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, content, image, tag, created_at, user_id,
      users (
        full_name,
        avatar
      )
    `)
    .eq('approved', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];

  return (data || []).map(p => ({
    id: p.id.toString(),
    userId: p.user_id,
    userFullName: p.users?.full_name || 'Người dùng',
    userAvatar: p.users?.avatar || '',
    content: p.content,
    image: p.image || null,
    tag: p.tag || null,
    createdAt: p.created_at
  }));
};

export const approvePost = async (postId) => {
  const { error } = await supabase
    .from('posts')
    .update({ approved: true })
    .eq('id', parseInt(postId, 10));

  if (error) {
    throw new Error(`Duyệt bài viết thất bại: ${error.message}`);
  }
};

// ─── BÌNH LUẬN (COMMENTS) ──────────────────────────────
export const getComments = async (postId) => {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id, post_id, user_id, parent_id, content, created_at,
      users!user_id (
        full_name,
        avatar
      )
    `)
    .eq('post_id', parseInt(postId, 10))
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    throw new Error(`Lỗi tải bình luận: ${error.message}`);
  }

  const rawComments = data || [];
  return rawComments.map(c => {
    const parentComment = c.parent_id ? rawComments.find(pc => pc.id === c.parent_id) : null;
    return {
      id: c.id.toString(),
      postId: c.post_id.toString(),
      userId: c.user_id,
      parentId: c.parent_id ? c.parent_id.toString() : null,
      replyToName: parentComment ? (parentComment.users?.full_name || 'Người dùng') : null,
      userFullName: c.users?.full_name || 'Người dùng',
      userAvatar: c.users?.avatar || '',
      userInitial: (c.users?.full_name || 'U')[0].toUpperCase(),
      content: c.content,
      createdAt: c.created_at
    };
  });
};

export const createComment = async (postId, { content, userId, parentId }) => {
  // Fetch post owner id first
  const { data: postData } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', parseInt(postId, 10))
    .single();

  const postOwnerId = postData?.user_id || null;

  const { data: comment, error } = await supabase
    .from('comments')
    .insert([
      {
        post_id: parseInt(postId, 10),
        user_id: userId,
        parent_id: parentId ? parseInt(parentId, 10) : null,
        content,
        post_owner_id: postOwnerId
      }
    ])
    .select(`
      id, post_id, user_id, parent_id, content, created_at,
      users!user_id (
        full_name,
        avatar
      )
    `)
    .single();

  if (error) {
    throw new Error(`Thêm bình luận thất bại: ${error.message}`);
  }

  return {
    id: comment.id.toString(),
    postId: comment.post_id.toString(),
    userId: comment.user_id,
    parentId: comment.parent_id ? comment.parent_id.toString() : null,
    userFullName: comment.users?.full_name || 'Người dùng',
    userAvatar: comment.users?.avatar || '',
    userInitial: (comment.users?.full_name || 'U')[0].toUpperCase(),
    content: comment.content,
    createdAt: comment.created_at
  };
};

let cachedSuggestions = null;
let cachedSuggestionsTime = 0;
const SUGGESTIONS_TTL_MS = 10 * 60 * 1000; // 10 phút

const getSearchSuggestionsBackground = async () => {
  try {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, avatar, university, major')
      .neq('role', 'admin')
      .limit(20);
      
    const { data: groups } = await supabase
      .from('study_groups')
      .select('id, name, description')
      .limit(20);
      
    const result = {
      users: (users || []).map(u => ({
        id: u.id.toString(),
        fullName: u.full_name,
        avatar: u.avatar || '',
        university: u.university || '',
        major: u.major || ''
      })),
      groups: (groups || []).map(g => ({
        id: g.id.toString(),
        name: g.name,
        description: g.description || '',
        category: ''
      }))
    };
    cachedSuggestions = result;
    cachedSuggestionsTime = Date.now();
    return result;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Error fetching search suggestions:', err);
    }
    return cachedSuggestions || { users: [], groups: [] };
  }
};

export const getSearchSuggestions = async () => {
  const now = Date.now();
  // Trả cache ngay nếu còn mới (chưa quá 10 phút)
  if (cachedSuggestions && (now - cachedSuggestionsTime) < SUGGESTIONS_TTL_MS) {
    return cachedSuggestions;
  }
  // Cache đã cũ hoặc chưa có: fetch mới, nhưng nếu có cache cũ thì trả luôn và refetch background
  if (cachedSuggestions) {
    getSearchSuggestionsBackground(); // refetch ngầm, không await
    return cachedSuggestions;
  }
  return await getSearchSuggestionsBackground();
};

export const deleteComment = async (commentId) => {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', parseInt(commentId, 10));

  if (error) {
    throw new Error(`Xóa bình luận thất bại: ${error.message}`);
  }
};

// ─── TÀI LIỆU (FILES) ──────────────────────────────────
export const getFiles = async (groupId) => {
  const { data, error } = await supabase
    .from('files')
    .select(`
      id, group_id, user_id, file_name, file_url, file_type, file_size, approved, created_at,
      users (
        id,
        full_name,
        avatar
      )
    `)
    .eq('group_id', parseInt(groupId, 10))
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    // Fallback if table files doesn't support approved filter or relations
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('files')
      .select('id, group_id, user_id, file_name, file_size, file_type, file_url, approved, created_at')
      .eq('group_id', parseInt(groupId, 10))
      .eq('approved', true)
      .limit(100);
    
    if (fallbackError) return [];
    return fallbackData.map(f => ({
      id: f.id.toString(),
      groupId: f.group_id.toString(),
      userId: f.user_id,
      userFullName: 'Thành viên',
      fileName: f.file_name || f.name,
      fileSize: f.file_size || f.size,
      fileType: f.file_type || f.type,
      fileData: f.file_url || '',
      createdAt: f.created_at,
      approved: f.approved
    }));
  }

  return (data || []).map(f => ({
    id: f.id.toString(),
    groupId: f.group_id.toString(),
    userId: f.user_id,
    userFullName: f.users?.full_name || 'Thành viên',
    fileName: f.file_name,
    fileSize: f.file_size,
    fileType: f.file_type,
    fileData: f.file_url || '',
    createdAt: f.created_at,
    approved: f.approved
  }));
};

export const getPendingFiles = async () => {
  const { data, error } = await supabase
    .from('files')
    .select(`
      id, group_id, user_id, file_name, file_size, file_type, file_url, approved, created_at,
      users (
        full_name
      ),
      study_groups (
        name
      )
    `)
    .eq('approved', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    const { data: fallbackData } = await supabase
      .from('files')
      .select('id, group_id, user_id, file_name, file_size, file_type, file_url, approved, created_at')
      .eq('approved', false)
      .limit(100);
    return (fallbackData || []).map(f => ({
      id: f.id.toString(),
      groupId: f.group_id.toString(),
      userId: f.user_id,
      userFullName: 'Thành viên',
      groupName: 'Nhóm học',
      fileName: f.file_name,
      fileSize: f.file_size,
      fileType: f.file_type,
      fileData: f.file_url,
      createdAt: f.created_at
    }));
  }

  return (data || []).map(f => ({
    id: f.id.toString(),
    groupId: f.group_id.toString(),
    userId: f.user_id,
    userFullName: f.users?.full_name || 'Thành viên',
    groupName: f.study_groups?.name || 'Nhóm học',
    fileName: f.file_name,
    fileSize: f.file_size,
    fileType: f.file_type,
    fileData: f.file_url,
    createdAt: f.created_at
  }));
};

export const approveFile = async (fileId) => {
  const { error } = await supabase
    .from('files')
    .update({ approved: true })
    .eq('id', parseInt(fileId, 10));

  if (error) {
    throw new Error(`Duyệt tài liệu thất bại: ${error.message}`);
  }
};

export const uploadFile = async (groupId, { fileName, fileSize, fileType, fileData, userId }) => {
  const MAX_SIZE = 20 * 1024 * 1024; // 20MB
  if (fileSize && fileSize > MAX_SIZE) {
    throw new Error('File quá lớn! Vui lòng chọn file nhỏ hơn 20MB.');
  }

  const { data: file, error } = await supabase
    .from('files')
    .insert([
      {
        group_id: parseInt(groupId, 10),
        user_id: parseInt(userId, 10),
        file_name: fileName,
        file_size: fileSize || 0,
        file_type: fileType || '',
        file_url: fileData, // Base64 data url or secure URL
        approved: false
      }
    ])
    .select(`
      id, group_id, user_id, file_name, file_size, file_type, file_url, created_at,
      users (
        full_name
      )
    `)
    .single();

  if (error) {
    throw new Error(`Tải lên tài liệu thất bại: ${error.message}`);
  }

  return {
    id: file.id.toString(),
    groupId: file.group_id.toString(),
    userId: file.user_id,
    userFullName: file.users?.full_name || 'Thành viên',
    fileName: file.file_name,
    fileSize: file.file_size,
    fileType: file.file_type,
    fileData: file.file_url,
    createdAt: file.created_at
  };
};

export const deleteFile = async (fileId) => {
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', parseInt(fileId, 10));

  if (error) {
    throw new Error(`Xóa tài liệu thất bại: ${error.message}`);
  }
};

// ─── LỊCH HỌC (SCHEDULES) ──────────────────────────────
export const getSchedules = async (groupId) => {
  const { data, error } = await supabase
    .from('schedules')
    .select('id, group_id, topic, date_time, location, description, creator_id, created_at')
    .eq('group_id', parseInt(groupId, 10))
    .order('date_time', { ascending: true })
    .limit(50);

  if (error) return [];

  return (data || []).map(s => ({
    id: s.id.toString(),
    groupId: s.group_id.toString(),
    topic: s.topic,
    dateTime: s.date_time,
    location: s.location || 'Online',
    description: s.description || '',
    creatorId: s.creator_id,
    createdAt: s.created_at
  }));
};

export const createSchedule = async (groupId, { topic, dateTime, location, description, creatorId }) => {
  const { data: schedule, error } = await supabase
    .from('schedules')
    .insert([
      {
        group_id: parseInt(groupId, 10),
        topic,
        date_time: dateTime,
        location: location || 'Online',
        description: description || '',
        creator_id: creatorId
      }
    ])
    .select('id, group_id, topic, date_time, location, description, creator_id, created_at')
    .single();

  if (error) {
    throw new Error(`Tạo lịch học thất bại: ${error.message}`);
  }

  return {
    id: schedule.id.toString(),
    groupId: schedule.group_id.toString(),
    topic: schedule.topic,
    dateTime: schedule.date_time,
    location: schedule.location,
    description: schedule.description,
    creatorId: schedule.creator_id,
    createdAt: schedule.created_at
  };
};

export const deleteSchedule = async (scheduleId) => {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', parseInt(scheduleId, 10));

  if (error) {
    throw new Error(`Xóa lịch học thất bại: ${error.message}`);
  }
};

export const updateSchedule = async (scheduleId, { topic, dateTime, location, description }) => {
  const { data: schedule, error } = await supabase
    .from('schedules')
    .update({
      topic,
      date_time: dateTime,
      location: location || 'Online',
      description: description || ''
    })
    .eq('id', parseInt(scheduleId, 10))
    .select('id, group_id, topic, date_time, location, description, creator_id, created_at')
    .single();

  if (error) {
    throw new Error(`Cập nhật lịch học thất bại: ${error.message}`);
  }

  return {
    id: schedule.id.toString(),
    groupId: schedule.group_id.toString(),
    topic: schedule.topic,
    dateTime: schedule.date_time,
    location: schedule.location,
    description: schedule.description,
    creatorId: schedule.creator_id,
    createdAt: schedule.created_at
  };
};

// ─── DEADLINE ──────────────────────────────────────────
export const getDeadlines = async (groupId) => {
  const { data, error } = await supabase
    .from('deadlines')
    .select(`
      id, title, due_date, group_id, creator_id, description, assignee_id, completed, created_at,
      users:users!assignee_id (
        full_name
      )
    `)
    .eq('group_id', parseInt(groupId, 10))
    .order('due_date', { ascending: true })
    .limit(50);

  if (error) {
    // Fallback if relation not supported
    const { data: fbData } = await supabase.from('deadlines').select('id, group_id, title, due_date, description, creator_id, assignee_id, assignee_name, completed, created_at').eq('group_id', parseInt(groupId, 10)).limit(50);
    return (fbData || []).map(d => ({
      id: d.id.toString(),
      groupId: d.group_id.toString(),
      title: d.title,
      dueDate: d.due_date,
      description: d.description || '',
      creatorId: d.creator_id,
      assigneeId: d.assignee_id || null,
      assigneeName: d.assignee_name || null,
      completed: d.completed || false,
      createdAt: d.created_at
    }));
  }

  return (data || []).map(d => ({
    id: d.id.toString(),
    groupId: d.group_id.toString(),
    title: d.title,
    dueDate: d.due_date,
    description: d.description || '',
    creatorId: d.creator_id,
    assigneeId: d.assignee_id || null,
    assigneeName: d.users?.full_name || null,
    completed: d.completed || false,
    createdAt: d.created_at
  }));
};

export const createDeadline = async (groupId, { title, dueDate, description, creatorId, assigneeId }) => {
  const { data: deadline, error } = await supabase
    .from('deadlines')
    .insert([
      {
        group_id: parseInt(groupId, 10),
        title,
        due_date: dueDate,
        description: description || '',
        creator_id: parseInt(creatorId, 10),
        assignee_id: assigneeId ? parseInt(assigneeId, 10) : null,
        completed: false
      }
    ])
    .select(`
      id, group_id, title, due_date, description, creator_id, assignee_id, completed, created_at,
      users:users!assignee_id (
        full_name
      )
    `)
    .single();

  if (error) {
    throw new Error(`Tạo deadline thất bại: ${error.message}`);
  }

  return {
    id: deadline.id.toString(),
    groupId: deadline.group_id.toString(),
    title: deadline.title,
    dueDate: deadline.due_date,
    description: deadline.description,
    creatorId: deadline.creator_id,
    assigneeId: deadline.assignee_id,
    assigneeName: deadline.users?.full_name || null,
    completed: deadline.completed,
    createdAt: deadline.created_at
  };
};

export const toggleDeadline = async (deadlineId) => {
  // Fetch current status
  const { data: current, error: getError } = await supabase
    .from('deadlines')
    .select('completed')
    .eq('id', parseInt(deadlineId, 10))
    .single();

  if (getError || !current) throw new Error('Deadline không tồn tại!');

  const { data: deadline, error: updateError } = await supabase
    .from('deadlines')
    .update({ completed: !current.completed })
    .eq('id', parseInt(deadlineId, 10))
    .select('id, group_id, title, due_date, description, creator_id, assignee_id, completed, created_at')
    .single();

  if (updateError) throw new Error('Lỗi cập nhật trạng thái deadline.');

  return {
    id: deadline.id.toString(),
    groupId: deadline.group_id.toString(),
    title: deadline.title,
    dueDate: deadline.due_date,
    description: deadline.description || '',
    creatorId: deadline.creator_id,
    assigneeId: deadline.assignee_id || null,
    completed: deadline.completed,
    createdAt: deadline.created_at
  };
};

export const deleteDeadline = async (deadlineId) => {
  const { error } = await supabase
    .from('deadlines')
    .delete()
    .eq('id', parseInt(deadlineId, 10));

  if (error) {
    throw new Error(`Xóa deadline thất bại: ${error.message}`);
  }
};

export const updateDeadline = async (deadlineId, { title, dueDate, description, assigneeId }) => {
  const { data: deadline, error } = await supabase
    .from('deadlines')
    .update({
      title,
      due_date: dueDate,
      description: description || '',
      assignee_id: assigneeId ? parseInt(assigneeId, 10) : null
    })
    .eq('id', parseInt(deadlineId, 10))
    .select(`
      id, group_id, title, due_date, description, creator_id, assignee_id, completed, created_at,
      users:users!assignee_id (
        full_name
      )
    `)
    .single();

  if (error) {
    throw new Error(`Cập nhật deadline thất bại: ${error.message}`);
  }

  return {
    id: deadline.id.toString(),
    groupId: deadline.group_id.toString(),
    title: deadline.title,
    dueDate: deadline.due_date,
    description: deadline.description,
    creatorId: deadline.creator_id,
    assigneeId: deadline.assignee_id,
    assigneeName: deadline.users?.full_name || null,
    completed: deadline.completed,
    createdAt: deadline.created_at
  };
};

// ─── GLOBAL SCHEDULING (FOR USER DASHBOARD) ────────────
export const getUserSchedulesAndDeadlines = async (userId) => {
  const uid = parseInt(userId, 10);
  // Fetch user's joined groups first
  const { data: joinedMemberships, error: memError } = await supabase
    .from('group_members')
    .select('group_id, role')
    .eq('user_id', uid)
    .limit(100);

  if (memError || !joinedMemberships || joinedMemberships.length === 0) {
    return { schedules: [], deadlines: [] };
  }

  const joinedGroupIds = joinedMemberships.map(m => m.group_id);

  // Fetch schedules for these groups with study_groups joined
  const { data: schedulesData } = await supabase
    .from('schedules')
    .select(`
      id, group_id, topic, date_time, location, description,
      study_groups (
        name
      )
    `)
    .in('group_id', joinedGroupIds)
    .order('date_time', { ascending: true })
    .limit(50);

  const schedules = (schedulesData || []).map(s => {
    return {
      id: s.id.toString(),
      groupId: s.group_id.toString(),
      groupName: s.study_groups?.name || 'Nhóm học',
      topic: s.topic,
      dateTime: s.date_time,
      location: s.location || 'Online',
      description: s.description || ''
    };
  });

  // Fetch deadlines for these groups with study_groups joined
  const { data: deadlinesData } = await supabase
    .from('deadlines')
    .select(`
      id, title, due_date, group_id, completed, description, assignee_id,
      study_groups (
        name
      )
    `)
    .in('group_id', joinedGroupIds)
    .order('due_date', { ascending: true })
    .limit(50);

  const deadlines = (deadlinesData || [])
    .filter(d => {
      // Leader/admin sees everything
      const membership = joinedMemberships.find(m => m.group_id === d.group_id);
      if (membership?.role === 'creator' || membership?.role === 'admin') return true;
      // Global group deadline
      if (!d.assignee_id) return true;
      // Assigned to current user
      return Number(d.assignee_id) === uid;
    })
    .map(d => {
      return {
        id: d.id.toString(),
        groupId: d.group_id.toString(),
        groupName: d.study_groups?.name || 'Nhóm học',
        title: d.title,
        dueDate: d.due_date,
        description: d.description || '',
        completed: d.completed || false
      };
    });

  return { schedules, deadlines };
};

// ─── TRÒ CHUYỆN NHÓM (CHAT) ────────────────────────────
export const getChatMessages = async (groupId) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, group_id, sender_id, content, file_attachment,
      reply_to, is_pinned, meetroom_id, created_at,
      users:users!sender_id (
        full_name,
        avatar
      )
    `)
    .eq('group_id', parseInt(groupId, 10))
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return [];

  const reversedData = (data || []).reverse();
  return reversedData
    .filter(c => !c.meetroom_id && !c.content?.startsWith('[meetroom:'))
    .map(c => ({
      id: c.id.toString(),
      groupId: c.group_id.toString(),
      userId: c.sender_id,
      userFullName: c.users?.full_name || 'Thành viên',
      userAvatar: c.users?.avatar || '',
      content: c.content,
      fileAttachment: c.file_attachment || null,
      replyTo: c.reply_to || null,
      isPinned: c.is_pinned || false,
      createdAt: c.created_at
    }));
};

export const deleteChatMessage = async (msgId, senderId) => {
  let query = supabase
    .from('messages')
    .delete()
    .eq('id', parseInt(msgId, 10));

  // If senderId provided, also filter by sender to satisfy RLS policies
  if (senderId) {
    query = query.eq('sender_id', parseInt(senderId, 10));
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Xóa tin nhắn thất bại: ${error.message}`);
  }
};

export const sendChatMessage = async (groupId, { content, fileAttachment, userId, replyTo }) => {
  // Try inserting with extended columns first. If schema hasn't been patched yet,
  // fall back to core-only columns so messaging always works.
  const corePayload = {
    group_id: parseInt(groupId, 10),
    sender_id: parseInt(userId, 10),
    content: content || '',
  };

  const extendedPayload = {
    ...corePayload,
    file_attachment: fileAttachment || null,
    reply_to: replyTo || null,
    is_pinned: false,
  };

  const selectClause = `
    id, group_id, sender_id, content, file_attachment, reply_to, is_pinned, created_at,
    users:users!sender_id (
      full_name,
      avatar
    )
  `;

  let { data: msg, error } = await supabase
    .from('messages')
    .insert([extendedPayload])
    .select(selectClause)
    .single();

  // If the extended columns don't exist yet, retry with core-only payload
  if (error && (error.message?.includes('file_attachment') || error.message?.includes('reply_to') || error.message?.includes('is_pinned'))) {
    const retry = await supabase
      .from('messages')
      .insert([corePayload])
      .select(selectClause)
      .single();
    msg = retry.data;
    error = retry.error;
  }

  if (error) {
    throw new Error(`Gửi tin nhắn thất bại: ${error.message}`);
  }

  return {
    id: msg.id.toString(),
    groupId: msg.group_id.toString(),
    userId: msg.sender_id,
    userFullName: msg.users?.full_name || 'Thành viên',
    userAvatar: msg.users?.avatar || '',
    content: msg.content,
    fileAttachment: msg.file_attachment || null,
    replyTo: msg.reply_to || null,
    isPinned: msg.is_pinned || false,
    createdAt: msg.created_at
  };
};

export const togglePinPost = async (postId) => {
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('is_pinned')
    .eq('id', parseInt(postId, 10))
    .single();

  if (fetchError) throw new Error(`Lỗi tải trạng thái ghim: ${fetchError.message}`);

  const newPinned = !post.is_pinned;

  const { error: updateError } = await supabase
    .from('posts')
    .update({ is_pinned: newPinned })
    .eq('id', parseInt(postId, 10));

  if (updateError) throw new Error(`Lỗi ghim bài viết: ${updateError.message}`);

  return newPinned;
};

export const togglePinChatMessage = async (msgId) => {
  const { data: msg, error: fetchError } = await supabase
    .from('messages')
    .select('is_pinned')
    .eq('id', parseInt(msgId, 10))
    .single();

  if (fetchError) throw new Error(`Lỗi tải trạng thái ghim tin nhắn: ${fetchError.message}`);

  const newPinned = !msg.is_pinned;

  const { error: updateError } = await supabase
    .from('messages')
    .update({ is_pinned: newPinned })
    .eq('id', parseInt(msgId, 10));

  if (updateError) throw new Error(`Lỗi ghim tin nhắn: ${updateError.message}`);

  return newPinned;
};

export const getUserPosts = async (friendId) => {
  if (!friendId) return [];
  const uid = parseInt(friendId, 10);

  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`
      id, content, image, tag, is_pinned,
      created_at, user_id, group_id, likes,
      users (full_name, avatar, university)
    `)
    .eq('user_id', uid)
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(10);

  if (postsError) throw new Error(`Lỗi tải bài viết: ${postsError.message}`);

  if (!postsData || postsData.length === 0) return [];

  const postIds = postsData.map(p => p.id);
  const { data: commentsData, error: commentsError } = await supabase
    .from('comments')
    .select(`
      id, post_id, user_id, parent_id, content, created_at,
      users!user_id (
        full_name,
        avatar
      )
    `)
    .in('post_id', postIds)
    .order('created_at', { ascending: true })
    .limit(50);

  if (commentsError && import.meta.env.DEV) {
    console.error('Error loading comments in getUserPosts:', commentsError);
  }

  return postsData.map(p => {
    const pCommentsRaw = (commentsData || []).filter(c => c.post_id === p.id);
    const pComments = pCommentsRaw.map(c => {
      const parentComment = c.parent_id ? pCommentsRaw.find(pc => pc.id === c.parent_id) : null;
      return {
        id: c.id.toString(),
        postId: c.post_id.toString(),
        userId: c.user_id,
        parentId: c.parent_id ? c.parent_id.toString() : null,
        replyToName: parentComment ? (parentComment.users?.full_name || 'Người dùng') : null,
        userFullName: c.users?.full_name || 'Người dùng',
        userAvatar: c.users?.avatar || '',
        userInitial: (c.users?.full_name || 'U')[0].toUpperCase(),
        content: c.content,
        createdAt: c.created_at
      };
    });

    return {
      id: p.id.toString(),
      groupId: p.group_id || null,
      userId: p.user_id,
      userFullName: p.users?.full_name || 'Người dùng',
      userAvatar: p.users?.avatar || '',
      userInitial: (p.users?.full_name || 'U')[0].toUpperCase(),
      university: p.users?.university || '',
      content: p.content,
      image: p.image || null,
      tag: p.tag || null,
      likes: Array.isArray(p.likes) ? p.likes : [],
      comments: pComments,
      isPinned: p.is_pinned || false,
      createdAt: p.created_at
    };
  });
};