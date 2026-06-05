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
  console.log('Connected to PostgreSQL database!');

  // Query community_spaces
  try {
    const res = await client.query(`
      SELECT * FROM community_spaces;
    `);
    console.log('\n--- Rows of table "community_spaces": ---');
    res.rows.forEach(row => {
      console.log(JSON.stringify(row, null, 2));
    });
  } catch (err) {
    console.error('Error querying community_spaces:', err);
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
