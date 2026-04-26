 'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Post {
  id?: string;
  day?: number;
  title?: string;
  hook?: string;
  cta?: string;
  content_type?: string;
  status?: 'pending' | 'generating' | 'generating_image' | 'completed' | 'error';
  content?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  error?: string;
  modified?: boolean;
}

interface CalendarItem {
  day: number;
  title: string;
  hook: string;
  cta: string;
  content_type: string;
}

export default function ContentsPage() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<Post[]>([]);
  const [calendarData, setCalendarData] = useState<CalendarItem[] | null>(null);
  const [contentMode, setContentMode] = useState('text');
  const [lastStrategyId, setLastStrategyId] = useState<string | null>(null);
  
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const fetchLastStrategy = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('strategies')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data[0]) {
      setLastStrategyId(data[0].id);
    }
  };

  const fetchLastCalendar = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('calendars')
      .select('content_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data[0]) {
      setCalendarData(data[0].content_data as CalendarItem[]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLastStrategy();
      fetchLastCalendar();
    }
  }, [user]);

  const generateSinglePost = async (item: CalendarItem, index: number) => {
    if (!item || !user) return;
    
    const updated = [...generatedPosts];
    updated[index] = { 
      ...item, 
      status: 'generating',
      day: item.day || index + 1,
      title: item.title || 'Sans titre',
      hook: item.hook || '',
      cta: item.cta || '',
      content_type: item.content_type || 'éducatif'
    };
    setGeneratedPosts(updated);
    
    try {
      const response = await fetch('/api/generate-full-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarItem: item,
          contentMode: contentMode,
          strategyId: lastStrategyId,
          userId: user.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const newPost = { 
          ...item, 
          day: item.day || index + 1,
          title: item.title || 'Sans titre',
          hook: item.hook || '',
          cta: item.cta || '',
          content_type: item.content_type || 'éducatif',
          content: result.content, 
          imageUrl: result.imageUrl,
          videoUrl: result.videoUrl,
          status: 'completed' as const,
          modified: false
        };
        const newUpdated = [...updated];
        newUpdated[index] = newPost;
        setGeneratedPosts(newUpdated);
      } else {
        const newUpdated = [...updated];
        newUpdated[index] = { 
          ...item, 
          day: item.day || index + 1,
          title: item.title || 'Sans titre',
          error: result.error, 
          status: 'error' as const 
        };
        setGeneratedPosts(newUpdated);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      const newUpdated = [...updated];
      newUpdated[index] = { 
        ...item, 
        day: item.day || index + 1,
        title: item.title || 'Sans titre', 
        error: errorMessage, 
        status: 'error' as const 
      };
      setGeneratedPosts(newUpdated);
    }
  };

  const generateAllContent = async () => {
    if (!calendarData || !calendarData.length) {
      toast.error('Aucun calendrier trouvé');
      return;
    }
    
    setGenerating(true);
    toast.loading('Génération en cours...', { id: 'generation' });
    
    const initial = calendarData.map((item, idx) => ({ 
      ...item, 
      id: `post-${idx}`,
      day: item.day || idx + 1,
      title: item.title || 'Sans titre',
      hook: item.hook || '',
      cta: item.cta || '',
      content_type: item.content_type || 'éducatif',
      status: 'pending' as const,
      content: null,
      imageUrl: null,
      videoUrl: null
    }));
    setGeneratedPosts(initial);
    
    let successCount = 0;
    
    for (let i = 0; i < calendarData.length; i++) {
      if (calendarData[i]) {
        await generateSinglePost(calendarData[i], i);
        successCount++;
        toast.loading(`Génération: ${i + 1}/${calendarData.length}`, { id: 'generation' });
      }
    }
    
    setGenerating(false);
    toast.success(`✅ ${successCount}/${calendarData.length} posts générés avec succès !`, { id: 'generation' });
  };

  const regenerateImage = async (index: number) => {
    const post = generatedPosts[index];
    if (!post || !user) return;
    
    const updated = [...generatedPosts];
    updated[index].status = 'generating_image';
    setGeneratedPosts(updated);
    
    try {
      const response = await fetch('/api/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarItem: {
            title: post.title,
            hook: post.hook,
            content_type: post.content_type
          },
          strategyId: lastStrategyId,
          userId: user.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const newUpdated = [...generatedPosts];
        newUpdated[index].imageUrl = result.imageUrl;
        newUpdated[index].status = 'completed';
        setGeneratedPosts(newUpdated);
      } else {
        const newUpdated = [...generatedPosts];
        newUpdated[index].error = result.error;
        newUpdated[index].status = 'error';
        setGeneratedPosts(newUpdated);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      const newUpdated = [...generatedPosts];
      newUpdated[index].error = errorMessage;
      newUpdated[index].status = 'error';
      setGeneratedPosts(newUpdated);
    }
  };

  const savePostEdit = (index: number) => {
    const updated = [...generatedPosts];
    updated[index].content = editingText;
    updated[index].modified = true;
    setGeneratedPosts(updated);
    setEditingPostId(null);
    toast.success('Texte modifié avec succès');
  };

  const downloadImage = async (imageUrl: string, title: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image téléchargée');
    } catch (err) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const modeOptions = [
    { mode: 'text', label: 'Texte seul', icon: '📝', color: 'blue' },
    { mode: 'image', label: 'Texte + Image', icon: '🖼️', color: 'purple' },
    { mode: 'video', label: 'Texte + Vidéo', icon: '🎬', color: 'pink' },
  ];

  const validPosts = generatedPosts.filter(post => post && typeof post === 'object');

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Veuillez vous connecter pour accéder à cette page</p>
        <a href="/login" className="text-primary hover:underline mt-2 inline-block">Se connecter →</a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Production de contenu</h1>
        <p className="text-muted-foreground mt-1">Générez vos textes, images et vidéos par IA</p>
      </div>

      {/* Type de contenu */}
      <div className="card p-6">
        <label className="block text-sm font-medium text-foreground mb-3">Type de contenu</label>
        <div className="grid grid-cols-3 gap-3">
          {modeOptions.map((option) => (
            <button
              key={option.mode}
              onClick={() => setContentMode(option.mode)}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                contentMode === option.mode
                  ? `bg-${option.color}-600 text-white shadow-md`
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <span className="mr-2">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Génération */}
      {calendarData && calendarData.length > 0 && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground">{calendarData.length} posts à générer</span>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">Mode démo</span>
          </div>
          <button
            onClick={generateAllContent}
            disabled={generating}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Génération en cours...
              </span>
            ) : (
              '✨ Générer tous les contenus'
            )}
          </button>

          {/* Programmation Buffer */}
          {generatedPosts.some(p => p.status === 'completed') && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="font-semibold text-foreground mb-2">📅 Programmation sociale</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Envoyez tous les posts vers Buffer. Programmation selon les jours du calendrier.
              </p>
              <button
                onClick={async () => {
                  const completedPosts = generatedPosts.filter(p => p.status === 'completed');
                  if (completedPosts.length === 0) {
                    toast.error('Aucun post généré à programmer');
                    return;
                  }
                  
                  toast.loading('Programmation en cours...', { id: 'buffer' });
                  
                  const response = await fetch('/api/schedule-buffer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      posts: completedPosts,
                      strategyId: lastStrategyId,
                      userId: user?.id
                    })
                  });
                  
                  const result = await response.json();
                  
                  if (result.success) {
                    toast.success(
                      `✅ ${result.scheduled} posts programmés !`,
                      { id: 'buffer', duration: 5000 }
                    );
                  } else {
                    toast.error('Erreur: ' + result.error, { id: 'buffer' });
                  }
                }}
                className="btn-primary w-full bg-green-600 hover:bg-green-700"
              >
                🚀 Programmer sur Buffer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Liste des posts */}
      {validPosts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Contenus générés</h2>
          
          {validPosts.map((post, idx) => (
            <div key={post.id || idx} className="card overflow-hidden">
              {/* En-tête */}
              <div className="bg-secondary px-6 py-4 border-b border-border flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">J{post?.day || idx + 1}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">{post?.title}</span>
                    <span className="ml-2 text-xs bg-secondary-foreground/10 px-2 py-0.5 rounded-full text-secondary-foreground">
                      {post?.content_type || 'éducatif'}
                    </span>
                  </div>
                </div>
                <div>
                  {post?.status === 'completed' && (
                    <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Généré
                    </span>
                  )}
                  {post?.status === 'generating' && (
                    <span className="inline-flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      En cours
                    </span>
                  )}
                  {post?.modified && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                      Modifié
                    </span>
                  )}
                </div>
              </div>

              {/* Accroche et CTA */}
              <div className="px-6 pt-4 pb-2 border-b border-border">
                <p className="text-sm text-muted-foreground">📢 {post?.hook || ''}</p>
                <p className="text-sm text-primary mt-1">🎯 {post?.cta || ''}</p>
              </div>

              {/* Texte */}
              <div className="px-6 py-4 border-b border-border">
                <label className="text-sm font-medium text-foreground mb-2 block">Texte du post</label>
                {editingPostId === idx ? (
                  <div>
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="input"
                      rows={6}
                    />
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => savePostEdit(idx)} className="btn-primary bg-green-600 hover:bg-green-700">
                        💾 Sauvegarder
                      </button>
                      <button onClick={() => setEditingPostId(null)} className="btn-secondary">
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="bg-secondary rounded-lg p-4 text-secondary-foreground text-sm whitespace-pre-wrap">
                      {post?.content || 'En attente de génération...'}
                    </div>
                    {post?.content && (
                      <button 
                        onClick={() => { setEditingText(post.content || ''); setEditingPostId(idx); }} 
                        className="mt-2 text-sm text-primary hover:text-primary/80"
                      >
                        ✏️ Modifier le texte
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Image */}
              {(contentMode === 'image' || contentMode === 'video') && post?.imageUrl && (
                <div className="px-6 py-4 border-b border-border">
                  <label className="text-sm font-medium text-foreground mb-2 block">Image générée</label>
                  <div className="relative group">
                    <div className="relative w-full h-64 bg-secondary rounded-lg overflow-hidden">
                      <Image
                        src={post.imageUrl}
                        alt={post.title || 'Image générée'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                      <button 
                        onClick={() => post.imageUrl && downloadImage(post.imageUrl, post.title || 'image')}
                        className="bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
                      >
                        📥 Télécharger
                      </button>
                      <button 
                        onClick={() => regenerateImage(idx)}
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/80"
                      >
                        🔄 Regénérer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton génération individuelle */}
              {!post?.content && !post?.error && post?.status !== 'generating' && calendarData && calendarData[idx] && (
                <div className="px-6 py-4 bg-secondary">
                  <button 
                    onClick={() => generateSinglePost(calendarData[idx], idx)}
                    className="btn-primary"
                  >
                    Générer ce post
                  </button>
                </div>
              )}

              {/* Erreur */}
              {post?.error && (
                <div className="px-6 py-4 bg-destructive/10">
                  <p className="text-destructive text-sm">❌ {post.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* État vide */}
      {!calendarData && (
        <div className="card p-12 text-center">
          <p className="text-muted-foreground mb-3">Aucun calendrier trouvé</p>
          <a href="/calendar" className="text-primary hover:underline">
            Générer un calendrier →
          </a>
        </div>
      )}
    </div>
  );
}