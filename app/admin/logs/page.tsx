'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user?.id)
      .single();
    
    if (!data) {
      router.push('/dashboard');
    } else {
      setIsAdmin(true);
    }
    setLoading(false);
  };

  if (loading) return <div className="text-center py-12">Chargement...</div>;
  if (!isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Logs système</h1>
      <p className="text-gray-500 mb-8">Historique des actions et erreurs</p>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-gray-500 text-center py-8">Fonctionnalité à venir - Connexion avec un service de logging</p>
      </div>
    </div>
  );
}