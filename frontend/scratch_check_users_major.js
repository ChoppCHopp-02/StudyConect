import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://auiksrjvcxbzemwdgmpb.supabase.co', 'sb_publishable_Xh9qsneU6YHPLtf4pGxw7A_qLrZ2_07');

async function main() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, email, major, university');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Total users in DB: ${users.length}`);
  for (const u of users) {
    console.log(`ID: ${u.id} | Name: "${u.full_name}" | Email: "${u.email}" | Major: "${u.major}" | Uni: "${u.university}"`);
  }
}
main();
