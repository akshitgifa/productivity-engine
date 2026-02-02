"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, TrendingUp, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface KPI {
  id: string;
  name: string;
  value: number;
}

interface KPIManagerProps {
  projectId: string;
}

export function KPIManager({ projectId }: KPIManagerProps) {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchKPIs() {
      const { data } = await supabase
        .from('project_kpis')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (data) setKpis(data);
    }
    fetchKPIs();
  }, [projectId, supabase]);

  const handleAddKPI = async () => {
    if (!newName) return;
    const { data, error } = await supabase
      .from('project_kpis')
      .insert({ project_id: projectId, name: newName, value: 0 })
      .select()
      .single();

    if (!error && data) {
      setKpis([...kpis, data]);
      setNewName("");
      setIsAdding(false);
    }
  };

  const handleUpdateValue = async (id: string, newValue: number) => {
    // Optimistic Update
    const previousKpis = [...kpis];
    setKpis(kpis.map(k => k.id === id ? { ...k, value: newValue } : k));

    const { error } = await supabase
      .from('project_kpis')
      .update({ value: newValue })
      .eq('id', id);

    if (error) {
      // Rollback on error
      setKpis(previousKpis);
      console.error("Failed to update KPI:", error);
    }
  };

  const handleDeleteKPI = async (id: string) => {
    // Optimistic Delete
    const previousKpis = [...kpis];
    setKpis(kpis.filter(k => k.id !== id));

    const { error } = await supabase
      .from('project_kpis')
      .delete()
      .eq('id', id);

    if (error) {
      setKpis(previousKpis);
      console.error("Failed to delete KPI:", error);
    }
  };

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Success Metrics</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all border",
            isAdding ? "bg-primary border-primary text-void" : "bg-surface border-border text-zinc-400 hover:text-white"
          )}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {isAdding && (
          <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
            <input 
              autoFocus
              className="flex-1 bg-void border border-border/50 rounded-2xl px-5 py-3 text-sm outline-none focus:border-primary/50 font-bold tracking-tight"
              placeholder="Metric description..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddKPI()}
            />
            <button 
              onClick={handleAddKPI}
              className="bg-primary text-void px-6 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest card-shadow"
            >
              Add
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.id} className="bg-surface border border-transparent rounded-2xl p-5 flex justify-between items-center group card-shadow hover:border-border/50 transition-all">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{kpi.name}</span>
                <div className="flex items-center gap-6">
                  <span className="text-3xl font-extrabold text-white tracking-tighter">{kpi.value}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdateValue(kpi.id, Math.max(0, kpi.value - 1))}
                      className="w-10 h-10 rounded-xl bg-void border border-border/50 flex items-center justify-center text-zinc-500 hover:text-rose-500 hover:border-rose-500/30 transition-all"
                    >
                      <Minus size={14} />
                    </button>
                    <button 
                      onClick={() => handleUpdateValue(kpi.id, kpi.value + 1)}
                      className="w-10 h-10 rounded-xl bg-void border border-border/50 flex items-center justify-center text-zinc-500 hover:text-primary hover:border-primary/30 transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => handleDeleteKPI(kpi.id)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-800 hover:text-rose-500 transition-colors group-hover:bg-rose-500/5"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {kpis.length === 0 && !isAdding && (
          <div className="text-center py-10 bg-void/30 border border-dashed border-border rounded-3xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-700">0 Metrics configured</p>
          </div>
        )}
      </div>
    </section>
  );
}
