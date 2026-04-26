'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface GenerationParams {
  posts_count: number;
  start_date: string;
  end_date: string;
  objectives: string;
  preferred_days: string[];
  preferred_hours: string[];
  content_types: {
    educatif: number;
    storytelling: number;
    promotionnel: number;
    inspirationnel: number;
  };
}

export default function ParamsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  const [params, setParams] = useState<GenerationParams>({
    posts_count: 30,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    objectives: '',
    preferred_days: ['monday', 'wednesday', 'friday'],
    preferred_hours: ['09:00', '12:00', '17:00'],
    content_types: {
      educatif: 40,
      storytelling: 30,
      promotionnel: 20,
      inspirationnel: 10
    }
  });

  useEffect(() => {
    if (user) {
      checkCompanyConfig();
      loadExistingParams();
    }
  }, [user]);

  const checkCompanyConfig = async () => {
    const { data, error } = await supabase
      .from('company_config')
      .select('status')
      .eq('user_id', user?.id)
      .single();
    
    if (error || !data || data.status !== 'completed') {
      toast.error('Veuillez d\'abord configurer votre entreprise');
      router.push('/setup');
    } else {
      setHasConfig(true);
    }
  };

  const loadExistingParams = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('generation_params')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle(); // Utilise maybeSingle au lieu de single pour éviter l'erreur
    
    if (data && !error) {
      setParams({
        posts_count: data.posts_count,
        start_date: data.start_date,
        end_date: data.end_date,
        objectives: data.objectives || '',
        preferred_days: data.preferred_days || ['monday', 'wednesday', 'friday'],
        preferred_hours: data.preferred_hours || ['09:00', '12:00', '17:00'],
        content_types: data.content_types || {
          educatif: 40,
          storytelling: 30,
          promotionnel: 20,
          inspirationnel: 10
        }
      });
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    
    // Vérifier la validité du total
    const total = Object.values(params.content_types).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      toast.error(`Le total des types de contenu doit être 100% (actuellement ${total}%)`);
      setSaving(false);
      return;
    }
    
    // Vérifier qu'au moins un jour est sélectionné
    if (params.preferred_days.length === 0) {
      toast.error('Veuillez sélectionner au moins un jour de publication');
      setSaving(false);
      return;
    }
    
    // Vérifier qu'au moins un horaire est sélectionné
    if (params.preferred_hours.length === 0) {
      toast.error('Veuillez sélectionner au moins un horaire de publication');
      setSaving(false);
      return;
    }
    
    // Vérifier les dates
    if (params.start_date > params.end_date) {
      toast.error('La date de début doit être antérieure à la date de fin');
      setSaving(false);
      return;
    }
    
    // UPSERT : insère ou met à jour
    const { error } = await supabase
      .from('generation_params')
      .upsert({
        user_id: user?.id,
        posts_count: params.posts_count,
        start_date: params.start_date,
        end_date: params.end_date,
        objectives: params.objectives,
        preferred_days: params.preferred_days,
        preferred_hours: params.preferred_hours,
        content_types: params.content_types,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id' // En cas de conflit sur user_id, on met à jour
      });
    
    setSaving(false);
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Paramètres sauvegardés !');
      router.push('/competitive-intelligence');
    }
  };

  const days = [
    { id: 'monday', label: 'Lundi', icon: '🌙' },
    { id: 'tuesday', label: 'Mardi', icon: '🔥' },
    { id: 'wednesday', label: 'Mercredi', icon: '💧' },
    { id: 'thursday', label: 'Jeudi', icon: '🌳' },
    { id: 'friday', label: 'Vendredi', icon: '⭐' },
    { id: 'saturday', label: 'Samedi', icon: '🎉' },
    { id: 'sunday', label: 'Dimanche', icon: '☀️' }
  ];

  const hours = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ];

  const total = Object.values(params.content_types).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!hasConfig) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Vérification de votre configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Paramètres de génération</h1>
        <p className="text-muted-foreground">Définissez le cadre de votre campagne</p>
      </div>

      <div className="card p-8 space-y-8">
        {/* Nombre de posts */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            📊 Nombre de posts par mois
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="60"
              value={params.posts_count}
              onChange={(e) => setParams({...params, posts_count: parseInt(e.target.value)})}
              className="flex-1 accent-primary"
            />
            <span className="text-2xl font-bold text-primary w-16 text-center">
              {params.posts_count}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Recommandé : 30 posts/mois pour une présence active</p>
        </div>

        {/* Période */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">📅 Date de début</label>
            <input
              type="date"
              value={params.start_date}
              onChange={(e) => setParams({...params, start_date: e.target.value})}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">📅 Date de fin</label>
            <input
              type="date"
              value={params.end_date}
              onChange={(e) => setParams({...params, end_date: e.target.value})}
              className="input"
            />
          </div>
        </div>

        {/* Objectifs */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            🎯 Objectifs de la campagne
          </label>
          <textarea
            value={params.objectives}
            onChange={(e) => setParams({...params, objectives: e.target.value})}
            className="input h-24"
            placeholder="Ex: Augmenter l'engagement de 30%, générer 50 leads, etc."
          />
        </div>

        {/* Jours préférés */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            📆 Jours de publication préférés
          </label>
          <div className="flex flex-wrap gap-2">
            {days.map((day) => (
              <button
                key={day.id}
                onClick={() => {
                  const newDays = params.preferred_days.includes(day.id)
                    ? params.preferred_days.filter(d => d !== day.id)
                    : [...params.preferred_days, day.id];
                  setParams({...params, preferred_days: newDays});
                }}
                className={`px-4 py-2 rounded-lg transition-all ${
                  params.preferred_days.includes(day.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <span className="mr-1">{day.icon}</span>
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Horaires préférés */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            ⏰ Horaires de publication préférés
          </label>
          <div className="flex flex-wrap gap-2">
            {hours.map((hour) => (
              <button
                key={hour}
                onClick={() => {
                  const newHours = params.preferred_hours.includes(hour)
                    ? params.preferred_hours.filter(h => h !== hour)
                    : [...params.preferred_hours, hour];
                  setParams({...params, preferred_hours: newHours});
                }}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  params.preferred_hours.includes(hour)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {hour}
              </button>
            ))}
          </div>
        </div>

        {/* Répartition des types de contenu */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            🎨 Répartition des types de contenu (Total: {total}%)
          </label>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>📚 Éducatif</span>
                <span className="text-muted-foreground">{params.content_types.educatif}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={params.content_types.educatif}
                onChange={(e) => setParams({
                  ...params,
                  content_types: {...params.content_types, educatif: parseInt(e.target.value)}
                })}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>📖 Storytelling</span>
                <span className="text-muted-foreground">{params.content_types.storytelling}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={params.content_types.storytelling}
                onChange={(e) => setParams({
                  ...params,
                  content_types: {...params.content_types, storytelling: parseInt(e.target.value)}
                })}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>🎁 Promotionnel</span>
                <span className="text-muted-foreground">{params.content_types.promotionnel}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={params.content_types.promotionnel}
                onChange={(e) => setParams({
                  ...params,
                  content_types: {...params.content_types, promotionnel: parseInt(e.target.value)}
                })}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>✨ Inspirationnel</span>
                <span className="text-muted-foreground">{params.content_types.inspirationnel}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={params.content_types.inspirationnel}
                onChange={(e) => setParams({
                  ...params,
                  content_types: {...params.content_types, inspirationnel: parseInt(e.target.value)}
                })}
                className="w-full accent-primary"
              />
            </div>
          </div>
          {total !== 100 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              ⚠️ Le total doit être de 100% (actuellement {total}%)
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t border-border">
          <button
            onClick={() => router.push('/setup')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Retour
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || total !== 100}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  );
}