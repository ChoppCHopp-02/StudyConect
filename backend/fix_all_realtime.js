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
  console.log('✅ Kết nối database thành công!\n');

  // Tables that need REPLICA IDENTITY FULL for UPDATE/DELETE events to carry old/new data
  const tables = [
    'posts',
    'friendships',
    'group_members',
    'messages',
    'comments',
    'group_invites',
    'group_join_requests',
    'schedules',
    'deadlines',
    'files',
    'post_reactions',
    'study_groups',
  ];

  // Set REPLICA IDENTITY FULL on all tables
  for (const table of tables) {
    try {
      await client.query(`ALTER TABLE public.${table} REPLICA IDENTITY FULL;`);
      console.log(`✅ REPLICA IDENTITY FULL → ${table}`);
    } catch (err) {
      console.error(`❌ ${table}: ${err.message}`);
    }
  }

  // Ensure all tables are in the supabase_realtime publication
  for (const table of tables) {
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND tablename = '${table}'
          ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.${table};
          END IF;
        END;
        $$;
      `);
      console.log(`✅ Publication OK → ${table}`);
    } catch (err) {
      console.error(`❌ Publication ${table}: ${err.message}`);
    }
  }

  // Also ensure accepted_at column exists in friendships (needed for friend accept notification)
  try {
    await client.query(`
      ALTER TABLE public.friendships 
      ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
    `);
    console.log('\n✅ Column accepted_at on friendships OK');
  } catch (err) {
    console.error(`\n❌ accepted_at column: ${err.message}`);
  }

  // Check group_join_requests also notifies admin members (not just creator)
  // Add group admin lookup support: make sure group_members.role is indexed
  try {
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_group_members_role 
      ON public.group_members(group_id, role);
    `);
    console.log('✅ Index group_members(group_id, role) OK');
  } catch (err) {
    console.error(`❌ Index: ${err.message}`);
  }

  // Verify publication
  const pubRows = await client.query(`
    SELECT tablename FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    ORDER BY tablename;
  `);
  console.log('\n📋 Tất cả bảng trong supabase_realtime:');
  pubRows.rows.forEach(r => console.log(`   - ${r.tablename}`));

  // Verify REPLICA IDENTITY
  const identityRows = await client.query(`
    SELECT relname, relreplident
    FROM pg_class
    WHERE relname = ANY($1)
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ORDER BY relname;
  `, [tables]);

  console.log('\n🔍 REPLICA IDENTITY status:');
  identityRows.rows.forEach(r => {
    const status = r.relreplident === 'f' ? 'FULL ✅' : r.relreplident === 'd' ? 'DEFAULT ⚠️' : `OTHER(${r.relreplident}) ❌`;
    console.log(`   ${r.relname}: ${status}`);
  });

  await client.end();
  console.log('\n✅ Hoàn thành!');
}

main().catch(err => {
  console.error('Lỗi:', err);
  process.exit(1);
});
