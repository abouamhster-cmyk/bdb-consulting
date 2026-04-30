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
      // 🔥 CHANGEMENT 1 : Utiliser maybeSingle() au lieu de single()
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user?.id)
        .maybeSingle();  // ← ICI le changement principal
      
      // 🔥 CHANGEMENT 2 : Vérifier error ET l'absence de data
      if (error) {
        console.error('Erreur vérification admin:', error);
        logger.error({ error, userId: user?.id }, 'Erreur vérification admin');
        router.push('/dashboard');
        return;
      }
      
      if (!data) {
        logger.warn({ userId: user?.id }, 'Accès admin refusé - utilisateur non admin');
        router.push('/dashboard');
        return;
      }
      
      console.log('Admin vérifié:', data);
      setIsAdmin(true);
      loadAdminData();
    } catch (err) {
      console.error('Exception checkAdminStatus:', err);
      logger.error({ error: err, userId: user?.id }, 'Exception vérification admin');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      // Compter les utilisateurs uniques dans company_config
      const { data: usersData, error: usersError } = await supabase
        .from('company_config')
        .select('user_id', { count: 'exact' });
      
      if (usersError) {
        console.error('Erreur chargement users:', usersError);
      }
      
      // Compter les configurations
      const { count: strategiesCount, error: strategiesError } = await supabase
        .from('company_config')
        .select('*', { count: 'exact', head: true });
      
      if (strategiesError) {
        console.error('Erreur chargement strategies:', strategiesError);
      }
      
      // Compter les posts
      const { count: postsCount, error: postsError } = await supabase
        .from('post_skeleton')
        .select('*', { count: 'exact', head: true });
      
      if (postsError) {
        console.error('Erreur chargement posts:', postsError);
      }
      
      // Compter les images
      const { count: imagesCount, error: imagesError } = await supabase
        .from('generated_images')
        .select('*', { count: 'exact', head: true });
      
      if (imagesError) {
        console.error('Erreur chargement images:', imagesError);
      }
      
      // Compter les vidéos
      const { count: videosCount, error: videosError } = await supabase
        .from('generated_videos')
        .select('*', { count: 'exact', head: true });
      
      if (videosError) {
        console.error('Erreur chargement videos:', videosError);
      }
      
      // Extraire les user_id uniques pour le comptage
      const uniqueUsers = usersData ? new Set(usersData.map(item => item.user_id)).size : 0;
      
      setStats({
        totalUsers: uniqueUsers,
        totalStrategies: strategiesCount || 0,
        totalPosts: postsCount || 0,
        totalImages: imagesCount || 0,
        totalVideos: videosCount || 0,
        apiCalls: 1247
      });
    } catch (err) {
      console.error('Exception loadAdminData:', err);
    }
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
