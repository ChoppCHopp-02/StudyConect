const express = require('express');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');
const { apiSuccess, apiError, apiPaginated } = require('../utils/apiResponse');

const router = express.Router();

// GET /profile/:id
router.get('/profile/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).json(apiError('ID người dùng không hợp lệ', 400));
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json(apiError('Không tìm thấy người dùng', 404));
    }

    return res.status(200).json(apiSuccess(user, 'Lấy thông tin cá nhân thành công'));
  } catch (error) {
    logger.error('[User Profile] Lỗi lấy thông tin:', { message: error.message, userId: req.params.id });
    return res.status(500).json(apiError('Lỗi hệ thống', 500));
  }
});

// PUT /profile
router.put('/profile', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, bio, university, major, avatar } = req.body;

    if (full_name !== undefined && (!full_name || full_name.trim() === '')) {
      return res.status(400).json(apiError('Họ tên không được để trống', 400));
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json(apiError('Không tìm thấy người dùng', 404));
    }

    // Update fields
    if (full_name !== undefined) user.full_name = full_name.trim();
    if (bio !== undefined) user.bio = bio;
    if (university !== undefined) user.university = university;
    if (major !== undefined) user.major = major;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    return res.status(200).json(apiSuccess(user, 'Cập nhật thông tin cá nhân thành công'));
  } catch (error) {
    logger.error('[User Update Profile] Lỗi cập nhật:', { message: error.message, userId: req.user?.id });
    return res.status(500).json(apiError('Lỗi hệ thống', 500));
  }
});

// PUT /change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json(apiError('Mật khẩu hiện tại và mật khẩu mới là bắt buộc', 400));
    }
    if (newPassword.length < 8) {
      return res.status(400).json(apiError('Mật khẩu mới phải chứa tối thiểu 8 ký tự', 400));
    }

    // Query user including password hash using scope
    const user = await User.scope('withPassword').findByPk(userId);
    if (!user) {
      return res.status(404).json(apiError('Không tìm thấy người dùng', 404));
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json(apiError('Mật khẩu hiện tại không chính xác', 401));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json(apiSuccess(null, 'Đổi mật khẩu thành công'));
  } catch (error) {
    logger.error('[User Change Password] Lỗi đổi mật khẩu:', { message: error.message, userId: req.user?.id });
    return res.status(500).json(apiError('Lỗi hệ thống', 500));
  }
});

// GET /search?q=&limit=&offset=
router.get('/search', protect, async (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const page = parseInt(req.query.page || '1', 10);
    
    // Support offset parameter directly if page is not provided but offset is
    let offset = (page - 1) * limit;
    if (req.query.offset !== undefined) {
      offset = parseInt(req.query.offset, 10);
    }

    // Find count and rows
    const { count, rows } = await User.findAndCountAll({
      where: {
        [Op.or]: [
          { full_name: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } }
        ]
      },
      limit,
      offset
    });

    return res.status(200).json(apiPaginated(rows, count, page, limit));
  } catch (error) {
    logger.error('[User Search] Lỗi tìm kiếm:', { message: error.message, query: req.query.q });
    return res.status(500).json(apiError('Lỗi hệ thống', 500));
  }
});

module.exports = router;
