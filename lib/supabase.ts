import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmntpdcapdsshskadxhf.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtbnRwZGNhcGRzc2hza2FkeGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTk1MTgsImV4cCI6MjEwMDIzNTUxOH0.hEI3Aq4EsMt2N-ptHxWEVZjz20I5NrzYvm9qKO5EMH4';

console.log('🔍 CLAVE SUPABASE EN USO:', supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);