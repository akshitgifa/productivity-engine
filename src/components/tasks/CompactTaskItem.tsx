import React from "react";
import { cn, formatTimeRemaining } from "@/lib/utils";
import { AlertCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface CompactTaskItemProps {
  title: string;
  duration: string;
  dueDate?: Date;
  projectColor?: string;
  onClick?: (e: React.MouseEvent) => void;
  isCompleted?: boolean;
  textColor?: string;
}

export function CompactTaskItem({
  title,
  duration,
  dueDate,
  projectColor,
  onClick,
  isCompleted = false,
  textColor
}: CompactTaskItemProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ x: 4 }}
      className={cn(
        "group flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer transition-all",
        "bg-surface/30 hover:bg-surface/50 border border-transparent hover:border-border/20",
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
            "text-sm font-medium truncate",
            isCompleted ? "opacity-50 line-through" : ""
          )}
          style={{ color: !isCompleted ? textColor : undefined }}
        >
          {title}
        </span>
      </div>

      <div className="flex items-center gap-3 ml-4 shrink-0">
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
  );
}
