import React from "react";
import { useUserStore, TimeConstraint } from "@/store/userStore";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

const TIME_OPTIONS: { label: string; value: TimeConstraint }[] = [
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "1h", value: 60 },
  { label: "2h+", value: 120 },
  { label: "All", value: null },
];

export function TimeAvailableSelector() {
  const { timeAvailable, setTimeAvailable } = useUserStore();

  return (
    <div className="flex flex-1 items-center gap-2 md:gap-3 bg-surface/40 md:bg-surface border border-border/20 md:border-border rounded-xl md:rounded-lg px-2 md:px-3 py-1.5 md:py-2 md:mb-6">
      <div className="flex items-center gap-1 md:gap-1.5 text-zinc-500 shrink-0">
        <Clock size={12} className="md:w-3.5 md:h-3.5" />
        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest leading-none hidden xs:inline">Limit</span>
      </div>
      <div className="h-3 md:h-4 w-px bg-zinc-800 shrink-0" />
      <div className="flex flex-1 justify-between gap-1 overflow-x-auto no-scrollbar">
        {TIME_OPTIONS.map((opt) => {
          const isActive = timeAvailable === opt.value;
          return (
            <button
              key={opt.label}
              onClick={() => setTimeAvailable(opt.value)}
              className={cn(
                "text-[8px] md:text-[10px] font-black uppercase px-2 py-1 md:py-0.5 rounded-lg md:rounded transition-all shrink-0",
                isActive 
                  ? "bg-primary text-void font-black shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
