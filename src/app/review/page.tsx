"use client";

import React from "react";
import { TrendingUp, BarChart, Clock } from "lucide-react";

export default function ReviewPage() {
  return (
    <div className="px-6 pt-12 max-w-md mx-auto">
      <header className="mb-10">
        <h1 className="text-xs font-mono text-primary uppercase tracking-[0.2em] mb-1">
          Performance Analytics
        </h1>
        <div className="h-px w-full bg-zinc-800" />
      </header>

      <section className="space-y-6">
        {/* Simple Input/Output Chart Replacement */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={16} className="text-emerald-500" />
            <span className="text-xs font-mono uppercase tracking-widest">Input vs Output</span>
          </div>
          
          <div className="h-32 flex items-end justify-between gap-2 px-2">
            {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-zinc-800 rounded-t-sm relative group overflow-hidden" style={{ height: `${h}%` }}>
                  <div className="absolute inset-0 bg-primary opacity-20 group-hover:opacity-40 transition-opacity" />
                  {i === 3 && <div className="absolute top-0 w-full h-1 bg-primary shadow-[0_0_10px_var(--color-primary)]" />}
                </div>
                <span className="text-[8px] font-mono text-zinc-700">MTWTFSS"[i]</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <BarChart size={14} className="text-primary mb-2" />
            <span className="text-[10px] font-mono text-zinc-600 uppercase block mb-1">Focus Efficiency</span>
            <span className="text-xl font-mono">82%</span>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <Clock size={14} className="text-amber-500 mb-2" />
            <span className="text-[10px] font-mono text-zinc-600 uppercase block mb-1">Deep Work Hrs</span>
            <span className="text-xl font-mono">34.5</span>
          </div>
        </div>

        <div className="bg-void border border-dashed border-border p-4 rounded-lg">
          <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Stagnation Report</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Project: Legacy Maintenance</span>
              <span className="text-entropy font-mono">14 days idle</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Task: Update Docs</span>
              <span className="text-entropy font-mono">8 days idle</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
