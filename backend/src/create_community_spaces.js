// backend/src/create_community_spaces.js
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});

const run = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('KHÔNG chạy migration script trên production!');
    process.exit(1);
  }
  console.log('Bạn có chắc muốn DROP và tạo lại bảng? (ctrl+C để hủy)');
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL database.');

    // 1. Drop old table if exists to alter columns cleanly
    await client.query('DROP TABLE IF EXISTS community_spaces CASCADE');
    console.log('✅ Dropped old "community_spaces" table.');

    // 2. Create table with province, district, ward
    const createTableQuery = `
      CREATE TABLE community_spaces (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        province VARCHAR(100) DEFAULT 'Hà Nội',
        district VARCHAR(100) DEFAULT 'Đống Đa',
        ward VARCHAR(100) DEFAULT 'Láng Thượng',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createTableQuery);
    console.log('✅ Table "community_spaces" created with location levels.');

    // 3. Seed initial spaces with clean location data
    console.log('🌱 Seeding initial community spaces...');
    const seedQuery = `
      INSERT INTO community_spaces (name, address, province, district, ward, description)
      VALUES 
      ('Cộng Cà Phê - Chùa Láng', '101 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội', 'Hà Nội', 'Đống Đa', 'Láng Thượng', 'Không gian hoài cổ, bàn học rộng rãi, ánh sáng vàng ấm cực kì dễ tập trung khi làm tiểu luận.'),
      ('Thư viện Tạ Quang Bửu - ĐHBK Hà Nội', 'Số 1 Đại Cồ Việt, Bách Khoa, Hai Bà Trưng, Hà Nội', 'Hà Nội', 'Hai Bà Trưng', 'Bách Khoa', 'Thiên đường ôn thi học kỳ, rộng mênh mông, máy lạnh mát rượi và hoàn toàn miễn phí.'),
      ('Highlands Coffee - Trần Duy Hưng', 'Số 10 Trần Duy Hưng, Trung Hòa, Cầu Giấy, Hà Nội', 'Hà Nội', 'Cầu Giấy', 'Trung Hòa', 'Không gian mở cực lớn, thích hợp thảo luận nhóm sôi nổi mà không sợ ảnh hưởng đến người xung quanh.'),
      ('The Coffee House - Cao Thắng', '180 Cao Thắng, Phường 3, Quận 3, TP. Hồ Chí Minh', 'TP. Hồ Chí Minh', 'Quận 3', 'Phường 3', 'Khu vực tầng 2 thiết kế như co-working space, bàn ghế êm ái, wifi siêu tốc tha hồ chạy deadline.');
    `;
    await client.query(seedQuery);
    console.log('✅ Seeded community spaces successfully.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
};

run();
