'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

type WizardStep = 'strategy' | 'calendar' | 'prompts' | 'texts' | 'images' | 'videos' | 'review' | 'schedule';

interface Strategy {
  id: string;
  brand_positioning: string;
  persona: string;
  editorial_charter: string;
  graphic_charter: string;
}

export default function ContentWizard() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>('strategy');
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [generatedTexts, setGeneratedTexts] = useState<any[]>([]);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [generatedVideos, setGeneratedVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [promptCustomizations, setPromptCustomizations] = useState({
    tone: 'professionnel',
    length: 'medium',
    includeEmojis: true,
    includeHashtags: true
  });

  // Charger les stratégies
  useEffect(() => {
    if (user) {
      fetchStrategies();
    }
  }, [user]);

  const fetchStrategies = async () => {
    const { data } = await supabase
      .from('strategies')
      .select('*')
      .eq('user_id', user?.id);
    
    if (data) setStrategies(data);
  };

  const steps: { id: WizardStep; label: string; icon: string }[] = [
    { id: 'strategy', label: 'Stratégie', icon: '🎯' },
    { id: 'calendar', label: 'Calendrier', icon: '📅' },
    { id: 'prompts', label: 'Personnalisation', icon: '✏️' },
    { id: 'texts', label: 'Textes', icon: '📝' },
    { id: 'images', label: 'Images', icon: '🖼️' },
    { id: 'videos', label: 'Vidéos', icon: '🎬' },
    { id: 'review', label: 'Relecture', icon: '👀' },
    { id: 'schedule', label: 'Programmation', icon: '🚀' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 'strategy':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">1. Choisissez votre stratégie</h2>
            <p className="text-gray-500">Sélectionnez la stratégie marketing à utiliser</p>
            
            <div className="grid gap-4">
              {strategies.map((strategy) => (
                <button
                  key={strategy.id}
                  onClick={() => setSelectedStrategy(strategy)}
                  className={`p-4 text-left rounded-xl border-2 transition-all ${
                    selectedStrategy?.id === strategy.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-medium text-gray-900">{strategy.brand_positioning?.substring(0, 100)}...</h3>
                  <p className="text-sm text-gray-500 mt-1">{strategy.persona?.substring(0, 80)}...</p>
                </button>
              ))}
            </div>
            
            {strategies.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucune stratégie trouvée</p>
                <a href="/strategy" className="text-blue-600 hover:underline mt-2 inline-block">
                  Créer une stratégie →
                </a>
              </div>
            )}
          </div>
        );

      case 'calendar':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">2. Générez votre calendrier</h2>
            <p className="text-gray-500">Planifiez vos posts pour le mois</p>
            
            <button
              onClick={async () => {
                setIsLoading(true);
                const response = await fetch('/api/generate-calendar', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    strategyId: selectedStrategy?.id,
                    userId: user?.id
                  })
                });
                const result = await response.json();
                if (result.success) {
                  setCalendarData(result.calendar);
                  toast.success(`${result.calendar.length} posts générés`);
                }
                setIsLoading(false);
              }}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium"
            >
              {isLoading ? 'Génération...' : '✨ Générer le calendrier'}
            </button>
            
            {calendarData.length > 0 && (
              <div className="space-y-3 mt-4">
                {calendarData.map((post, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-600">Jour {post.day}</span>
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">{post.content_type}</span>
                    </div>
                    <p className="font-medium mt-1">{post.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'prompts':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">3. Personnalisez vos prompts</h2>
            <p className="text-gray-500">Ajustez le style de vos contenus</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ton</label>
                <select
                  value={promptCustomizations.tone}
                  onChange={(e) => setPromptCustomizations({...promptCustomizations, tone: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2"
                >
                  <option value="professionnel">Professionnel</option>
                  <option value="décontracté">Décontracté</option>
                  <option value="humoristique">Humoristique</option>
                  <option value="inspirant">Inspirant</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longueur</label>
                <select
                  value={promptCustomizations.length}
                  onChange={(e) => setPromptCustomizations({...promptCustomizations, length: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2"
                >
                  <option value="short">Court (50-100 mots)</option>
                  <option value="medium">Moyen (150-250 mots)</option>
                  <option value="long">Long (300-500 mots)</option>
                </select>
              </div>
              
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={promptCustomizations.includeEmojis}
                    onChange={(e) => setPromptCustomizations({...promptCustomizations, includeEmojis: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Inclure des émojis</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={promptCustomizations.includeHashtags}
                    onChange={(e) => setPromptCustomizations({...promptCustomizations, includeHashtags: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Inclure des hashtags</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'texts':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">4. Générez les textes</h2>
            <p className="text-gray-500">L'IA rédige vos posts</p>
            
            <button
              onClick={async () => {
                setIsLoading(true);
                const newTexts = [];
                for (const post of calendarData) {
                  const response = await fetch('/api/generate-full-post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      calendarItem: post,
                      contentMode: 'text',
                      strategyId: selectedStrategy?.id,
                      userId: user?.id,
                      customization: promptCustomizations
                    })
                  });
                  const result = await response.json();
                  if (result.success) {
                    newTexts.push({ ...post, content: result.content });
                  }
                }
                setGeneratedTexts(newTexts);
                setIsLoading(false);
                toast.success(`${newTexts.length} textes générés`);
              }}
              disabled={isLoading || calendarData.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
            >
              {isLoading ? 'Génération...' : '📝 Générer tous les textes'}
            </button>
            
            {generatedTexts.map((text, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-xl">
                <p className="font-medium">{text.title}</p>
                <p className="text-sm text-gray-600 mt-2">{text.content?.substring(0, 150)}...</p>
              </div>
            ))}
          </div>
        );

      case 'images':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">5. Générez les images</h2>
            <p className="text-gray-500">Créez des visuels avec DALL·E</p>
            
            <button
              onClick={async () => {
                setIsLoading(true);
                const newImages = [];
                for (const post of generatedTexts) {
                  const response = await fetch('/api/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      post,
                      strategyId: selectedStrategy?.id,
                      graphicCharter: selectedStrategy?.graphic_charter
                    })
                  });
                  const result = await response.json();
                  if (result.success) {
                    newImages.push({ ...post, imageUrl: result.imageUrl });
                  }
                }
                setGeneratedImages(newImages);
                setIsLoading(false);
                toast.success(`${newImages.length} images générées`);
              }}
              disabled={isLoading || generatedTexts.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium disabled:opacity-50"
            >
              {isLoading ? 'Génération...' : '🖼️ Générer toutes les images'}
            </button>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">6. Relecture finale</h2>
            <p className="text-gray-500">Vérifiez et modifiez vos contenus</p>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {generatedImages.map((post, idx) => (
                <div key={idx} className="p-4 bg-white border border-gray-200 rounded-xl">
                  <h3 className="font-semibold">{post.title}</h3>
                  <p className="text-sm text-gray-600 mt-2">{post.content}</p>
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt={post.title} className="mt-3 rounded-lg max-h-48 object-cover" />
                  )}
                  <div className="flex gap-2 mt-3">
                    <button className="text-sm text-blue-600">✏️ Modifier</button>
                    <button className="text-sm text-red-600">🗑️ Supprimer</button>
                    <button className="text-sm text-green-600">✓ Valider</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">7. Programmation</h2>
            <p className="text-gray-500">Envoyez vos posts sur les réseaux sociaux</p>
            
            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 text-center">
              <p className="text-green-800 font-medium">Prêt à programmer !</p>
              <p className="text-sm text-green-600 mt-1">{generatedImages.length} posts seront publiés</p>
              <button
                onClick={async () => {
                  toast.loading('Programmation en cours...', { id: 'schedule' });
                  const response = await fetch('/api/schedule-buffer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      posts: generatedImages,
                      strategyId: selectedStrategy?.id,
                      userId: user?.id
                    })
                  });
                  const result = await response.json();
                  if (result.success) {
                    toast.success(`${result.scheduled} posts programmés !`, { id: 'schedule' });
                  }
                }}
                className="mt-4 w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-xl font-medium"
              >
                🚀 Programmer sur Buffer
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Wizard de création</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-full h-2 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex justify-between mb-8 overflow-x-auto pb-2">
        {steps.map((step, idx) => (
          <button
            key={step.id}
            onClick={() => {
              if (idx <= currentStepIndex) setCurrentStep(step.id);
            }}
            className={`flex flex-col items-center gap-1 min-w-[70px] transition-all ${
              idx <= currentStepIndex ? 'opacity-100' : 'opacity-40'
            } ${idx < currentStepIndex ? 'cursor-pointer' : 'cursor-not-allowed'}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
              idx < currentStepIndex
                ? 'bg-green-600 text-white'
                : idx === currentStepIndex
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {idx < currentStepIndex ? '✓' : step.icon}
            </div>
            <span className="text-xs text-gray-500 hidden sm:block">{step.label}</span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {renderStep()}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        {currentStepIndex > 0 && (
          <button
            onClick={() => setCurrentStep(steps[currentStepIndex - 1].id)}
            className="px-6 py-2.5 text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Précédent
          </button>
        )}
        <div className="flex-1" />
        {currentStepIndex < steps.length - 1 && (
          <button
            onClick={() => setCurrentStep(steps[currentStepIndex + 1].id)}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            Suivant →
          </button>
        )}
      </div>
    </div>
  );
}
