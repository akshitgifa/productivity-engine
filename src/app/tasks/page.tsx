"use client";

import React, { useEffect, useState } from "react";
import { FocusCard } from "@/components/ui/FocusCard";
import { Search, Filter, Trash2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useTaskFulfillment } from "@/hooks/useTaskFulfillment";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { completeTask } = useTaskFulfillment();

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*, projects(name, tier)')
      .eq('state', 'Active')
      .order('created_at', { ascending: false });
    
    if (data) setTasks(data);
    setIsLoading(false);
  }

  const handleDelete = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  };

  const handleComplete = async (task: any) => {
    setTasks(tasks.filter(t => t.id !== task.id));
    try {
      await completeTask({
        id: task.id,
        title: task.title,
        projectId: task.project_id,
        durationMinutes: task.est_duration_minutes,
        recurrenceIntervalDays: task.recurrence_interval_days,
        energyTag: task.energy_tag
      });
    } catch (error) {
      console.error("Fulfillment Error:", error);
      fetchTasks(); // Rollback on error
    }
  };

  const handleUpdateStatus = async (id: string, newState: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, state: newState } : t));
    await supabase.from('tasks').update({ state: newState }).eq('id', id);
  };

  const handleSetRecurrence = async (id: string, days: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, recurrence_interval_days: days } : t));
    await supabase.from('tasks').update({ recurrence_interval_days: days }).eq('id', id);
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(filter.toLowerCase()) || 
    t.projects?.name?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="px-6 pt-12 pb-32 max-w-md md:max-w-6xl mx-auto">
      <header className="mb-10 text-center md:text-left">
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-1">Intelligence</p>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">Manager</h1>
        
        <div className="flex gap-4 max-w-2xl md:mx-0 mx-auto">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Filter tasks by title or project..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-surface border border-transparent rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:border-primary/50 transition-all font-medium card-shadow"
            />
          </div>
        </div>
      </header>

      <section className="space-y-6">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-[11px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Active Objectives</h2>
          <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest bg-void/50 px-3 py-1 rounded-full border border-border/20">{filteredTasks.length} Entities</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <div key={task.id} className="group relative bg-surface border border-transparent rounded-3xl p-6 transition-all card-shadow hover:border-border/30">
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 leading-none">{task.projects?.name || 'Orbit'}</span>
                   <h3 className="text-lg font-bold text-zinc-100 group-hover:text-white transition-colors pr-12 leading-snug">{task.title}</h3>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={() => handleComplete(task)}
                    className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition-all"
                    title="Mark Done"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(task.id)}
                    className="w-10 h-10 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-border/10">
                 {/* State Toggle */}
                 <div className="relative group/select">
                   <select 
                     className="bg-void border border-border/50 rounded-xl px-4 py-2 text-[10px] font-bold uppercase text-zinc-400 outline-none focus:border-primary/40 appearance-none hover:text-zinc-200 transition-colors cursor-pointer"
                     value={task.state}
                     onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                   >
                     <option value="Active">Active State</option>
                     <option value="Waiting">Waiting State</option>
                     <option value="Blocked">Blocked State</option>
                   </select>
                 </div>

                 {/* Recurrence Setup */}
                 <div className="flex items-center bg-void border border-border/50 rounded-xl px-4 py-2 gap-3">
                   <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">Recur:</span>
                   <select 
                     className="bg-transparent text-[10px] font-extrabold text-zinc-500 outline-none appearance-none hover:text-zinc-300 transition-colors cursor-pointer"
                     value={task.recurrence_interval_days || ""}
                     onChange={(e) => handleSetRecurrence(task.id, parseInt(e.target.value))}
                   >
                     <option value="">Static</option>
                     <option value="1">Daily</option>
                     <option value="7">Weekly</option>
                     <option value="15">Bi-Weekly</option>
                     <option value="30">Monthly</option>
                   </select>
                 </div>

                 {task.state === 'Waiting' && (
                    <div className="flex items-center bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                      Deferred
                    </div>
                 )}
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && !isLoading && (
          <div className="text-center py-32 bg-surface/30 rounded-3xl border border-dashed border-border/50">
            <p className="text-zinc-700 font-bold text-[10px] uppercase tracking-widest italic">No objectives in current focus</p>
          </div>
        )}
      </section>
    </div>
  );
}
