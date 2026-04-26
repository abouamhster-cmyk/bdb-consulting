'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    strategies: 0,
    calendars: 0,
    contents: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: strategiesCount } = await supabase
        .from('strategies')
        .select('*', { count: 'exact', head: true });
      
      const { count: calendarsCount } = await supabase
        .from('calendars')
        .select('*', { count: 'exact', head: true });
      
      const { count: contentsCount } = await supabase
        .from('generated_content')
        .select('*', { count: 'exact', head: true });
      
      setStats({
        strategies: strategiesCount || 0,
        calendars: calendarsCount || 0,
        contents: contentsCount || 0,
      });
    };
    
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Stratégies', value: stats.strategies, icon: '🎯', gradient: 'from-blue-500 to-blue-600' },
    { label: 'Calendriers', value: stats.calendars, icon: '📅', gradient: 'from-purple-500 to-purple-600' },
    { label: 'Contenus', value: stats.contents, icon: '✨', gradient: 'from-green-500 to-green-600' },
  ];

  const actions = [
    { title: 'Nouvelle stratégie', href: '/strategy', icon: '🎯', description: 'Définissez vos objectifs marketing' },
    { title: 'Générer un calendrier', href: '/calendar', icon: '📅', description: 'Planifiez votre mois' },
    { title: 'Créer du contenu', href: '/contents', icon: '✨', description: 'Produisez avec l\'IA' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero section - garde le blanc car c'est un gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-2xl font-bold mb-2">Bonjour 👋</h1>
        <p className="text-blue-100">Prêt à booster votre marketing avec l'IA ?</p>
        <div className="mt-4 flex gap-2">
          <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-sm text-white">
            {stats.strategies} stratégies
          </span>
          <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-sm text-white">
            {stats.contents} contenus
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {statCards.map((stat, idx) => (
          <div key={idx} className="card p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center text-2xl shadow-lg`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action, idx) => (
            <Link
              key={idx}
              href={action.href}
              className="card p-5 card-hover"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center text-xl">
                  {action.icon}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{action.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}