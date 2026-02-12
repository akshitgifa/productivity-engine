"use client";

import { useEffect, useState, useCallback } from "react";
import { FocusCard } from "@/components/ui/FocusCard";
import { ModeSelector } from "@/components/layout/ModeSelector";
import { TimeAvailableSelector } from "@/components/layout/TimeAvailableSelector";
import { useUserStore } from "@/store/userStore";
import { useTaskFulfillment } from "@/hooks/useTaskFulfillment";
import { CheckCircle2, Share2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { sortTasksByUserOrder, filterAdminTasks, mapTaskData, Task } from "@/lib/engine";
import { taskService } from '@/lib/taskService';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { ReorderableItem } from "@/components/ui/ReorderableItem";
import { db } from "@/lib/db";

export default function Home() {
  const { mode, timeAvailable } = useUserStore();
  const { completeTask } = useTaskFulfillment();
  const queryClient = useQueryClient();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [projectFilters, setProjectFilters] = useState<string[]>([]);
  const [undoToast, setUndoToast] = useState<{ id: string; title: string } | null>(null);

  // 1. Fetch Active Tasks Query from Local DB
  const { data: allActive = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: async () => {
      // Fetch tasks from local Dexie DB
      const tasks = await db.tasks
        .where('state')
        .equals('Active')
        .toArray();
      
      // Filter by waiting_until and exclude soft-deleted
      const now = new Date().toISOString();
      const filtered = tasks.filter(t => !t.is_deleted && (!t.waiting_until || t.waiting_until <= now));

      // Enhance with project data (Manual join since Dexie is NoSQL-style)
      const enhanced = await Promise.all(filtered.map(async (t) => {
        let projects = null;
        if (t.project_id) {
          projects = await db.projects.get(t.project_id);
        }
        return mapTaskData({ ...t, projects });
      }));

      return enhanced;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: async () => {
      const all = await db.projects.orderBy('name').toArray();
      return all.filter((p: any) => !p.is_deleted);
    }
  });


  // Load home filters from localStorage

  const saveFilters = (nextFilters: string[]) => {
    setProjectFilters(nextFilters);
    localStorage.setItem('home_project_filters', JSON.stringify(nextFilters));
  };

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
      
      return await Promise.all(tasks.filter(t => !t.is_deleted).map(async (t) => {
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
      await queryClient.cancelQueries({ queryKey: ['tasks', 'today'] });
      await queryClient.cancelQueries({ queryKey: ['history', 'recent'] });

      const previousActive = queryClient.getQueryData<any[]>(['tasks', 'today']);
      const previousRecent = queryClient.getQueryData<any[]>(['history', 'recent']);

      queryClient.setQueryData(['tasks', 'today'], (old: any) => old?.filter((t: any) => t.id !== task.id));
      
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
      queryClient.setQueryData(['tasks', 'today'], context?.previousActive);
      queryClient.setQueryData(['history', 'recent'], context?.previousRecent);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const deleted = await taskService.delete(taskId);
      return deleted;
    },
    onMutate: async (taskId: string) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'today'] });
      const previous = queryClient.getQueryData<any[]>(['tasks', 'today']);
      queryClient.setQueryData(['tasks', 'today'], (old: any) => old?.filter((t: any) => t.id !== taskId));
      return { previous };
    },
    onSuccess: (deletedTask) => {
      if (deletedTask) {
        setUndoToast({ id: deletedTask.id, title: deletedTask.title || 'Task' });
        setTimeout(() => setUndoToast(null), 5000);
      }
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['tasks', 'today'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    }
  });

  const handleUndo = useCallback(async () => {
    if (!undoToast) return;
    await taskService.undoDelete(undoToast.id);
    setUndoToast(null);
    queryClient.invalidateQueries({ queryKey: ['tasks', 'today'] });
  }, [undoToast, queryClient]);

  // Filter & Logic
  let filteredTasks = allActive;
  if (projectFilters.length > 0) {
    filteredTasks = allActive.filter((t) => {
      const isInbox = t.projectId === 'c0ffee00-0000-0000-0000-000000000000';
      if (isInbox) return projectFilters.includes('INBOX');
      return projectFilters.includes(t.projectId);
    });
  }

  let constrainedTasks = filteredTasks;
  if (timeAvailable) {
    constrainedTasks = constrainedTasks.filter(t => t.durationMinutes <= timeAvailable);
  }

  const sorted = sortTasksByUserOrder(constrainedTasks, mode);
  const { focus: focusTasks, admin: adminTasks } = filterAdminTasks(sorted);
  const isLoading = isTasksLoading;

  // Reorder handler: updates sort_order locally in Dexie and syncs via outbox
  const handleReorder = async (reorderedTasks: Task[]) => {
    // Optimistic UI update via query cache
    const updatedAll = allActive.map(t => {
      const idx = reorderedTasks.findIndex(rt => rt.id === t.id);
      if (idx !== -1) return { ...t, sortOrder: idx + 1 };
      return t;
    });
    queryClient.setQueryData(['tasks', 'today'], updatedAll);

    // Persist via centralized service
    const orderedIds = reorderedTasks.map(t => ({ id: t.id, currentSortOrder: t.sortOrder }));
    await taskService.reorder(orderedIds);
  };

  const activeFilterCount = projectFilters.length;

  const toggleProjectFilter = (id: string) => {
    const next = projectFilters.includes(id)
      ? projectFilters.filter((pid) => pid !== id)
      : [...projectFilters, id];
    saveFilters(next);
  };

  return (
    <div className="px-6 pt-12 pb-32 max-w-md md:max-w-6xl mx-auto overflow-x-hidden">
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
                      saveFilters([]);
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

        <div className="md:col-span-12 lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              Focus Objectives
            </h2>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-surface/50 border border-border/10 rounded-3xl p-6 h-48 animate-pulse">
                  <div className="w-20 h-2 bg-zinc-800 rounded-full mb-4" />
                  <div className="w-full h-4 bg-zinc-800 rounded-full mb-2" />
                  <div className="w-2/3 h-4 bg-zinc-800 rounded-full" />
                </div>
              ))}
            </div>
          ) : focusTasks.length > 0 ? (
            <Reorder.Group
              axis="y"
              values={focusTasks}
              onReorder={(reordered) => handleReorder(reordered)}
              className="flex flex-col gap-4"
              as="div"
            >
              {focusTasks.map((task) => (
                <ReorderableItem
                  key={task.id}
                  value={task}
                >
                  <FocusCard
                    title={task.title}
                    project={task.projectName}
                    tier={task.projectTier as any}
                    duration={task.durationMinutes < 60 ? `${task.durationMinutes}m` : `${Math.floor(task.durationMinutes / 60)}h`}
                    dueDate={task.dueDate}
                    isActive={true}
                    onComplete={() => {
                      if (completeMutation.isPending) return;
                      completeMutation.mutate(task);
                    }}
                    onDelete={() => {
                      if (deleteMutation.isPending) return;
                      deleteMutation.mutate(task.id);
                    }}
                    onClick={() => setSelectedTaskId(task.id)}
                    subtasksCount={task.subtasksCount}
                    completedSubtasksCount={task.completedSubtasksCount}
                    projectColor={task.projectColor}
                  />
                </ReorderableItem>
              ))}
            </Reorder.Group>
          ) : (
            <div className="text-center py-24 border border-dashed border-border rounded-3xl text-zinc-600 text-[10px] font-bold uppercase tracking-widest bg-surface/30">
              All objectives synchronized
            </div>
          )}
        </div>

        <div className="md:col-span-12 lg:col-span-4 space-y-8">
          {completedToday.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  Recent Momentum
                </h2>
                <Link href="/history" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {completedToday.map((task: any) => (
                  <div key={task.id} className="bg-surface/50 border border-transparent rounded-2xl p-4 flex items-center justify-between group card-shadow hover:border-border/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-emerald-500/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-300 line-clamp-1">{task.title}</p>
                         <p className="text-[9px] font-bold text-zinc-600 uppercase italic leading-none mt-1.5">{task.projects?.name || 'Inbox'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-700 uppercase bg-void/50 px-2 py-1 rounded-lg border border-border/20">{task.est_duration_minutes}m</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <Link 
            href="/tasks"
            className={cn(
              "p-6 bg-surface/30 border border-dashed border-border rounded-3xl block transition-all group hover:border-primary/50 hover:bg-surface/50 card-shadow",
              adminTasks.length === 0 ? "opacity-30 grayscale" : "opacity-80"
            )}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] block text-zinc-500 group-hover:text-primary transition-colors">
                Admin Batch
              </span>
              {adminTasks.length > 0 && (
                <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-1 rounded-lg animate-pulse uppercase tracking-widest">
                  {adminTasks.length} Detected
                </span>
              )}
            </div>
            <div className="text-sm font-medium text-zinc-500 leading-relaxed group-hover:text-zinc-300 transition-colors">
               {adminTasks.length > 0 
                ? `${adminTasks.length} micro-tasks aggregated. Click to process fragmented subtasks.` 
                : "System stability optimal. No fragmentation detected."}
            </div>
          </Link>
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

      {/* Undo Delete Toast */}
      <AnimatePresence>
        {undoToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-40 left-6 right-6 md:bottom-12 md:right-12 md:left-auto md:w-auto md:min-w-[320px] md:translate-x-0 z-[100] glass rounded-2xl px-6 py-4 card-shadow flex items-center justify-between gap-6 border border-white/10"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-white/90 font-medium">
                Deleted — {undoToast.title.length > 20 ? undoToast.title.substring(0, 20) + '...' : undoToast.title}
              </span>
            </div>
            <button
              onClick={handleUndo}
              className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-primary/20 active:scale-95"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
