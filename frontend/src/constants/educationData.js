// src/constants/educationData.js

export const HCM_UNIVERSITIES = [
  'Đại học Bách Khoa - ĐHQG TP.HCM',
  'Đại học Khoa học Tự nhiên - ĐHQG TP.HCM',
  'Đại học Công nghệ Thông tin - ĐHQG TP.HCM',
  'Đại học Quốc tế - ĐHQG TP.HCM',
  'Đại học Kinh tế - Luật - ĐHQG TP.HCM',
  'Đại học Sư phạm Kỹ thuật TP.HCM',
  'Đại học Ngoại thương (Cơ sở II)',
  'Đại học Kinh tế TP.HCM (UEH)',
  'Đại học Ngoại ngữ - Tin học TP.HCM (HUFLIT)',
  'Đại học Tôn Đức Thắng (TDTU)',
  'Đại học Sư phạm TP.HCM (HCMUE)',
  'Đại học Sài Gòn (SGU)',
  'Đại học Mở TP.HCM (OU)',
  'Đại học RMIT Việt Nam',
  'Đại học Công nghệ TP.HCM (HUTECH)',
  'Đại học FPT TP.HCM',
  'Đại học Hoa Sen (HSU)',
  'Đại học Văn Lang (VLU)',
  'Đại học Y Dược TP.HCM',
  'Đại học Luật TP.HCM',
  'Đại học Kiến trúc TP.HCM',
  'Trường khác...'
];

export const MAJORS = [
  // ── Công nghệ - Kỹ thuật ──
  'Công nghệ thông tin',
  'Kỹ thuật phần mềm',
  'Khoa học máy tính',
  'An toàn thông tin',
  'Hệ thống thông tin',
  'Trí tuệ nhân tạo',
  'Kỹ thuật điện - Điện tử',
  'Kỹ thuật cơ khí',
  'Kỹ thuật xây dựng',
  'Kỹ thuật hóa học',
  'Kỹ thuật môi trường',
  'Kỹ thuật ô tô',
  'Kỹ thuật hàng không - Vũ trụ',
  'Kỹ thuật sinh học',
  'Công nghệ thực phẩm',
  'Công nghệ vật liệu',
  // ── Kinh tế - Quản trị ──
  'Quản trị kinh doanh',
  'Kinh doanh quốc tế',
  'Kế toán',
  'Kiểm toán',
  'Tài chính - Ngân hàng',
  'Marketing',
  'Logistics và Quản lý chuỗi cung ứng',
  'Thương mại điện tử',
  'Kinh tế học',
  'Quản lý công nghiệp',
  // ── Y - Dược - Sức khỏe ──
  'Y khoa',
  'Dược học',
  'Điều dưỡng',
  'Răng - Hàm - Mặt',
  'Y tế công cộng',
  'Kỹ thuật y sinh',
  'Dinh dưỡng học',
  // ── Khoa học tự nhiên ──
  'Toán học',
  'Vật lý học',
  'Hóa học',
  'Sinh học',
  'Khoa học Trái Đất',
  // ── Khoa học xã hội - Nhân văn ──
  'Luật',
  'Tâm lý học',
  'Xã hội học',
  'Triết học',
  'Lịch sử',
  'Địa lý học',
  'Văn học',
  'Nhân học',
  // ── Ngôn ngữ ──
  'Ngôn ngữ Anh',
  'Ngôn ngữ Trung Quốc',
  'Ngôn ngữ Nhật',
  'Ngôn ngữ Hàn Quốc',
  'Ngôn ngữ Pháp',
  'Ngôn ngữ Đức',
  'Ngôn ngữ Nga',
  // ── Giáo dục - Sư phạm ──
  'Sư phạm Toán học',
  'Sư phạm Vật lý',
  'Sư phạm Hóa học',
  'Sư phạm Sinh học',
  'Sư phạm Tiếng Anh',
  'Sư phạm Ngữ văn',
  'Giáo dục Mầm non',
  'Giáo dục Tiểu học',
  'Giáo dục Thể chất',
  // ── Kiến trúc - Quy hoạch ──
  'Kiến trúc',
  'Quy hoạch đô thị',
  'Thiết kế nội thất',
  // ── Nghệ thuật - Truyền thông ──
  'Thiết kế đồ họa',
  'Thiết kế thời trang',
  'Mỹ thuật',
  'Âm nhạc',
  'Điện ảnh - Truyền hình',
  'Báo chí',
  'Truyền thông đa phương tiện',
  'Quan hệ công chúng',
  // ── Du lịch - Dịch vụ ──
  'Quản trị Du lịch - Lữ hành',
  'Quản trị Khách sạn',
  'Quản trị Nhà hàng - Ẩm thực',
  // ── Nông - Lâm - Ngư ──
  'Nông học',
  'Thú y',
  'Lâm nghiệp',
  'Nuôi trồng thủy sản',
  'Khoa học cây trồng',
  // ── Thể dục thể thao ──
  'Giáo dục thể chất',
  'Huấn luyện thể thao',
  // ── Quản lý - Hành chính ──
  'Quản lý nhà nước',
  'Quan hệ quốc tế',
  'Chính trị học',
  'Ngành khác...'
];

