"use client";

import React, { useEffect, useState } from "react";
import { FocusCard } from "@/components/ui/FocusCard";
import { Search, Filter, Trash2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

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
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleComplete = async (id: string) => {
    await supabase.from('tasks').update({ state: 'Done' }).eq('id', id);
    setTasks(tasks.filter(t => t.id !== id));
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(filter.toLowerCase()) || 
    t.projects?.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="px-6 pt-12 max-w-md mx-auto">
      <header className="mb-8">
        <h1 className="text-xs font-mono text-primary uppercase tracking-[0.2em] mb-4">
          Central Task Manager
        </h1>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
            <input 
              type="text" 
              placeholder="Filter tasks..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 font-mono text-xs outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
      </header>

      <section className="space-y-4 pb-12">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Active Database</span>
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{filteredTasks.length} Items</span>
        </div>
        
        {filteredTasks.map((task) => (
          <div key={task.id} className="group relative">
            <FocusCard 
              title={task.title}
              project={task.projects?.name || 'Orbit'}
              tier={task.projects?.tier || 3}
              duration={task.est_duration_minutes < 60 ? `${task.est_duration_minutes}m` : `${Math.floor(task.est_duration_minutes / 60)}h`}
            />
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleComplete(task.id)}
                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded border border-emerald-500/20 transition-colors"
              >
                <CheckCircle2 size={14} />
              </button>
              <button 
                onClick={() => handleDelete(task.id)}
                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded border border-rose-500/20 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && !isLoading && (
          <div className="text-center py-20 text-zinc-600 font-mono text-xs uppercase border border-dashed border-border rounded-lg">
            No matches in current orbit
          </div>
        )}
      </section>
    </div>
  );
}
