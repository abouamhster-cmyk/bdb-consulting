import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yivzprlnhjkyldszmcns.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpdnpwcmxuaGpreWxkc3ptY25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDAyMjgsImV4cCI6MjA5MTQ3NjIyOH0.p7vQMuHSDu7ZH4_mfvD4z9uk73xglwfOHCRJV-9vY50'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Configuration avec persistence et headers
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
    },
  },
})
