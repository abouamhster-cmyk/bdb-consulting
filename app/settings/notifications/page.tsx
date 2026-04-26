'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState({
    competitive_alert: true,
    campaign_ready: true,
    weekly_report: true,
    email: ''
  });

  useEffect(() => {
    if (user) {
      loadPrefs();
    }
  }, [user]);

  const loadPrefs = async () => {
    const { data } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    
    if (data) {
      setPrefs({
        competitive_alert: data.competitive_alert,
        campaign_ready: data.campaign_ready,
        weekly_report: data.weekly_report,
        email: data.email || user?.email || ''
      });
    } else {
      setPrefs(prev => ({ ...prev, email: user?.email || '' }));
    }
    setLoading(false);
  };

  const savePrefs = async () => {
    const { error } = await supabase
      .from('email_preferences')
      .upsert({
        user_id: user?.id,
        ...prefs,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Préférences sauvegardées');
    }
  };

  if (loading) return <div className="text-center py-12">Chargement...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">Notifications email</h1>
      <p className="text-muted-foreground mb-8">Recevez des alertes sur votre activité</p>

      <div className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Email de réception</label>
          <input
            type="email"
            value={prefs.email}
            onChange={(e) => setPrefs({...prefs, email: e.target.value})}
            className="input"
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-medium text-foreground">🔍 Veille concurrentielle</span>
              <p className="text-xs text-muted-foreground">Alerté quand de nouveaux insights sont disponibles</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.competitive_alert}
              onChange={(e) => setPrefs({...prefs, competitive_alert: e.target.checked})}
              className="w-5 h-5 accent-primary"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-medium text-foreground">🎯 Campagne prête</span>
              <p className="text-xs text-muted-foreground">Notification quand une campagne est terminée</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.campaign_ready}
              onChange={(e) => setPrefs({...prefs, campaign_ready: e.target.checked})}
              className="w-5 h-5 accent-primary"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="font-medium text-foreground">📊 Rapport hebdomadaire</span>
              <p className="text-xs text-muted-foreground">Résumé des performances chaque semaine</p>
            </div>
            <input
              type="checkbox"
              checked={prefs.weekly_report}
              onChange={(e) => setPrefs({...prefs, weekly_report: e.target.checked})}
              className="w-5 h-5 accent-primary"
            />
          </label>
        </div>

        <button
          onClick={savePrefs}
          className="w-full btn-primary"
        >
          Sauvegarder
        </button>
      </div>
    </div>
  );
}