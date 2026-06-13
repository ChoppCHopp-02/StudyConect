const multer = require('multer');
const { apiError } = require('../utils/apiResponse');

// Memory storage configuration
const storage = multer.memoryStorage();

// File filter check for allowed mime types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận các định dạng ảnh (JPEG, PNG, GIF, WEBP) hoặc PDF!'), false);
  }
};

// Helper wrapper to handle multer errors nicely
const handleMulterError = (multerMiddleware, sizeLimitStr) => {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        let errMsg = err.message;
        if (err.code === 'LIMIT_FILE_SIZE') {
          errMsg = `Kích thước file vượt quá giới hạn cho phép (${sizeLimitStr})!`;
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          errMsg = 'Trường gửi lên không hợp lệ hoặc vượt quá số lượng file tối đa!';
        }
        return res.status(400).json(apiError(errMsg, 400));
      }
      next();
    });
  };
};

const uploadAvatar = handleMulterError(
  multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
  }).single('avatar'),
  '2MB'
);

const uploadFile = handleMulterError(
  multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
  }).single('file'),
  '10MB'
);

const uploadImages = handleMulterError(
  multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
  }).array('images', 5),
  '2MB mỗi ảnh'
);

module.exports = {
  uploadAvatar,
  uploadFile,
  uploadImages
};
