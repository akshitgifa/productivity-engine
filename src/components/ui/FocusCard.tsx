import React, { useState, useRef, useCallback, useEffect } from "react";
import { cn, formatTimeRemaining } from "@/lib/utils";
import { hexToRgba } from "@/lib/colors";
import { RotateCcw, Trash2, Check, Maximize2, AlertCircle } from "lucide-react";
import { motion, useMotionValue } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ActionBubbles, BUBBLE_POSITIONS } from "./ActionBubbles";

interface FocusCardProps {
  title: string;
  project: string;
  tier: 1 | 2 | 3 | 4;
  duration: string;
  isActive?: boolean;
  onUndo?: () => void;
  onDelete?: () => void;
  onComplete?: () => void;
  onClick?: () => void;
  subtasksCount?: number;
  completedSubtasksCount?: number;
  dueDate?: Date;
  projectColor?: string;
  isPlanned?: boolean;
  onPlannedChange?: (isPlanned: boolean) => void;
  onInteractionChange?: (active: boolean) => void;
  // Unified drag props
  isDragging?: boolean;
  dragOffset?: { x: number; y: number };
  dragStartCenter?: { x: number; y: number } | null;
}

const BUBBLE_RADIUS = 250; // px — past this, bubbles dismiss
const LONG_PRESS_MS = 350; // ms to activate bubbles

