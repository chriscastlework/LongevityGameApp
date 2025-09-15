// Quick environment variable check
const fs = require('fs');
const path = require('path');

// Try to load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL=');
  const hasServiceKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY=');

  console.log('✅ .env.local file found');
  console.log('SUPABASE_URL:', hasSupabaseUrl ? '✅ Set' : '❌ NOT SET');
  console.log('SERVICE_ROLE_KEY:', hasServiceKey ? '✅ Set' : '❌ NOT SET');

  if (!hasSupabaseUrl || !hasServiceKey) {
    console.log('\n📋 Add these to your .env.local file:');
    if (!hasSupabaseUrl) console.log('NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url');
    if (!hasServiceKey) console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    console.log('\n👉 Get these from your Supabase dashboard > Settings > API');
  }
} else {
  console.log('❌ .env.local file not found');
  console.log('👉 Create .env.local with your Supabase credentials');
}

console.log('\n🎯 Next steps:');
console.log('1. Make sure .env.local has the correct Supabase credentials');
console.log('2. Run: scripts/quick-fix-signup-rls.sql in Supabase SQL Editor');
console.log('3. Test signup again');