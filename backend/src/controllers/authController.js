const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const { apiSuccess, apiError } = require('../utils/apiResponse');
const { signToken } = require('../middleware/auth');
const { sendEmail, resetPasswordEmail } = require('../utils/email');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:8000',
  process.env.SUPABASE_SERVICE_KEY || 'placeholder'
);

// POST /register
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json(apiError('Vui lòng điền đầy đủ họ tên, email và mật khẩu', 400));
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(apiError('Email không đúng định dạng', 400));
    }
    if (password.length < 8) {
      return res.status(400).json(apiError('Mật khẩu phải chứa tối thiểu 8 ký tự', 400));
    }

    // Check existing email
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      logger.error('[Auth Register] Lỗi kiểm tra email:', { message: checkError.message });
      return res.status(500).json(apiError('Lỗi hệ thống khi kiểm tra email', 500));
    }
    if (existingUser) {
      return res.status(400).json(apiError('Email đã được sử dụng', 400));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        full_name,
        email,
        password: hashedPassword,
        role: 'user'
      }])
      .select('id, full_name, email, role, university, major, bio, avatar, is_banned, created_at')
      .single();

    if (insertError) {
      logger.error('[Auth Register] Lỗi đăng ký user:', { message: insertError.message });
      return res.status(500).json(apiError('Đăng ký tài khoản thất bại', 500));
    }

    return res.status(201).json(apiSuccess(newUser, 'Đăng ký tài khoản thành công', 201));
  } catch (error) {
    logger.error('[Auth Register] Lỗi không xác định:', { message: error.message });
    return res.status(500).json(apiError('Lỗi hệ thống', 500));
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json(apiError('Email và mật khẩu là bắt buộc', 400));
    }

    // Query user including password (for comparison)
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('id, full_name, email, password, role, university, major, bio, avatar, is_banned, created_at')
      .eq('email', email)
      .maybeSingle();

    if (queryError) {
      logger.error('[Auth Login] Lỗi truy vấn user:', { message: queryError.message });
      return res.status(500).json(apiError('Lỗi hệ thống khi đăng nhập', 500));
    }

    if (!user) {
      return res.status(401).json(apiError('Email hoặc mật khẩu không đúng', 401));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json(apiError('Email hoặc mật khẩu không đúng', 401));
    }

    if (user.is_banned) {
      return res.status(403).json(apiError('Tài khoản đã bị khóa', 403));
    }

    // Clean user object (remove password)
    const cleanedUser = { ...user };
    delete cleanedUser.password;

    const token = signToken(cleanedUser);

    return res.status(200).json(apiSuccess({ user: cleanedUser, token }, 'Đăng nhập thành công'));
  } catch (error) {
    logger.error('[Auth Login] Lỗi không xác định:', { message: error.message });
    return res.status(500).json(apiError('Lỗi hệ thống', 500));
  }
});

// POST /admin-login
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json(apiError('Email và mật khẩu là bắt buộc', 400));
    }

    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('id, full_name, email, password, role, university, major, bio, avatar, is_banned, created_at')
      .eq('email', email)
      .maybeSingle();

    if (queryError) {
      logger.error('[Admin Login] Lỗi truy vấn user:', { message: queryError.message });
      return res.status(500).json(apiError('Lỗi hệ thống khi đăng nhập', 500));
    }

    if (!user) {
      return res.status(401).json(apiError('Email hoặc mật khẩu không đúng', 401));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json(apiError('Email hoặc mật khẩu không đúng', 401));
    }

    if (user.is_banned) {
      return res.status(403).json(apiError('Tài khoản đã bị khóa', 403));
    }

    if (user.role !== 'admin') {
      return res.status(403).json(apiError('Chỉ quản trị viên mới có quyền đăng nhập trang này', 403));
    }

    const cleanedUser = { ...user };
    delete cleanedUser.password;

    const token = signToken(cleanedUser);

    return res.status(200).json(apiSuccess({ user: cleanedUser, token }, 'Đăng nhập quản trị viên thành công'));
  } catch (error) {
    logger.error('[Admin Login] Lỗi không xác định:', { message: error.message });
    return res.status(500).json(apiError('Lỗi hệ thống', 500));
  }
});

// POST /forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json(apiError('Email là bắt buộc', 400));
    }

    // Query user
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('email', email)
      .maybeSingle();

    if (queryError) {
      logger.error('[Forgot Password] Lỗi truy vấn email:', { message: queryError.message });
      return res.status(500).json(apiError('Lỗi hệ thống', 500));
    }

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      const { error: updateError } = await supabase
        .from('users')
        .update({ reset_token: resetToken, reset_expires: resetExpires })
        .eq('id', user.id);

      if (updateError) {
        logger.error('[Forgot Password] Lỗi lưu token reset:', { message: updateError.message });
        return res.status(500).json(apiError('Lỗi hệ thống', 500));
      }

      // Send email (async, non-blocking)
      const emailHtml = resetPasswordEmail(resetToken, user.full_name);
      sendEmail({
        to: user.email,
        subject: 'Đặt lại mật khẩu StudyConnect',
        html: emailHtml
      }).catch(err => logger.error('[Forgot Password] Gửi email thất bại:', { message: err.message }));
    }

    // Always return success for security (prevent email enumeration)
    return res.status(200).json(apiSuccess(null, 'Yêu cầu khôi phục mật khẩu đã được ghi nhận. Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.'));
  } catch (error) {
    logger.error('[Forgot Password] Lỗi không xác định:', { message: error.message });
    return res.status(500).json(apiError('Lỗi hệ thống', 500));
  }
});

// POST /reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json(apiError('Token và mật khẩu mới là bắt buộc', 400));
    }
    if (newPassword.length < 8) {
      return res.status(400).json(apiError('Mật khẩu mới phải chứa tối thiểu 8 ký tự', 400));
    }

    // Query user by reset token
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('id, reset_expires')
      .eq('reset_token', token)
      .maybeSingle();

    if (queryError) {
      logger.error('[Reset Password] Lỗi truy vấn token:', { message: queryError.message });
      return res.status(500).json(apiError('Lỗi hệ thống', 500));
    }

    if (!user) {
      return res.status(400).json(apiError('Mã khôi phục không hợp lệ hoặc đã được sử dụng', 400));
    }

    const now = new Date();
    const expires = new Date(user.reset_expires);
    if (expires < now) {
      return res.status(400).json(apiError('Mã khôi phục đã hết hạn', 400));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        reset_token: null,
        reset_expires: null
      })
      .eq('id', user.id);

    if (updateError) {
      logger.error('[Reset Password] Lỗi đặt lại mật khẩu:', { message: updateError.message });
      return res.status(500).json(apiError('Đặt lại mật khẩu thất bại', 500));
    }

    return res.status(200).json(apiSuccess(null, 'Đặt lại mật khẩu thành công'));
  } catch (error) {
    logger.error('[Reset Password] Lỗi không xác định:', { message: error.message });
    return res.status(500).json(apiError('Lỗi hệ thống', 500));
  }
});

module.exports = router;
