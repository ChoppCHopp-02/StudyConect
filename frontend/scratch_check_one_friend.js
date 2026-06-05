import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://auiksrjvcxbzemwdgmpb.supabase.co', 'sb_publishable_Xh9qsneU6YHPLtf4pGxw7A_qLrZ2_07');

async function main() {
  const uid = 2;
  const { data: friendships } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'accepted')
    .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`);

  const friendIds = friendships.map(f => Number(f.from_user_id) === uid ? Number(f.to_user_id) : Number(f.from_user_id));
  console.log('friendIds:', friendIds);

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .in('id', friendIds);

  console.log('users count:', users.length);
  console.log('users list:', users.map(u => ({ id: u.id, name: u.full_name })));
}
main();
