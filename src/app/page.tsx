"use client";

import { useEffect, useState } from "react";
import { FocusCard } from "@/components/ui/FocusCard";
import { ModeSelector } from "@/components/layout/ModeSelector";
import { useUserStore } from "@/store/userStore";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { sortTasksByUrgency, filterAdminTasks, Task } from "@/lib/engine";

export default function Home() {
  const { mode } = useUserStore();
  const [focusTasks, setFocusTasks] = useState<Task[]>([]);
  const [adminTasks, setAdminTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchTasks() {
      const { data } = await supabase
        .from('tasks')
        .select(`
          id, 
          title, 
          project_id, 
          due_date, 
          est_duration_minutes, 
          energy_tag,
          last_touched_at,
          projects(name, tier, decay_threshold_days)
        `)
        .eq('state', 'Active');

      if (data) {
        const transformedTasks: Task[] = data.map((t: any) => ({
          id: t.id,
          title: t.title,
          projectId: t.projects?.name || t.project_id,
          projectTier: t.projects?.tier || 3,
          lastTouchedAt: new Date(t.last_touched_at),
          decayThresholdDays: t.projects?.decay_threshold_days || 15,
          dueDate: t.due_date ? new Date(t.due_date) : undefined,
          energyTag: t.energy_tag,
          durationMinutes: t.est_duration_minutes || 30
        }));

        const sorted = sortTasksByUrgency(transformedTasks, mode);
        const { focus, admin } = filterAdminTasks(sorted);
        setFocusTasks(focus);
        setAdminTasks(admin);
      }
      setIsLoading(false);
    }

    fetchTasks();
  }, [mode, supabase]);

  return (
    <div className="px-6 pt-12 max-w-md mx-auto">
      <header className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xs font-mono text-primary uppercase tracking-[0.2em]">
            Priority Syllabus
          </h1>
          <span className="text-[10px] font-mono text-zinc-600">
            SYSTEM_STATUS: {isLoading ? "SYNCING..." : "NOMINAL"}
          </span>
        </div>
        <div className="h-px w-full bg-zinc-800" />
      </header>

      <ModeSelector />

      <section className="space-y-4">
        {focusTasks.length > 0 ? (
          focusTasks.map((task, i) => {
            const isFirst = i === 0;
            return (
              <div key={task.id} className="relative">
                <FocusCard
                  title={task.title}
                  project={task.projectId}
                  tier={task.projectTier as any}
                  duration={task.durationMinutes < 60 ? `${task.durationMinutes}m` : `${Math.floor(task.durationMinutes / 60)}h`}
                  isActive={isFirst}
                />
                {isFirst && (
                  <button 
                    onClick={async () => {
                      // 1. Mark task as done
                      await supabase.from('tasks').update({ state: 'Done' }).eq('id', task.id);
                      
                      // 2. Rejuvenate project health
                      if (task.projectId) {
                        await supabase
                          .from('projects')
                          .update({ last_touched_at: new Date().toISOString() })
                          .eq('name', task.projectId);
                      }
                      
                      window.location.reload(); 
                    }}
                    className="absolute right-4 bottom-4 bg-primary/20 hover:bg-primary/40 text-primary px-3 py-1 rounded text-[10px] font-mono uppercase border border-primary/30 transition-all font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  >
                    Resolve
                  </button>
                )}
              </div>
            );
          })
        ) : !isLoading && (
          <div className="text-center py-12 border border-dashed border-border rounded-lg text-zinc-600 text-xs font-mono uppercase tracking-widest">
            Vacuum State: 0 Tasks
          </div>
        )}
      </section>

      <Link 
        href="/tasks"
        className={cn(
          "mt-12 p-4 border border-dashed border-border rounded-lg block transition-all group hover:border-primary/50",
          adminTasks.length === 0 ? "opacity-20 grayscale" : "opacity-60"
        )}
      >
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-mono uppercase tracking-widest block text-zinc-400 group-hover:text-primary transition-colors">
            Admin Batch
          </span>
          {adminTasks.length > 0 && (
            <span className="text-[10px] font-mono text-primary animate-pulse">
              {adminTasks.length} DETECTED
            </span>
          )}
        </div>
        <div className="text-sm font-light text-zinc-400">
          {adminTasks.length > 0 
            ? `${adminTasks.length} micro-tasks aggregated. Click to process.` 
            : "No fragmentation detected."}
        </div>
      </Link>
    </div>
  );
}
