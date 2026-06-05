const { createClient } = require('@supabase/supabase-js');

const url = 'https://auiksrjvcxbzemwdgmpb.supabase.co';
const key = 'sb_publishable_Xh9qsneU6YHPLtf4pGxw7A_qLrZ2_07';

console.log('Connecting to:', url);

const supabase = createClient(url, key);

const channel = supabase
  .channel('global-app-listener-test')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'comments' },
    (payload) => {
      console.log('Realtime Event on comments:', payload);
    }
  )
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'posts' },
    (payload) => {
      console.log('Realtime Event on posts:', payload);
    }
  )
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'messages' },
    (payload) => {
      console.log('Realtime Event on messages:', payload);
    }
  )
  .subscribe((status) => {
    console.log('Subscription status:', status);
  });

setInterval(() => {
  console.log('Heartbeat...');
}, 5000);
