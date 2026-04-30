import { createClient } from '@supabase/supabase-js'

// Valeurs en dur pour le test (à remplacer après)
const supabaseUrl = 'https://yivzprlnhjkyldszmcns.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpdnpwcmxuaGpreWxkc3ptY25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDAyMjgsImV4cCI6MjA5MTQ3NjIyOH0.p7vQMuHSDu7ZH4_mfvD4z9uk73xglwfOHCRJV-9vY50'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey
    }
  }
})
