const { createClient } = require('@supabase/supabase-js');
const url = 'https://qjmiykrtbjaiaaifdjun.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqbWl5a3J0YmphaWFhaWZkanVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDEwNzUsImV4cCI6MjA5NzExNzA3NX0.6AximWPxD86Q0SLQpB4CUv1stPGCoTgNDDeCgFVi9eg';

const supabase = createClient(url, key);

async function test() {
  const r = await fetch(url+'/auth/v1/token?grant_type=password',{
    method:'POST',
    headers:{'apikey':key,'Content-Type':'application/json'},
    body:JSON.stringify({email:'admin@carlocation.dz',password:'Admin@2026!'})
  });
  const d = await r.json();
  const token = d.access_token;

  // 1. Get current car data
  console.log('=== Current car dates ===');
  const carRes = await fetch(url+'/rest/v1/cars?select=id,brand,model,insurance_expiry,oil_change_expiry,vignette_expiry,inspection_expiry&limit=1&order=created_at.desc',{
    headers:{'apikey':key,'Authorization':'Bearer '+token}
  });
  const cars = await carRes.json();
  const car = cars[0];
  console.log('Car:', car.brand, car.model);
  console.log('Insurance:', car.insurance_expiry);
  console.log('Oil:', car.oil_change_expiry);
  console.log('Vignette:', car.vignette_expiry);
  console.log('Inspection:', car.inspection_expiry);

  // 2. Check current notifications
  console.log('\n=== Current notifications ===');
  const notifRes = await fetch(url+'/rest/v1/notifications?select=title,category,metadata,is_read&order=created_at.desc',{
    headers:{'apikey':key,'Authorization':'Bearer '+token}
  });
  const notifs = await notifRes.json();
  console.log('Count:', notifs.length);
  notifs.forEach(n => console.log('  -', n.title, '|', n.category, '| read:', n.is_read));

  // 3. Simulate: change inspection to > 15 days from now
  console.log('\n=== Simulating: change inspection to 2027-01-01 (> 15 days) ===');
  const updateRes = await fetch(url+'/rest/v1/cars?id=eq.'+car.id, {
    method: 'PATCH',
    headers:{'apikey':key,'Authorization':'Bearer '+token,'Content-Type':'application/json'},
    body: JSON.stringify({inspection_expiry: '2027-01-01'})
  });
  console.log('Update status:', updateRes.status);

  // 4. Now run the equivalent of checkExpiryDates
  console.log('\n=== Running check logic ===');
  
  // Get all existing expiry notifications
  const existingRes = await fetch(url+'/rest/v1/notifications?select=id,title,category,metadata&in:category=(insurance_expiry,oil_change_expiry,vignette_expiry,inspection_expiry)&is_read=eq.false',{
    headers:{'apikey':key,'Authorization':'Bearer '+token}
  });
  const existing = await existingRes.json();
  console.log('Existing expiry notifications:', existing.length);
  existing.forEach(n => console.log('  -', n.title, '|', n.category));

  // Check each car's dates against notifications
  const now = new Date();
  const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  
  for (const n of existing) {
    const meta = n.metadata ? JSON.parse(n.metadata) : null;
    const categoryField = {
      'insurance_expiry': 'insurance_expiry',
      'oil_change_expiry': 'oil_change_expiry', 
      'vignette_expiry': 'vignette_expiry',
      'inspection_expiry': 'inspection_expiry'
    }[n.category];
    
    if (meta?.carId && categoryField) {
      const expiry = car[categoryField];
      if (expiry) {
        const expDate = new Date(expiry);
        const isWithin15 = expDate <= in15Days && expDate > now;
        console.log(`  ${n.category}: ${expiry} → ${isWithin15 ? 'KEEP (within 15 days)' : 'DELETE (safe)'}`);
        
        if (!isWithin15) {
          // Delete this notification
          const delRes = await fetch(url+'/rest/v1/notifications?id=eq.'+n.id, {
            method: 'DELETE',
            headers:{'apikey':key,'Authorization':'Bearer '+token}
          });
          console.log('    Deleted:', delRes.status === 204 ? 'YES' : 'NO');
        }
      }
    }
  }

  // 5. Check notifications after
  console.log('\n=== Notifications after update ===');
  const notifRes2 = await fetch(url+'/rest/v1/notifications?select=title,category,is_read&order=created_at.desc&limit=10',{
    headers:{'apikey':key,'Authorization':'Bearer '+token}
  });
  const notifs2 = await notifRes2.json();
  console.log('Count:', notifs2.length);
  notifs2.forEach(n => console.log('  -', n.title, '|', n.category, '| read:', n.is_read));
}

test().catch(console.error);
