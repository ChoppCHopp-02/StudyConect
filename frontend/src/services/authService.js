// src/services/authService.js
import { supabase } from '@/config/supabaseClient';

const SESSION_KEY = 'sc_session';
const ADMIN_SESSION_KEY = 'sc_admin_session';

const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
};

const saveSession = (user) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('Error saving session:', err);
  }
};

const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
};

// Hàm hash mật khẩu bảo mật Salted SHA-256 (Client-side)
export const hashPassword = async (password, email) => {
  if (!password) return '';
  const salt = String(email || '').toLowerCase().trim();
  const msgBuffer = new TextEncoder().encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ─── ĐĂNG KÝ ─────────────────────────────────────────
export const register = async ({ fullName, email, password, university, major, bio }) => {
  const normalizedEmail = email.toLowerCase().trim();
  // Check if email already exists
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id, is_banned')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (checkError) {
    throw new Error('Có lỗi xảy ra khi kiểm tra email.');
  }
  if (existingUser) {
    if (existingUser.is_banned) {
      throw new Error('Email này đã bị khóa vĩnh viễn khỏi hệ thống do vi phạm chính sách nội dung khiêu dâm.');
    }
    throw new Error('Email này đã được sử dụng.');
  }

  const hashedPassword = await hashPassword(password, normalizedEmail);

  // Insert user
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([
      {
        full_name: fullName,
        email: normalizedEmail,
        password: hashedPassword, // Đã được hash Salted SHA-256 an toàn
        role: 'user',
        university: university || '',
        major: major || '',
        avatar: '',
        bio: bio || '',
      },
    ])
    .select('id, full_name, email, role, university, major, avatar, bio, created_at')
    .single();

  if (insertError) {
    throw new Error(`Đăng ký thất bại: ${insertError.message}`);
  }

  // Map to frontend user structure
  const safeUser = {
    id: newUser.id,
    fullName: newUser.full_name,
    email: newUser.email,
    role: newUser.role,
    university: newUser.university,
    major: newUser.major,
    avatar: newUser.avatar,
    bio: newUser.bio,
    createdAt: newUser.created_at,
  };

  saveSession(safeUser);
  return { user: safeUser };
};

// ─── ĐĂNG NHẬP ──────────────────────────────────────
export const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const hashedPassword = await hashPassword(password, normalizedEmail);

  const { data: user, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, university, major, avatar, bio, created_at, is_banned, password')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(`Đăng nhập thất bại: ${error.message}`);
  }
  if (!user) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }
  if (user.is_banned) {
    throw new Error('Tài khoản này đã bị khóa vĩnh viễn khỏi hệ thống do vi phạm chính sách nội dung khiêu dâm.');
  }

  // Hỗ trợ tự động nâng cấp mật khẩu cũ (plaintext) lên bảo mật hash
  const isLegacyMatch = user.password === password;
  const isHashMatch = user.password === hashedPassword;

  if (!isLegacyMatch && !isHashMatch) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }

  if (isLegacyMatch && !isHashMatch) {
    try {
      await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', user.id);
      if (import.meta.env.DEV) {
        console.log(`[Auth] Tự động nâng cấp mật khẩu lên Salted SHA-256 cho: ${normalizedEmail}`);
      }
    } catch (upgradeErr) {
      if (import.meta.env.DEV) {
        console.warn('[Auth] Không thể nâng cấp mật khẩu cũ:', upgradeErr);
      }
    }
  }

  const safeUser = {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    university: user.university,
    major: user.major,
    avatar: user.avatar,
    bio: user.bio,
    createdAt: user.created_at,
  };

  saveSession(safeUser);
  return { user: safeUser };
};

// ─── ĐĂNG XUẤT ──────────────────────────────────────
export const logout = () => {
  clearSession();
};

export const adminLogin = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const hashedPassword = await hashPassword(password, normalizedEmail);

  const { data: user, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, university, major, avatar, bio, created_at, is_banned, password')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new Error(`Đăng nhập thất bại: ${error.message}`);
  }
  if (!user) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }
  if (user.role !== 'admin') {
    throw new Error('Tài khoản này không có quyền Quản trị viên hệ thống.');
  }

  // Tương tự, hỗ trợ tự nâng cấp mật khẩu legacy cho admin
  const isLegacyMatch = user.password === password;
  const isHashMatch = user.password === hashedPassword;

  if (!isLegacyMatch && !isHashMatch) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }

  if (isLegacyMatch && !isHashMatch) {
    try {
      await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', user.id);
      if (import.meta.env.DEV) {
        console.log(`[Auth] Tự động nâng cấp mật khẩu Admin lên Salted SHA-256`);
      }
    } catch (upgradeErr) {
      if (import.meta.env.DEV) {
        console.warn('[Auth] Không thể nâng cấp mật khẩu Admin:', upgradeErr);
      }
    }
  }

  const safeAdmin = {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    university: user.university,
    major: user.major,
    avatar: user.avatar,
    bio: user.bio,
    createdAt: user.created_at,
  };

  try {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(safeAdmin));
  } catch (err) {
    console.warn('Error saving admin session:', err);
  }
  return { admin: safeAdmin };
};

