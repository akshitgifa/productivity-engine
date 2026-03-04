import React, { useState } from "react";
import { cn, formatTimeRemaining } from "@/lib/utils";
import { hexToRgba } from "@/lib/colors";
import { RotateCcw, Trash2, Check, Maximize2, AlertCircle, Calendar, MoreHorizontal, CalendarX, Sparkles, CalendarPlus } from "lucide-react";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";
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
  plannedDate?: string;
  plannedDateType?: 'on' | 'before';
  isDecayed?: boolean;
  onUnplan?: () => void;
  onReschedule?: (date: string | null, type?: 'on' | 'before') => void;
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
  isDragging,
  plannedDate,
  plannedDateType,
  isDecayed,
  onUnplan,
  onReschedule
}: FocusCardProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
          {plannedDateType === 'before' && plannedDate && (
             <span className="text-[10px] font-bold text-cyan-500/80 bg-cyan-500/5 px-2 py-0.5 rounded-full border border-cyan-500/20">
               Within {(() => {
                 // Use local date comparison to avoid UTC offset issues
                 const plannedParts = plannedDate.split('-').map(Number);
                 const today = new Date();
                 const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
                 const plannedMs = new Date(plannedParts[0], plannedParts[1] - 1, plannedParts[2]).getTime();
                 const diff = Math.ceil((plannedMs - todayMs) / (1000 * 60 * 60 * 24));
                 return diff > 0 ? diff : 0;
               })()} days
             </span>
          )}
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
    <div className="relative group">
      {/* Quick Reschedule Menu (Absolute Overlay) */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Click-away backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-transparent cursor-default"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
                animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
              }}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-[calc(100%+8px)] right-4 z-[100] bg-[#1a1a20] border border-white/10 rounded-2xl p-1.5 shadow-2xl min-w-[200px] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-1">
                <div className="px-2 py-1.5 mb-1 border-b border-white/5">
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Quick Reschedule</span>
                </div>

                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsMenuOpen(false);
                    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
                    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                    onReschedule?.(tomorrow, 'on');
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-all text-left group/item"
                >
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover/item:border-primary/40">
                    <Calendar size={12} className="text-primary" />
                  </div>
                  <span className="text-[11px] font-bold">Tomorrow</span>
                </button>

                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsMenuOpen(false);
                    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
                    const date = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
                    onReschedule?.(date, 'before');
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-all text-left group/item"
                >
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover/item:border-cyan-400/40">
                    <Sparkles size={12} className="text-cyan-400" />
                  </div>
                  <span className="text-[11px] font-bold">Within 3 Days</span>
                </button>

                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsMenuOpen(false);
                    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
                    const date = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
                    onReschedule?.(date, 'before');
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-all text-left group/item"
                >
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover/item:border-indigo-400/40">
                    <Sparkles size={12} className="text-indigo-400" />
                  </div>
                  <span className="text-[11px] font-bold">Within 7 Days</span>
                </button>

                {onUnplan && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onUnplan?.(); 
                    setIsMenuOpen(false);
                    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-zinc-500 hover:text-rose-500 transition-all text-left group/item mt-1 border-t border-white/5 pt-2"
                >
                  <div className="w-6 h-6 rounded-lg bg-rose-500/5 flex items-center justify-center border border-rose-500/10 group-hover/item:border-rose-500/20">
                    <CalendarX size={12} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Remove Plan</span>
                </button>
                )}

                {/* Custom Date Picker */}
                <div className="mt-1 border-t border-white/5 pt-2">
                  <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white transition-all cursor-pointer text-left group/item relative">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover/item:border-emerald-400/40">
                      <CalendarPlus size={12} className="text-emerald-400" />
                    </div>
                    <span className="text-[11px] font-bold">Custom Date...</span>
                    <input 
                      type="date" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.value) {
                          setIsMenuOpen(false);
                          animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
                          onReschedule?.(e.target.value, 'on');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative overflow-hidden rounded-2xl group bg-void shadow-inner">
        {/* Action Tray (Mobile Swipe) */}
        <div className="absolute inset-0 flex justify-end items-center gap-2 pr-4">
          {/* Button 3: More (Quick Reschedule) */}
          {!isCompleted && !isMissed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextState = !isMenuOpen;
                setIsMenuOpen(nextState);
                if (!nextState) {
                  animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
                }
              }}
              className={cn(
                 "w-12 h-12 flex items-center justify-center rounded-xl transition-all",
                 isMenuOpen ? "bg-primary text-void scale-110" : "bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800"
              )}
            >
              <MoreHorizontal size={20} />
            </button>
          )}

          {/* Button 2: Context-sensitive action */}
          {isDecayed && onRecommit ? (
            <button
              onClick={(e) => handleAction(e, onRecommit)}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              title="Recommit to Today"
            >
              <RotateCcw size={18} />
            </button>
          ) : !isCompleted && !isMissed && onUnplan ? (
            <button
              onClick={(e) => handleAction(e, onUnplan)}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-zinc-800/30 text-zinc-500 border border-zinc-800/50 hover:bg-zinc-800 transition-colors"
              title="Remove Plan"
            >
              <CalendarX size={18} />
            </button>
          ) : null}

          {/* Button 1: Complete */}
          {!isCompleted && !isMissed && onComplete && (
            <button
              onClick={(e) => handleAction(e, onComplete)}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/40 transition-colors"
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
            <motion.div 
              className={cn(
                "absolute left-0 w-1 rounded-r-full transition-[height,top,bottom,background-color] duration-300",
                plannedDateType === 'before' && !isCompleted && !isMissed && "border-r-2 border-dashed border-cyan-500 bg-transparent w-0"
              )}
              animate={isDecayed && !isCompleted && !isMissed ? {
                opacity: [0.4, 1, 0.4],
                scaleY: [1, 1.05, 1],
                x: [0, 1, 0]
              } : {}}
              transition={isDecayed ? {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              } : {}}
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
    </div>
  );
}
