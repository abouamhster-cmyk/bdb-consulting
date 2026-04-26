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
}

interface ScheduledPost {
  id: string;
  video_id: string;
  platform: string;
  scheduled_date: string;
  status: string;
}

export default function SchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [skeleton, setSkeleton] = useState<SkeletonPost[]>([]);
  const [texts, setTexts] = useState<Record<string, GeneratedText>>({});
  const [images, setImages] = useState<Record<string, GeneratedImage>>({});
  const [videos, setVideos] = useState<Record<string, GeneratedVideo>>({});
  const [scheduled, setScheduled] = useState<Record<string, ScheduledPost[]>>({});
  const [scheduling, setScheduling] = useState<Record<string, boolean>>({});
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin']);
  const [hasBufferConfig, setHasBufferConfig] = useState(false);

  const platforms = [
    { id: 'linkedin', name: 'LinkedIn', icon: '🔗', color: 'bg-blue-600' },
    { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'bg-black dark:bg-gray-800' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-800' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-600' }
  ];

  useEffect(() => {
    if (user) {
      loadData();
      loadBufferSettings();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    
    // Charger le squelette
    const { data: skeletonData } = await supabase
      .from('post_skeleton')
      .select('*')
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
    
    // Charger les vidéos
    const { data: videosData } = await supabase
      .from('generated_videos')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'completed');
    
    if (videosData) {
      const videosMap: Record<string, GeneratedVideo> = {};
      videosData.forEach(v => { videosMap[v.image_id] = v; });
      setVideos(videosMap);
    }
    
    // Charger les programmations existantes
    const { data: scheduledData } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', user?.id);
    
    if (scheduledData) {
      const scheduledMap: Record<string, ScheduledPost[]> = {};
      scheduledData.forEach(s => {
        if (!scheduledMap[s.video_id]) scheduledMap[s.video_id] = [];
        scheduledMap[s.video_id].push(s);
      });
      setScheduled(scheduledMap);
    }
    
    setLoading(false);
  };

  const loadBufferSettings = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('buffer_api_key, buffer_platforms')
      .eq('user_id', user?.id)
      .single();
    
    if (data?.buffer_api_key) {
      setHasBufferConfig(true);
      if (data.buffer_platforms) {
        setSelectedPlatforms(data.buffer_platforms);
      }
    }
  };

  const schedulePost = async (video: GeneratedVideo, post: SkeletonPost, platform: string) => {
    setScheduling(prev => ({ ...prev, [`${video.id}-${platform}`]: true }));
    
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + (post.day - 1));
    scheduledDate.setHours(10, 0, 0, 0);
    
    const text = texts[post.id];
    const image = images[text?.id];
    
    const postContent = `${post.title}\n\n${post.hook}\n\n${text?.content?.substring(0, 200) || ''}\n\n${post.cta}`;
    
    const response = await fetch('/api/schedule-buffer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        videoId: video.id,
        post: {
          ...post,
          content: postContent,
          imageUrl: image?.image_url,
          videoUrl: video.video_url
        },
        platform,
        scheduledDate: scheduledDate.toISOString()
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      toast.success(`Programmé sur ${platform} pour le jour ${post.day}`);
      loadData();
    } else {
      toast.error(`Erreur: ${result.error}`);
    }
    
    setScheduling(prev => ({ ...prev, [`${video.id}-${platform}`]: false }));
  };

  const scheduleAll = async () => {
    toast.loading('Programmation en cours...', { id: 'schedule-all' });
    
    let successCount = 0;
    let total = 0;
    
    for (const post of skeleton) {
      const text = texts[post.id];
      const image = text ? images[text.id] : null;
      const video = image ? videos[image.id] : null;
      
      if (video && !scheduled[video.id]?.length) {
        for (const platform of selectedPlatforms) {
          total++;
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + (post.day - 1));
          scheduledDate.setHours(10, 0, 0, 0);
          
          const textContent = texts[post.id];
          const postImage = textContent ? images[textContent.id] : null;
          
          const response = await fetch('/api/schedule-buffer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user?.id,
              videoId: video.id,
              post: {
                ...post,
                content: textContent?.content,
                imageUrl: postImage?.image_url,
                videoUrl: video.video_url
              },
              platform,
              scheduledDate: scheduledDate.toISOString()
            })
          });
          
          const result = await response.json();
          if (result.success) successCount++;
        }
      }
    }
    
    toast.success(`${successCount}/${total} posts programmés !`, { id: 'schedule-all' });
    loadData();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const postsWithVideo = skeleton.filter(post => {
    const text = texts[post.id];
    const image = text ? images[text.id] : null;
    return image && videos[image.id];
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Programmation finale</h1>
        <p className="text-muted-foreground">Planifiez la publication sur vos réseaux sociaux</p>
      </div>

      {/* Configuration Buffer */}
      {!hasBufferConfig && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-2">⚠️ Configuration Buffer requise</h3>
          <p className="text-sm text-amber-700 dark:text-amber-500 mb-4">
            Pour programmer automatiquement vos posts, configurez votre clé API Buffer dans les paramètres.
          </p>
          <button
            onClick={() => router.push('/settings')}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700 transition-colors"
          >
            Configurer Buffer →
          </button>
        </div>
      )}

      {/* Sélection plateformes */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">📱 Plateformes de publication</h2>
        <div className="flex flex-wrap gap-3">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => {
                if (selectedPlatforms.includes(platform.id)) {
                  setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id));
                } else {
                  setSelectedPlatforms([...selectedPlatforms, platform.id]);
                }
              }}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                selectedPlatforms.includes(platform.id)
                  ? `${platform.color} text-white`
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <span>{platform.icon}</span>
              {platform.name}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des posts à programmer */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-foreground">📋 Posts à programmer</h2>
          {hasBufferConfig && postsWithVideo.length > 0 && (
            <button
              onClick={scheduleAll}
              className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-lg text-sm hover:shadow-lg transition-all"
            >
              🚀 Tout programmer
            </button>
          )}
        </div>

        {postsWithVideo.map((post) => {
          const text = texts[post.id];
          const image = images[text?.id];
          const video = videos[image?.id];
          const postScheduled = scheduled[video?.id] || [];
          const isScheduled = postScheduled.length > 0;
          
          return (
            <div key={post.id} className="card overflow-hidden">
              <div className="bg-secondary px-6 py-4 border-b border-border">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">J{post.day}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{post.title}</h3>
                      <p className="text-sm text-muted-foreground">{post.hook}</p>
                    </div>
                  </div>
                  {isScheduled && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                      ✓ Programmé sur {postScheduled.map(s => s.platform).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="px-6 py-4">
                {!isScheduled ? (
                  <div className="flex flex-wrap gap-3">
                    {selectedPlatforms.map((platform) => {
                      const platformInfo = platforms.find(p => p.id === platform);
                      const isScheduling = scheduling[`${video?.id}-${platform}`];
                      return (
                        <button
                          key={platform}
                          onClick={() => schedulePost(video, post, platform)}
                          disabled={isScheduling || !hasBufferConfig}
                          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                            platformInfo?.color
                          } text-white hover:opacity-90 disabled:opacity-50`}
                        >
                          {isScheduling ? '⏳' : platformInfo?.icon}
                          {platformInfo?.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    📅 Programmé pour le jour {post.day}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {postsWithVideo.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-muted-foreground mb-4">Aucun post avec vidéo trouvé</p>
            <button
              onClick={() => router.push('/generate-videos')}
              className="text-primary hover:underline"
            >
              Retour à la génération des vidéos →
            </button>
          </div>
        )}
      </div>

      {/* Navigation finale */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => router.push('/generate-videos')}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={() => {
            toast.success('🎉 Félicitations ! Votre campagne est prête !');
            router.push('/dashboard');
          }}
          className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg transition-all"
        >
          🎉 Terminer la campagne
        </button>
      </div>
    </div>
  );
}