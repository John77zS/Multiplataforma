const SUPABASE_URL = "https://biyfgdxyvugxytgbodng.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpeWZnZHh5dnVneHl0Z2JvZG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMDU3NDIsImV4cCI6MjA5ODU4MTc0Mn0.ayuJmR0etPFGA6vKd0MFBRfr9n3SY8VWu7L2lOHIrI4";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);