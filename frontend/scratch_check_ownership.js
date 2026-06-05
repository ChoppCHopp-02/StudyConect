import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auiksrjvcxbzemwdgmpb.supabase.co';
const supabaseKey = 'sb_publishable_Xh9qsneU6YHPLtf4pGxw7A_qLrZ2_07';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, user_id, content');

  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Posts:', posts);
}

main();
