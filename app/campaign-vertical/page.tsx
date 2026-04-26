'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Image from 'next/image';

const platformLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'Twitter'
};

const allPlatforms = ['linkedin', 'instagram', 'facebook', 'twitter'];

interface Post {
  id: string;
  day: number;
  date: string;
  title: string;
  hook: string;
  cta: string;
  content_type: string;
  event_name: string | null;
  campaign_id?: string;
  
  status_skeleton: 'pending' | 'completed';
  status_text: 'pending' | 'generating' | 'completed';
  status_image: 'pending' | 'generating' | 'completed';
  status_video: 'pending' | 'generating' | 'completed';
  status_scheduled: 'pending' | 'completed';
  
  text_linkedin?: string;
  text_instagram?: string;
  text_facebook?: string;
  text_twitter?: string;
  image_prompt?: string;
  image_url?: string;
  video_script?: string;
  video_url?: string;
  
  generating_platform?: string | null;
  selected_platforms?: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function CampaignVerticalPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [contentMode, setContentMode] = useState<'text' | 'image' | 'video'>('video');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [companyConfig, setCompanyConfig] = useState<any>(null);
  const [campaignParams, setCampaignParams] = useState<any>(null);
  
  // Chat dynamique
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatContext, setChatContext] = useState<{ type: string; content: string; field?: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Édition
  const [editingField, setEditingField] = useState<{ postId: string; field: string; platform?: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Upload d'image de référence
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [imageFormat, setImageFormat] = useState<'square' | 'portrait' | 'landscape'>('square');
  const [imageSize, setImageSize] = useState<'1024x1024' | '1024x1792' | '1792x1024'>('1024x1024');
  
  // État pour le choix des plateformes
  const [showPlatformSelection, setShowPlatformSelection] = useState(false);
  const [tempPlatforms, setTempPlatforms] = useState<string[]>([]);
  
  // Configuration des étapes
  const steps = [
    { name: 'Squelette', icon: '📋', key: 'skeleton', required: true },
    { name: 'Textes', icon: '📝', key: 'text', required: true },
    { name: 'Image', icon: '🖼️', key: 'image', required: contentMode !== 'text' },
    { name: 'Vidéo', icon: '🎬', key: 'video', required: contentMode === 'video' },
    { name: 'Programmation', icon: '🚀', key: 'schedule', required: true }
  ];
  
  const visibleSteps = steps.filter(step => step.required !== false);
  
  // Chargement initial
  useEffect(() => {
    if (user) {
      loadCompanyConfig();
      loadCampaignParams();
      
      const urlParams = new URLSearchParams(window.location.search);
      const campaignIdParam = urlParams.get('campaignId');
      
      if (campaignIdParam) {
        setCampaignId(campaignIdParam);
        loadCampaignPosts(campaignIdParam);
      } else {
        loadAllPosts();
      }
    }
  }, [user]);
  
  // Auto-scroll du chat
  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);
  
  const loadCompanyConfig = async () => {
    const { data } = await supabase
      .from('company_config')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    setCompanyConfig(data);
  };
  
  const loadCampaignParams = async () => {
    const { data } = await supabase
      .from('generation_params')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    setCampaignParams(data);
  };
  
  const loadCampaignPosts = async (id: string) => {
    const { data } = await supabase
      .from('post_skeleton')
      .select('*')
      .eq('campaign_id', id)
      .order('day', { ascending: true });
    
    if (data && data.length > 0) {
      setPosts(data);
      setSelectedPostId(data[0].id);
    }
    setInitializing(false);
  };
  
  const loadAllPosts = async () => {
    const { data } = await supabase
      .from('post_skeleton')
      .select('*')
      .eq('user_id', user?.id)
      .order('day', { ascending: true });
    
    if (data && data.length > 0) {
      setPosts(data);
      setSelectedPostId(data[0].id);
    }
    setInitializing(false);
  };
  
  const currentPost = posts.find(p => p.id === selectedPostId);
  const currentPlatforms = currentPost?.selected_platforms || ['linkedin', 'instagram', 'facebook', 'twitter'];
  const brandTone = campaignParams?.brand_tone || 'professionnel';
  
  const updateField = async (postId: string, updates: Record<string, any>) => {
    await supabase.from('post_skeleton').update(updates).eq('id', postId);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
  };
  
  // ==================== SQUELETTE ====================
  const openPlatformSelection = () => {
    setTempPlatforms(currentPlatforms);
    setShowPlatformSelection(true);
  };
  
  const confirmPlatformSelection = async () => {
    if (tempPlatforms.length === 0) {
      toast.error('Sélectionnez au moins une plateforme');
      return;
    }
    await updateField(selectedPostId!, { selected_platforms: tempPlatforms });
    setShowPlatformSelection(false);
    toast.success(`Plateformes mises à jour : ${tempPlatforms.map(p => platformLabels[p]).join(', ')}`);
  };
  
  const validateSkeleton = async (postId: string) => {
    await updateField(postId, { status_skeleton: 'completed' });
    toast.success('Squelette validé');
    const nextStep = steps.findIndex(s => s.key === 'text');
    setCurrentStep(nextStep);
  };
  
  // ==================== TEXTES ====================
  const generateText = async (post: Post, platform: string) => {
    setPosts(prev => prev.map(p => 
      p.id === post.id ? { ...p, generating_platform: platform } : p
    ));
    
    try {
      const response = await fetch('/api/generate-text-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          post: { id: post.id, title: post.title, hook: post.hook, cta: post.cta, content_type: post.content_type },
          platform,
          event: post.event_name,
          tone: brandTone
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await updateField(post.id, { 
          [`text_${platform}`]: result.content,
          generating_platform: null
        });
        toast.success(`Texte ${platformLabels[platform]} généré`);
      } else {
        await updateField(post.id, { generating_platform: null });
        toast.error('Erreur: ' + result.error);
      }
    } catch (error) {
      await updateField(post.id, { generating_platform: null });
      toast.error('Erreur de génération');
    }
  };
  
  const saveTextEdit = async (postId: string, platform: string, newText: string) => {
    await updateField(postId, { [`text_${platform}`]: newText });
    setEditingField(null);
    toast.success('Texte modifié');
  };
  
  const validateTexts = async (postId: string) => {
    await updateField(postId, { status_text: 'completed' });
    toast.success('Textes validés');
    let nextStepKey = contentMode === 'text' ? 'schedule' : 'image';
    const nextStep = steps.findIndex(s => s.key === nextStepKey);
    setCurrentStep(nextStep);
  };
  
  // ==================== IMAGE ====================
  const generateImagePrompt = async (post: Post) => {
    setLoading(true);
    toast.loading('Génération du prompt image...', { id: 'prompt' });
    
    const response = await fetch('/api/generate-image-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        post: { 
          title: post.title, 
          hook: post.hook, 
          content_type: post.content_type,
          event_name: post.event_name
        },
        brandTone: brandTone,
        referenceImageDescription: referenceImage ? "L'utilisateur a fourni une image de référence à prendre en compte pour le style" : null
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      await updateField(post.id, { image_prompt: result.prompt });
      toast.success('Prompt généré', { id: 'prompt' });
    } else {
      toast.error('Erreur: ' + result.error, { id: 'prompt' });
    }
    setLoading(false);
  };
  
  const generateImage = async (post: Post) => {
    if (!post.image_prompt) {
      toast.error('Veuillez d\'abord définir un prompt');
      return;
    }
    
    await updateField(post.id, { status_image: 'generating' });
    
    const response = await fetch('/api/generate-image-advanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        post,
        text: post.text_linkedin || '',
        customPrompt: post.image_prompt,
        referenceImage: referenceImage,
        format: imageFormat,
        size: imageSize
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      await updateField(post.id, { image_url: result.imageUrl, status_image: 'completed' });
      toast.success('Image générée');
    } else {
      toast.error('Erreur: ' + result.error);
      await updateField(post.id, { status_image: 'pending' });
    }
  };
  
  const validateImage = async (postId: string) => {
    await updateField(postId, { status_image: 'completed' });
    toast.success('Image validée');
    let nextStepKey = contentMode === 'video' ? 'video' : 'schedule';
    const nextStep = steps.findIndex(s => s.key === nextStepKey);
    setCurrentStep(nextStep);
  };
  
  // ==================== VIDÉO ====================
  const generateVideoScript = async (post: Post) => {
    setLoading(true);
    toast.loading('Génération du script vidéo...', { id: 'script' });
    
    const response = await fetch('/api/generate-video-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post: { title: post.title, hook: post.hook, cta: post.cta, content_type: post.content_type }
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      await updateField(post.id, { video_script: result.script });
      toast.success('Script généré', { id: 'script' });
    } else {
      toast.error('Erreur: ' + result.error, { id: 'script' });
    }
    setLoading(false);
  };
  
  const generateVideo = async (post: Post) => {
    if (!post.video_script) {
      toast.error('Veuillez d\'abord définir un script');
      return;
    }
    
    await updateField(post.id, { status_video: 'generating' });
    
    const response = await fetch('/api/generate-video-advanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        post,
        imageUrl: post.image_url,
        customScript: post.video_script
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      await updateField(post.id, { video_url: result.videoUrl, status_video: 'completed' });
      toast.success('Vidéo générée');
    } else {
      toast.error('Erreur: ' + result.error);
      await updateField(post.id, { status_video: 'pending' });
    }
  };
  
  const validateVideo = async (postId: string) => {
    await updateField(postId, { status_video: 'completed' });
    toast.success('Vidéo validée');
    const nextStep = steps.findIndex(s => s.key === 'schedule');
    setCurrentStep(nextStep);
  };
  
  // ==================== PROGRAMMATION ====================
  const schedulePost = async (post: Post) => {
    await updateField(post.id, { status_scheduled: 'completed' });
    toast.success(`Post programmé pour le ${new Date(post.date).toLocaleDateString()}`);
  };
  
  // ==================== CHAT DYNAMIQUE ====================
  const openChat = (context: { type: string; content: string; field?: string }) => {
    setChatContext(context);
    setChatMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Je suis votre assistant. Comment puis-je vous aider à améliorer ce ${context.type} ?\n\n"${context.content.substring(0, 200)}${context.content.length > 200 ? '...' : ''}"`,
        timestamp: new Date()
      }
    ]);
    setChatOpen(true);
  };
  
  const sendChatMessage = async () => {
    if (!chatInput.trim()) {
      toast.error('Veuillez écrire un message');
      return;
    }
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const response = await fetch('/api/chat-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          context: chatContext,
          currentPost
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.reply,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, assistantMessage]);
        
        if (result.suggestion && result.field) {
          toast.success('L\'IA a une suggestion !', { duration: 5000 });
        }
      } else {
        toast.error('Erreur: ' + (result.error || 'Erreur inconnue'));
      }
    } catch (error) {
      toast.error('Erreur de communication');
    }
    
    setChatLoading(false);
  };
  
  const handleReferenceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setReferenceImage(reader.result as string);
      toast.success('Image de référence ajoutée');
    };
    reader.readAsDataURL(file);
  };
  
  const getStepStatus = (post: Post, stepKey: string) => {
    const statusMap: Record<string, string> = {
      skeleton: post.status_skeleton,
      text: post.status_text,
      image: post.status_image,
      video: post.status_video,
      schedule: post.status_scheduled
    };
    return statusMap[stepKey] || 'pending';
  };
  
  const canProceedToNextStep = (post: Post) => {
    const currentStepKey = steps[currentStep]?.key;
    
    switch (currentStepKey) {
      case 'skeleton': return post.status_skeleton === 'completed';
      case 'text': return post.status_text === 'completed';
      case 'image': return post.status_image === 'completed';
      case 'video': return post.status_video === 'completed';
      case 'schedule': return post.status_scheduled === 'completed';
      default: return false;
    }
  };
  
  const allTextsGenerated = (post: Post) => {
    const platforms = post.selected_platforms || ['linkedin', 'instagram', 'facebook', 'twitter'];
    return platforms.every(p => post[`text_${p}` as keyof Post]);
  };
  
  if (initializing) {
    return <div className="text-center py-12">Chargement...</div>;
  }
  
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Aucun post trouvé</p>
        <button onClick={() => router.push('/skeleton')} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Générer un squelette →
        </button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Mode de contenu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Type de contenu</label>
        <div className="flex gap-3">
          {(['text', 'image', 'video'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setContentMode(mode);
                toast.success(`Mode ${mode === 'text' ? 'texte seul' : mode === 'image' ? 'texte + image' : 'contenu complet'} activé`);
              }}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                contentMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {mode === 'text' && '📝 Texte seul'}
              {mode === 'image' && '🖼️ Texte + Image'}
              {mode === 'video' && '🎬 Contenu complet'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Navigation par posts */}
      <div className="flex flex-wrap gap-2 mb-6">
        {posts.map((post) => (
          <button
            key={post.id}
            onClick={() => {
              setSelectedPostId(post.id);
              setCurrentStep(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              selectedPostId === post.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Jour {post.day}
            {post.status_scheduled === 'completed' && <span className="ml-1">✅</span>}
          </button>
        ))}
      </div>
      
      {currentPost && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">Jour {currentPost.day}</h2>
                <p className="text-sm text-gray-500">{new Date(currentPost.date).toLocaleDateString()}</p>
                {currentPost.event_name && (
                  <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                    📅 {currentPost.event_name}
                  </span>
                )}
              </div>
              <button
                onClick={openPlatformSelection}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
              >
                ⚙️ Plateformes
              </button>
            </div>
          </div>
          
          {/* Wizard Steps */}
          <div className="px-6 pt-4">
            <div className="flex justify-between border-b border-gray-200">
              {visibleSteps.map((step, idx) => {
                const status = getStepStatus(currentPost, step.key);
                const isActive = idx === currentStep;
                const isCompleted = status === 'completed';
                const canAccess = idx <= currentStep || isCompleted;
                
                return (
                  <button
                    key={step.key}
                    onClick={() => {
                      if (canAccess) {
                        setCurrentStep(idx);
                      } else {
                        toast.error(`Veuillez d'abord valider l'étape ${steps[currentStep].name}`);
                      }
                    }}
                    className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                      isActive
                        ? 'border-blue-600 text-blue-600'
                        : isCompleted
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-400'
                    }`}
                  >
                    <span className="mr-2">{step.icon}</span>
                    {step.name}
                    {isCompleted && <span className="ml-1">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* ÉTAPE 1 : SQUELETTE */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                  {editingField?.postId === currentPost.id && editingField.field === 'title' ? (
                    <div className="flex gap-2">
                      <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 border rounded-lg px-3 py-2" />
                      <button onClick={() => updateField(currentPost.id, { title: editValue })} className="bg-blue-600 text-white px-3 py-1 rounded">💾</button>
                      <button onClick={() => setEditingField(null)} className="bg-gray-200 px-3 py-1 rounded">Annuler</button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p className="text-gray-900">{currentPost.title}</p>
                      <button onClick={() => { setEditValue(currentPost.title); setEditingField({ postId: currentPost.id, field: 'title' }); }} className="text-blue-600 text-sm hover:underline">✏️ Modifier</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accroche</label>
                  {editingField?.postId === currentPost.id && editingField.field === 'hook' ? (
                    <div className="flex gap-2">
                      <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 border rounded-lg px-3 py-2" />
                      <button onClick={() => updateField(currentPost.id, { hook: editValue })} className="bg-blue-600 text-white px-3 py-1 rounded">💾</button>
                      <button onClick={() => setEditingField(null)} className="bg-gray-200 px-3 py-1 rounded">Annuler</button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p className="text-gray-900">{currentPost.hook}</p>
                      <button onClick={() => { setEditValue(currentPost.hook); setEditingField({ postId: currentPost.id, field: 'hook' }); }} className="text-blue-600 text-sm hover:underline">✏️ Modifier</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CTA</label>
                  {editingField?.postId === currentPost.id && editingField.field === 'cta' ? (
                    <div className="flex gap-2">
                      <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1 border rounded-lg px-3 py-2" />
                      <button onClick={() => updateField(currentPost.id, { cta: editValue })} className="bg-blue-600 text-white px-3 py-1 rounded">💾</button>
                      <button onClick={() => setEditingField(null)} className="bg-gray-200 px-3 py-1 rounded">Annuler</button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p className="text-gray-900">{currentPost.cta}</p>
                      <button onClick={() => { setEditValue(currentPost.cta); setEditingField({ postId: currentPost.id, field: 'cta' }); }} className="text-blue-600 text-sm hover:underline">✏️ Modifier</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={currentPost.content_type} onChange={(e) => updateField(currentPost.id, { content_type: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2">
                    <option value="éducatif">📚 Éducatif</option>
                    <option value="storytelling">📖 Storytelling</option>
                    <option value="promotionnel">🎁 Promotionnel</option>
                    <option value="inspirationnel">✨ Inspirationnel</option>
                  </select>
                </div>
                <button onClick={() => validateSkeleton(currentPost.id)} disabled={currentPost.status_skeleton === 'completed'} className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50">
                  {currentPost.status_skeleton === 'completed' ? '✓ Squelette validé' : '✓ Valider le squelette'}
                </button>
              </div>
            )}
            
            {/* ÉTAPE 2 : TEXTES */}
            {currentStep === 1 && (
              <div className="space-y-4">
                {currentPlatforms.map(platform => {
                  const text = currentPost[`text_${platform}` as keyof Post] as string;
                  const isGenerating = currentPost.generating_platform === platform;
                  return (
                    <div key={platform} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="font-medium">{platformLabels[platform]}</label>
                        {!text && !isGenerating && <button onClick={() => generateText(currentPost, platform)} className="text-sm text-blue-600 hover:underline">Générer</button>}
                        {isGenerating && <span className="text-sm text-amber-600">⏳ Génération...</span>}
                      </div>
                      {text ? (
                        <div>
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">{text}</p>
                          <div className="flex gap-3 mt-2">
                            <button onClick={() => { setEditValue(text); setEditingField({ postId: currentPost.id, field: `text_${platform}`, platform }); }} className="text-xs text-blue-600 hover:underline">✏️ Modifier</button>
                            <button onClick={() => generateText(currentPost, platform)} className="text-xs text-amber-600 hover:underline">🔄 Regénérer</button>
                            <button onClick={() => openChat({ type: `texte ${platformLabels[platform]}`, content: text, field: `text_${platform}` })} className="text-xs text-purple-600 hover:underline">💬 Discuter</button>
                          </div>
                        </div>
                      ) : !isGenerating ? <p className="text-sm text-gray-400">Non généré</p> : null}
                    </div>
                  );
                })}
                
                {editingField && editingField.platform && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6">
                      <h3 className="text-lg font-semibold mb-4">Modifier le texte {platformLabels[editingField.platform]}</h3>
                      <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full border border-gray-200 rounded-lg p-3 h-48 text-sm" />
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => saveTextEdit(editingField.postId, editingField.platform!, editValue)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">💾 Sauvegarder</button>
                        <button onClick={() => setEditingField(null)} className="flex-1 bg-gray-200 py-2 rounded-lg">Annuler</button>
                      </div>
                    </div>
                  </div>
                )}
                
                <button onClick={() => { if (allTextsGenerated(currentPost)) validateTexts(currentPost.id); else toast.error('Veuillez générer tous les textes'); }} className="w-full bg-green-600 text-white py-2 rounded-lg">
                  ✓ Valider tous les textes
                </button>
              </div>
            )}
            
            {/* ÉTAPE 3 : IMAGE */}
            {currentStep === 2 && (contentMode === 'image' || contentMode === 'video') && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Prompt image</label>
                    {!currentPost.image_prompt && (
                      <button
                        onClick={() => generateImagePrompt(currentPost)}
                        disabled={loading}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        ✨ Générer automatiquement
                      </button>
                    )}
                  </div>
                  <textarea
                    value={currentPost.image_prompt || ''}
                    onChange={(e) => updateField(currentPost.id, { image_prompt: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm"
                    rows={4}
                    placeholder="Décrivez l'image que vous souhaitez générer..."
                  />
                  <button
                    onClick={() => openChat({ type: 'prompt image', content: currentPost.image_prompt || '', field: 'image_prompt' })}
                    className="text-xs text-purple-600 hover:underline mt-1"
                  >
                    💬 Discuter du prompt
                  </button>
                </div>

                {/* Image de référence */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image de référence (optionnel)</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm">
                      📁 Choisir une image
                      <input type="file" accept="image/*" className="hidden" onChange={handleReferenceImageUpload} />
                    </label>
                    {referenceImage && (
                      <div className="relative w-16 h-16">
                        <Image src={referenceImage} alt="Référence" fill className="object-cover rounded" unoptimized />
                        <button onClick={() => setReferenceImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs">✕</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Format et taille */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                    <select
                      value={imageFormat}
                      onChange={(e) => setImageFormat(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="square">Carré (1:1)</option>
                      <option value="portrait">Portrait (2:3)</option>
                      <option value="landscape">Paysage (3:2)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Taille</label>
                    <select
                      value={imageSize}
                      onChange={(e) => setImageSize(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="1024x1024">Standard (1024x1024)</option>
                      <option value="1024x1792">Portrait HD (1024x1792)</option>
                      <option value="1792x1024">Paysage HD (1792x1024)</option>
                    </select>
                  </div>
                </div>

                {/* AFFICHAGE DE L'IMAGE - AVEC ZOOM ET MODAL */}
                {currentPost.image_url ? (
                  <div className="mt-4">
                    <div 
                      className="relative w-full bg-gray-100 rounded-lg overflow-hidden group cursor-pointer" 
                      style={{ aspectRatio: '1 / 1' }}
                      onClick={() => window.open(currentPost.image_url, '_blank')}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentPost.image_url}
                        alt={currentPost.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <span className="bg-white/90 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                          🔍 Cliquer pour agrandir
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => generateImage(currentPost)}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg text-sm transition-colors"
                      >
                        🔄 Regénérer l'image
                      </button>
                      <a
                        href={currentPost.image_url}
                        download
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm text-center transition-colors"
                      >
                        📥 Télécharger
                      </a>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => generateImage(currentPost)}
                    disabled={currentPost.status_image === 'generating' || !currentPost.image_prompt}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
                  >
                    {currentPost.status_image === 'generating' ? 'Génération en cours...' : '🖼️ Générer l\'image'}
                  </button>
                )}

                {currentPost.status_image !== 'completed' && currentPost.image_url && (
                  <button
                    onClick={() => validateImage(currentPost.id)}
                    className="w-full bg-green-600 text-white py-2 rounded-lg"
                  >
                    ✓ Valider l'image
                  </button>
                )}
                {currentPost.status_image === 'completed' && (
                  <div className="text-center text-green-600 py-2">✓ Image validée</div>
                )}
              </div>
            )}
            
            {/* ÉTAPE 4 : VIDÉO */}
            {currentStep === 3 && contentMode === 'video' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Script vidéo</label>
                    {!currentPost.video_script && (
                      <button
                        onClick={() => generateVideoScript(currentPost)}
                        disabled={loading}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        ✨ Générer automatiquement
                      </button>
                    )}
                  </div>
                  <textarea
                    value={currentPost.video_script || ''}
                    onChange={(e) => updateField(currentPost.id, { video_script: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm"
                    rows={4}
                    placeholder="Écrivez le script de votre vidéo..."
                  />
                  <button
                    onClick={() => openChat({ type: 'script vidéo', content: currentPost.video_script || '', field: 'video_script' })}
                    className="text-xs text-purple-600 hover:underline mt-1"
                  >
                    💬 Discuter du script
                  </button>
                </div>
                
                {currentPost.video_url ? (
                  <div>
                    <video src={currentPost.video_url} controls className="w-full rounded-lg" />
                    <button onClick={() => generateVideo(currentPost)} className="w-full bg-amber-600 text-white py-2 rounded-lg mt-2">
                      🔄 Regénérer la vidéo
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => generateVideo(currentPost)}
                    disabled={currentPost.status_video === 'generating' || !currentPost.video_script}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
                  >
                    {currentPost.status_video === 'generating' ? 'Génération en cours...' : '🎬 Générer la vidéo'}
                  </button>
                )}
                
                {currentPost.status_video !== 'completed' && currentPost.video_url && (
                  <button onClick={() => validateVideo(currentPost.id)} className="w-full bg-green-600 text-white py-2 rounded-lg">
                    ✓ Valider la vidéo
                  </button>
                )}
                {currentPost.status_video === 'completed' && (
                  <div className="text-center text-green-600 py-2">✓ Vidéo validée</div>
                )}
              </div>
            )}
            
            {/* ÉTAPE 5 : PROGRAMMATION */}
            {currentStep === (contentMode === 'video' ? 4 : contentMode === 'image' ? 3 : 2) && (
              <div className="space-y-4">
                {currentPost.status_scheduled !== 'completed' ? (
                  <button onClick={() => schedulePost(currentPost)} className="w-full bg-blue-600 text-white py-2 rounded-lg">
                    📅 Programmer pour le {new Date(currentPost.date).toLocaleDateString()}
                  </button>
                ) : (
                  <div className="text-center text-green-600 py-2">✓ Post programmé</div>
                )}
              </div>
            )}
            
            {/* Navigation entre étapes */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  let prevStep = currentStep - 1;
                  while (prevStep >= 0 && !steps[prevStep].required) prevStep--;
                  setCurrentStep(Math.max(0, prevStep));
                }}
                disabled={currentStep === 0}
                className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                ← Étape précédente
              </button>
              <button
                onClick={() => {
                  if (canProceedToNextStep(currentPost)) {
                    let nextStep = currentStep + 1;
                    while (nextStep < steps.length && !steps[nextStep].required) nextStep++;
                    if (nextStep < steps.length) {
                      setCurrentStep(nextStep);
                      if (steps[nextStep].key === 'image' && !currentPost.image_prompt) {
                        generateImagePrompt(currentPost);
                      }
                      if (steps[nextStep].key === 'video' && !currentPost.video_script) {
                        generateVideoScript(currentPost);
                      }
                    } else {
                      toast.success('🎉 Post terminé !');
                    }
                  } else {
                    toast.error('Veuillez valider cette étape avant de continuer');
                  }
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                {currentStep < steps.length - 1 ? 'Étape suivante →' : 'Terminer →'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Choix des plateformes */}
      {showPlatformSelection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">🌐 Plateformes pour ce post</h3>
            <p className="text-sm text-gray-500 mb-4">Sélectionnez les plateformes sur lesquelles vous souhaitez publier.</p>
            <div className="space-y-2 mb-6">
              {allPlatforms.map(platform => (
                <label key={platform} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempPlatforms.includes(platform)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTempPlatforms([...tempPlatforms, platform]);
                      } else {
                        setTempPlatforms(tempPlatforms.filter(p => p !== platform));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">{platformLabels[platform]}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={confirmPlatformSelection} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">Valider</button>
              <button onClick={() => setShowPlatformSelection(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Annuler</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Chat IA */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">💬 Assistant IA</h3>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">{msg.timestamp.toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Posez votre question..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <button onClick={sendChatMessage} disabled={chatLoading} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}