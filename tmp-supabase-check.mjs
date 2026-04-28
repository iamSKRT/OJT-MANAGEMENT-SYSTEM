import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envContent = fs.readFileSync('./.env', 'utf8');
const env = Object.fromEntries(envContent.split(/\r?\n/).filter(Boolean).map(line => {
  const [key, ...rest] = line.split('=');
  const value = rest.join('=');
  return [key, value.replace(/^"|"$/g, '')];
}));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const profilesRes = await supabase.from('profiles').select('user_id,full_name,is_archived');
const rolesRes = await supabase.from('user_roles').select('user_id,role');
console.log(JSON.stringify({ profilesRes, rolesRes }, null, 2));
