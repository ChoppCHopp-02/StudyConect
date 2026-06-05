const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('✅ Kết nối database thành công!');

  const steps = [
    // 1. Bật REPLICA IDENTITY FULL cho posts để Supabase Realtime gửi đủ dữ liệu JSONB
    {
      name: 'ALTER TABLE posts REPLICA IDENTITY FULL',
      sql: `ALTER TABLE public.posts REPLICA IDENTITY FULL;`
    },
    // 2. Thêm posts vào publication supabase_realtime (nếu chưa có)
    {
      name: 'Add posts to supabase_realtime publication',
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND tablename = 'posts'
          ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
          END IF;
        END;
        $$;
      `
    },
    // 3. Tạo bảng post_reactions để lắng nghe INSERT thay vì UPDATE trên JSONB
    {
      name: 'Create post_reactions table',
      sql: `
        CREATE TABLE IF NOT EXISTS public.post_reactions (
          id          BIGSERIAL PRIMARY KEY,
          post_id     BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
          user_id     BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          emoji       TEXT NOT NULL DEFAULT '❤️',
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (post_id, user_id)
        );
      `
    },
    // 4. Bật RLS cho post_reactions
    {
      name: 'Enable RLS on post_reactions',
      sql: `ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;`
    },
    // 5. Policy: mọi người đăng nhập đều có thể đọc
    {
      name: 'Policy: SELECT post_reactions',
      sql: `
        DROP POLICY IF EXISTS "Allow select post_reactions" ON public.post_reactions;
        CREATE POLICY "Allow select post_reactions"
          ON public.post_reactions FOR SELECT
          USING (true);
      `
    },
    // 6. Policy: chỉ người dùng đó mới có thể insert/update/delete reaction của mình
    {
      name: 'Policy: INSERT/UPDATE/DELETE own post_reactions',
      sql: `
        DROP POLICY IF EXISTS "Allow manage own reactions" ON public.post_reactions;
        CREATE POLICY "Allow manage own reactions"
          ON public.post_reactions FOR ALL
          USING (true)
          WITH CHECK (true);
      `
    },
    // 7. GRANT quyền cho anon và authenticated
    {
      name: 'GRANT privileges on post_reactions',
      sql: `
        GRANT ALL ON public.post_reactions TO anon, authenticated;
        GRANT USAGE, SELECT ON SEQUENCE public.post_reactions_id_seq TO anon, authenticated;
      `
    },
    // 8. Thêm post_reactions vào supabase_realtime
    {
      name: 'Add post_reactions to supabase_realtime publication',
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND tablename = 'post_reactions'
          ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;
          END IF;
        END;
        $$;
      `
    }
  ];

  for (const step of steps) {
    try {
      await client.query(step.sql);
      console.log(`✅ ${step.name}`);
    } catch (err) {
      console.error(`❌ ${step.name}: ${err.message}`);
    }
  }

  // Verify
  const { rows } = await client.query(`
    SELECT relreplident 
    FROM pg_class 
    WHERE relname = 'posts' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  `);
  const identity = rows[0]?.relreplident;
  // 'f' = FULL, 'd' = DEFAULT, 'n' = NOTHING
  console.log(`\n🔍 REPLICA IDENTITY cho bảng posts: ${identity === 'f' ? 'FULL ✅' : identity === 'd' ? 'DEFAULT (chưa full)' : identity}`);

  const pubRows = await client.query(`
    SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;
  `);
  console.log('📋 Các bảng trong supabase_realtime:', pubRows.rows.map(r => r.tablename).join(', '));

  await client.end();
}

main().catch(err => {
  console.error('Lỗi:', err);
  process.exit(1);
});