export function FocusCard({ 
  title, 
  project, 
  tier, 
  duration, 
  isActive,
  onUndo,
  onDelete,
  onComplete,
  onClick,
  subtasksCount = 0,
  completedSubtasksCount = 0,
  dueDate,
  projectColor,
  isPlanned,
  onPlannedChange,
  onInteractionChange,
  isDragging,
  dragOffset,
  dragStartCenter
}: FocusCardProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  // — Mobile bubble state (Now reactive) —
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const lastIsDragging = useRef(false);
  const handlersRef = useRef({ onComplete, onDelete, onPlannedChange, isPlanned });

  // Update refs on every render to always have the latest functions
  useEffect(() => {
    handlersRef.current = { onComplete, onDelete, onPlannedChange, isPlanned };
  });


  // Reactive bubble logic
  const bubblesActive = isMobile && isDragging && dragOffset 
    ? (Math.sqrt(dragOffset.x * dragOffset.x + dragOffset.y * dragOffset.y) < BUBBLE_RADIUS)
    : false;

  useEffect(() => {
    if (!isMobile || !isDragging || !dragOffset) {
      setActiveActionId(prev => prev === null ? null : null);
      return;
    }

    const { x: actualX, y: actualY } = dragOffset;

    setActiveActionId(prev => {
      let next: string | null = null;
      const TRIGGER_THRESHOLD = 40; // Maintain generous hit area around bubble center

      for (const action of BUBBLE_POSITIONS) {
        const dist = Math.sqrt(Math.pow(actualX - action.pos.x, 2) + Math.pow(actualY - action.pos.y, 2));
        if (dist <= TRIGGER_THRESHOLD) {
          next = action.id;
          break;
        }
      }
      return prev === next ? prev : next;
    });
  }, [isMobile, isDragging, dragOffset]);

  // Trigger actions on drag end
  useEffect(() => {
    if (lastIsDragging.current && !isDragging && activeActionId) {
      const { onComplete, onDelete, onPlannedChange, isPlanned } = handlersRef.current;
      if (activeActionId === "complete") onComplete?.();
      else if (activeActionId === "delete") onDelete?.();
      else if (activeActionId === "today") onPlannedChange?.(!isPlanned);
    }
    lastIsDragging.current = !!isDragging;
  }, [isDragging, activeActionId]);

  const cardContent = (
    <div className="flex flex-col h-full pointer-events-none">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-1.5 h-1.5 rounded-full" 
            style={{ backgroundColor: projectColor || (tier === 1 ? "#ef4444" : tier === 2 ? "#3b82f6" : "#10b981") }}
          />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
            {project}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {dueDate && (() => {
            const { label, urgency } = formatTimeRemaining(dueDate);
            return (
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all",
                urgency === 'high' ? "bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse" :
                urgency === 'medium' ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                urgency === 'low' ? "bg-primary/10 border-primary/30 text-primary" :
                "bg-zinc-500/10 border-border/30 text-zinc-500"
              )}>
                <AlertCircle size={10} />
                <span>{label}</span>
              </div>
            );
          })()}
          <span className="text-[10px] font-bold text-zinc-500 bg-void/50 px-2 py-0.5 rounded-full border border-border/30">
            {duration}
          </span>
          {!isMobile && onUndo && (
            <button 
              onClick={(e) => { e.stopPropagation(); onUndo(); }}
              className="p-1 text-zinc-500 hover:text-white transition-colors ml-1 pointer-events-auto"
              title="Undo"
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>
      </div>
      
      <h3 className={cn(
        "text-xl font-semibold tracking-tight leading-tight mb-1",
        isActive ? "text-white" : "text-zinc-300"
      )}>
        {title}
      </h3>
      
      {isActive && subtasksCount > 0 && (
        <div className="absolute bottom-6 right-6 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
            {completedSubtasksCount}/{subtasksCount}
          </span>
        </div>
      )}

      {!isMobile && !isDragging && (
        <div className="absolute inset-0 bg-void/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-2xl flex items-center justify-center gap-4 z-10 pointer-events-auto">
          {onPlannedChange && (
            <button 
              onClick={(e) => { e.stopPropagation(); onPlannedChange(!isPlanned); }}
              className={cn(
                "w-12 h-12 rounded-full border flex items-center justify-center transition-all",
                isPlanned 
                  ? "bg-primary text-void border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]" 
                  : "bg-surface/10 border-border/20 text-zinc-500 hover:border-zinc-300 hover:text-zinc-200"
              )}
              title={isPlanned ? "Remove from Today" : "Add to Today"}
            >
              <span className="text-xl font-black">+</span>
            </button>
          )}
          {onComplete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-void transition-all"
              title="Complete"
            >
              <Check size={20} />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            className="w-12 h-12 rounded-full flex items-center justify-center hover:text-void transition-all"
            style={{ 
              backgroundColor: projectColor ? `${projectColor}12` : 'rgba(var(--primary), 0.08)', 
              borderColor: projectColor ? `${projectColor}20` : 'rgba(var(--primary), 0.15)',
              color: projectColor || 'var(--primary)'
            }}
            title="Open Details"
          >
            <Maximize2 size={20} />
          </button>
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
              title="Delete"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn(
      "relative overflow-visible group",
      bubblesActive ? "z-50" : "z-auto"
    )}>
      {/* Portal-based bubbles positioned at card's original center */}
      <ActionBubbles 
        isVisible={bubblesActive} 
        activeActionId={activeActionId}
        onPlannedChange={isPlanned}
        center={dragStartCenter || undefined}
      />

      <motion.div
        onClick={() => {
          if (!bubblesActive) onClick?.();
        }}
        className={cn(
          "relative bg-surface border rounded-2xl p-5 card-shadow cursor-pointer will-change-transform z-10",
          bubblesActive ? "transition-none" : "transition-all duration-300",
          isActive ? "bg-surface/90 border-transparent shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)]" : "border-transparent hover:border-border/50",
          !isMobile && !isDragging && "group-hover:border-border/30",
          bubblesActive && "brightness-75 contrast-110"
        )}
        style={{ 
          background: isActive 
            ? `linear-gradient(135deg, ${hexToRgba(projectColor || '#facc15', 0.05)} 0%, rgba(15, 15, 18, 0.95) 100%)` 
            : `linear-gradient(135deg, ${hexToRgba(projectColor || '#facc15', 0.02)} 0%, rgba(15, 15, 18, 0.98) 100%)`,
          borderColor: isActive && projectColor ? `${projectColor}22` : projectColor ? `${projectColor}15` : undefined,
          boxShadow: isActive && projectColor ? `0 0 40px -15px ${hexToRgba(projectColor, 0.2)}` : undefined
        }}
      >
        {/* Left Accent Bar */}
        <div 
          className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full transition-all duration-300"
          style={{ 
            backgroundColor: projectColor || '#facc15',
            opacity: isActive ? 1 : 0.3
          }}
        />
        {cardContent}
      </motion.div>
    </div>
  );
}
