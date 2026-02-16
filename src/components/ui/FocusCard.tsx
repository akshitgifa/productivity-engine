import React, { useState } from "react";
import { cn, formatTimeRemaining } from "@/lib/utils";
import { hexToRgba } from "@/lib/colors";
import { RotateCcw, Trash2, Check, Maximize2, AlertCircle, Calendar } from "lucide-react";
import { motion, useMotionValue, animate } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";

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
  onRecommit?: () => void;
  onInteractionChange?: (active: boolean) => void;
  isCarriedForward?: boolean;
  isMissed?: boolean;
  isCompleted?: boolean;
  // Drag state from ReorderableItem (vertical)
  isDragging?: boolean;
}

export function FocusCard({ 
  title, 
  project, 
  tier, 
  duration, 
  isActive,
  onUndo,
  onDelete,
  onComplete,
  onPlannedChange,
  onRecommit,
  onClick,
  subtasksCount = 0,
  completedSubtasksCount = 0,
  dueDate,
  projectColor,
  isPlanned,
  isCarriedForward,
  isMissed,
  isCompleted,
  isDragging
}: FocusCardProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const x = useMotionValue(0);

  const handleAction = (e: React.MouseEvent, action?: () => void) => {
    e.stopPropagation();
    action?.();
    // Snap back after action
    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
  };

  const onDragEnd = (_: any, info: any) => {
    // If swiped more than 50px left, snap to -180 (revealed), else snap back to 0
    const threshold = -50;
    const finalX = info.offset.x < threshold ? -180 : 0;
    animate(x, finalX, { type: "spring", stiffness: 300, damping: 30 });
  };

  const cardContent = (
    <div className="flex flex-col h-full pointer-events-none">
      <div className={cn("flex justify-between items-start", (isMissed || isCompleted) ? "mb-1" : "mb-2")}>
        <div className="flex items-center gap-2">
          {isCarriedForward && (
             <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]" />
          )}
          <div 
            className="w-1.5 h-1.5 rounded-full" 
            style={{ backgroundColor: projectColor || (tier === 1 ? "#ef4444" : tier === 2 ? "#3b82f6" : "#10b981") }}
          />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
            {isCarriedForward ? "Carried Forward • " : ""}{project}
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
          {!isMobile && onUndo && !isCompleted && !isMissed && (
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
        "font-semibold tracking-tight leading-tight",
        (isMissed || isCompleted) ? "text-base mb-0" : "text-lg mb-0.5",
        isActive ? "text-white" : "text-zinc-300",
        isCompleted && "text-zinc-400 line-through decoration-[3.5px] decoration-primary opacity-100"
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

      {!isMobile && !isDragging && !isCompleted && !isMissed && (
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
          {onRecommit && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRecommit(); }}
              className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary hover:text-void transition-all"
              title="Recommit to Today"
            >
              <RotateCcw size={20} />
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
    <div className="relative overflow-hidden rounded-2xl group bg-void shadow-inner">
      {/* Action Tray (Mobile Swipe) */}
      <div className="absolute inset-0 flex justify-end items-center gap-2 pr-4">
        <button
          onClick={(e) => handleAction(e, onDelete)}
          className="w-12 h-12 flex items-center justify-center rounded-xl bg-rose-500/20 text-rose-500 hover:bg-rose-500/40 transition-colors"
        >
          <Trash2 size={20} />
        </button>
        {isCarriedForward && onRecommit && (
          <button
            onClick={(e) => handleAction(e, onRecommit)}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 hover:bg-amber-500/40 transition-colors"
          >
            <Calendar size={20} />
          </button>
        )}
        {!isCompleted && !isMissed && onComplete && (
          <button
            onClick={(e) => handleAction(e, onComplete)}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/40 transition-colors"
          >
            <Check size={20} />
          </button>
        )}
      </div>

      <motion.div
        drag={isMobile && !isDragging ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: -180, right: 0 }}
        dragElastic={0.1}
        onDragEnd={onDragEnd}
        onClick={() => {
          if (!isMissed && !isCompleted) onClick?.();
        }}
        className={cn(
          "relative border rounded-2xl cursor-pointer will-change-transform z-10",
          "bg-[#0f0f12]", // Strictly opaque color
          "transition-[background-color,border-color,opacity,box-shadow,filter] duration-200",
          (isMissed || isCompleted) ? "py-2.5 px-3.5" : "py-3 px-4 md:py-3.5 md:px-4.5",
          isActive ? "border-transparent shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)] bg-[#15151a]" : "border-transparent border-zinc-800",
          !isMobile && !isDragging && "group-hover:border-zinc-700"
        )}
        style={{ 
          x,
          backgroundColor: '#0f0f12', // Solid base to prevent any transparency
          backgroundImage: isActive 
            ? `linear-gradient(135deg, ${hexToRgba(projectColor || '#facc15', 0.15)} 0%, #0f0f12 100%)` 
            : `linear-gradient(135deg, ${hexToRgba(projectColor || '#facc15', 0.08)} 0%, #0f0f12 100%)`,
          borderColor: isActive && projectColor ? `${projectColor}22` : projectColor ? `${projectColor}15` : undefined,
          boxShadow: isActive && projectColor ? `0 0 40px -15px ${hexToRgba(projectColor, 0.2)}` : undefined
        }}
      >
        <div className={cn(
          "w-full h-full transition-opacity duration-300",
          isMissed ? "opacity-40" : isCompleted ? "opacity-80" : "opacity-100"
        )}>
          {/* Left Accent Bar */}
          <div 
            className="absolute left-0 w-1 rounded-r-full transition-[height,top,bottom,background-color] duration-300"
            style={{ 
              top: (isMissed || isCompleted) ? '12px' : '16px',
              bottom: (isMissed || isCompleted) ? '12px' : '16px',
              backgroundColor: isCompleted ? '#10b981' : isMissed ? '#27272a' : (projectColor || '#facc15')
            }}
          />
          {cardContent}
        </div>
      </motion.div>
    </div>
  );
}
