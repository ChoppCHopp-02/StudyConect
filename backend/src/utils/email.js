const nodemailer = require('nodemailer');
const logger = require('./logger');

const sendEmail = async ({ to, subject, html }) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    logger.warn('[Email] Thiếu cấu hình SMTP trong env. Không thể gửi email.', {
      host: !!SMTP_HOST,
      port: !!SMTP_PORT,
      user: !!SMTP_USER,
      pass: !!SMTP_PASS
    });
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: parseInt(SMTP_PORT, 10) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    const info = await transporter.sendMail({
      from: `"StudyConnect" <${SMTP_USER}>`,
      to,
      subject,
      html
    });

    logger.info('[Email] Gửi email thành công', { messageId: info.messageId, to });
    return true;
  } catch (error) {
    logger.error('[Email] Lỗi gửi email:', { message: error.message, to });
    return false;
  }
};

const resetPasswordEmail = (token, name = 'Người dùng') => {
  const resetUrl = `${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/reset-password?token=${token}`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #6366f1;">Đặt lại mật khẩu StudyConnect</h2>
      <p>Xin chào <strong>${name}</strong>,</p>
      <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng bấm vào nút bên dưới để tiến hành thiết lập mật khẩu mới:</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Đặt lại mật khẩu</a>
      </div>
      <p>Đường liên kết này sẽ hết hạn sau 1 giờ.</p>
      <p>Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #64748b;">Đội ngũ StudyConnect</p>
    </div>
  `;
};

module.exports = {
  sendEmail,
  resetPasswordEmail
};
