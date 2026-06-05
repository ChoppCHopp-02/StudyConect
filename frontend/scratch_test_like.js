import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auiksrjvcxbzemwdgmpb.supabase.co';
const supabaseKey = 'sb_publishable_Xh9qsneU6YHPLtf4pGxw7A_qLrZ2_07';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const postId = 8;
  const userId = 2;
  const emoji = '🔥';

  console.log('--- Updating post 8 likes (owned by user 2) ---');
  const { data, error } = await supabase
    .from('posts')
    .update({ 
      likes: [{ userId, emoji }],
      likes_count: 1
    })
    .eq('id', postId)
    .select();

  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('Update result data:', data);
  }
}

main();
