'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface CompanyConfig {
  company_name: string;
  logo_url: string;
  brand_positioning: string;
  persona: string;
  customer_journey: string;
  editorial_charter: string;
  graphic_charter: string;
  communication_strategy: string;
}

export default function SetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  const [config, setConfig] = useState<CompanyConfig>({
    company_name: '',
    logo_url: '',
    brand_positioning: '',
    persona: '',
    customer_journey: '',
    editorial_charter: '',
    graphic_charter: '',
    communication_strategy: ''
  });

  useEffect(() => {
    if (user) {
      loadExistingConfig();
    }
  }, [user]);

  const loadExistingConfig = async () => {
    const { data } = await supabase
      .from('company_config')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    
    if (data) {
      setConfig(data);
      setCurrentStep(7);
    }
  };

  const handleChange = (field: keyof CompanyConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10MB)');
      return;
    }
    
    setAiLoading(true);
    setUploadedFiles([file]);
    
    // Nettoyer le nom du fichier
    const cleanFileName = file.name.replace(/\s/g, '_').replace(/[éèêë]/g, 'e').replace(/[ç]/g, 'c');
    const fileName = `${user?.id}/${Date.now()}-${cleanFileName}`;
    
    try {
      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company-docs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erreur upload: ' + uploadError.message);
        setAiLoading(false);
        return;
      }
      
      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from('company-docs')
        .getPublicUrl(fileName);
      
      // Sauvegarder en base
      const { error: dbError } = await supabase.from('company_documents').insert({
        user_id: user?.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        status: 'processing'
      });
      
      if (dbError) {
        console.error('DB error:', dbError);
        // Non bloquant, on continue
      }
      
      // Appeler l'IA pour extraire les infos
      toast.loading('Analyse du document par IA...', { id: 'ai-extract' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user?.id || '');
      
      const response = await fetch('/api/extract-document', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConfig(prev => ({
          ...prev,
          brand_positioning: result.data.brand_positioning || prev.brand_positioning,
          persona: result.data.persona || prev.persona,
          customer_journey: result.data.customer_journey || prev.customer_journey,
          editorial_charter: result.data.editorial_charter || prev.editorial_charter,
          graphic_charter: result.data.graphic_charter || prev.graphic_charter,
          communication_strategy: result.data.communication_strategy || prev.communication_strategy,
        }));
        toast.success('Document analysé avec succès !', { id: 'ai-extract' });
      } else {
        toast.error('Erreur analyse: ' + result.error, { id: 'ai-extract' });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo trop volumineux (max 2MB)');
      return;
    }
    
    const cleanFileName = file.name.replace(/\s/g, '_').replace(/[éèêë]/g, 'e').replace(/[ç]/g, 'c');
    const fileName = `logos/${user?.id}/logo-${Date.now()}-${cleanFileName}`;
    
    const { data, error } = await supabase.storage
      .from('company-assets')
      .upload(fileName, file);
    
    if (error) {
      toast.error('Erreur upload logo: ' + error.message);
      return;
    }
    
    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl(fileName);
    
    setConfig(prev => ({ ...prev, logo_url: urlData.publicUrl }));
    toast.success('Logo uploadé');
  };

  const handleSubmit = async () => {
    // Validation des champs obligatoires
    if (!config.company_name) {
      toast.error('Veuillez saisir le nom de votre entreprise');
      return;
    }
    if (!config.brand_positioning) {
      toast.error('Veuillez saisir le positionnement de votre marque');
      return;
    }
    if (!config.persona) {
      toast.error('Veuillez saisir votre persona cible');
      return;
    }
    if (!config.customer_journey) {
      toast.error('Veuillez saisir le parcours client');
      return;
    }
    if (!config.editorial_charter) {
      toast.error('Veuillez saisir la charte éditoriale');
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase
      .from('company_config')
      .upsert({
        user_id: user?.id,
        ...config,
        status: 'completed',
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      toast.error('Erreur: ' + error.message);
    } else {
      toast.success('Configuration sauvegardée !');
      router.push('/params');
    }
    
    setLoading(false);
  };

  const steps = [
    { name: 'Entreprise', icon: '🏢', field: 'company_name' },
    { name: 'Positionnement', icon: '🎯', field: 'brand_positioning' },
    { name: 'Persona', icon: '👤', field: 'persona' },
    { name: 'Parcours', icon: '🗺️', field: 'customer_journey' },
    { name: 'Charte éditoriale', icon: '📝', field: 'editorial_charter' },
    { name: 'Charte graphique', icon: '🎨', field: 'graphic_charter' },
    { name: 'Communication', icon: '📢', field: 'communication_strategy' },
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Veuillez vous connecter</p>
        <a href="/login" className="text-primary hover:underline mt-2 inline-block">Se connecter →</a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Configuration de votre entreprise</h1>
        <p className="text-muted-foreground">Ces informations serviront de base pour toute votre stratégie marketing</p>
      </div>

      {/* Import documents */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl p-6 mb-8 border border-blue-100 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📄</span>
          <h2 className="text-lg font-semibold text-foreground">Importez vos documents</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Uploadez vos briefs, chartes ou tout document existant. L'IA analysera et préremplira automatiquement les champs.
        </p>
        
        <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl bg-white/50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-900 cursor-pointer transition-all">
          <div className="text-center">
            <span className="text-2xl block mb-1">📁</span>
            <span className="text-sm text-muted-foreground">Cliquez ou glissez vos fichiers (PDF, DOC, TXT)</span>
            <span className="text-xs text-muted-foreground block mt-1">Max 10Mo</span>
          </div>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
            disabled={aiLoading}
          />
        </label>
        
        {aiLoading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-primary">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span>Analyse en cours par l'IA...</span>
          </div>
        )}
        
        {uploadedFiles.length > 0 && (
          <div className="mt-3 text-sm text-green-600 dark:text-green-400">
            ✓ {uploadedFiles[0].name} analysé
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Configuration</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div className="bg-gradient-to-r from-primary to-purple-600 rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Steps navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {steps.map((step, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentStep(idx)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              idx === currentStep
                ? 'bg-primary text-primary-foreground'
                : idx < currentStep
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            <span className="mr-2">{step.icon}</span>
            {step.name}
            {idx < currentStep && <span className="ml-2">✓</span>}
          </button>
        ))}
      </div>

      {/* Formulaire */}
      <div className="card p-8">
        {currentStep === 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">🏢 Informations générales</h2>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nom de l'entreprise</label>
              <input
                type="text"
                value={config.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                className="input"
                placeholder="Ex: BDB Consulting"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Logo</label>
              <div className="flex items-center gap-4">
                {config.logo_url && (
                  <div className="relative w-20 h-20">
                    <Image src={config.logo_url} alt="Logo" fill className="object-contain rounded-lg" unoptimized />
                  </div>
                )}
                <label className="px-4 py-2 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors">
                  <span className="text-sm text-secondary-foreground">📁 Choisir un logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleLogoUpload(e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">🎯 Positionnement de marque</h2>
            <p className="text-sm text-muted-foreground">Définissez l'identité unique de votre marque</p>
            <textarea
              value={config.brand_positioning}
              onChange={(e) => handleChange('brand_positioning', e.target.value)}
              className="input h-48"
              placeholder="Ex: Marque premium de cosmétiques naturels pour femmes actives..."
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">👤 Persona cible</h2>
            <p className="text-sm text-muted-foreground">Décrivez votre client idéal</p>
            <textarea
              value={config.persona}
              onChange={(e) => handleChange('persona', e.target.value)}
              className="input h-48"
              placeholder="Âge, profession, intérêts, problèmes, objectifs..."
            />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">🗺️ Parcours client</h2>
            <p className="text-sm text-muted-foreground">Cartographiez le chemin de vos clients</p>
            <textarea
              value={config.customer_journey}
              onChange={(e) => handleChange('customer_journey', e.target.value)}
              className="input h-48"
              placeholder="Découverte → Considération → Décision → Fidélisation"
            />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">📝 Charte éditoriale</h2>
            <p className="text-sm text-muted-foreground">Ton, sujets, valeurs</p>
            <textarea
              value={config.editorial_charter}
              onChange={(e) => handleChange('editorial_charter', e.target.value)}
              className="input h-48"
              placeholder="Ton : Professionnel mais accessible | Sujets : Conseils, tendances | Valeurs : Transparence, innovation"
            />
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">🎨 Charte graphique</h2>
            <p className="text-sm text-muted-foreground">Couleurs, typos, style visuel</p>
            <textarea
              value={config.graphic_charter}
              onChange={(e) => handleChange('graphic_charter', e.target.value)}
              className="input h-48"
              placeholder="Couleurs : Bleu (#1E3A8A) | Typos : Montserrat | Style : Moderne, minimaliste"
            />
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">📢 Stratégie de communication</h2>
            <p className="text-sm text-muted-foreground">Objectifs, canaux, fréquence</p>
            <textarea
              value={config.communication_strategy}
              onChange={(e) => handleChange('communication_strategy', e.target.value)}
              className="input h-48"
              placeholder="Objectifs : +30% d'engagement | Canaux : LinkedIn, Instagram | Fréquence : 3-4 posts/semaine"
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Précédent
            </button>
          )}
          <div className="flex-1" />
          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="btn-primary"
            >
              Suivant →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Sauvegarde...' : '✓ Finaliser la configuration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}