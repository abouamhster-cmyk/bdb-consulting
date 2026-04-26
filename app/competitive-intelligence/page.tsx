'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Source {
  id: string;
  name: string;
  url: string;
  type: string;
  is_active: boolean;
  frequency: string;
}

interface Insight {
  id: string;
  insight: string;
  category: string;
  sentiment: string;
  suggested_actions: string[];
  status: string;
}

export default function CompetitiveIntelligencePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [pendingInsights, setPendingInsights] = useState<Insight[]>([]);
  const [validatedInsights, setValidatedInsights] = useState<Insight[]>([]);
  const [showAddSource, setShowAddSource] = useState(false);
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    type: 'website',
    frequency: 'weekly'
  });

  useEffect(() => {
    if (user) {
      loadSources();
      loadInsights();
    }
  }, [user]);

  const loadSources = async () => {
    const { data } = await supabase
      .from('competitive_sources')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) setSources(data);
  };

  const loadInsights = async () => {
    setLoading(true);
    
    // Insights en attente
    const { data: pending } = await supabase
      .from('competitive_insights')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    // Insights validés
    const { data: validated } = await supabase
      .from('competitive_insights')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'validated')
      .order('created_at', { ascending: false });
    
    setPendingInsights(pending || []);
    setValidatedInsights(validated || []);
    
    setLoading(false);
  };

  const addSource = async () => {
    if (!newSource.name || !newSource.url) {
      toast.error('Nom et URL requis');
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase
      .from('competitive_sources')
      .insert({
        user_id: user?.id,
        ...newSource
      });
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Source ajoutée');
      setShowAddSource(false);
      setNewSource({ name: '', url: '', type: 'website', frequency: 'weekly' });
      loadSources();
    }
    
    setLoading(false);
  };

  const deleteSource = async (id: string) => {
    const { error } = await supabase
      .from('competitive_sources')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Source supprimée');
      loadSources();
    }
  };

  const runScraping = async () => {
    setLoading(true);
    toast.loading('Analyse des concurrents en cours...', { id: 'scraping' });
    
    const response = await fetch('/api/scrape-competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        sources: sources.filter(s => s.is_active !== false)
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      toast.success(`${result.insightsCount} insights découverts`, { id: 'scraping' });
      loadInsights();
    } else {
      toast.error('Erreur: ' + result.error, { id: 'scraping' });
    }
    
    setLoading(false);
  };

  const validateInsights = async () => {
    if (selectedInsights.length === 0) {
      toast.error('Sélectionnez au moins un insight');
      return;
    }
    
    const { error } = await supabase
      .from('competitive_insights')
      .update({ status: 'validated', validated_at: new Date().toISOString() })
      .in('id', selectedInsights);
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success(`${selectedInsights.length} insights validés`);
      setSelectedInsights([]);
      loadInsights();
    }
  };

  const rejectInsight = async (id: string) => {
    const { error } = await supabase
      .from('competitive_insights')
      .update({ status: 'rejected' })
      .eq('id', id);
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Insight rejeté');
      loadInsights();
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'topic': return '📚';
      case 'format': return '🎬';
      case 'tone': return '🎭';
      case 'offer': return '🎁';
      default: return '💡';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch(sentiment) {
      case 'positive': return 'text-green-700 bg-green-100';
      case 'negative': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const allInsights = [...pendingInsights, ...validatedInsights];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Veille concurrentielle</h1>
        <p className="text-gray-500">Surveillez vos concurrents et obtenez des insights pour vos contenus</p>
      </div>

      {/* Sources */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">🔍 Sources à surveiller</h2>
          <button
            onClick={() => setShowAddSource(!showAddSource)}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            + Ajouter une source
          </button>
        </div>

        {showAddSource && (
          <div className="mb-4 p-4 bg-gray-50 rounded-xl">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Nom (ex: Concurrent A)"
                value={newSource.name}
                onChange={(e) => setNewSource({...newSource, name: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="URL"
                value={newSource.url}
                onChange={(e) => setNewSource({...newSource, url: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newSource.type}
                onChange={(e) => setNewSource({...newSource, type: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="website">Site web</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">Twitter/X</option>
                <option value="rss">Flux RSS</option>
              </select>
              <select
                value={newSource.frequency}
                onChange={(e) => setNewSource({...newSource, frequency: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuelle</option>
              </select>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={addSource}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Ajouter
              </button>
              <button
                onClick={() => setShowAddSource(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {sources.length === 0 && (
            <p className="text-gray-400 text-center py-4">Aucune source configurée</p>
          )}
          {sources.map((source) => (
            <div key={source.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{source.name}</span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{source.type}</span>
                  <span className="text-xs text-gray-500">{source.frequency}</span>
                </div>
                <p className="text-sm text-gray-500 truncate max-w-md">{source.url}</p>
              </div>
              <button
                onClick={() => deleteSource(source.id)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {sources.length > 0 && (
          <button
            onClick={runScraping}
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Analyse en cours...' : '🔍 Lancer l\'analyse des concurrents'}
          </button>
        )}
      </div>

      {/* Pending Insights */}
      {pendingInsights.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-amber-600">🕐 Insights à valider</h2>
            <button
              onClick={validateInsights}
              disabled={selectedInsights.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              Valider les insights sélectionnés ({selectedInsights.length})
            </button>
          </div>

          <div className="space-y-3">
            {pendingInsights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedInsights.includes(insight.id)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => {
                  if (selectedInsights.includes(insight.id)) {
                    setSelectedInsights(selectedInsights.filter(id => id !== insight.id));
                  } else {
                    setSelectedInsights([...selectedInsights, insight.id]);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getCategoryIcon(insight.category)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getSentimentColor(insight.sentiment)}`}>
                        {insight.sentiment}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                        {insight.category}
                      </span>
                    </div>
                    <p className="text-gray-700">{insight.insight}</p>
                    {insight.suggested_actions && insight.suggested_actions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-500">Actions suggérées :</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {insight.suggested_actions.map((action, idx) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      rejectInsight(insight.id);
                    }}
                    className="text-gray-400 hover:text-red-500 ml-2 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validated Insights */}
      {validatedInsights.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-green-600 mb-4">✓ Insights validés</h2>
          <div className="space-y-3">
            {validatedInsights.map((insight) => (
              <div key={insight.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{getCategoryIcon(insight.category)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getSentimentColor(insight.sentiment)}`}>
                    {insight.sentiment}
                  </span>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">
                    {insight.category}
                  </span>
                </div>
                <p className="text-gray-700">{insight.insight}</p>
                {insight.suggested_actions && insight.suggested_actions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500">Actions suggérées :</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {insight.suggested_actions.map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No insights */}
      {sources.length > 0 && allInsights.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-4">Aucun insight pour le moment</p>
          <p className="text-sm text-gray-400">Lancez l'analyse pour découvrir des tendances</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => router.push('/params')}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={() => router.push('/skeleton')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Générer le squelette →
        </button>
      </div>
    </div>
  );
}