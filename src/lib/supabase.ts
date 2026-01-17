import { createClient } from '@supabase/supabase-js';

// User's existing Supabase project for data
const supabaseUrl = 'https://cyfriqyupxvfkbfwrjon.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZnJpcXl1cHh2ZmtiZndyam9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzI2MjcsImV4cCI6MjA4MTY0ODYyN30.rpCetOBm-_lmRy4B6LSdXWBXqPGmkPuFHc9taXBUI-A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cloud functions client (for edge functions like payments)
const cloudUrl = import.meta.env.VITE_SUPABASE_URL || supabaseUrl;
const cloudKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || supabaseAnonKey;

export const cloudClient = createClient(cloudUrl, cloudKey);
