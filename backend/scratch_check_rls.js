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
  console.log('Connected to database!');
  
  try {
    const res = await client.query(`
      SELECT 
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
        AND c.relkind = 'r' 
        AND c.relname IN (
          'messages', 'comments', 'posts', 'friendships', 'group_invites', 'schedules', 'deadlines', 'group_members', 'files', 'group_join_requests'
        );
    `);
    console.log('RLS Status of tables:');
    console.table(res.rows);

    const policiesRes = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN (
          'messages', 'comments', 'posts', 'friendships', 'group_invites', 'schedules', 'deadlines', 'group_members', 'files', 'group_join_requests'
        );
    `);
    console.log('Policies on tables:');
    console.table(policiesRes.rows);

  } catch (err) {
    console.error('Error running SQL:', err);
  } finally {
    await client.end();
  }
}

main();
