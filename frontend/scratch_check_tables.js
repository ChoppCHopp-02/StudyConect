import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auiksrjvcxbzemwdgmpb.supabase.co';
const supabaseKey = 'sb_publishable_Xh9qsneU6YHPLtf4pGxw7A_qLrZ2_07';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- Checking post_likes table ---');
  const { data: pl, error: ple } = await supabase.from('post_likes').select('*').limit(5);
  console.log('post_likes:', ple ? ple.message : pl);

  console.log('--- Checking likes table ---');
  const { data: l, error: le } = await supabase.from('likes').select('*').limit(5);
  console.log('likes:', le ? le.message : l);

  console.log('--- Checking reactions table ---');
  const { data: r, error: re } = await supabase.from('reactions').select('*').limit(5);
  console.log('reactions:', re ? re.message : r);
}

main();
