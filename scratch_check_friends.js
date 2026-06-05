const { Client } = require('pg');

const client = new Client({
  host: 'db.auiksrjvcxbzemwdgmpb.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'vanhai005@@$$',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT sender_id, receiver_id, content, created_at
      FROM messages
      WHERE (sender_id = 2 AND receiver_id IN (18, 21)) OR (sender_id IN (18, 21) AND receiver_id = 2)
      ORDER BY created_at DESC;
    `);
    console.log('--- messages ---');
    console.log(res.rows);
  } catch (err) {
    console.error('Error querying:', err);
  }
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
