import React from "react";
import { cn } from "@/lib/utils";

interface FocusCardProps {
  title: string;
  project: string;
  tier: 1 | 2 | 3 | 4;
  duration: string;
  isActive?: boolean;
}

const TIER_COLORS = {
  1: "text-tier-1 bg-tier-1/10 border-tier-1/20",
  2: "text-tier-2 bg-tier-2/10 border-tier-2/20",
  3: "text-tier-3 bg-tier-3/10 border-tier-3/20",
  4: "text-tier-4 bg-tier-4/10 border-tier-4/20",
};

export function FocusCard({ title, project, tier, duration, isActive }: FocusCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-surface border border-border rounded-lg p-4 transition-all duration-300",
        isActive && "focus-glow border-primary/50"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border",
          TIER_COLORS[tier]
        )}>
          {project}
        </span>
        <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-tighter bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700/50">
          {duration}
        </span>
      </div>
      
      <h3 className={cn(
        "text-lg font-medium tracking-tight",
        isActive ? "text-primary" : "text-zinc-200"
      )}>
        {title}
      </h3>
      
      {isActive && (
        <div className="mt-4 flex gap-2">
          <div className="h-0.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-1/3 shadow-[0_0_8px_var(--color-primary)]" />
          </div>
        </div>
      )}
    </div>
  );
}
