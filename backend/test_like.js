const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const SUPABASE_URL = frontendEnv.VITE_SUPABASE_URL;
const SUPABASE_KEY = frontendEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testLike() {
  console.log("Testing insert to post_reactions...");
  const { data, error } = await supabase
    .from('post_reactions')
    .upsert(
      { post_id: 11, user_id: 2, emoji: '🔥' },
      { onConflict: 'post_id,user_id' }
    );
  
  if (error) {
    console.error("Error inserting to post_reactions:", error);
  } else {
    console.log("Success! Data:", data);
  }

  // Verify
  const { data: fetch, error: err2 } = await supabase.from('post_reactions').select('*').eq('post_id', 11);
  console.log("Current reactions for post 11:", fetch);
}

testLike();
