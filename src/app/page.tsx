"use client";

import { useEffect } from "react";
import { FocusCard } from "@/components/ui/FocusCard";
import { ModeSelector } from "@/components/layout/ModeSelector";
import { TimeAvailableSelector } from "@/components/layout/TimeAvailableSelector";
import { useUserStore } from "@/store/userStore";
import { useTaskFulfillment } from "@/hooks/useTaskFulfillment";
import { CheckCircle2, Share2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";
import { sortTasksByUrgency, filterAdminTasks, mapTaskData } from "@/lib/engine";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { AnimatePresence, motion } from "framer-motion";
import { Task } from "@/lib/engine";

import { db } from "@/lib/db";
import { processOutbox } from "@/lib/sync";

export default function Home() {
  const { mode, timeAvailable } = useUserStore();
  const { completeTask } = useTaskFulfillment();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [projectFilters, setProjectFilters] = useState<string[]>([]);
  const [expandedSegments, setExpandedSegments] = useState<Record<string, boolean>>({
    focus: true,
    ongoing: false,
    inbox: false
  });

  // 1. Fetch Active Tasks Query from Local DB
  const { data: allActive = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks', 'active'],
    queryFn: async () => {
      // Fetch tasks from local Dexie DB
      const tasks = await db.tasks
        .where('state')
        .equals('Active')
        .toArray();
      
      // Filter by waiting_until (Dexie doesn't support complex OR filters easily in 'where')
      const now = new Date().toISOString();
      const filtered = tasks.filter(t => !t.waiting_until || t.waiting_until <= now);

      // Enhance with project data (Manual join since Dexie is NoSQL-style)
      const enhanced = await Promise.all(filtered.map(async (t) => {
        let projects = null;
        if (t.project_id) {
          projects = await db.projects.get(t.project_id);
        }
        // Subtasks count (simplified for now)
        return mapTaskData({ ...t, projects });
      }));

      return enhanced;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: async () => {
      return await db.projects.orderBy('name').toArray();
    }
  });

  // Keep view_prefs on Supabase for now as it's less critical for offline core loop
  // and involves complex merging. We can move it later if needed.
  const { data: homePrefs } = useQuery({
    queryKey: ['view_prefs', 'home'],
    queryFn: async () => {
      const { data } = await supabase
        .from('view_preferences')
        .select('id, value')
        .eq('key', 'home_filters')
        .is('user_id', null)
        .maybeSingle();
      return data || null;
    },
    staleTime: 1000 * 60 * 5
  });

  useEffect(() => {
    const saved = homePrefs?.value?.projectFilterIds;
    if (Array.isArray(saved)) {
      setProjectFilters(saved);
    }
  }, [homePrefs]);

  const savePrefsMutation = useMutation({
    mutationFn: async (nextFilters: string[]) => {
      const { data: existing } = await supabase
        .from('view_preferences')
        .select('id')
        .eq('key', 'home_filters')
        .is('user_id', null)
        .maybeSingle();
      
      const payload = {
        key: 'home_filters',
        value: { projectFilterIds: nextFilters },
        user_id: null
      };

      if (existing?.id) {
        const { error } = await supabase
          .from('view_preferences')
          .update({ value: payload.value, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
        return;
      }
      
      const { error } = await supabase
        .from('view_preferences')
        .insert(payload);
      if (error) throw error;
    }
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = allActive.find(t => t.id === selectedTaskId);

  // 2. Fetch Recently Completed Tasks Query from Local DB
  const { data: completedToday = [] } = useQuery({
    queryKey: ['history', 'recent'],
    queryFn: async () => {
      const tasks = await db.tasks
        .where('state')
        .equals('Done')
        .reverse()
        .limit(3)
        .toArray();
      
      return await Promise.all(tasks.map(async (t) => {
        const projects = t.project_id ? await db.projects.get(t.project_id) : null;
        return { ...t, projects };
      }));
    }
  });

  // 3. Complete Task Mutation
  const completeMutation = useMutation({
    mutationFn: async (task: any) => {
      await completeTask({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        durationMinutes: task.durationMinutes,
        recurrenceIntervalDays: task.recurrenceIntervalDays,
        energyTag: task.energyTag
      });
    },
    onMutate: async (task: any) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'active'] });
      await queryClient.cancelQueries({ queryKey: ['history', 'recent'] });

      const previousActive = queryClient.getQueryData<any[]>(['tasks', 'active']);
      const previousRecent = queryClient.getQueryData<any[]>(['history', 'recent']);

      queryClient.setQueryData(['tasks', 'active'], (old: any) => old?.filter((t: any) => t.id !== task.id));
      
      queryClient.setQueryData(['history', 'recent'], (old: any) => {
        const newItem = {
          id: task.id,
          title: task.title,
          est_duration_minutes: task.durationMinutes,
          projects: { name: task.projectName }
        };
        const filtered = (old || []).filter((t: any) => t.id !== task.id);
        return [newItem, ...filtered].slice(0, 3);
      });

      return { previousActive, previousRecent };
    },
    onError: (err, task, context) => {
      queryClient.setQueryData(['tasks', 'active'], context?.previousActive);
      queryClient.setQueryData(['history', 'recent'], context?.previousRecent);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await db.tasks.delete(taskId);
      await db.recordAction('tasks', 'delete', { id: taskId });
      processOutbox().catch(() => {});
    },
    onMutate: async (taskId: string) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'active'] });
      const previous = queryClient.getQueryData<any[]>(['tasks', 'active']);
      queryClient.setQueryData(['tasks', 'active'], (old: any) => old?.filter((t: any) => t.id !== taskId));
      return { previous };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['tasks', 'active'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }
  });

  // Realtime Sync - Only for critical external triggers if needed. 
  // Removing broad Task sync to prevent edit-flicker for solo user.
  useEffect(() => {
    const channel = supabase
      .channel('home-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tasks', 'active'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, queryClient]);

  // Filter & Logic
  let filteredTasks = allActive;
  if (projectFilters.length > 0) {
    filteredTasks = allActive.filter((t) => {
      const isInbox = !t.projectId;
      if (isInbox) return projectFilters.includes('INBOX');
      return projectFilters.includes(t.projectId);
    });
  }

  let constrainedTasks = filteredTasks;
  if (timeAvailable) {
    constrainedTasks = constrainedTasks.filter(t => t.durationMinutes <= timeAvailable);
  }

  const sorted = sortTasksByUrgency(constrainedTasks, mode);
  
  // Segmenting logic
  const focusTasks = sorted.filter(t => t.priority >= 1 || (t.dueDate && new Date(t.dueDate).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000));
  const otherTasks = sorted.filter(t => !focusTasks.find(ft => ft.id === t.id));
  
  const inboxTasks = otherTasks.filter(t => t.projectName === "Inbox");
  const ongoingTasks = otherTasks.filter(t => t.projectName !== "Inbox");

  const isLoading = isTasksLoading;
  const activeFilterCount = projectFilters.length;
 
  const toggleSegment = (id: string) => {
    setExpandedSegments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleProjectFilter = (id: string) => {
    const next = projectFilters.includes(id)
      ? projectFilters.filter((pid) => pid !== id)
      : [...projectFilters, id];
    setProjectFilters(next);
    savePrefsMutation.mutate(next);
  };

  return (
    <div className="px-6 pt-12 pb-32 max-w-md md:max-w-6xl mx-auto">
      <header className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-1">Intelligence</p>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Today
            </h1>
          </div>
          <div className="flex gap-4">
            <Link
              href="/export"
              className="h-10 px-4 md:h-16 md:px-8 rounded-2xl md:rounded-[2rem] bg-primary text-void flex items-center gap-3 card-shadow hover:opacity-90 transition-all font-black text-[10px] md:text-xs tracking-[0.2em]"
            >
              <Share2 size={18} strokeWidth={2.5} />
              <span>EXPORT</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface/40 backdrop-blur-md border border-border/20 rounded-[2rem] p-4">
            <div className="space-y-4">
              <ModeSelector />
              <TimeAvailableSelector />
            </div>
          </div>
          <div className="bg-surface/40 backdrop-blur-md border border-border/20 rounded-[2rem] p-4">
            <button
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Filters</p>
                <p className="text-sm font-semibold text-zinc-200">Projects</p>
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 ? (
                  <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-1 rounded-lg uppercase tracking-widest">
                    {activeFilterCount} Active
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">All</span>
                )}
                <span className="text-xs text-zinc-600">{filtersOpen ? "−" : "+"}</span>
              </div>
            </button>

            {filtersOpen && (
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => toggleProjectFilter("INBOX")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all",
                    projectFilters.includes("INBOX")
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-void/40 border-border/20 text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <span>Inbox</span>
                  {projectFilters.includes("INBOX") && <span className="text-[9px]">On</span>}
                </button>

                {projects.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProjectFilter(p.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all",
                      projectFilters.includes(p.id)
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-void/40 border-border/20 text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <span>{p.name}</span>
                    {projectFilters.includes(p.id) && <span className="text-[9px]">On</span>}
                  </button>
                ))}

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectFilters([]);
                      savePrefsMutation.mutate([]);
                    }}
                    className="w-full mt-2 bg-void/40 border border-border/20 text-zinc-500 hover:text-zinc-300 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-12 space-y-12">
          {/* Section: Focus Objectives */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Critical Mission
              </h2>
              <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest bg-void/50 px-3 py-1 rounded-full border border-border/20">
                {focusTasks.length} Entities
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {isLoading ? (
                 Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-surface/50 border border-border/10 rounded-3xl p-6 h-48 animate-pulse" />
                ))
              ) : focusTasks.length > 0 ? (
                focusTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <FocusCard
                      title={task.title}
                      project={task.projectName}
                      tier={task.projectTier as any}
                      duration={task.durationMinutes < 60 ? `${task.durationMinutes}m` : `${Math.floor(task.durationMinutes / 60)}h`}
                      dueDate={task.dueDate}
                      isActive={true}
                      onComplete={() => completeMutation.mutate(task)}
                      onDelete={() => deleteMutation.mutate(task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                      subtasksCount={task.subtasksCount}
                      completedSubtasksCount={task.completedSubtasksCount}
                      projectColor={task.projectColor}
                      priority={task.priority}
                    />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center border border-dashed border-border/30 rounded-3xl bg-surface/10">
                   <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest italic">All systems clear. No critical items detected.</p>
                </div>
              )}
            </div>
          </section>

          {/* Section: Ongoing Flow */}
          <section className="space-y-6">
            <button 
              onClick={() => toggleSegment('ongoing')}
              className="w-full flex items-center justify-between px-1 group"
            >
              <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-3 group-hover:text-zinc-300 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                Active Flow
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest bg-void/50 px-3 py-1 rounded-full border border-border/20">
                  {ongoingTasks.length} Items
                </span>
                <ChevronRight size={14} className={cn("text-zinc-600 transition-transform", expandedSegments.ongoing && "rotate-90")} />
              </div>
            </button>
            
            {expandedSegments.ongoing && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {ongoingTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <FocusCard
                      title={task.title}
                      project={task.projectName}
                      tier={task.projectTier as any}
                      duration={`${task.durationMinutes}m`}
                      dueDate={task.dueDate}
                      isActive={false}
                      onComplete={() => completeMutation.mutate(task)}
                      onDelete={() => deleteMutation.mutate(task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                      subtasksCount={task.subtasksCount}
                      completedSubtasksCount={task.completedSubtasksCount}
                      projectColor={task.projectColor}
                      priority={task.priority}
                    />
                  </motion.div>
                ))}
                {ongoingTasks.length === 0 && (
                  <div className="col-span-full py-12 text-center border border-dashed border-border/20 rounded-3xl">
                    <p className="text-[10px] font-bold text-zinc-800 uppercase tracking-widest italic">Flow state optimal. No secondary tasks.</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section: Inbox */}
          <section className="space-y-6">
            <button 
              onClick={() => toggleSegment('inbox')}
              className="w-full flex items-center justify-between px-1 group"
            >
              <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-3 group-hover:text-zinc-300 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                Inbox
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest bg-void/50 px-3 py-1 rounded-full border border-border/20">
                  {inboxTasks.length} Entities
                </span>
                <ChevronRight size={14} className={cn("text-zinc-600 transition-transform", expandedSegments.inbox && "rotate-90")} />
              </div>
            </button>
            
            {expandedSegments.inbox && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                 {inboxTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <FocusCard
                      title={task.title}
                      project={task.projectName}
                      tier={task.projectTier as any}
                      duration={`${task.durationMinutes}m`}
                      dueDate={task.dueDate}
                      isActive={false}
                      onComplete={() => completeMutation.mutate(task)}
                      onDelete={() => deleteMutation.mutate(task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                      subtasksCount={task.subtasksCount}
                      completedSubtasksCount={task.completedSubtasksCount}
                      priority={task.priority}
                    />
                  </motion.div>
                ))}
                {inboxTasks.length === 0 && (
                  <div className="col-span-full py-12 text-center border border-dashed border-border/20 rounded-3xl">
                    <p className="text-[10px] font-bold text-zinc-800 uppercase tracking-widest italic">Inbox cleared. New ideas welcome.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {selectedTaskId && selectedTask && (
          <TaskDetailModal 
            key={selectedTaskId}
            task={selectedTask} 
            isOpen={!!selectedTaskId} 
            onClose={() => setSelectedTaskId(null)} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}
