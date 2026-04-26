'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface PostSkeleton {
  id: string;
  day: number;
  title: string;
  hook: string;
  cta: string;
  content_type: string;
  status: string;
}

export default function SkeletonPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [skeleton, setSkeleton] = useState<PostSkeleton[]>([]);
  const [validatedIds, setValidatedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState({ title: '', hook: '', cta: '', content_type: '' });
  const [hasConfig, setHasConfig] = useState(false);
  const [hasParams, setHasParams] = useState(false);
  const [hasInsights, setHasInsights] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  // Vérifier les prérequis
  useEffect(() => {
    if (user) {
      checkPrerequisites();
      loadExistingSkeleton();
      loadStrategies();
    }
  }, [user]);

  const checkPrerequisites = async () => {
    // Vérifier config entreprise
    const { data: config } = await supabase
      .from('company_config')
      .select('status')
      .eq('user_id', user?.id)
      .single();
    setHasConfig(config?.status === 'completed');

    // Vérifier paramètres
    const { data: params } = await supabase
      .from('generation_params')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    setHasParams(!!params);

    // Vérifier insights validés
    const { data: insights } = await supabase
      .from('competitive_insights')
      .select('id')
      .eq('user_id', user?.id)
      .eq('status', 'validated')
      .limit(1);
    setHasInsights((insights?.length || 0) > 0);

    if (!config || config.status !== 'completed') {
      toast.error('Configuration entreprise manquante');
      router.push('/setup');
    } else if (!params) {
      toast.error('Paramètres de génération manquants');
      router.push('/params');
    }
  };

  const loadStrategies = async () => {
    const { data } = await supabase
      .from('company_config')
      .select('id, brand_positioning')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      setSelectedStrategyId(data[0].id);
    }
  };

  const loadExistingSkeleton = async () => {
    const { data } = await supabase
      .from('post_skeleton')
      .select('*')
      .eq('user_id', user?.id)
      .order('day', { ascending: true });
    
    if (data && data.length > 0) {
      setSkeleton(data);
      const validated = data.filter(p => p.status === 'validated').map(p => p.id);
      setValidatedIds(validated);
    }
  };

  const generateSkeleton = async () => {
    if (!selectedStrategyId) {
      toast.error('Aucune stratégie disponible');
      return;
    }
    
    setGenerating(true);
    toast.loading('Génération du squelette en cours...', { id: 'generate' });
    
    // Récupérer les données nécessaires
    const { data: config } = await supabase
      .from('company_config')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    
    const { data: params } = await supabase
      .from('generation_params')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    
    const { data: insights } = await supabase
      .from('competitive_insights')
      .select('insight, category')
      .eq('user_id', user?.id)
      .eq('status', 'validated');
    
    const response = await fetch('/api/generate-skeleton', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategyId: selectedStrategyId,
        userId: user?.id,
        config,
        params,
        insights: insights || []
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      setSkeleton(result.skeleton || result.calendar);
      toast.success(`${(result.skeleton || result.calendar).length} posts générés`, { id: 'generate' });
    } else {
      toast.error('Erreur: ' + result.error, { id: 'generate' });
    }
    
    setGenerating(false);
  };

  const updatePost = async (id: string, field: string, value: string) => {
    const { error } = await supabase
      .from('post_skeleton')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      toast.error('Erreur mise à jour');
    } else {
      setSkeleton(skeleton.map(p => p.id === id ? { ...p, [field]: value } : p));
      toast.success('Post modifié');
    }
    setEditingId(null);
  };

  const validatePost = async (id: string) => {
    const { error } = await supabase
      .from('post_skeleton')
      .update({ status: 'validated', updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      toast.error('Erreur validation');
    } else {
      setSkeleton(skeleton.map(p => p.id === id ? { ...p, status: 'validated' } : p));
      setValidatedIds([...validatedIds, id]);
      toast.success('Post validé');
    }
  };

  const validateAll = async () => {
    const unvalidatedIds = skeleton.filter(p => p.status !== 'validated').map(p => p.id);
    if (unvalidatedIds.length === 0) {
      toast.error('Tous les posts sont déjà validés');
      return;
    }
    
    const { error } = await supabase
      .from('post_skeleton')
      .update({ status: 'validated', updated_at: new Date().toISOString() })
      .in('id', unvalidatedIds);
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      setSkeleton(skeleton.map(p => 
        unvalidatedIds.includes(p.id) ? { ...p, status: 'validated' } : p
      ));
      setValidatedIds([...validatedIds, ...unvalidatedIds]);
      toast.success(`${unvalidatedIds.length} posts validés`);
    }
  };

  const getContentTypeColor = (type: string) => {
    switch(type) {
      case 'éducatif': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'storytelling': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      case 'promotionnel': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'inspirationnel': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  if (!hasConfig || !hasParams) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Vérification de votre configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Génération du squelette</h1>
        <p className="text-muted-foreground">Créez la structure de vos posts (titres, accroches, CTA)</p>
      </div>

      {/* Bouton génération */}
      {skeleton.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-muted-foreground mb-4">
            {!hasInsights ? (
              '📡 Veuillez d\'abord valider des insights dans la veille concurrentielle'
            ) : (
              '🎯 Prêt à générer votre planning éditorial'
            )}
          </p>
          {hasInsights && (
            <button
              onClick={generateSkeleton}
              disabled={generating}
              className="btn-primary px-8 py-3"
            >
              {generating ? 'Génération...' : '✨ Générer le squelette'}
            </button>
          )}
          {!hasInsights && (
            <button
              onClick={() => router.push('/competitive-intelligence')}
              className="text-primary hover:underline"
            >
              Aller à la veille concurrentielle →
            </button>
          )}
        </div>
      )}

      {/* Liste des posts */}
      {skeleton.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              📋 Vos posts ({skeleton.filter(p => p.status === 'validated').length}/{skeleton.length} validés)
            </h2>
            <button
              onClick={validateAll}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              ✓ Tout valider
            </button>
          </div>

          <div className="space-y-4">
            {skeleton.map((post, idx) => (
              <div
                key={post.id}
                className={`card p-5 transition-all ${
                  post.status === 'validated'
                    ? 'border-green-500 dark:border-green-700 bg-green-50/30 dark:bg-green-950/20'
                    : ''
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      Jour {post.day}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getContentTypeColor(post.content_type)}`}>
                      {post.content_type}
                    </span>
                    {post.status === 'validated' && (
                      <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">✓ Validé</span>
                    )}
                  </div>
                </div>

                {/* Titre */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-muted-foreground">TITRE</label>
                  {editingId === post.id && editValue.title !== undefined ? (
                    <input
                      type="text"
                      value={editValue.title}
                      onChange={(e) => setEditValue({...editValue, title: e.target.value})}
                      className="input mt-1"
                      autoFocus
                    />
                  ) : (
                    <p className="font-semibold text-foreground cursor-pointer hover:text-primary" onClick={() => {
                      setEditValue({ title: post.title, hook: post.hook, cta: post.cta, content_type: post.content_type });
                      setEditingId(post.id);
                    }}>
                      {post.title}
                    </p>
                  )}
                </div>

                {/* Accroche */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-muted-foreground">ACCROCHE</label>
                  {editingId === post.id && editValue.hook !== undefined ? (
                    <input
                      type="text"
                      value={editValue.hook}
                      onChange={(e) => setEditValue({...editValue, hook: e.target.value})}
                      className="input mt-1"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground cursor-pointer hover:text-primary" onClick={() => {
                      setEditValue({ title: post.title, hook: post.hook, cta: post.cta, content_type: post.content_type });
                      setEditingId(post.id);
                    }}>
                      📢 {post.hook}
                    </p>
                  )}
                </div>

                {/* CTA */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-muted-foreground">CALL TO ACTION</label>
                  {editingId === post.id && editValue.cta !== undefined ? (
                    <input
                      type="text"
                      value={editValue.cta}
                      onChange={(e) => setEditValue({...editValue, cta: e.target.value})}
                      className="input mt-1"
                    />
                  ) : (
                    <p className="text-sm text-primary cursor-pointer hover:text-primary/80" onClick={() => {
                      setEditValue({ title: post.title, hook: post.hook, cta: post.cta, content_type: post.content_type });
                      setEditingId(post.id);
                    }}>
                      🎯 {post.cta}
                    </p>
                  )}
                </div>

                {/* Type de contenu */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted-foreground">TYPE</label>
                  {editingId === post.id && editValue.content_type !== undefined ? (
                    <select
                      value={editValue.content_type}
                      onChange={(e) => setEditValue({...editValue, content_type: e.target.value})}
                      className="input mt-1"
                    >
                      <option value="éducatif">📚 Éducatif</option>
                      <option value="storytelling">📖 Storytelling</option>
                      <option value="promotionnel">🎁 Promotionnel</option>
                      <option value="inspirationnel">✨ Inspirationnel</option>
                    </select>
                  ) : (
                    <p className="text-sm text-muted-foreground">{post.content_type}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {editingId === post.id ? (
                    <>
                      <button
                        onClick={() => updatePost(post.id, 'title', editValue.title)}
                        className="btn-primary bg-green-600 hover:bg-green-700 text-sm"
                      >
                        💾 Sauvegarder
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-secondary text-sm"
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      {post.status !== 'validated' && (
                        <button
                          onClick={() => validatePost(post.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                        >
                          ✓ Valider
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => router.push('/competitive-intelligence')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Retour
            </button>
            <button
              onClick={() => {
                if (validatedIds.length === skeleton.length) {
                  router.push('/generate-texts');
                } else {
                  toast.error(`Veuillez valider tous les posts (${skeleton.length - validatedIds.length} restants)`);
                }
              }}
              className="btn-primary"
            >
              Générer les textes →
            </button>
          </div>
        </>
      )}
    </div>
  );
}