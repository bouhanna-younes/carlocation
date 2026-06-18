const { createClient } = require('@supabase/supabase-js');

const url = 'https://qjmiykrtbjaiaaifdjun.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbWl5a3J0YmphaWFhaWZkanVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDEwNzUsImV4cCI6MjA5NzExNzA3NX0.6AximWPxD86Q0SLQpB4CUv1stPGCoTgNDDeCgFVi9eg';

const supabase = createClient(url, key);

async function test() {
  console.log('=== Testing Realtime ===\n');

  // Test 1: Try to subscribe to notifications changes
  console.log('1. Creating Realtime channel...');
  
  let messageReceived = false;
  const channel = supabase
    .channel('test-notifications')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      (payload) => {
        console.log('   ✅ Received change:', JSON.stringify(payload.eventType));
        messageReceived = true;
      }
    )
    .on('system', { event: 'connected' }, () => {
      console.log('   ✅ Connected to Realtime');
    })
    .subscribe((status) => {
      console.log('   Subscribe status:', status);
    });

  // Wait 3 seconds for connection
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 2: Create a test notification to trigger Realtime
  console.log('\n2. Creating test notification...');
  const r = await fetch(url+'/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({email:'admin@carlocation.dz', password:'Admin@2026!'})
  });
  const d = await r.json();
  const token = d.access_token;

  const insertRes = await fetch(url+'/rest/v1/notifications', {
    method: 'POST',
    headers: { 
      'apikey': key, 
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Realtime Test',
      message: 'Test notification',
      type: 'info',
      category: 'general'
    })
  });
  console.log('   Insert status:', insertRes.status);

  // Wait 3 seconds for Realtime to process
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('\n3. Results:');
  console.log('   Message received via Realtime:', messageReceived ? 'YES ✅' : 'NO ❌');

  // Cleanup
  supabase.removeChannel(channel);
  process.exit(0);
}

test().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
