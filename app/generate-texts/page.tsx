'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface SkeletonPost {
  id: string;
  day: number;
  title: string;
  hook: string;
  cta: string;
  content_type: string;
}

interface GeneratedText {
  id: string;
  skeleton_id: string;
  content: string;
  word_count: number;
  status: string;
}

export default function GenerateTextsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [skeleton, setSkeleton] = useState<SkeletonPost[]>([]);
  const [texts, setTexts] = useState<Record<string, GeneratedText>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    
    // Charger le squelette validé
    const { data: skeletonData } = await supabase
      .from('post_skeleton')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'validated')
      .order('day', { ascending: true });
    
    if (skeletonData) setSkeleton(skeletonData);
    
    // Charger les textes existants
    const { data: textsData } = await supabase
      .from('generated_texts')
      .select('*')
      .eq('user_id', user?.id);
    
    if (textsData) {
      const textsMap: Record<string, GeneratedText> = {};
      textsData.forEach(t => { textsMap[t.skeleton_id] = t; });
      setTexts(textsMap);
    }
    
    setLoading(false);
  };

  const generateText = async (post: SkeletonPost) => {
    setGenerating(prev => ({ ...prev, [post.id]: true }));
    toast.loading(`Génération du texte pour "${post.title}"...`, { id: post.id });
    
    // Récupérer la config entreprise
    const { data: config } = await supabase
      .from('company_config')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    
    const response = await fetch('/api/generate-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        post,
        config
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      setTexts(prev => ({
        ...prev,
        [post.id]: {
          id: result.textId,
          skeleton_id: post.id,
          content: result.content,
          word_count: result.word_count,
          status: 'completed'
        }
      }));
      toast.success(`Texte généré !`, { id: post.id });
    } else {
      toast.error('Erreur: ' + result.error, { id: post.id });
    }
    
    setGenerating(prev => ({ ...prev, [post.id]: false }));
  };

  const updateText = async (skeletonId: string) => {
    const textId = texts[skeletonId]?.id;
    if (!textId) return;
    
    const { error } = await supabase
      .from('generated_texts')
      .update({
        content: editContent,
        word_count: editContent.split(/\s+/).length,
        updated_at: new Date().toISOString()
      })
      .eq('id', textId);
    
    if (error) {
      toast.error('Erreur mise à jour');
    } else {
      setTexts(prev => ({
        ...prev,
        [skeletonId]: {
          ...prev[skeletonId],
          content: editContent,
          word_count: editContent.split(/\s+/).length
        }
      }));
      toast.success('Texte modifié');
    }
    setEditingId(null);
  };

  const regenerateText = async (post: SkeletonPost) => {
    await generateText(post);
  };

  const allGenerated = skeleton.length > 0 && skeleton.every(p => texts[p.id]?.status === 'completed');

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (skeleton.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="card p-12">
          <p className="text-muted-foreground mb-4">Aucun squelette validé trouvé</p>
          <button
            onClick={() => router.push('/skeleton')}
            className="text-primary hover:underline"
          >
            Retour au squelette →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Génération des textes</h1>
        <p className="text-muted-foreground">Produisez le contenu complet de chaque post</p>
      </div>

      {/* Progression */}
      <div className="card p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Progression</span>
          <span className="text-sm font-medium text-primary">
            {Object.keys(texts).length}/{skeleton.length} textes générés
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 mt-2">
          <div
            className="bg-gradient-to-r from-primary to-purple-600 rounded-full h-2 transition-all"
            style={{ width: `${(Object.keys(texts).length / skeleton.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Liste des posts */}
      <div className="space-y-6">
        {skeleton.map((post) => {
          const text = texts[post.id];
          const isGenerating = generating[post.id];
          const isCompleted = text?.status === 'completed';
          
          return (
            <div key={post.id} className="card overflow-hidden">
              {/* En-tête */}
              <div className="bg-secondary px-6 py-4 border-b border-border flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">J{post.day}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">📢 {post.hook}</p>
                  </div>
                </div>
                <div>
                  {isCompleted && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">✓ Texte généré</span>
                  )}
                  {isGenerating && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">⏳ Génération...</span>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="px-6 py-2 bg-primary/5 border-b border-border">
                <p className="text-sm text-primary">🎯 {post.cta}</p>
              </div>

              {/* Texte */}
              <div className="px-6 py-4">
                <label className="text-sm font-medium text-foreground mb-2 block">📝 Contenu du post</label>
                
                {editingId === post.id ? (
                  <div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="input"
                      rows={8}
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => updateText(post.id)}
                        className="btn-primary bg-green-600 hover:bg-green-700"
                      >
                        💾 Sauvegarder
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-secondary"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {isCompleted ? (
                      <>
                        <div className="bg-secondary rounded-xl p-4 whitespace-pre-wrap">
                          <p className="text-secondary-foreground text-sm">{text.content}</p>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              setEditContent(text.content);
                              setEditingId(post.id);
                            }}
                            className="text-sm text-primary hover:text-primary/80"
                          >
                            ✏️ Modifier
                          </button>
                          <button
                            onClick={() => regenerateText(post)}
                            className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            🔄 Regénérer
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => generateText(post)}
                        disabled={isGenerating}
                        className="btn-primary w-full disabled:opacity-50"
                      >
                        {isGenerating ? 'Génération en cours...' : '📝 Générer le texte'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => router.push('/skeleton')}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={() => {
            if (allGenerated) {
              router.push('/generate-images');
            } else {
              toast.error(`Veuillez générer tous les textes (${skeleton.length - Object.keys(texts).length} restants)`);
            }
          }}
          className="btn-primary"
        >
          Générer les images →
        </button>
      </div>
    </div>
  );
}