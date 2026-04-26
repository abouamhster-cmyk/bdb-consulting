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
  prompt: string;
  status: string;
}

export default function GenerateImagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [skeleton, setSkeleton] = useState<SkeletonPost[]>([]);
  const [texts, setTexts] = useState<Record<string, GeneratedText>>({});
  const [images, setImages] = useState<Record<string, GeneratedImage>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [showPromptModal, setShowPromptModal] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

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
    
    // Charger les images existantes
    const { data: imagesData } = await supabase
      .from('generated_images')
      .select('*')
      .eq('user_id', user?.id);
    
    if (imagesData) {
      const imagesMap: Record<string, GeneratedImage> = {};
      imagesData.forEach(i => { imagesMap[i.text_id] = i; });
      setImages(imagesMap);
    }
    
    setLoading(false);
  };

  const generateImage = async (text: GeneratedText, post: SkeletonPost, customPromptText?: string) => {
    setGenerating(prev => ({ ...prev, [text.id]: true }));
    toast.loading(`Génération de l'image pour "${post.title}"...`, { id: text.id });
    
    // Récupérer la config entreprise
    const { data: config } = await supabase
      .from('company_config')
      .select('graphic_charter, brand_positioning')
      .eq('user_id', user?.id)
      .single();
    
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        text,
        post,
        config,
        customPrompt: customPromptText
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      setImages(prev => ({
        ...prev,
        [text.id]: {
          id: result.imageId,
          text_id: text.id,
          image_url: result.imageUrl,
          prompt: result.prompt,
          status: 'completed'
        }
      }));
      toast.success(`Image générée !`, { id: text.id });
    } else {
      toast.error('Erreur: ' + result.error, { id: text.id });
    }
    
    setGenerating(prev => ({ ...prev, [text.id]: false }));
    setShowPromptModal(null);
  };

  const regenerateImage = async (text: GeneratedText, post: SkeletonPost) => {
    await generateImage(text, post);
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

  const allGenerated = skeleton.length > 0 && skeleton.every(post => {
    const text = texts[post.id];
    return text && images[text.id]?.status === 'completed';
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const postsWithText = skeleton.filter(post => texts[post.id]);
  const postsWithoutText = skeleton.filter(post => !texts[post.id]);

  if (postsWithoutText.length > 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="card p-12">
          <p className="text-muted-foreground mb-4">
            {postsWithoutText.length} post(s) sans texte généré
          </p>
          <button
            onClick={() => router.push('/generate-texts')}
            className="text-primary hover:underline"
          >
            Retour à la génération des textes →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Génération des images</h1>
        <p className="text-muted-foreground">Créez des visuels pour chaque post avec DALL·E</p>
      </div>

      {/* Progression */}
      <div className="card p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Progression</span>
          <span className="text-sm font-medium text-primary">
            {Object.keys(images).length}/{postsWithText.length} images générées
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 mt-2">
          <div
            className="bg-gradient-to-r from-primary to-purple-600 rounded-full h-2 transition-all"
            style={{ width: `${(Object.keys(images).length / postsWithText.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Liste des posts */}
      <div className="space-y-6">
        {skeleton.map((post) => {
          const text = texts[post.id];
          if (!text) return null;
          
          const image = images[text.id];
          const isGenerating = generating[text.id];
          const isCompleted = image?.status === 'completed';
          
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
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">✓ Image générée</span>
                  )}
                  {isGenerating && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">⏳ Génération...</span>
                  )}
                </div>
              </div>

              {/* Image */}
              <div className="px-6 py-4">
                {isCompleted ? (
                  <div className="space-y-4">
                    <div className="relative group">
                      <div className="relative w-full h-80 bg-secondary rounded-xl overflow-hidden">
                        <Image
                          src={image.image_url}
                          alt={post.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                        <button
                          onClick={() => downloadImage(image.image_url, post.title)}
                          className="bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
                        >
                          📥 Télécharger
                        </button>
                        <button
                          onClick={() => setShowPromptModal(text.id)}
                          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/80"
                        >
                          🎨 Personnaliser
                        </button>
                        <button
                          onClick={() => regenerateImage(text, post)}
                          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700"
                        >
                          🔄 Regénérer
                        </button>
                      </div>
                    </div>
                    <details className="text-xs text-muted-foreground">
                      <summary>Voir le prompt utilisé</summary>
                      <p className="mt-2 p-2 bg-secondary rounded">{image.prompt}</p>
                    </details>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <button
                      onClick={() => setShowPromptModal(text.id)}
                      disabled={isGenerating}
                      className="btn-primary px-6 py-3 disabled:opacity-50"
                    >
                      {isGenerating ? 'Génération en cours...' : '🖼️ Générer l\'image'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal personnalisation prompt */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Personnalisez le prompt</h3>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="input h-32"
              placeholder="Décrivez l'image que vous souhaitez générer..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  const text = texts[showPromptModal];
                  const post = skeleton.find(p => p.id === text?.skeleton_id);
                  if (text && post) {
                    generateImage(text, post, customPrompt);
                  }
                }}
                className="flex-1 btn-primary"
              >
                Générer
              </button>
              <button
                onClick={() => setShowPromptModal(null)}
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
          onClick={() => router.push('/generate-texts')}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={() => {
            if (allGenerated) {
              router.push('/generate-videos');
            } else {
              toast.error(`Veuillez générer toutes les images (${postsWithText.length - Object.keys(images).length} restantes)`);
            }
          }}
          className="btn-primary"
        >
          Générer les vidéos →
        </button>
      </div>
    </div>
  );
}