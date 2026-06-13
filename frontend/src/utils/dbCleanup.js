import { supabase } from '../config/supabaseClient';

// Gọi 1 lần khi app khởi động, xóa data cũ
// để giảm dung lượng DB
export const runDbCleanup = async () => {
  if (!import.meta.env.PROD) return;
  try {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Xóa group_invites đã xử lý cũ hơn 30 ngày
    await supabase
      .from('group_invites')
      .delete()
      .neq('status', 'pending')
      .lt('created_at', thirtyDaysAgo);

    // Xóa group_join_requests đã xử lý cũ hơn 30 ngày
    await supabase
      .from('group_join_requests')
      .delete()
      .neq('status', 'pending')
      .lt('created_at', thirtyDaysAgo);

  } catch {
    // Silent fail — cleanup không ảnh hưởng app
  }
};
