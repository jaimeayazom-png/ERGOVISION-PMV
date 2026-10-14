import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _supabase;
export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
      realtime: { transport: ws },
    });
  }
  return _supabase;
}