// Môn học mặc định theo ngành học (tự động load, không cần seed DB)
export const SUBJECTS_BY_MAJOR = {
  // ── Công nghệ - Kỹ thuật ──
  'Công nghệ thông tin': [
    'Toán cao cấp', 'Lập trình Web', 'Cơ sở dữ liệu',
    'Mạng máy tính', 'Hệ điều hành', 'Lập trình hướng đối tượng',
    'Cấu trúc dữ liệu và giải thuật', 'Trí tuệ nhân tạo',
  ],
  'Kỹ thuật phần mềm': [
    'Toán cao cấp', 'Lập trình Web', 'Cơ sở dữ liệu',
    'Kỹ nghệ phần mềm', 'Kiểm thử phần mềm',
    'Cấu trúc dữ liệu và giải thuật', 'Phân tích thiết kế hệ thống',
  ],
  'Khoa học máy tính': [
    'Toán cao cấp', 'Đại số tuyến tính', 'Giải tích',
    'Cấu trúc dữ liệu và giải thuật', 'Học máy',
    'Trí tuệ nhân tạo', 'Xử lý ngôn ngữ tự nhiên',
  ],
  'An toàn thông tin': [
    'Mật mã học', 'An ninh mạng', 'Bảo mật ứng dụng web',
    'Pháp lý an toàn thông tin', 'Lập trình Web', 'Hệ điều hành',
  ],
  'Hệ thống thông tin': [
    'Cơ sở dữ liệu', 'Phân tích hệ thống', 'Quản trị dự án',
    'ERP và hệ thống doanh nghiệp', 'Kinh doanh thông minh',
  ],
  'Trí tuệ nhân tạo': [
    'Học máy', 'Học sâu', 'Xử lý ngôn ngữ tự nhiên',
    'Thị giác máy tính', 'Toán cao cấp', 'Xác suất thống kê',
  ],
  'Kỹ thuật điện - Điện tử': [
    'Mạch điện', 'Điện tử tương tự', 'Điện tử số',
    'Vi điều khiển', 'Xử lý tín hiệu số', 'Điện lực',
  ],
  'Kỹ thuật cơ khí': [
    'Cơ học kỹ thuật', 'Sức bền vật liệu', 'Nguyên lý máy',
    'Kỹ thuật nhiệt', 'CAD/CAM', 'Gia công cắt gọt',
  ],
  'Kỹ thuật xây dựng': [
    'Cơ học kết cấu', 'Sức bền vật liệu', 'Bê tông cốt thép',
    'Địa kỹ thuật', 'Kết cấu thép', 'Quản lý dự án xây dựng',
  ],
  'Kỹ thuật hóa học': [
    'Hóa đại cương', 'Hóa hữu cơ', 'Hóa lý', 'Cơ học chất lỏng',
    'Quá trình thiết bị', 'An toàn hóa chất',
  ],
  'Kỹ thuật môi trường': [
    'Hóa môi trường', 'Xử lý nước thải', 'Quản lý chất thải rắn',
    'Quan trắc môi trường', 'Đánh giá tác động môi trường',
  ],
  'Kỹ thuật ô tô': [
    'Cơ học kỹ thuật', 'Động cơ đốt trong', 'Hệ thống gầm ô tô',
    'Điện ô tô', 'Chẩn đoán ô tô',
  ],
  'Công nghệ thực phẩm': [
    'Hóa học thực phẩm', 'Vi sinh vật thực phẩm', 'Bảo quản chế biến',
    'Kiểm soát chất lượng', 'Công nghệ lên men',
  ],
  // ── Kinh tế - Quản trị ──
  'Quản trị kinh doanh': [
    'Kinh tế vĩ mô', 'Kinh tế vi mô', 'Nguyên lý kế toán',
    'Quản trị học', 'Marketing căn bản', 'Quản trị chiến lược',
    'Quản trị nhân lực', 'Quản trị tài chính',
  ],
  'Kinh doanh quốc tế': [
    'Kinh tế quốc tế', 'Marketing quốc tế', 'Luật thương mại quốc tế',
    'Thanh toán quốc tế', 'Văn hóa kinh doanh quốc tế',
  ],
  'Kế toán': [
    'Nguyên lý kế toán', 'Kế toán tài chính', 'Kế toán quản trị',
    'Kế toán thuế', 'Phân tích báo cáo tài chính',
  ],
  'Kiểm toán': [
    'Nguyên lý kiểm toán', 'Kiểm toán tài chính', 'Kiểm toán nội bộ',
    'Pháp luật kiểm toán', 'Kế toán tài chính',
  ],
  'Tài chính - Ngân hàng': [
    'Tài chính doanh nghiệp', 'Ngân hàng thương mại',
    'Thị trường chứng khoán', 'Quản trị rủi ro', 'Tiền tệ tín dụng',
  ],
  'Marketing': [
    'Marketing căn bản', 'Marketing kỹ thuật số', 'Hành vi người tiêu dùng',
    'Nghiên cứu thị trường', 'Quản trị thương hiệu', 'Marketing nội dung',
  ],
  'Logistics và Quản lý chuỗi cung ứng': [
    'Quản lý chuỗi cung ứng', 'Vận tải quốc tế', 'Quản trị kho hàng',
    'Hải quan và xuất nhập khẩu', 'Khai thác cảng biển',
  ],
  'Thương mại điện tử': [
    'Marketing kỹ thuật số', 'Thương mại điện tử căn bản',
    'Quản trị sàn TMĐT', 'Thanh toán điện tử', 'SEO và quảng cáo trực tuyến',
  ],
  'Kinh tế học': [
    'Kinh tế vi mô', 'Kinh tế vĩ mô', 'Kinh tế lượng',
    'Kinh tế phát triển', 'Chính sách công',
  ],
  // ── Y - Dược ──
  'Y khoa': [
    'Giải phẫu học', 'Sinh lý học', 'Sinh hóa y học',
    'Bệnh học nội khoa', 'Ngoại khoa', 'Dược lý học', 'Miễn dịch học',
  ],
  'Dược học': [
    'Hóa dược', 'Dược lý học', 'Bào chế học',
    'Kiểm nghiệm thuốc', 'Thực vật dược', 'Dược lâm sàng',
  ],
  'Điều dưỡng': [
    'Giải phẫu sinh lý', 'Điều dưỡng cơ bản', 'Chăm sóc nội khoa',
    'Chăm sóc ngoại khoa', 'Dinh dưỡng lâm sàng', 'Y đức',
  ],
  'Y tế công cộng': [
    'Dịch tễ học', 'Sức khỏe môi trường', 'Thống kê y tế',
    'Quản lý y tế', 'Giáo dục sức khỏe',
  ],
  'Dinh dưỡng học': [
    'Dinh dưỡng cơ bản', 'Sinh hóa dinh dưỡng', 'Dinh dưỡng lâm sàng',
    'An toàn vệ sinh thực phẩm', 'Dinh dưỡng cộng đồng',
  ],
  // ── Khoa học tự nhiên ──
  'Toán học': [
    'Giải tích', 'Đại số', 'Hình học vi phân',
    'Xác suất thống kê', 'Toán rời rạc', 'Phương trình vi phân',
  ],
  'Vật lý học': [
    'Cơ học', 'Điện từ học', 'Quang học', 'Nhiệt học',
    'Vật lý hiện đại', 'Cơ học lượng tử',
  ],
  'Hóa học': [
    'Hóa đại cương', 'Hóa hữu cơ', 'Hóa vô cơ',
    'Hóa lý', 'Hóa phân tích', 'Hóa polymer',
  ],
  'Sinh học': [
    'Sinh học tế bào', 'Di truyền học', 'Sinh thái học',
    'Vi sinh vật học', 'Sinh lý học thực vật', 'Hóa sinh học',
  ],
  // ── Khoa học xã hội - Nhân văn ──
  'Luật': [
    'Lý luận nhà nước và pháp luật', 'Luật dân sự', 'Luật hình sự',
    'Luật kinh tế', 'Luật hành chính', 'Luật quốc tế', 'Luật tố tụng',
  ],
  'Tâm lý học': [
    'Tâm lý học đại cương', 'Tâm lý học phát triển', 'Tâm lý học xã hội',
    'Tâm lý học lâm sàng', 'Tham vấn tâm lý', 'Trắc nghiệm tâm lý',
  ],
  'Xã hội học': [
    'Xã hội học đại cương', 'Xã hội học đô thị', 'Phương pháp nghiên cứu xã hội',
    'Công tác xã hội', 'Dân số học',
  ],
  'Lịch sử': [
    'Lịch sử Việt Nam', 'Lịch sử thế giới', 'Khảo cổ học',
    'Lịch sử văn minh', 'Phương pháp nghiên cứu lịch sử',
  ],
  'Văn học': [
    'Văn học Việt Nam', 'Văn học nước ngoài', 'Ngôn ngữ học đại cương',
    'Lý luận văn học', 'Phê bình văn học',
  ],
  // ── Ngôn ngữ ──
  'Ngôn ngữ Anh': [
    'Ngữ pháp tiếng Anh', 'Nghe nói chuyên sâu', 'Đọc viết học thuật',
    'Biên dịch Anh - Việt', 'Phiên dịch', 'Tiếng Anh thương mại',
  ],
  'Ngôn ngữ Trung Quốc': [
    'Tiếng Trung cơ bản', 'Ngữ pháp tiếng Trung', 'Hán tự',
    'Nghe nói tiếng Trung', 'Biên phiên dịch Trung - Việt',
  ],
  'Ngôn ngữ Nhật': [
    'Tiếng Nhật cơ bản', 'Ngữ pháp tiếng Nhật', 'Chữ Kanji',
    'Hội thoại tiếng Nhật', 'Biên dịch Nhật - Việt',
  ],
  'Ngôn ngữ Hàn Quốc': [
    'Tiếng Hàn cơ bản', 'Ngữ pháp tiếng Hàn', 'Hội thoại tiếng Hàn',
    'Văn hóa Hàn Quốc', 'Biên dịch Hàn - Việt',
  ],
  'Ngôn ngữ Pháp': [
    'Tiếng Pháp cơ bản', 'Ngữ pháp tiếng Pháp', 'Nghe nói tiếng Pháp',
    'Biên dịch Pháp - Việt', 'Văn học Pháp ngữ',
  ],
  // ── Giáo dục - Sư phạm ──
  'Sư phạm Toán học': [
    'Giải tích', 'Đại số', 'Hình học', 'Phương pháp dạy Toán',
    'Tâm lý giáo dục', 'Lý luận dạy học',
  ],
  'Sư phạm Tiếng Anh': [
    'Ngữ pháp tiếng Anh', 'Phương pháp dạy tiếng Anh', 'Ngôn ngữ học ứng dụng',
    'Kiểm tra đánh giá', 'Tâm lý giáo dục',
  ],
  'Giáo dục Mầm non': [
    'Tâm lý học trẻ em', 'Phương pháp giáo dục mầm non',
    'Âm nhạc mầm non', 'Mỹ thuật mầm non', 'Dinh dưỡng trẻ em',
  ],
  'Giáo dục Tiểu học': [
    'Tâm lý học lứa tuổi', 'Phương pháp dạy Tiếng Việt',
    'Phương pháp dạy Toán Tiểu học', 'Nghệ thuật Tiểu học',
  ],
  // ── Kiến trúc - Thiết kế ──
  'Kiến trúc': [
    'Nguyên lý thiết kế kiến trúc', 'Lịch sử kiến trúc', 'Kết cấu công trình',
    'Quy hoạch đô thị', 'Mỹ thuật kiến trúc', 'Vật liệu xây dựng',
  ],
  'Thiết kế nội thất': [
    'Nguyên lý thiết kế nội thất', 'Vật liệu nội thất',
    'Kỹ thuật chiếu sáng', '3D Rendering', 'AutoCAD',
  ],
  'Quy hoạch đô thị': [
    'Nguyên lý quy hoạch', 'Hạ tầng kỹ thuật đô thị',
    'Kinh tế đô thị', 'GIS trong quy hoạch',
  ],
  // ── Nghệ thuật - Truyền thông ──
  'Thiết kế đồ họa': [
    'Nguyên lý thiết kế', 'Lý thuyết màu sắc', 'Typography',
    'Thiết kế UI/UX', 'Nhiếp ảnh', 'Adobe Illustrator/Photoshop',
  ],
  'Thiết kế thời trang': [
    'Nguyên lý thiết kế thời trang', 'Cắt may cơ bản',
    'Lịch sử thời trang', 'Vải và chất liệu', 'Phác thảo thời trang',
  ],
  'Báo chí': [
    'Lý thuyết truyền thông', 'Kỹ năng viết báo', 'Báo chí đa phương tiện',
    'Phóng sự điều tra', 'Đạo đức báo chí', 'Nhiếp ảnh báo chí',
  ],
  'Truyền thông đa phương tiện': [
    'Sản xuất video', 'Thiết kế đồ họa', 'Truyền thông xã hội',
    'Quảng cáo sáng tạo', 'Podcast và phát thanh',
  ],
  'Quan hệ công chúng': [
    'Lý thuyết PR', 'Tổ chức sự kiện', 'Quản lý khủng hoảng truyền thông',
    'Viết nội dung PR', 'Quan hệ báo chí',
  ],
  // ── Du lịch - Dịch vụ ──
  'Quản trị Du lịch - Lữ hành': [
    'Tổng quan du lịch', 'Địa lý du lịch', 'Nghiệp vụ hướng dẫn',
    'Marketing du lịch', 'Quản trị tour', 'Luật du lịch',
  ],
  'Quản trị Khách sạn': [
    'Nghiệp vụ lễ tân', 'Quản trị buồng phòng', 'Quản trị ẩm thực',
    'Marketing khách sạn', 'Quản lý nhân sự khách sạn',
  ],
  'Quản trị Nhà hàng - Ẩm thực': [
    'Kỹ thuật chế biến món ăn', 'Ẩm thực Việt Nam', 'Ẩm thực quốc tế',
    'Quản trị nhà hàng', 'Vệ sinh an toàn thực phẩm',
  ],
  // ── Nông - Lâm - Ngư ──
  'Nông học': [
    'Khoa học đất', 'Sinh lý thực vật', 'Bảo vệ thực vật',
    'Kỹ thuật canh tác', 'Nông nghiệp hữu cơ',
  ],
  'Thú y': [
    'Giải phẫu động vật', 'Sinh lý học động vật', 'Bệnh truyền nhiễm thú y',
    'Dược lý thú y', 'Chẩn đoán bệnh động vật',
  ],
  'Nuôi trồng thủy sản': [
    'Ngư loại học', 'Sinh học thủy sinh', 'Dinh dưỡng thủy sản',
    'Kỹ thuật nuôi cá', 'Bệnh học thủy sản',
  ],
  // ── Quản lý - Chính trị ──
  'Quan hệ quốc tế': [
    'Lý thuyết quan hệ quốc tế', 'Chính sách đối ngoại Việt Nam',
    'Tổ chức quốc tế', 'Ngoại giao học', 'Luật quốc tế',
  ],
  'Quản lý nhà nước': [
    'Hành chính công', 'Pháp luật hành chính', 'Quản lý ngân sách nhà nước',
    'Chính sách công', 'Quản trị địa phương',
  ],
};
