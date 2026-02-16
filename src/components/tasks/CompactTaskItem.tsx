import React from "react";
import { cn, formatTimeRemaining } from "@/lib/utils";
import { AlertCircle, Clock, Check, Trash2, Calendar } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface CompactTaskItemProps {
  title: string;
  duration: string;
  dueDate?: Date;
  projectColor?: string;
  onClick?: (e: React.MouseEvent) => void;
  onComplete?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onCommit?: (e: React.MouseEvent) => void;
  isCompleted?: boolean;
  isPlanned?: boolean;
  textColor?: string;
}

export function CompactTaskItem({
  title,
  duration,
  dueDate,
  projectColor,
  onClick,
  onComplete,
  onDelete,
  onCommit,
  isCompleted = false,
  isPlanned = false,
  textColor
}: CompactTaskItemProps) {
  const x = useMotionValue(0);
  
  const handleAction = (e: React.MouseEvent, action?: (e: React.MouseEvent) => void) => {
    e.stopPropagation();
    action?.(e);
    // Snap back after action
    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
  };

  const onDragEnd = (_: any, info: any) => {
    // If swiped more than 40px left, snap to -140 (revealed), else snap back to 0
    const threshold = -40;
    const finalX = info.offset.x < threshold ? -140 : 0;
    animate(x, finalX, { type: "spring", stiffness: 300, damping: 30 });
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-void shadow-inner">
      {/* Action Tray (Mobile Swipe) */}
      <div className="absolute inset-0 flex justify-end items-center gap-1 pr-2">
        <button
          onClick={(e) => handleAction(e, onDelete)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-rose-500/20 text-rose-500 hover:bg-rose-500/40 transition-colors"
        >
          <Trash2 size={16} />
        </button>
        {!isPlanned && !isCompleted && (
          <button
            onClick={(e) => handleAction(e, onCommit)}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 hover:bg-amber-500/40 transition-colors"
          >
            <Calendar size={16} />
          </button>
        )}
        {!isCompleted && (
          <button
            onClick={(e) => handleAction(e, onComplete)}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/40 transition-colors"
          >
            <Check size={16} />
          </button>
        )}
      </div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={0.1}
        onDragEnd={onDragEnd}
        style={{ x }}
        onClick={onClick}
        className={cn(
          "relative group flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer z-10",
          "bg-[#0f0f12] border border-zinc-800/50 shadow-sm", // Solid opaque card
          "transition-[background-color,border-color,opacity,box-shadow] duration-200",
          "hover:bg-[#15151a] hover:border-border/30",
          isCompleted && "opacity-50"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Project Color Dot */}
          <div 
            className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)]" 
            style={{ backgroundColor: projectColor || "var(--primary)" }}
          />
          
          {/* Title */}
          <span 
            className={cn(
              "text-sm font-medium truncate transition-colors",
              isCompleted ? "opacity-30 line-through" : "group-hover:text-primary underline-offset-4"
            )}
            style={{ color: !isCompleted ? textColor : undefined }}
          >
            {title}
          </span>
        </div>

        <div className="flex items-center gap-3 ml-4 shrink-0">
          {/* Desktop Hover Actions */}
          <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isCompleted && (
              <button 
                onClick={(e) => handleAction(e, onComplete)}
                className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-500 transition-all scale-90 hover:scale-100"
              >
                <Check size={14} />
              </button>
            )}
            {!isPlanned && !isCompleted && (
              <button 
                onClick={(e) => { e.stopPropagation(); onCommit?.(e); }}
                className="p-1.5 rounded-lg hover:bg-amber-500/20 text-zinc-500 hover:text-amber-500 transition-all scale-90 hover:scale-100"
              >
                <Calendar size={14} />
              </button>
            )}
            <button 
              onClick={(e) => handleAction(e, onDelete)}
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-500 hover:text-rose-500 transition-all scale-90 hover:scale-100"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Due Date Indicator */}
          {dueDate && (() => {
            const { label, urgency } = formatTimeRemaining(dueDate);
            const isOverdue = label.toLowerCase() === 'overdue';
            return (
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition-all",
                urgency === 'high' ? "bg-rose-500/10 border-rose-500/30 text-rose-500" :
                urgency === 'medium' ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                "bg-zinc-500/10 border-border/30 text-zinc-500"
              )}>
                <AlertCircle size={10} className={cn(urgency === 'high' && "animate-pulse")} />
                {!isOverdue && <span>{label}</span>}
              </div>
            );
          })()}

          {/* Duration */}
          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-600 bg-void/50 px-2 py-0.5 rounded-md border border-border/20">
            <Clock size={8} />
            <span>{duration}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
