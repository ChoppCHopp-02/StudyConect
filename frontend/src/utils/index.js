// src/utils/index.js
// Tập hợp các utility function dùng chung trong toàn bộ app

// ─── THỜI GIAN ─────────────────────────────────────────────────────
/**
 * Trả về chuỗi thời gian tương đối (vd: "5 phút trước")
 * @param {string} iso - ISO date string
 */
export function timeAgo(iso) {
  if (!iso) return 'Vừa xong';
  const parsed = new Date(iso);
  if (isNaN(parsed.getTime())) return 'Vừa xong';
  const diff = (Date.now() - parsed.getTime()) / 1000;
  if (diff < 0) return 'Vừa xong';
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

/**
 * Giả lập độ trễ mạng (dùng trong localStorage-based services)
 * @param {number} ms - milliseconds
 */
export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── FILE ──────────────────────────────────────────────────────────
/**
 * Chuyển File object sang base64 data URL
 * @param {File} file
 * @returns {Promise<string>}
 */
export const fileToBase64 = (file) =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
  });

/**
 * Format bytes sang đơn vị đọc được (KB, MB, GB)
 * @param {number} bytes
 * @param {number} decimals
 */
export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// ─── ID ────────────────────────────────────────────────────────────
/**
 * Generate random unique ID dạng timestamp
 */
export const generateId = () => Date.now().toString();

/**
 * Generate random 6-digit group code
 * @param {string[]} existingIds - Danh sách ID đã tồn tại để tránh trùng
 */
export function generateGroupId(existingIds = []) {
  let id;
  do {
    id = Math.floor(100000 + Math.random() * 900000).toString();
  } while (existingIds.includes(id));
  return id;
}

/**
 * Generate invite ID với prefix
 */
export const generateInviteId = () =>
  `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── AVATAR ────────────────────────────────────────────────────────
/**
 * Lấy chữ cái đầu từ tên đầy đủ để dùng làm avatar placeholder
 * @param {string} fullName
 */
export const getInitial = (fullName = '') =>
  (fullName || 'U')[0].toUpperCase();

// ─── DATE TIME ─────────────────────────────────────────────────────
/**
 * Trả về datetime string dạng ISO cắt xuống minute (dùng cho input[type=datetime-local])
 */
export function getNowDateTimeLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

// ─── STRING ────────────────────────────────────────────────────────
/**
 * Generate room meeting code (vd: abc-defg-hij)
 */
export function generateRoomCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const seg = (len) =>
    Array.from({ length: len }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
}
