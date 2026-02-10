import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dzlmtvodpyhetvektfuo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NilsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6bG10dm9kcHloZXR2ZWt0ZnVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxNDA5NzAsImV4cCI6MjA1MzcxNjk3MH0.qmnWB4aWdb7U8Iod9Hv8PQAOJO3AG0vYEGnPS--kfAo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
