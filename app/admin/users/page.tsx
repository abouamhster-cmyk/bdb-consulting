'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
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
      loadUsers();
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('company_config')
      .select('user_id, company_name, created_at')
      .order('created_at', { ascending: false });
    
    if (data) {
      const uniqueUsers = new Map();
      data.forEach(item => {
        if (!uniqueUsers.has(item.user_id)) {
          uniqueUsers.set(item.user_id, item);
        }
      });
      setUsers(Array.from(uniqueUsers.values()));
    }
  };

  if (loading) return <div className="text-center py-12">Chargement...</div>;
  if (!isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Utilisateurs</h1>
      <p className="text-gray-500 mb-8">Gestion des comptes</p>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entreprise</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((userItem) => (
              <tr key={userItem.user_id}>
                <td className="px-6 py-4 text-sm text-gray-500">{userItem.user_id?.substring(0, 8)}...</td>
                <td className="px-6 py-4 text-sm text-gray-900">{userItem.company_name || 'Non renseigné'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(userItem.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}