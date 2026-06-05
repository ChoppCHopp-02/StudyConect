import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://auiksrjvcxbzemwdgmpb.supabase.co', 'sb_publishable_Xh9qsneU6YHPLtf4pGxw7A_qLrZ2_07');

async function main() {
  // Update Thúy E (id: 25) major to "Công nghệ thông tin"
  const { data, error } = await supabase
    .from('users')
    .update({
      major: 'Công nghệ thông tin',
      university: 'Đại học Ngoại ngữ - Tin học TP.HCM (HUFLIT)',
    })
    .eq('id', 25)
    .select('id, full_name, major, university');

  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('Updated successfully:');
    console.log(data);
  }

  // Now verify the ilike query works for matching
  console.log('\nVerifying match query for "Công nghệ thông tin":');
  const { data: matched, error: matchErr } = await supabase
    .from('users')
    .select('id, full_name, major, university')
    .ilike('major', '%Công nghệ thông tin%')
    .not('id', 'in', '(25)');

  if (matchErr) {
    console.error('Match query error:', matchErr);
  } else {
    console.log(`Found ${matched.length} match candidates:`);
    matched.forEach(u => console.log(`  ID: ${u.id} | ${u.full_name} | ${u.major}`));
  }
}
main();
