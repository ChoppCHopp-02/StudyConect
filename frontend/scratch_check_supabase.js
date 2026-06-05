import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auiksrjvcxbzemwdgmpb.supabase.co';
const supabaseKey = 'sb_publishable_Xh9qsneU6YHPLtf4pGxw7A_qLrZ2_07';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const userId = '2';
  const uid = parseInt(userId, 10);

  // 1. Fetch friendships
  const { data: friendships, error: fetchError } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'accepted')
    .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`);

  console.log('--- friendships ---', fetchError, friendships);

  if (friendships && friendships.length > 0) {
    const friendIds = friendships.map(f => f.from_user_id === uid ? f.to_user_id : f.from_user_id);
    console.log('friendIds mapped: ', friendIds);

    const friendIds2 = friendships.map(f => Number(f.from_user_id) === uid ? Number(f.to_user_id) : Number(f.from_user_id));
    console.log('friendIds2 mapped: ', friendIds2);

    // Fetch users details
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('id', friendIds);
    console.log('--- users (friendIds) ---', usersError, users?.map(u => ({ id: u.id, name: u.full_name })));

    const { data: users2, error: usersError2 } = await supabase
      .from('users')
      .select('*')
      .in('id', friendIds2);
    console.log('--- users2 (friendIds2) ---', usersError2, users2?.map(u => ({ id: u.id, name: u.full_name })));
  }
}

main();
