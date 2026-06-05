import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://auiksrjvcxbzemwdgmpb.supabase.co', 'sb_publishable_Xh9qsneU6YHPLtf4pGxw7A_qLrZ2_07');

async function main() {
  const ids = [3, 17, 20, 23, 18, 21];
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .in('id', ids);

  if (error) {
    console.error(error);
    return;
  }

  for (const u of users) {
    console.log(`User ID: ${u.id}`);
    console.log(`Full Name: "${u.full_name}"`);
    console.log(`Email: "${u.email}"`);
    console.log(`Role: "${u.role}"`);
    console.log(`Avatar length: ${u.avatar ? u.avatar.length : 0}`);
    console.log('---');
  }
}
main();
