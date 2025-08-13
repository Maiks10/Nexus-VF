import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tqcnvhjdyirvfmmkoglp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxY252aGpkeWlydmZtbWtvZ2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MzAwODMsImV4cCI6MjA3MDEwNjA4M30.6_VGR0tmWmpF8QxVY73fmh7iuddNWQsrWiKXotN1WqQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);