// ─── QUÊN MẬT KHẨU ──────────────────────────────────
export const forgotPassword = async ({ email }) => {
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (fetchError) {
    throw new Error('Lỗi truy vấn email.');
  }

  if (user) {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expires = Date.now() + 15 * 60 * 1000;

    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: token,
        reset_expires: expires,
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error('Không thể tạo token khôi phục.');
    }

    if (import.meta.env.DEV) {
      console.log(`%c[Studyconect] Reset Token: ${token}`, 'color:#6c63ff;font-weight:bold;font-size:13px');
    }
  }

  return { message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.' };
};

// ─── ĐẶT LẠI MẬT KHẨU ──────────────────────────────
export const resetPassword = async ({ token, password }) => {
  const now = Date.now();
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, email')
    .eq('reset_token', token)
    .gt('reset_expires', now)
    .maybeSingle();

  if (fetchError) {
    throw new Error('Lỗi xác thực token.');
  }
  if (!user) {
    throw new Error('Token không hợp lệ hoặc đã hết hạn (15 phút).');
  }

  const hashedPassword = await hashPassword(password, user.email);

  const { error: updateError } = await supabase
    .from('users')
    .update({
      password: hashedPassword,
      reset_token: null,
      reset_expires: null,
    })
    .eq('id', user.id);

  if (updateError) {
    throw new Error('Lỗi cập nhật mật khẩu.');
  }

  return { message: 'Đặt lại mật khẩu thành công!' };
};

// ─── CẬP NHẬT HỒ SƠ ─────────────────────────────────
export const updateProfile = async ({ id, fullName, university, major, bio, avatarFile }) => {
  // Step 1: Get current user's full data (email, role, avatar, etc.) to preserve fields not being updated
  const { data: currentUser, error: getError } = await supabase
    .from('users')
    .select('id, email, role, avatar, created_at')
    .eq('id', id)
    .single();

  if (getError || !currentUser) {
    throw new Error('Không tìm thấy thông tin tài khoản. Vui lòng đăng nhập lại.');
  }

  // Step 2: Determine avatar value (keep existing if no new file)
  let avatar = currentUser.avatar || '';
  if (avatarFile) {
    if (typeof avatarFile === 'string') {
      avatar = avatarFile;
    } else if (avatarFile instanceof File || avatarFile instanceof Blob) {
      try {
        const fileExt = (avatarFile.name || 'avatar.png').split('.').pop() || 'png';
        const fileName = `${id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          if (import.meta.env.DEV) {
            console.warn('Upload avatar to Storage failed:', uploadError.message);
          }
          avatar = await fileToBase64(avatarFile);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatar = publicUrl;
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Storage upload exception, falling back to base64:', err);
        }
        avatar = await fileToBase64(avatarFile);
      }
    } else {
      try {
        avatar = await fileToBase64(avatarFile);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('fileToBase64 failed on unknown avatarFile type:', err);
        }
      }
    }
  }

  // Step 3: Perform the update
  const { error: updateError } = await supabase
    .from('users')
    .update({
      full_name: fullName,
      university: university || '',
      major: major || '',
      bio: bio || '',
      avatar: avatar,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    throw new Error(`Cập nhật hồ sơ thất bại: ${updateError.message}`);
  }

  // Step 4: Always fetch the freshest data from DB after update to guarantee session accuracy
  const { data: freshUser, error: fetchError } = await supabase
    .from('users')
    .select('id, full_name, email, role, university, major, bio, avatar, created_at')
    .eq('id', id)
    .single();

  // Build safeUser from fresh DB data if available, otherwise fall back to known payload
  const source = (!fetchError && freshUser) ? freshUser : {
    id,
    full_name: fullName,
    email: currentUser.email,
    role: currentUser.role,
    university: university || '',
    major: major || '',
    bio: bio || '',
    avatar,
    created_at: currentUser.created_at,
  };

  const safeUser = {
    id: source.id,
    fullName: source.full_name,
    email: source.email,
    role: source.role,
    university: source.university,
    major: source.major,
    avatar: source.avatar,
    bio: source.bio,
    createdAt: source.created_at,
  };

  saveSession(safeUser);
  return { user: safeUser };
};

// ─── ĐỔI MẬT KHẨU ───────────────────────────────────
export const changePassword = async ({ id, currentPassword, newPassword }) => {
  const { data: user, error: getError } = await supabase
    .from('users')
    .select('email, password')
    .eq('id', id)
    .single();

  if (getError || !user) {
    throw new Error('Người dùng không tồn tại.');
  }

  const hashedCurrent = await hashPassword(currentPassword, user.email);
  const isLegacyMatch = user.password === currentPassword;
  const isHashMatch = user.password === hashedCurrent;

  if (!isLegacyMatch && !isHashMatch) {
    throw new Error('Mật khẩu hiện tại không đúng.');
  }

  const hashedNew = await hashPassword(newPassword, user.email);

  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashedNew })
    .eq('id', id);

  if (updateError) {
    throw new Error('Lỗi đổi mật khẩu.');
  }

  return { message: 'Đổi mật khẩu thành công!' };
};

// ─── HELPERS ─────────────────────────────────────────
export const getCurrentUser = () => getSession();
export const isAuthenticated = () => !!getSession();

const fileToBase64 = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => res(r.result);
    r.onerror = rej;
  });