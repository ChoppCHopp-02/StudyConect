# StudyConnect Full-Stack System 🚀

Chào mừng bạn đến với hệ thống **StudyConnect** - Nền tảng mạng xã hội kết nối học tập và tìm kiếm nhóm học dành cho sinh viên. 

Dự án này đã được cấu trúc lại hoàn toàn theo kiến trúc chuẩn **Full-Stack Monorepo**, giúp tách biệt rõ ràng giữa Frontend (Client), Backend (API Server), và Database layer.

---

## 📂 Cấu trúc Dự án

```
fullstack-system/ (Thư mục gốc)
├── frontend/             # Giao diện người dùng (React + Vite)
│   ├── public/           # Tài nguyên tĩnh công cộng (images, icons)
│   ├── src/              # Mã nguồn React
│   │   ├── assets/       # Tài nguyên đồ họa, font, style chung
│   │   ├── components/   # Các Component giao diện dùng chung
│   │   ├── pages/        # Các trang màn hình chính
│   │   ├── hooks/        # Custom React Hooks
│   │   ├── context/      # Quản lý State toàn cục (Authentication, Theme, v.v.)
│   │   ├── services/     # Tương tác API và Mock Storage
│   │   ├── utils/        # Các hàm tiện ích dùng chung
│   │   ├── App.jsx       # Component gốc khởi chạy App
│   │   ├── main.jsx      # Điểm neo ứng dụng React vào DOM
│   │   └── index.css     # Định nghĩa CSS toàn cục (Tailwind/Vanilla)
│   ├── .env              # File cấu hình môi trường Frontend
│   └── vite.config.js    # Cấu hình đóng gói Vite
├── backend/              # Hệ thống máy chủ API (Express & Node.js)
│   ├── src/              # Mã nguồn Backend
│   │   ├── config/       # Cấu hình kết nối Database, Mailer, Supabase
│   │   ├── controllers/  # Xử lý Logic nghiệp vụ API endpoints
│   │   ├── models/       # Định nghĩa lược đồ dữ liệu (Sequelize / Supabase Models)
│   │   ├── routes/       # Định tuyến các endpoints API
│   │   ├── middleware/   # Các bộ lọc bảo mật, xác thực (JWT Auth, Upload)
│   │   ├── services/     # Tách biệt logic xử lý dữ liệu phức tạp
│   │   ├── utils/        # Tiện ích bổ trợ (Logger, API Response standardizer)
│   │   ├── app.js        # Cấu hình Express App & Middleware
│   │   └── server.js     # Khởi chạy HTTP Server chính
│   └── .env              # File cấu hình bảo mật môi trường Backend
├── database/             # Cơ sở dữ liệu
│   └── schema.sql        # Lược đồ cơ sở dữ liệu mẫu dạng SQL (MySQL/PostgreSQL)
├── .gitignore            # Bỏ qua các file không đưa lên Git
├── package.json          # Quản lý Workspaces & Chạy đồng thời hệ thống
└── README.md             # Tài liệu hướng dẫn dự án
```

---

## 🛠️ Hướng dẫn Khởi chạy Hệ thống

Dự án sử dụng tính năng **npm workspaces** giúp bạn cài đặt thư viện và chạy cả 2 server chỉ với 1 cửa sổ dòng lệnh duy nhất ở thư mục gốc.

### Bước 1: Cài đặt toàn bộ thư viện (Dependencies)
Tại thư mục gốc của dự án (`d:\StudyConect (2)`), chạy lệnh sau:
```bash
npm install
```
*Lệnh này sẽ tự động tải các gói cài đặt cho cả thư mục Gốc, Frontend, và Backend.*

### Bước 2: Chạy thử nghiệm đồng thời (Development Mode)
Để khởi chạy đồng thời **Frontend Dev Server** (cổng `5173`) và **Backend Express Server** (cổng `5000`), chạy lệnh sau tại thư mục gốc:
```bash
npm run dev
```

Hoặc nếu bạn muốn khởi chạy độc lập từng thư mục:
- Chạy riêng **Frontend**: `npm run dev:frontend`
- Chạy riêng **Backend**: `npm run dev:backend`

---

## 🗄️ Cấu trúc Cơ sở dữ liệu (`database/schema.sql`)
Lược đồ SQL mẫu đã được thiết lập sẵn tại thư mục `database/schema.sql` gồm các bảng:
1. `users` — Thông tin tài khoản sinh viên.
2. `study_groups` — Thông tin các nhóm học tập được tạo.
3. `group_members` — Quản lý thành viên tham gia nhóm.
4. `group_invites` — Quản lý lời mời gia nhập nhóm học.
5. `posts` — Bài đăng trên bảng tin học tập chung.
6. `comments` — Bình luận dưới các bài đăng.
7. `messages` — Tin nhắn trò chuyện thời gian thực (Trực tiếp & Nhóm).
