'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function ReportingPage() {
  const [stats, setStats] = useState({
    strategies: 0,
    calendars: 0,
    contents: 0,
  });

  const [engagementData, setEngagementData] = useState([
    { name: 'Lun', value: 45 },
    { name: 'Mar', value: 62 },
    { name: 'Mer', value: 78 },
    { name: 'Jeu', value: 53 },
    { name: 'Ven', value: 89 },
    { name: 'Sam', value: 34 },
    { name: 'Dim', value: 28 },
  ]);

  const [typeData, setTypeData] = useState([
    { name: 'Éducatif', value: 42 },
    { name: 'Storytelling', value: 28 },
    { name: 'Promotionnel', value: 18 },
    { name: 'Inspirationnel', value: 12 },
  ]);

  const [platformData, setPlatformData] = useState([
    { name: 'LinkedIn', value: 45 },
    { name: 'Twitter', value: 25 },
    { name: 'Facebook', value: 18 },
    { name: 'Instagram', value: 12 },
  ]);

  useEffect(() => {
    fetchStats();
  }, []);

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

  const recommendations = [
    { title: 'Augmentez votre fréquence', description: 'Publiez 3-4x par semaine pour un meilleur engagement', impact: '+40%', icon: '📈' },
    { title: 'Testez les vidéos courtes', description: 'Les vidéos de 30-60 secondes génèrent plus d\'interactions', impact: '+35%', icon: '🎬' },
    { title: 'Optimisez vos horaires', description: 'Publiez entre 10h-12h pour maximiser la portée', impact: '+25%', icon: '⏰' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Analyses & Performance</h1>
        <p className="text-muted-foreground">Suivez vos résultats et optimisez votre stratégie</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Stratégies</p>
              <p className="text-3xl font-bold text-foreground">{stats.strategies}</p>
            </div>
            <span className="text-3xl">🎯</span>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Calendriers</p>
              <p className="text-3xl font-bold text-foreground">{stats.calendars}</p>
            </div>
            <span className="text-3xl">📅</span>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Contenus générés</p>
              <p className="text-3xl font-bold text-foreground">{stats.contents}</p>
            </div>
            <span className="text-3xl">✨</span>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Graphique ligne */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">📈 Engagement par jour</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))'
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique camembert */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">🥧 Répartition par type de contenu</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {typeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))'
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Graphique barres */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">📊 Performance par plateforme</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))'
                  }} 
                />
                <Legend />
                <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recommandations */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">🤖 Recommandations IA</h3>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 bg-secondary rounded-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center text-xl">
                  {rec.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-semibold text-foreground">{rec.title}</h4>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                      +{rec.impact}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance preview */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">📊 Aperçu des performances</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Engagement estimé</span>
              <span className="font-medium text-foreground">342 interactions</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-full h-2" style={{ width: '68%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Portée estimée</span>
              <span className="font-medium text-foreground">12.5K vues</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-full h-2" style={{ width: '45%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Taux de conversion</span>
              <span className="font-medium text-foreground">3.2%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-full h-2" style={{ width: '32%' }} />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">Données simulées en mode démo</p>
      </div>
    </div>
  );
}