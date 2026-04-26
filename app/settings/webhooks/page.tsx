'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function WebhooksPage() {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[]
  });

  const events = [
    { id: 'campaign_completed', label: 'Campagne terminée', icon: '🎉' },
    { id: 'post_published', label: 'Post publié', icon: '📝' },
    { id: 'insight_ready', label: 'Insight disponible', icon: '💡' }
  ];

  useEffect(() => {
    loadWebhooks();
  }, [user]);

  const loadWebhooks = async () => {
    const { data } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', user?.id);
    
    if (data) setWebhooks(data);
  };

  const createWebhook = async () => {
    const { error } = await supabase
      .from('webhooks')
      .insert({
        user_id: user?.id,
        ...newWebhook,
        secret: Math.random().toString(36).substring(2, 15)
      });
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Webhook créé');
      setShowForm(false);
      setNewWebhook({ name: '', url: '', events: [] });
      loadWebhooks();
    }
  };

  const deleteWebhook = async (id: string) => {
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Webhook supprimé');
      loadWebhooks();
    }
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('webhooks')
      .update({ is_active: !isActive })
      .eq('id', id);
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success(isActive ? 'Webhook désactivé' : 'Webhook activé');
      loadWebhooks();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">Webhooks</h1>
      <p className="text-muted-foreground mb-8">Connectez vos outils externes</p>

      <div className="card p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">Mes webhooks</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-primary text-sm hover:underline"
          >
            + Ajouter
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 bg-secondary rounded-xl">
            <input
              type="text"
              placeholder="Nom (ex: Slack, Discord)"
              value={newWebhook.name}
              onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
              className="input mb-3"
            />
            <input
              type="url"
              placeholder="URL du webhook"
              value={newWebhook.url}
              onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
              className="input mb-3"
            />
            <div className="mb-3">
              <p className="text-sm text-foreground mb-2">Événements à écouter</p>
              <div className="space-y-2">
                {events.map((event) => (
                  <label key={event.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newWebhook.events.includes(event.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewWebhook({...newWebhook, events: [...newWebhook.events, event.id]});
                        } else {
                          setNewWebhook({...newWebhook, events: newWebhook.events.filter(e => e !== event.id)});
                        }
                      }}
                      className="accent-primary"
                    />
                    <span className="text-muted-foreground">{event.icon} {event.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={createWebhook} className="btn-primary">Créer</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="flex justify-between items-center p-3 bg-secondary rounded-lg">
              <div>
                <p className="font-medium text-foreground">{webhook.name}</p>
                <p className="text-xs text-muted-foreground truncate max-w-md">{webhook.url}</p>
                <div className="flex gap-1 mt-1">
                  {webhook.events.map((e: string) => (
                    <span key={e} className="text-xs bg-secondary-foreground/10 px-1.5 py-0.5 rounded text-secondary-foreground">
                      {events.find(ev => ev.id === e)?.icon} {e}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleWebhook(webhook.id, webhook.is_active)}
                  className={`text-sm ${webhook.is_active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
                >
                  {webhook.is_active ? '✓ Actif' : '○ Inactif'}
                </button>
                <button onClick={() => deleteWebhook(webhook.id)} className="text-red-500 text-sm">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}