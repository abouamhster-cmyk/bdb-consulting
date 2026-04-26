'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  item: {
    day: number;
    title: string;
    hook: string;
    cta: string;
    content_type: string;
  };
}

export function SortableItem({ id, item }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg ring-2 ring-blue-300' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Numéro du jour */}
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
          <span className="text-sm font-bold text-blue-600">J{item.day}</span>
        </div>
        
        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">
              {item.content_type}
            </span>
          </div>
          <h3 className="font-medium text-gray-900 text-sm sm:text-base">
            {item.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {item.hook}
          </p>
          <p className="text-sm text-blue-600 mt-2">🎯 {item.cta}</p>
        </div>
        
        {/* Handle visuel pour drag */}
        <div className="flex-shrink-0 text-gray-300 group-hover:text-gray-400 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      </div>
    </div>
  );
}
