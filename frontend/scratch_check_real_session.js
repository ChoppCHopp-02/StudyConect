import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auiksrjvcxbzemwdgmpb.supabase.co';
const supabaseKey = 'sb_publishable_Xh9qsneU6YHPLtf4pGxw7A_qLrZ2_07';

const supabase = createClient(supabaseUrl, supabaseKey);

// Import the getFriends logic directly
async function getFriends(userId) {
  const uid = Number(userId);

  const { data: friendships, error: fetchError } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'accepted')
    .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`);

  console.log('fetchError:', fetchError);
  console.log('friendships length:', friendships?.length);

  if (fetchError || !friendships || friendships.length === 0) return [];

  const friendIds = friendships.map(f => Number(f.from_user_id) === uid ? Number(f.to_user_id) : Number(f.from_user_id));
  console.log('friendIds:', friendIds);

  // Fetch users details
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .in('id', friendIds);

  console.log('usersError:', usersError);
  console.log('users length:', users?.length);
  console.log('users details:', users?.map(u => ({ id: u.id, name: u.full_name })));

  return friendships.map(f => {
    const friendId = Number(f.from_user_id) === uid ? Number(f.to_user_id) : Number(f.from_user_id);
    const friendUser = users.find(u => Number(u.id) === friendId);
    if (!friendUser) return null;

    return {
      requestId: f.id.toString(),
      userId: friendId.toString(),
      fullName: friendUser.full_name,
    };
  }).filter(Boolean);
}

async function main() {
  console.log('Querying user record by email: haivan@gmail.com...');
  const { data: userRec, error: userRecError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'haivan@gmail.com')
    .single();

  if (userRecError) {
    console.error('User record fetch error:', userRecError);
    return;
  }

  console.log('Logged in user record:', userRec.id, userRec.full_name);
  const friends = await getFriends(userRec.id);
  console.log('Final friends list:', friends);
}

main();
