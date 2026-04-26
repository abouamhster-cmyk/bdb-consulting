'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/lib/supabase';   
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const [bufferApiKey, setBufferApiKey] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);

  // Charger les paramètres existants
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('buffer_api_key, buffer_platforms')
      .eq('user_id', user?.id)
      .single();
    
    if (data) {
      setBufferApiKey(data.buffer_api_key || '');
      setSelectedPlatforms(data.buffer_platforms || []);
    }
  };

  const testBufferConnection = async () => {
    if (!bufferApiKey) {
      toast.error('Entrez votre clé API Buffer');
      return;
    }
    
    toast.loading('Test de connexion...', { id: 'buffer-test' });
    
    try {
      const response = await fetch('/api/buffer/profiles', {
        headers: { 'Authorization': `Bearer ${bufferApiKey}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        setProfiles(data.profiles);
        toast.success(`Connecté ! ${data.profiles.length} comptes trouvés`, { id: 'buffer-test' });
      } else {
        toast.error(data.error || 'Clé invalide', { id: 'buffer-test' });
      }
    } catch (error) {
      toast.error('Erreur de connexion', { id: 'buffer-test' });
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user?.id,
        buffer_api_key: bufferApiKey,
        buffer_platforms: selectedPlatforms,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Paramètres sauvegardés');
    }
    
    setIsSaving(false);
  };

  const platforms = [
    { id: 'linkedin', name: 'LinkedIn', icon: '🔗' },
    { id: 'facebook', name: 'Facebook', icon: '📘' },
    { id: 'twitter', name: 'Twitter', icon: '🐦' },
    { id: 'instagram', name: 'Instagram', icon: '📷' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">⚙️ Paramètres</h1>
        <p className="text-muted-foreground">Connectez vos comptes sociaux pour la programmation automatique</p>
      </div>

      {/* Buffer Configuration */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">📤 Buffer</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1">Clé API Buffer</label>
          <input
            type="password"
            value={bufferApiKey}
            onChange={(e) => setBufferApiKey(e.target.value)}
            placeholder="Entrez votre clé API Buffer"
            className="input"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Obtenez votre clé sur <a href="https://buffer.com/developers/apps" target="_blank" className="text-primary hover:underline">buffer.com/developers</a>
          </p>
        </div>

        <button
          onClick={testBufferConnection}
          className="w-full mb-4 bg-secondary text-secondary-foreground py-2 rounded-lg hover:bg-secondary/80 transition-colors"
        >
          🔌 Tester la connexion
        </button>

        {profiles.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">Comptes disponibles</label>
            <div className="space-y-2">
              {profiles.map((profile) => (
                <label key={profile.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(profile.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlatforms([...selectedPlatforms, profile.id]);
                      } else {
                        setSelectedPlatforms(selectedPlatforms.filter(p => p !== profile.id));
                      }
                    }}
                    className="rounded accent-primary"
                  />
                  <span className="text-muted-foreground">{profile.service_icon} {profile.service} - @{profile.username}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="w-full btn-primary disabled:opacity-50"
        >
          {isSaving ? 'Sauvegarde...' : '💾 Sauvegarder les paramètres'}
        </button>
      </div>

      {/* Mode démo info */}
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 p-4">
        <p className="text-sm text-amber-700 dark:text-amber-400">
          ⚡ Mode démo : Sans clé API, la programmation simulera l'envoi. 
          Les posts seront marqués comme "programmés (démo)".
        </p>
      </div>
    </div>
  );
}