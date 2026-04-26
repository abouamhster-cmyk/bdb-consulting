'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface SkeletonPost {
  id: string;
  day: number;
  title: string;
  content_type: string;
}

interface GeneratedText {
  id: string;
  skeleton_id: string;
  content: string;
}

interface GeneratedImage {
  id: string;
  text_id: string;
  image_url: string;
}

interface GeneratedVideo {
  id: string;
  image_id: string;
  video_url: string;
  script: string;
  duration: number;
  status: string;
}

export default function GenerateVideosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [skeleton, setSkeleton] = useState<SkeletonPost[]>([]);
  const [texts, setTexts] = useState<Record<string, GeneratedText>>({});
  const [images, setImages] = useState<Record<string, GeneratedImage>>({});
  const [videos, setVideos] = useState<Record<string, GeneratedVideo>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [editingScript, setEditingScript] = useState<string | null>(null);
  const [scriptContent, setScriptContent] = useState('');
  const [showScriptModal, setShowScriptModal] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    
    // Charger le squelette
    const { data: skeletonData } = await supabase
      .from('post_skeleton')
      .select('id, day, title, content_type')
      .eq('user_id', user?.id)
      .eq('status', 'validated')
      .order('day', { ascending: true });
    
    if (skeletonData) setSkeleton(skeletonData);
    
    // Charger les textes
    const { data: textsData } = await supabase
      .from('generated_texts')
      .select('*')
      .eq('user_id', user?.id);
    
    if (textsData) {
      const textsMap: Record<string, GeneratedText> = {};
      textsData.forEach(t => { textsMap[t.skeleton_id] = t; });
      setTexts(textsMap);
    }
    
    // Charger les images
    const { data: imagesData } = await supabase
      .from('generated_images')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'completed');
    
    if (imagesData) {
      const imagesMap: Record<string, GeneratedImage> = {};
      imagesData.forEach(i => { imagesMap[i.text_id] = i; });
      setImages(imagesMap);
    }
    
    // Charger les vidéos existantes
    const { data: videosData } = await supabase
      .from('generated_videos')
      .select('*')
      .eq('user_id', user?.id);
    
    if (videosData) {
      const videosMap: Record<string, GeneratedVideo> = {};
      videosData.forEach(v => { videosMap[v.image_id] = v; });
      setVideos(videosMap);
    }
    
    setLoading(false);
  };

  const generateVideo = async (image: GeneratedImage, post: SkeletonPost, customScript?: string) => {
    setGenerating(prev => ({ ...prev, [image.id]: true }));
    toast.loading(`Génération de la vidéo pour "${post.title}"...`, { id: image.id });
    
    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        image,
        post,
        customScript
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      setVideos(prev => ({
        ...prev,
        [image.id]: {
          id: result.videoId,
          image_id: image.id,
          video_url: result.videoUrl,
          script: result.script,
          duration: result.duration || 4,
          status: 'completed'
        }
      }));
      toast.success(`Vidéo générée !`, { id: image.id });
    } else {
      toast.error('Erreur: ' + result.error, { id: image.id });
    }
    
    setGenerating(prev => ({ ...prev, [image.id]: false }));
    setShowScriptModal(null);
  };

  const updateScript = async (imageId: string, videoId: string) => {
    const { error } = await supabase
      .from('generated_videos')
      .update({
        script: scriptContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId);
    
    if (error) {
      toast.error('Erreur mise à jour');
    } else {
      setVideos(prev => ({
        ...prev,
        [imageId]: {
          ...prev[imageId],
          script: scriptContent
        }
      }));
      toast.success('Script modifié');
    }
    setEditingScript(null);
  };

  const regenerateVideo = async (image: GeneratedImage, post: SkeletonPost) => {
    await generateVideo(image, post);
  };

  const allGenerated = skeleton.length > 0 && skeleton.every(post => {
    const text = texts[post.id];
    const image = text ? images[text.id] : null;
    return image && videos[image.id]?.status === 'completed';
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const postsWithImage = skeleton.filter(post => {
    const text = texts[post.id];
    return text && images[text.id];
  });
  const postsWithoutImage = skeleton.filter(post => {
    const text = texts[post.id];
    return !text || !images[text.id];
  });

  if (postsWithoutImage.length > 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="card p-12">
          <p className="text-muted-foreground mb-4">
            {postsWithoutImage.length} post(s) sans image générée
          </p>
          <button
            onClick={() => router.push('/generate-images')}
            className="text-primary hover:underline"
          >
            Retour à la génération des images →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Génération des vidéos</h1>
        <p className="text-muted-foreground">Créez des vidéos courtes pour chaque post</p>
      </div>

      {/* Progression */}
      <div className="card p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Progression</span>
          <span className="text-sm font-medium text-primary">
            {Object.keys(videos).length}/{postsWithImage.length} vidéos générées
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 mt-2">
          <div
            className="bg-gradient-to-r from-primary to-purple-600 rounded-full h-2 transition-all"
            style={{ width: `${(Object.keys(videos).length / postsWithImage.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Liste des posts */}
      <div className="space-y-6">
        {skeleton.map((post) => {
          const text = texts[post.id];
          if (!text) return null;
          
          const image = images[text.id];
          if (!image) return null;
          
          const video = videos[image.id];
          const isGenerating = generating[image.id];
          const isCompleted = video?.status === 'completed';
          
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
                    <span className="text-xs bg-secondary-foreground/10 text-secondary-foreground px-2 py-0.5 rounded-full">{post.content_type}</span>
                  </div>
                </div>
                <div>
                  {isCompleted && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">✓ Vidéo générée</span>
                  )}
                  {isGenerating && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">⏳ Génération...</span>
                  )}
                </div>
              </div>

              {/* Image source */}
              <div className="px-6 py-3 bg-secondary/50 border-b border-border">
                <p className="text-xs text-muted-foreground mb-2">Image source :</p>
                <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                  <Image
                    src={image.image_url}
                    alt={post.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>

              {/* Vidéo */}
              <div className="px-6 py-4">
                {isCompleted ? (
                  <div className="space-y-4">
                    <video
                      src={video.video_url}
                      controls
                      className="w-full rounded-xl border border-border"
                    />
                    
                    {/* Script */}
                    <div className="bg-secondary rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-foreground">📜 Script de la vidéo</label>
                        {editingScript === video.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateScript(image.id, video.id)}
                              className="text-green-600 dark:text-green-400 text-sm hover:underline"
                            >
                              Sauvegarder
                            </button>
                            <button
                              onClick={() => setEditingScript(null)}
                              className="text-muted-foreground text-sm hover:underline"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setScriptContent(video.script);
                              setEditingScript(video.id);
                            }}
                            className="text-primary text-sm hover:underline"
                          >
                            ✏️ Modifier
                          </button>
                        )}
                      </div>
                      
                      {editingScript === video.id ? (
                        <textarea
                          value={scriptContent}
                          onChange={(e) => setScriptContent(e.target.value)}
                          className="input"
                          rows={4}
                        />
                      ) : (
                        <p className="text-sm text-secondary-foreground whitespace-pre-wrap">{video.script}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowScriptModal(image.id)}
                        className="flex-1 btn-primary"
                      >
                        🎨 Générer avec un script personnalisé
                      </button>
                      <button
                        onClick={() => regenerateVideo(image, post)}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg text-sm transition-colors"
                      >
                        🔄 Regénérer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <button
                      onClick={() => setShowScriptModal(image.id)}
                      disabled={isGenerating}
                      className="btn-primary px-6 py-3 disabled:opacity-50"
                    >
                      {isGenerating ? 'Génération en cours...' : '🎬 Générer la vidéo'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal personnalisation script */}
      {showScriptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Personnalisez le script vidéo</h3>
            <textarea
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              className="input h-32"
              placeholder="Décrivez le script de la vidéo (30-60 secondes)..."
            />
            <p className="text-xs text-muted-foreground mt-2">L'IA générera une vidéo de 4 secondes basée sur ce script</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  const text = texts[showScriptModal];
                  const image = text ? images[text.id] : null;
                  const post = skeleton.find(p => p.id === text?.skeleton_id);
                  if (image && post) {
                    generateVideo(image, post, scriptContent);
                  }
                }}
                className="flex-1 btn-primary"
              >
                Générer
              </button>
              <button
                onClick={() => setShowScriptModal(null)}
                className="flex-1 btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => router.push('/generate-images')}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={() => {
            if (allGenerated) {
              router.push('/schedule');
            } else {
              toast.error(`Veuillez générer toutes les vidéos (${postsWithImage.length - Object.keys(videos).length} restantes)`);
            }
          }}
          className="btn-primary"
        >
          Programmer →
        </button>
      </div>
    </div>
  );
}