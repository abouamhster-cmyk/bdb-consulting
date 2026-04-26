'use client';

import { useState } from 'react';
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
import { SortableItem } from './SortableItem';

interface CalendarItem {
  id: string;
  day: number;
  title: string;
  hook: string;
  cta: string;
  content_type: string;
}

interface DraggableCalendarProps {
  items: CalendarItem[];
  onReorder: (items: CalendarItem[]) => void;
}

export default function DraggableCalendar({ items, onReorder }: DraggableCalendarProps) {
  const [calendarItems, setCalendarItems] = useState(items);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = calendarItems.findIndex((item) => item.id === active.id);
      const newIndex = calendarItems.findIndex((item) => item.id === over?.id);
      
      const newItems = arrayMove(calendarItems, oldIndex, newIndex);
      // Recalculer les jours
      const renumberedItems = newItems.map((item, idx) => ({ ...item, day: idx + 1 }));
      setCalendarItems(renumberedItems);
      onReorder(renumberedItems);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={calendarItems.map(item => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {calendarItems.map((item) => (
            <SortableItem key={item.id} id={item.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
