// src/services/chatService.js
// Chat với bạn bè — Lưu trữ đồng bộ trực tiếp vào database Supabase
import { supabase } from '../config/supabaseClient';

let cachedMessages = [];

// ─── TẢI CACHE TRỰC TIẾP TỪ DATABASE ────────────────────────
export const refreshCache = async (userId) => {
  if (!userId) return;
  const uid = parseInt(userId, 10);
  if (isNaN(uid)) return;

  try {
    let query = supabase
      .from('messages')
      .select('*')
      .is('group_id', null)
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

    if (cachedMessages.length > 0) {
      const lastMsg = cachedMessages[cachedMessages.length - 1];
      query = query.gt('created_at', lastMsg.createdAt).order('created_at', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false }).limit(2000);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      // If we fetched the initial 2000 messages descending, we must reverse them to ascending order
      const orderedData = cachedMessages.length === 0 ? [...data].reverse() : data;

      const newMsgs = orderedData.map(raw => ({
        id: String(raw.id),
        fromUserId: String(raw.sender_id),
        toUserId: String(raw.receiver_id),
        content: raw.content,
        type: raw.content?.startsWith('[chat_background]:') ? 'background' : ((raw.content?.startsWith('data:image') || (raw.content?.startsWith('http') && (raw.content?.match(/\.(jpeg|jpg|gif|png)/i) || raw.content?.includes('supabase')))) ? 'image' : 'text'),
        fileAttachment: raw.file_attachment || null,
        createdAt: raw.created_at,
        read: raw.is_read
      }));

      // Filter out any messages that already exist in cache just in case
      const existingIds = new Set(cachedMessages.map(m => m.id));
      const uniqueNewMsgs = newMsgs.filter(m => !existingIds.has(m.id));

      if (uniqueNewMsgs.length > 0) {
        cachedMessages = [...cachedMessages, ...uniqueNewMsgs];
      }
    }
  } catch (err) {
    console.error('[chatService] Exception in refreshCache:', err);
  }
};

// ─── GỬI TIN NHẮN ────────────────────────────────────────
// type: 'text' | 'image' | 'file'
export const sendMessage = async (fromUserId, toUserId, content, type = 'text', fileAttachment = null) => {
  if (type === 'text' && !content?.trim() && !fileAttachment) throw new Error('Nội dung tin nhắn không được trống.');

  const cleanContent = type === 'text' && content ? content.trim() : (content || '');
  
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        sender_id: parseInt(fromUserId, 10),
        receiver_id: parseInt(toUserId, 10),
        group_id: null,
        content: cleanContent,
        file_attachment: fileAttachment,
        is_read: false
      }
    ])
    .select();

  if (error) {
    throw new Error(`Gửi tin nhắn thất bại: ${error.message}`);
  }

  const raw = data[0];
  const newMsg = {
    id: String(raw.id),
    fromUserId: String(raw.sender_id),
    toUserId: String(raw.receiver_id),
    content: raw.content,
    fileAttachment: raw.file_attachment || null,
    type: (raw.content?.startsWith('data:image') || (raw.content?.startsWith('http') && (raw.content?.match(/\.(jpeg|jpg|gif|png)/i) || raw.content?.includes('supabase')))) ? 'image' : 'text',
    createdAt: raw.created_at,
    read: raw.is_read
  };

  // Cập nhật ngay lập tức vào cache để UI phản hồi tức thì
  cachedMessages.push(newMsg);
  return newMsg;
};

// ─── LẤY TIN NHẮN GIỮA 2 USER ────────────────────────────
export const getConversation = async (userId, friendId) => {
  const uid = parseInt(userId, 10);
  const fid = parseInt(friendId, 10);

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .is('group_id', null)
    .or(`and(sender_id.eq.${uid},receiver_id.eq.${fid}),and(sender_id.eq.${fid},receiver_id.eq.${uid})`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching conversation:', error);
    return { messages: [], background: '' };
  }

  let background = '';
  const messages = [];

  data.forEach(raw => {
    if (raw.content?.startsWith('[chat_background]:')) {
      background = raw.content.replace('[chat_background]:', '');
    } else {
      messages.push({
        id: String(raw.id),
        fromUserId: String(raw.sender_id),
        toUserId: String(raw.receiver_id),
        content: raw.content,
        fileAttachment: raw.file_attachment || null,
        type: (raw.content?.startsWith('data:image') || (raw.content?.startsWith('http') && (raw.content?.match(/\.(jpeg|jpg|gif|png)/i) || raw.content?.includes('supabase')))) ? 'image' : 'text',
        createdAt: raw.created_at,
        read: raw.is_read
      });
    }
  });

  return { messages, background };
};

// ─── ĐÁNH DẤU ĐÃ ĐỌC ─────────────────────────────────────
export const markAsRead = async (userId, friendId) => {
  const uid = parseInt(userId, 10);
  const fid = parseInt(friendId, 10);

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('sender_id', fid)
    .eq('receiver_id', uid)
    .is('group_id', null);

  if (!error) {
    cachedMessages = cachedMessages.map(m =>
      m.fromUserId === String(fid) && m.toUserId === String(uid) ? { ...m, read: true } : m
    );
  }
};

// ─── ĐẾM TIN CHƯA ĐỌC ────────────────────────────────────
export const getUnreadCount = (userId, friendId) => {
  const uid = String(userId);
  const fid = String(friendId);
  return cachedMessages.filter(m => m.fromUserId === fid && m.toUserId === uid && !m.read && m.type !== 'background').length;
};

// ─── TỔNG SỐ TIN CHƯA ĐỌC ────────────────────────────────
export const getTotalUnread = (userId) => {
  const uid = String(userId);
  return cachedMessages.filter(m => m.toUserId === uid && !m.read && m.type !== 'background').length;
};

// ─── LẤY TIN NHẮN CUỐI CỦA MỖI CUỘC HỘI THOẠI ──────────
export const getLastMessages = (userId) => {
  const uid = String(userId);
  const convMap = {};
  cachedMessages.forEach(m => {
    if (m.fromUserId !== uid && m.toUserId !== uid) return;
    if (m.type === 'background') return; // Bỏ qua tin nhắn đổi hình nền
    const otherId = m.fromUserId === uid ? m.toUserId : m.fromUserId;
    if (!convMap[otherId] || new Date(m.createdAt) > new Date(convMap[otherId].createdAt)) {
      convMap[otherId] = m;
    }
  });
  return convMap;
};

// ─── XÓA TIN NHẮN ────────────────────────────────────────
export const deleteMessage = async (msgId) => {
  const id = parseInt(msgId, 10);
  if (isNaN(id)) return;

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Xóa tin nhắn thất bại: ${error.message}`);
  }

  // Cập nhật cache
  cachedMessages = cachedMessages.filter(m => m.id !== String(msgId));
};