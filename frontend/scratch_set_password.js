import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://auiksrjvcxbzemwdgmpb.supabase.co';
const supabaseKey = 'sb_publishable_Xh9qsneU6YHPLtf4pGxw7A_qLrZ2_07';
const supabase = createClient(supabaseUrl, supabaseKey);

// Hashing function equivalent to client-side crypto digest in Node.js
function hashPasswordNode(password, email) {
  const salt = String(email || '').toLowerCase().trim();
  const shasum = crypto.createHash('sha256');
  shasum.update(password + salt);
  return shasum.digest('hex');
}

async function main() {
  const email = 'thuye@gmail.com';
  const plainPassword = '123456';
  const hashedPassword = hashPasswordNode(plainPassword, email);

  console.log(`Hashed password for ${email}: ${hashedPassword}`);

  const { data, error } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('email', email)
    .select();

  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('Update successful:', data);
  }
}

main();
