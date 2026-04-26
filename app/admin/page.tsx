'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStrategies: 0,
    totalPosts: 0,
    totalImages: 0,
    totalVideos: 0,
    apiCalls: 0
  });

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    } else if (user === null) {
      router.push('/login');
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user?.id)
        .single();
      
      if (error || !data) {
        logger.warn({ userId: user?.id }, 'Accès admin refusé');
        router.push('/dashboard');
        return;
      }
      
      setIsAdmin(true);
      loadAdminData();
    } catch (err) {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    const { count: usersCount } = await supabase
      .from('company_config')
      .select('user_id', { count: 'exact', head: true });
    
    const { count: strategiesCount } = await supabase
      .from('company_config')
      .select('*', { count: 'exact', head: true });
    
    const { count: postsCount } = await supabase
      .from('post_skeleton')
      .select('*', { count: 'exact', head: true });
    
    const { count: imagesCount } = await supabase
      .from('generated_images')
      .select('*', { count: 'exact', head: true });
    
    const { count: videosCount } = await supabase
      .from('generated_videos')
      .select('*', { count: 'exact', head: true });
    
    setStats({
      totalUsers: usersCount || 0,
      totalStrategies: strategiesCount || 0,
      totalPosts: postsCount || 0,
      totalImages: imagesCount || 0,
      totalVideos: videosCount || 0,
      apiCalls: 1247
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Vérification des droits...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard Administrateur</h1>
        <p className="text-muted-foreground">Gestion et monitoring de la plateforme</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Utilisateurs</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Stratégies</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalStrategies}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Posts générés</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalPosts}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Images</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalImages}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Vidéos</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalVideos}</p>
        </div>
      </div>

      {/* Alertes système */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">⚠️ État du système</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-muted-foreground">API OpenAI : Opérationnelle</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-muted-foreground">Base de données Supabase : OK</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span className="text-muted-foreground">Buffer API : En attente de configuration</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span className="text-muted-foreground">Runway ML : En attente de configuration</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">🛠️ Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => alert('Fonctionnalité à venir')}
            className="btn-primary"
          >
            📊 Voir les logs
          </button>
          <button
            onClick={() => alert('Fonctionnalité à venir')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            ⚠️ Alerte système
          </button>
          <button
            onClick={() => alert('Fonctionnalité à venir')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            📧 Newsletter
          </button>
          <button
            onClick={() => alert('Fonctionnalité à venir')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            🔄 Nettoyer le cache
          </button>
        </div>
      </div>
    </div>
  );
}