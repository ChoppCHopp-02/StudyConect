const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config();

// Read env from frontend
const fs = require('fs');
const path = require('path');

// Read frontend .env
const frontendEnv = {};
try {
  const envFile = fs.readFileSync(path.join(__dirname, '../frontend/.env'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) frontendEnv[k.trim()] = v.join('=').trim();
  });
} catch(e) {
  console.warn('Cannot read frontend .env:', e.message);
}

const SUPABASE_URL = frontendEnv.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = frontendEnv.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// DB client for raw queries
const pg = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await pg.connect();
  console.log('✅ PostgreSQL connected\n');

  // 1. Check post_reactions table data
  console.log('━━━ 1. BẢNG post_reactions ━━━');
  const reacts = await pg.query(`
    SELECT pr.*, u.full_name, p.user_id as post_owner_id
    FROM public.post_reactions pr
    JOIN public.users u ON u.id = pr.user_id
    JOIN public.posts p ON p.id = pr.post_id
    ORDER BY pr.created_at DESC
    LIMIT 10;
  `);
  if (reacts.rows.length === 0) {
    console.log('❌ post_reactions TRỐNG — chưa có dữ liệu nào!');
    console.log('   → Khi user thả icon, dữ liệu KHÔNG được ghi vào bảng này');
  } else {
    console.log(`✅ Có ${reacts.rows.length} reaction(s):`);
    reacts.rows.forEach(r => {
      console.log(`   Post#${r.post_id} | User: ${r.full_name} (${r.user_id}) | Emoji: ${r.emoji} | PostOwner: ${r.post_owner_id} | At: ${r.created_at}`);
    });
  }

  // 2. Check posts.likes JSONB
  console.log('\n━━━ 2. POSTS.LIKES (JSONB) ━━━');
  const postLikes = await pg.query(`
    SELECT id, user_id, likes, likes_count
    FROM public.posts
    WHERE likes IS NOT NULL AND jsonb_array_length(likes) > 0
    ORDER BY created_at DESC
    LIMIT 5;
  `);
  if (postLikes.rows.length === 0) {
    console.log('❌ Không có bài viết nào có likes');
  } else {
    postLikes.rows.forEach(p => {
      console.log(`   Post#${p.id} | Owner: User#${p.user_id} | likes_count: ${p.likes_count} | likes: ${JSON.stringify(p.likes)}`);
    });
  }

  // 3. Check comments
  console.log('\n━━━ 3. BÌNH LUẬN GẦN NHẤT ━━━');
  const comments = await pg.query(`
    SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, 
           u.full_name as commenter, p.user_id as post_owner_id
    FROM public.comments c
    JOIN public.users u ON u.id = c.user_id
    JOIN public.posts p ON p.id = c.post_id
    ORDER BY c.created_at DESC
    LIMIT 5;
  `);
  if (comments.rows.length === 0) {
    console.log('❌ Không có bình luận nào');
  } else {
    comments.rows.forEach(c => {
      console.log(`   Comment#${c.id} | By: ${c.commenter}(${c.user_id}) | PostOwner: User#${c.post_owner_id} | "${c.content}" | ${c.created_at}`);
    });
  }

  // 4. Check messages (last 5)
  console.log('\n━━━ 4. TIN NHẮN GẦN NHẤT ━━━');
  const msgs = await pg.query(`
    SELECT m.id, m.sender_id, m.receiver_id, m.group_id, m.content, m.created_at,
           u.full_name as sender_name
    FROM public.messages m
    JOIN public.users u ON u.id = m.sender_id
    ORDER BY m.created_at DESC
    LIMIT 5;
  `);
  msgs.rows.forEach(m => {
    const target = m.group_id ? `Group#${m.group_id}` : `→User#${m.receiver_id}`;
    console.log(`   Msg#${m.id} | ${m.sender_name}(${m.sender_id}) ${target} | "${m.content?.substring(0,40)}" | ${m.created_at}`);
  });

  // 5. REPLICA IDENTITY check
  console.log('\n━━━ 5. REPLICA IDENTITY STATUS ━━━');
  const ri = await pg.query(`
    SELECT relname, 
      CASE relreplident
        WHEN 'f' THEN 'FULL ✅'
        WHEN 'd' THEN 'DEFAULT ⚠️'
        WHEN 'n' THEN 'NOTHING ❌'
        ELSE relreplident::text
      END as identity
    FROM pg_class
    WHERE relname IN ('posts','comments','messages','post_reactions','friendships','group_members','group_invites','group_join_requests','schedules','deadlines','files')
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ORDER BY relname;
  `);
  ri.rows.forEach(r => console.log(`   ${r.relname}: ${r.identity}`));

  // 6. Publication check
  console.log('\n━━━ 6. SUPABASE REALTIME PUBLICATION ━━━');
  const pub = await pg.query(`
    SELECT tablename FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' ORDER BY tablename;
  `);
  console.log('   Tables:', pub.rows.map(r => r.tablename).join(', '));

  const needed = ['posts','comments','messages','post_reactions','friendships','group_members','group_invites','schedules','deadlines','files','group_join_requests'];
  const inPub = new Set(pub.rows.map(r => r.tablename));
  const missing = needed.filter(t => !inPub.has(t));
  if (missing.length > 0) {
    console.log('   ❌ THIẾU trong publication:', missing.join(', '));
  } else {
    console.log('   ✅ Tất cả bảng cần thiết đều có trong publication');
  }

  // 7. Live realtime test using Supabase JS
  console.log('\n━━━ 7. LIVE REALTIME TEST ━━━');
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('⚠️  Không tìm thấy SUPABASE_URL/KEY — bỏ qua live test');
    await pg.end();
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Đang lắng nghe INSERT trên post_reactions (30 giây)...');
  console.log('👉 Hãy vào web và thả icon vào một bài viết ngay bây giờ!\n');

  let received = false;
  const testChannel = supabase
    .channel('test-reactions')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_reactions' }, (payload) => {
      received = true;
      console.log('🎉 NHẬN ĐƯỢC EVENT từ post_reactions!');
      console.log('   Payload:', JSON.stringify(payload.new, null, 2));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
      console.log('📦 Event posts:', payload.eventType, '| likes:', JSON.stringify(payload.new?.likes));
    })
    .subscribe((status) => {
      console.log('Channel status:', status);
    });

  await new Promise(resolve => setTimeout(resolve, 30000));

  if (!received) {
    console.log('\n❌ Không nhận được event nào trong 30 giây');
    console.log('   → Nguyên nhân có thể: upsert ghi vào DB nhưng không trigger INSERT event');
  }

  testChannel.unsubscribe();
  await pg.end();
  console.log('\nKiểm tra hoàn tất!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
