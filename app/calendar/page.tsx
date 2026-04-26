'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from '../components/SortableItem';
import toast from 'react-hot-toast';

interface CalendarItem {
  id: string;
  day: number;
  title: string;
  hook: string;
  cta: string;
  content_type: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarItem[] | null>(null);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user) {
      fetchStrategies();
      loadSavedOrder();
    }
  }, [user]);

  const fetchStrategies = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('strategies')
      .select('id, brand_positioning')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      setStrategies(data);
      setSelectedStrategyId(data[0].id);
    }
  };

  const loadSavedOrder = () => {
    const saved = localStorage.getItem('calendar_order');
    if (saved) {
      try {
        const order = JSON.parse(saved);
        setCalendarData(order);
      } catch (e) {
        console.error('Erreur chargement ordre:', e);
      }
    }
  };

  const saveOrder = (items: CalendarItem[]) => {
    localStorage.setItem('calendar_order', JSON.stringify(items));
  };

  const generateCalendar = async () => {
    if (!selectedStrategyId || !user) {
      toast.error('Veuillez sélectionner une stratégie');
      return;
    }
    
    setGenerating(true);
    
    try {
      const response = await fetch('/api/generate-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          strategyId: selectedStrategyId,
          userId: user.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const itemsWithIds = result.calendar.map((item: any, idx: number) => ({
          ...item,
          id: `item-${Date.now()}-${idx}`,
          day: idx + 1
        }));
        setCalendarData(itemsWithIds);
        saveOrder(itemsWithIds);
        toast.success(`✅ ${result.calendar.length} posts générés !`);
      } else {
        toast.error('Erreur: ' + result.error);
      }
    } catch (error) {
      toast.error('Erreur: ' + (error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id && calendarData) {
      setIsReordering(true);
      
      const oldIndex = calendarData.findIndex((item) => item.id === active.id);
      const newIndex = calendarData.findIndex((item) => item.id === over?.id);
      
      const newItems = arrayMove(calendarData, oldIndex, newIndex);
      const renumberedItems = newItems.map((item, idx) => ({ ...item, day: idx + 1 }));
      
      setCalendarData(renumberedItems);
      saveOrder(renumberedItems);
      
      setTimeout(() => setIsReordering(false), 300);
    }
  };

  const resetOrder = () => {
    if (calendarData) {
      const originalOrder = [...calendarData].sort((a, b) => a.day - b.day);
      setCalendarData(originalOrder);
      saveOrder(originalOrder);
      toast.success('Ordre réinitialisé');
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Veuillez vous connecter</p>
        <a href="/login" className="text-primary hover:underline">Se connecter →</a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Calendrier éditorial</h1>
        <p className="text-muted-foreground">Générez et organisez votre planning mensuel</p>
      </div>

      <div className="card p-6 mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">
          Stratégie de référence
        </label>
        <select
          value={selectedStrategyId || ''}
          onChange={(e) => setSelectedStrategyId(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-3 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Sélectionnez une stratégie</option>
          {strategies.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.brand_positioning?.substring(0, 60)}...
            </option>
          ))}
        </select>

        <button
          onClick={generateCalendar}
          disabled={generating || !selectedStrategyId}
          className="w-full mt-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Génération en cours...
            </span>
          ) : (
            '✨ Générer le calendrier'
          )}
        </button>
      </div>

      {calendarData && calendarData.length > 0 && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-foreground">📅 Votre planning</h2>
            <div className="flex gap-2">
              <button
                onClick={resetOrder}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                ↺ Réinitialiser
              </button>
              <span className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
                {isReordering ? '💾 Sauvegarde...' : '⋮⋮ Glisser pour réorganiser'}
              </span>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={calendarData.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {calendarData.map((item, idx) => (
                  <SortableItem key={item.id} id={item.id} item={item} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          <div className="mt-6 pt-4 border-t border-border flex gap-3">
            <button
              onClick={() => router.push('/contents')}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium py-3 rounded-xl hover:shadow-lg"
            >
              ✨ Générer les contenus
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(calendarData, null, 2));
                toast.success('Planning copié');
              }}
              className="px-4 py-3 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80"
            >
              📋 Exporter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}