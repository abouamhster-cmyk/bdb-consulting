'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function StrategyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  const [formData, setFormData] = useState({
    brand_positioning: '',
    persona: '',
    customer_journey: '',
    competitors: '',
    editorial_charter: '',
    graphic_charter: '',
    communication_strategy: ''
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Vous devez être connecté');
      return;
    }
    
    setSaving(true);
    
    const { error, data } = await supabase
      .from('strategies')
      .insert([{ 
        ...formData,
        user_id: user.id
      }])
      .select();
    
    setSaving(false);
    
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      alert('✅ Stratégie enregistrée avec succès');
      router.push('/calendar');
    }
  };

  const steps = [
    { name: 'Positionnement', field: 'brand_positioning', icon: '🎯', placeholder: 'Quel est votre positionnement unique ?' },
    { name: 'Persona', field: 'persona', icon: '👤', placeholder: 'Décrivez votre client idéal' },
    { name: 'Parcours', field: 'customer_journey', icon: '🗺️', placeholder: 'Comment vos clients vous découvrent-ils ?' },
    { name: 'Concurrence', field: 'competitors', icon: '⚔️', placeholder: 'Qui sont vos concurrents ?' },
    { name: 'Éditorial', field: 'editorial_charter', icon: '📝', placeholder: 'Quel ton et quels sujets ?' },
    { name: 'Graphisme', field: 'graphic_charter', icon: '🎨', placeholder: 'Identité visuelle de votre marque' },
    { name: 'Communication', field: 'communication_strategy', icon: '📢', placeholder: 'Objectifs et canaux' },
  ];

  const currentStep = steps[activeStep];
  const progress = ((activeStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Définissez votre stratégie</h1>
        <p className="text-muted-foreground">7 étapes pour une communication parfaite</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Progression</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-full h-2 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex justify-between mb-8 overflow-x-auto pb-2">
        {steps.map((step, idx) => (
          <button
            key={idx}
            onClick={() => setActiveStep(idx)}
            className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${
              activeStep === idx ? 'opacity-100' : 'opacity-40 hover:opacity-70'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
              activeStep === idx ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md' : 'bg-secondary text-muted-foreground'
            }`}>
              {step.icon}
            </div>
            <span className="text-xs text-muted-foreground hidden sm:block">{step.name}</span>
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">{currentStep.name}</h2>
          <p className="text-muted-foreground text-sm mb-6">Remplissez ce champ avec soin</p>
          
          <textarea
            name={currentStep.field}
            value={formData[currentStep.field as keyof typeof formData]}
            onChange={handleChange}
            className="w-full border border-border rounded-xl p-4 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            rows={8}
            placeholder={currentStep.placeholder}
            required={currentStep.field !== 'competitors' && currentStep.field !== 'graphic_charter' && currentStep.field !== 'communication_strategy'}
          />
        </div>

        <div className="flex justify-between mt-6">
          {activeStep > 0 && (
            <button
              type="button"
              onClick={() => setActiveStep(activeStep - 1)}
              className="px-6 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Précédent
            </button>
          )}
          <div className="flex-1" />
          {activeStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setActiveStep(activeStep + 1)}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              Suivant →
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : '✓ Enregistrer la stratégie'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}