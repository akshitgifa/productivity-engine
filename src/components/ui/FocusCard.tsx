import React from "react";
import { cn } from "@/lib/utils";
import { RotateCcw, Trash2 } from "lucide-react";

interface FocusCardProps {
  title: string;
  project: string;
  tier: 1 | 2 | 3 | 4;
  duration: string;
  isActive?: boolean;
  onUndo?: () => void;
  onDelete?: () => void;
}

const TIER_COLORS = {
  1: "text-tier-1 bg-tier-1/5",
  2: "text-tier-2 bg-tier-2/5",
  3: "text-tier-3 bg-tier-3/5",
  4: "text-tier-4 bg-tier-4/5",
};

export function FocusCard({ 
  title, 
  project, 
  tier, 
  duration, 
  isActive,
  onUndo,
  onDelete
}: FocusCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-surface border border-transparent rounded-2xl p-5 transition-all duration-300 card-shadow",
        isActive ? "focus-precision border-primary/20 bg-surface/80" : "hover:border-border/50"
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full", 
            tier === 1 ? "bg-tier-1" : tier === 2 ? "bg-tier-2" : tier === 3 ? "bg-tier-3" : "bg-tier-4"
          )} />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
            {project}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-500 bg-void/50 px-2 py-0.5 rounded-full border border-border/30">
            {duration}
          </span>
          {(onUndo || onDelete) && (
            <div className="flex gap-1 pl-2 border-l border-border/20">
              {onUndo && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onUndo(); }}
                  className="p-1 text-zinc-500 hover:text-white transition-colors"
                  title="Undo: Return to Active"
                >
                  <RotateCcw size={12} />
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-1 text-zinc-500 hover:text-rose-500 transition-colors"
                  title="Delete Permanently"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <h3 className={cn(
        "text-xl font-semibold tracking-tight leading-tight mb-1",
        isActive ? "text-white" : "text-zinc-300"
      )}>
        {title}
      </h3>
      
      {isActive && (
        <div className="mt-6">
           <div className="h-1 w-full bg-void/50 rounded-full overflow-hidden">
             <div className="h-full bg-primary w-1/4 rounded-full" />
           </div>
        </div>
      )}
    </div>
  );
}
