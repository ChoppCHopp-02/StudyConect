const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully.');

    // Create RLS update policy for posts
    const query = `
      DROP POLICY IF EXISTS "Allow update posts" ON posts;
      CREATE POLICY "Allow update posts" ON posts FOR UPDATE USING (true);
      
      GRANT ALL PRIVILEGES ON posts TO anon, authenticated;
    `;
    
    const res = await client.query(query);
    console.log('Query executed successfully. Results:', res);
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await client.end();
  }
}

main();
