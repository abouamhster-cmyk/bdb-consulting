'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestPage() {
  useEffect(() => {
    supabase.from('company_config').select('*').then(res => {
      console.log('Supabase test:', res);
    });
  }, []);

  return <div>Test - Regarde la console (F12)</div>;
}
