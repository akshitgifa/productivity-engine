"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { FocusCard } from "@/components/ui/FocusCard";
import { TimeAvailableSelector } from "@/components/layout/TimeAvailableSelector";
import { useUserStore } from "@/store/userStore";
import { useTaskFulfillment } from "@/hooks/useTaskFulfillment";
import { CheckCircle2, Share2, Calendar as CalendarIcon, Zap, Target, Search, Settings, Trophy, Plus, ChevronLeft, ChevronRight, List, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { sortTasksByUserOrder, mapTaskData, Task, distributeSoftPool, identifyDecayedTasks } from "@/lib/engine";
import { taskService } from '@/lib/taskService';
import { projectService } from '@/lib/projectService';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { ReorderableItem } from "@/components/ui/ReorderableItem";
import { db, ProjectCustomization } from "@/lib/db";
import { toLocalISOString, isTodayLocal } from "@/lib/dateUtils";
import { UserProfile } from "@/components/layout/UserProfile";
import { ProjectSection } from "@/components/tasks/ProjectSection";
import { useToastStore } from "@/store/toastStore";

const EMPTY_ARRAY: any[] = [];

export default function Home() {
  const { timeAvailable } = useUserStore();
  const { completeTask } = useTaskFulfillment();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [projectFilters, setProjectFilters] = useState<string[]>([]);
  const [undoToast, setUndoToast] = useState<{ id: string; title: string } | null>(null);
  const [viewMode, setViewMode] = useState<'Today' | 'Master'>('Today');

  // Load viewMode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('home_view_mode');
    if (saved === 'Today' || saved === 'Master') {
      setViewMode(saved);
    }
  }, []);

  // Save viewMode to localStorage when it changes
  const handleViewModeChange = (mode: 'Today' | 'Master') => {
    setViewMode(mode);
    localStorage.setItem('home_view_mode', mode);
  };
  const [displayedTasks, setDisplayedTasks] = useState<Task[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(toLocalISOString());

  useEffect(() => {
    setHasMounted(true);
  }, []);


  // Use local date string (YYYY-MM-DD) from utility
  const todayStr = toLocalISOString();

  // 1. Fetch Active Tasks Query from Local DB
  const { data: allActiveData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: async () => {
      // Fetch active tasks from centralized helper
      const tasks = await db.getActiveTasks({ state: 'Active' });
      
      const now = new Date().toISOString();
      const filtered = tasks.filter(t => !t.waiting_until || t.waiting_until <= now);

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
  const allActive = allActiveData || EMPTY_ARRAY;

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: async () => {
      return await db.getActiveProjects();
    }
  });
  const projects = projectsData || EMPTY_ARRAY;

  const { data: customizationsData } = useQuery({
    queryKey: ['project_customizations'],
    queryFn: async () => {
      return await db.getAllProjectCustomizations();
    }
  });
  const customizations = customizationsData || EMPTY_ARRAY;

  const customizationMap = useMemo(() => {
    const map: Record<string, ProjectCustomization> = {};
    customizations.forEach(c => {
      map[c.projectId] = c;
    });
    return map;
  }, [customizations]);


  // Load home filters from localStorage

  const saveFilters = (nextFilters: string[]) => {
    setProjectFilters(nextFilters);
    localStorage.setItem('home_project_filters', JSON.stringify(nextFilters));
  };

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = allActive.find(t => t.id === selectedTaskId);

  // 2. Fetch Tasks Completed TODAY
  const { data: completedTodayData } = useQuery({
    queryKey: ['history', 'today'],
    queryFn: async () => {
      const logs = await db.activity_logs.toArray();
      const todayLogs = logs.filter(l => l.completed_at.startsWith(todayStr));
      
      return await Promise.all(todayLogs.map(async (l) => {
        const t = l.task_id ? await db.tasks.get(l.task_id) : null;
        if (!t) return null;
        const projects = t.project_id ? await db.projects.get(t.project_id) : null;
        return { ...t, projects };
      }));
    }
  });

  const completedToday = useMemo(() => 
    (completedTodayData || []).filter(Boolean).map((t: any) => mapTaskData({ ...t, isCompleted: true })), 
    [completedTodayData]
  );
  
  // 4. Retrospective Data Query
  const { data: retrospectiveTasks = EMPTY_ARRAY } = useQuery({
    queryKey: ['retrospective', selectedDate],
    queryFn: async () => {
      if (!selectedDate || selectedDate >= todayStr) return [];
      
      const logs = await db.activity_logs.toArray();
      const dayLogs = logs.filter(l => l.completed_at.startsWith(selectedDate));
      
      const completed = await Promise.all(dayLogs.map(async (l) => {
        const t = l.task_id ? await db.tasks.get(l.task_id) : null;
        if (!t) return null;
        const projects = t.project_id ? await db.projects.get(t.project_id) : null;
        return mapTaskData({ 
          ...t, 
          projects, 
          isCompleted: true
        });
      }));

      const allTasks = await db.tasks.toArray();
      const missed = await Promise.all(allTasks.filter(t => {
        if (t.is_deleted) return false;
        let taskPlannedDay = t.planned_date?.includes('T') ? toLocalISOString(new Date(t.planned_date)) : t.planned_date;
        
        // Task must have a planned date that is on or before the selected historical date
        const wasPlannedByThen = taskPlannedDay && taskPlannedDay <= selectedDate;
        if (!wasPlannedByThen) return false;

        // Check if it was completed ON this day (it will be in the 'completed' list already)
        const completedOnThisDay = dayLogs.some(l => l.task_id === t.id);
        if (completedOnThisDay) return false;

        // Check if it was completed BEFORE this day
        const completedBefore = logs.some(l => l.task_id === t.id && l.completed_at.split('T')[0] < selectedDate);
        if (completedBefore) return false;

        return true;
      }).map(async (t) => {
        const projects = t.project_id ? await db.projects.get(t.project_id) : null;
        return mapTaskData({ 
          ...t, 
          projects, 
          isMissed: true
        });
      }));

      return [...completed.filter(Boolean), ...missed];
    },
    enabled: selectedDate < todayStr && viewMode === 'Today'
  });

  // 3. Complete Task Mutation
  const completeMutation = useMutation({
    mutationFn: async (task: any) => {
      await completeTask({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        durationMinutes: task.durationMinutes,
        recurrenceIntervalDays: task.recurrenceIntervalDays
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

  const handleComplete = useCallback((task: Task) => {
    if (completeMutation.isPending) return;
    completeMutation.mutate(task);
  }, [completeMutation]);

  const handleDelete = useCallback((taskId: string) => {
    if (deleteMutation.isPending) return;
    deleteMutation.mutate(taskId);
  }, [deleteMutation]);

  const toggleCommitment = useCallback(async (taskId: string, currentPlanned: boolean, targetPlanned?: boolean) => {
    // If targetPlanned is provided, use it; otherwise toggle
    const shouldPlan = targetPlanned !== undefined ? targetPlanned : !currentPlanned;
    const nextPlanned = shouldPlan ? selectedDate : null;
    
    // Optimistic UI update
    const previousTasks = queryClient.getQueryData<Task[]>(['tasks', 'today']);
    if (previousTasks) {
      const updated = previousTasks.map(t => 
        t.id === taskId ? { ...t, plannedDate: nextPlanned || undefined } : t
      );
      queryClient.setQueryData(['tasks', 'today'], updated);
    }

    try {
      await taskService.setPlannedDate(taskId, nextPlanned);
    } catch (err) {
      console.error("Failed to toggle commitment:", err);
      // Rollback on error
      if (previousTasks) {
        queryClient.setQueryData(['tasks', 'today'], previousTasks);
      }
    } finally {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today'] });
    }
  }, [queryClient, selectedDate]);



  const applyToAllMutation = useMutation({
    mutationFn: async (customization: Partial<ProjectCustomization>) => {
      await projectService.applyCustomizationToAll(customization);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_customizations'] });
    }
  });

  const applySizeToAllMutation = useMutation({
    mutationFn: async ({ w, h }: { w: number, h: number }) => {
      await projectService.applySizeToAll(w, h);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_customizations'] });
    }
  });

  // Handle auto-refresh from sync events
  useEffect(() => {
    const handleSync = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'today'] });
    };
    window.addEventListener('entropy:sync-complete', handleSync);
    return () => window.removeEventListener('entropy:sync-complete', handleSync);
  }, [queryClient]);
  
  // 1.5. Distribute Soft Pool tasks across their windows
  const softDistribution = useMemo(() => {
    return distributeSoftPool(allActive, todayStr);
  }, [allActive, todayStr]);

  // 1.6. Identify decayed tasks for maintenance
  const decayedTaskIds = useMemo(() => {
    return identifyDecayedTasks(allActive, todayStr).map(t => t.id);
  }, [allActive, todayStr]);

  // 1. Basic Filters (Project + Time)
  const memoizedDisplayTasks = useMemo(() => {
    if (viewMode === 'Today' && selectedDate < todayStr) {
      return retrospectiveTasks;
    }

    let filtered = allActive;
    if (projectFilters.length > 0) {
      filtered = allActive.filter((t) => {
        const isInbox = t.projectId === 'c0ffee00-0000-0000-0000-000000000000';
        if (isInbox) return projectFilters.includes('INBOX');
        return projectFilters.includes(t.projectId);
      });
    }

    if (timeAvailable) {
      filtered = filtered.filter(t => t.durationMinutes <= timeAvailable);
    }

    if (viewMode !== 'Today') return filtered;

    // View Mode Filters
    const filteredResults = filtered.filter((t: Task) => {
      // Normalize plannedDate: handle both old ISO strings and new local strings
      const taskPlannedDay = t.plannedDate?.includes('T') ? toLocalISOString(new Date(t.plannedDate)) : t.plannedDate;
      const isPlannedOnSelected = taskPlannedDay === selectedDate;
      
      // Compare local date strings for due dates
      const taskDueDateStr = t.dueDate ? toLocalISOString(t.dueDate) : null;
      
      // If selected date is today, show due today + overdue + carry-forward
      if (selectedDate === todayStr) {
        const isDueTodayOrOverdue = taskDueDateStr && taskDueDateStr <= todayStr;
        const isCarriedForward = taskPlannedDay && taskPlannedDay < todayStr;
        return isPlannedOnSelected || isDueTodayOrOverdue || isCarriedForward;
      }
      
      // If selected date is future, only show what's planned for that specific day
      if (selectedDate > todayStr) {
        return isPlannedOnSelected;
      }

      // Check if task is suggested for this date by the engine
      const suggestedTaskIds = softDistribution.get(selectedDate) || EMPTY_ARRAY;
      const isSuggestedForSelected = suggestedTaskIds.includes(t.id);

      return isPlannedOnSelected || isSuggestedForSelected;
    });

    // DO NOT include completed tasks here - they go in a separate section below
    return filteredResults;
  }, [allActive, projectFilters, timeAvailable, viewMode, todayStr, selectedDate, retrospectiveTasks]);

  // Group tasks by project for Master List
  const groupedMasterTasks = useMemo(() => {
    if (viewMode !== 'Master') return [];
    
    // Use memoizedDisplayTasks which already has project/filter logic applied
    const tasks = memoizedDisplayTasks;
    const groups: Record<string, { id: string, name: string, tasks: Task[] }> = {};
    
    tasks.forEach((task: Task) => {
      const pid = task.projectId || 'c0ffee00-0000-0000-0000-000000000000';
      if (!groups[pid]) {
        groups[pid] = {
          id: pid,
          name: task.projectName || 'Inbox',
          tasks: []
        };
      }
      groups[pid].tasks.push(task);
    });
    
    // Sort projects: Tier 1 first, then Inbox (tier 4) last, etc.
    // We need to fetch tiers for sorting if they aren't in the task object reliably
    // Based on engine.ts mapTaskData, task.projectTier is available.
    
    return Object.values(groups).sort((a, b) => {
      const custA = customizationMap[a.id];
      const custB = customizationMap[b.id];
      
      // Use sortOrder if available, otherwise fallback to tier then name
      if (custA?.sortOrder && custB?.sortOrder) {
        return custA.sortOrder - custB.sortOrder;
      }
      if (custA?.sortOrder) return -1;
      if (custB?.sortOrder) return 1;

      const tierA = a.tasks[0]?.projectTier || 3;
      const tierB = b.tasks[0]?.projectTier || 3;
      if (tierA !== tierB) return tierA - tierB;
      return a.name.localeCompare(b.name);
    });
  }, [memoizedDisplayTasks, viewMode, customizationMap]);

  const isLoading = isTasksLoading;



  useEffect(() => {
    setDisplayedTasks(sortTasksByUserOrder(memoizedDisplayTasks));
  }, [memoizedDisplayTasks]);

  const handleUnplan = async (taskId: string) => {
    await taskService.setPlannedDate(taskId, null);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    addToast("Task removed from plan", 'success');
  };

  const handleRecommit = async (taskId: string) => {
    await taskService.setPlannedDate(taskId, todayStr, 'on');
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    addToast("Task recommitted to today", 'success');
  };

  const handleReschedule = async (taskId: string, date: string | null, type: 'on' | 'before' = 'on') => {
    await taskService.setPlannedDate(taskId, date, type);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    addToast(`Task rescheduled to ${format(new Date(date + 'T00:00:00'), 'MMM d')}`, 'success');
  };

  // Reorder handler: updates local state for smooth drag
  const handleReorder = useCallback((reorderedTasks: Task[]) => {
    setDisplayedTasks(reorderedTasks);
  }, []);

  const persistReorder = useCallback(async () => {
    if (displayedTasks.length === 0) return;
    const orderedIds = displayedTasks.map((t, idx) => ({ 
      id: t.id, 
      currentSortOrder: t.sortOrder 
    }));
    await taskService.reorder(orderedIds);
  }, [displayedTasks]);

  const activeFilterCount = projectFilters.length;

  const toggleProjectFilter = (id: string) => {
    const next = projectFilters.includes(id)
      ? projectFilters.filter((pid) => pid !== id)
      : [...projectFilters, id];
    saveFilters(next);
  };

  return (
    <div className="px-6 pt-8 md:pt-12 pb-32 max-w-md md:max-w-6xl mx-auto overflow-x-hidden">
      <header className="mb-4 md:mb-10">
        {/* Row 1: Title + Actions */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div>
            <p className="hidden md:block text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-1">Intelligence</p>
            <h1 className="text-2xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {(() => {
                if (viewMode === 'Master') return "Master List";
                if (selectedDate === todayStr) return "Today";
                const tomorrow = toLocalISOString(addDays(new Date(), 1));
                if (selectedDate === tomorrow) return "Tomorrow";
                const yesterday = toLocalISOString(addDays(new Date(), -1));
                if (selectedDate === yesterday) return "Yesterday";
                return format(new Date(selectedDate), "EEE, MMM d");
              })()}
            </h1>
          </div>
          <div className="flex gap-2 md:gap-4 items-center">
            <Link
              href="/export"
              className="h-9 w-9 md:h-12 md:px-6 rounded-xl md:rounded-2xl bg-surface/40 text-primary border border-primary/20 flex items-center justify-center gap-3 card-shadow hover:bg-primary/10 transition-all font-black text-[10px] md:text-[11px] tracking-[0.2em]"
            >
              <Share2 size={15} strokeWidth={2.5} />
              <span className="hidden md:inline">EXPORT</span>
            </Link>
            <UserProfile />
          </div>
        </div>

        {/* Row 2: Day Picker Strip with ALL pill (mobile: compact) */}
        <div className="flex gap-1.5 md:gap-2 items-center mb-3 md:mb-4 min-w-0">
          {/* ALL pill for Master List - Fixed on the Left */}
          <button
            onClick={() => handleViewModeChange('Master')}
            className={cn(
              "flex flex-col items-center justify-center min-w-[54px] md:min-w-[64px] h-11 md:h-16 rounded-xl md:rounded-2xl border transition-all shrink-0 gap-0.5",
              viewMode === 'Master'
                ? "bg-primary text-void border-primary shadow-lg scale-105"
                : "bg-surface/40 border-border/40 text-primary hover:border-primary/60 border-dashed"
            )}
          >
            <List size={14} className="md:hidden" />
            <List size={16} className="hidden md:block" />
            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest">All</span>
          </button>

          {/* Scrollable Day Picker */}
          <div className="flex gap-1.5 md:gap-2 overflow-x-auto no-scrollbar pb-0.5 flex-1 min-w-0">
            {Array.from({ length: 9 }).map((_, i) => {
              const date = new Date();
              date.setDate(date.getDate() + (i - 2));
              const dateStr = toLocalISOString(date);
              const isSelected = viewMode === 'Today' && selectedDate === dateStr;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    handleViewModeChange('Today');
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[48px] md:min-w-[60px] h-11 md:h-16 rounded-xl md:rounded-2xl border transition-all relative shrink-0",
                    isSelected 
                      ? "bg-primary text-void border-primary shadow-lg scale-105" 
                      : "bg-surface/40 border-border/20 text-zinc-500 hover:border-zinc-400"
                  )}
                >
                  <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest opacity-60">
                    {format(date, "EEE")}
                  </span>
                  <span className="text-xs md:text-sm font-bold">
                    {format(date, "d")}
                  </span>
                  {isToday && !isSelected && (
                    <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Calendar picker - Fixed on the Right */}
          <div className="relative group shrink-0">
             <input 
               type="date"
               className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
               value={selectedDate}
               onChange={(e) => {
                 setSelectedDate(e.target.value);
                 handleViewModeChange('Today');
               }}
             />
             <button className="h-11 w-10 md:h-16 md:w-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-surface/40 border border-border/20 text-zinc-500 group-hover:border-primary/30 group-hover:text-primary transition-all">
               <CalendarIcon size={16} className="md:hidden" />
               <CalendarIcon size={18} className="hidden md:block" />
             </button>
          </div>
        </div>

        {/* Row 3 (mobile): Compact controls bar — Limit + Filter */}
        <div className="flex md:hidden items-center gap-2 mb-1">
          {/* Compact Limit Selector */}
          <TimeAvailableSelector />

          {/* Compact Filter Trigger */}
          <button
            onClick={() => setFiltersOpen((prev) => !prev)}
            className={cn(
              "relative h-9 w-9 flex items-center justify-center rounded-xl border transition-all shrink-0",
              filtersOpen || activeFilterCount > 0
                ? "bg-primary/10 border-primary/30 text-primary" 
                : "bg-surface/40 border-border/20 text-zinc-500"
            )}
          >
            <SlidersHorizontal size={14} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-void text-[8px] font-black rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile filter dropdown */}
        {filtersOpen && (
          <div className="md:hidden mb-3 space-y-1.5 bg-surface/60 backdrop-blur-md border border-border/20 rounded-2xl p-3">
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
                onClick={() => saveFilters([])}
                className="w-full mt-1 bg-void/40 border border-border/20 text-zinc-500 hover:text-zinc-300 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </header>

      {/* Desktop controls: Limit + Filter cards (hidden on mobile) */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-12 gap-10 mb-10">
        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface/40 backdrop-blur-md border border-border/20 rounded-[2rem] p-4">
            <div className="space-y-4">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-10">
        <div className={cn(
          "md:col-span-12 space-y-4",
          viewMode === 'Today' ? "lg:col-span-8" : "lg:col-span-12"
        )}>
          <div className="hidden md:flex items-center justify-between mb-4 md:mb-6">
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
          ) : viewMode === 'Today' ? (
            <>
              {displayedTasks.length > 0 ? (
                <Reorder.Group
                  axis="y"
                  values={displayedTasks}
                  onReorder={handleReorder}
                  className="flex flex-col gap-4"
                  as="div"
                >
                  {displayedTasks.map((task) => {
                    const isOverdue = (() => {
                      if (selectedDate !== todayStr) return false;
                      const taskPlannedDay = task.plannedDate?.includes('T') ? toLocalISOString(new Date(task.plannedDate)) : task.plannedDate;
                      return !!(taskPlannedDay && taskPlannedDay < todayStr);
                    })();

                    return (
                      <ReorderableItem
                        key={task.id}
                        value={task}
                        onDragEnd={persistReorder}
                      >
                        <FocusCard
                          title={task.title}
                          project={task.projectName}
                          tier={task.projectTier as any}
                          duration={task.durationMinutes < 60 ? `${task.durationMinutes}m` : `${Math.floor(task.durationMinutes / 60)}h`}
                          dueDate={task.dueDate}
                          isActive={true}
                          onComplete={() => handleComplete(task)}
                          onDelete={() => handleDelete(task.id)}
                          onClick={() => setSelectedTaskId(task.id)}
                          subtasksCount={task.subtasksCount}
                          completedSubtasksCount={task.completedSubtasksCount}
                          projectColor={task.projectColor}
                          isPlanned={!isOverdue}
                          isCarriedForward={isOverdue}
                          isMissed={task.isMissed}
                          isCompleted={task.isCompleted}
                          plannedDate={task.plannedDate}
                          plannedDateType={task.plannedDateType}
                          isDecayed={decayedTaskIds.includes(task.id)}
                          onRecommit={() => handleRecommit(task.id)}
                          onUnplan={() => handleUnplan(task.id)}
                          onReschedule={(date, type) => handleReschedule(task.id, date, type)}
                        />
                      </ReorderableItem>
                    );
                  })}
                </Reorder.Group>
              ) : completedToday.length === 0 ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="text-center py-24 border border-dashed border-border/30 rounded-[3rem] bg-surface/20">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                      <Share2 className="text-primary opacity-40" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Your Today is empty</h3>
                    <p className="text-zinc-500 text-xs font-medium max-w-[240px] mx-auto mb-8 uppercase tracking-widest leading-relaxed">
                      The engine is ready. Pick your focus for a productive day.
                    </p>
                    <button 
                      onClick={() => handleViewModeChange('Master')}
                      className="px-8 py-4 bg-primary text-void rounded-[2rem] font-black text-[10px] tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                      PLAN YOUR DAY
                    </button>
                  </div>

                  {/* Recommendations Section */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">Top Picks from Engine</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {memoizedDisplayTasks.slice(0, 3).map((task: Task) => (
                        <div key={task.id} className="bg-surface/40 border border-border/10 rounded-2xl p-4 flex items-center justify-between group hover:border-primary/20 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.projectColor || '#10b981' }} />
                            <div>
                              <p className="text-sm font-semibold text-zinc-200">{task.title}</p>
                              <p className="text-[10px] font-bold text-zinc-600 uppercase mt-0.5">{task.projectName}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => toggleCommitment(task.id, false, true)}
                            className="w-10 h-10 rounded-xl border border-border/20 text-zinc-500 flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
                          >
                            <span className="text-lg font-black">+</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {completedToday.length > 0 && (
                <div className="mt-12 space-y-4">
                  <h2 className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                    Completed
                  </h2>
                  <div className="flex flex-col gap-4 opacity-60 hover:opacity-100 transition-opacity">
                    {completedToday.map((task) => (
                      <FocusCard
                        key={task.id}
                        title={task.title}
                        project={task.projectName}
                        tier={task.projectTier as any}
                        duration={task.durationMinutes < 60 ? `${task.durationMinutes}m` : `${Math.floor(task.durationMinutes / 60)}h`}
                        dueDate={task.dueDate}
                        isActive={false}
                        onComplete={() => handleComplete(task)}
                        onDelete={() => handleDelete(task.id)}
                        onClick={() => setSelectedTaskId(task.id)}
                        subtasksCount={task.subtasksCount}
                        completedSubtasksCount={task.completedSubtasksCount}
                        projectColor={task.projectColor}
                        isPlanned={selectedDate === todayStr}
                        isCarriedForward={false}
                        isMissed={task.isMissed}
                        isCompleted={true}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : viewMode === 'Master' && hasMounted && groupedMasterTasks.length > 0 ? (
            <div className="flex flex-wrap gap-10">
              {groupedMasterTasks.map(group => {
                const cust = customizationMap[group.id];
                const widthClass = {
                  1: "w-full md:w-[calc(25%-30px)]",
                  2: "w-full md:w-[calc(50%-20px)]",
                }[cust?.gridW || 1] || "w-full md:w-[calc(25%-30px)]";

                const heightClass = {
                  1: "min-h-[200px]",
                  2: "min-h-[420px]",
                }[cust?.gridH || 1] || "min-h-[200px]";

                return (
                  <div 
                    key={group.id}
                    className={cn(widthClass, heightClass, "transition-all duration-300")}
                  >
                    <ProjectSection
                      projectId={group.id}
                      projectName={group.name}
                      tasks={group.tasks}
                      onTaskClick={(id) => setSelectedTaskId(id)}
                      onCompleteTask={handleComplete}
                      onDeleteTask={handleDelete}
                      onCommitTask={(taskId) => toggleCommitment(taskId, false, true)}
                      customization={cust}
                      onApplyToAll={(c: Partial<ProjectCustomization>) => applyToAllMutation.mutate(c)}
                      onApplySizeToAll={(w, h) => applySizeToAllMutation.mutate({ w, h })}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24 border border-dashed border-border rounded-3xl text-zinc-600 text-[10px] font-bold uppercase tracking-widest bg-surface/30">
              All objectives synchronized
            </div>
          )}
        </div>

        {viewMode === 'Today' && (
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
          </div>
        )}
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
            className="fixed bottom-40 left-6 right-6 md:bottom-12 md:right-12 md:left-auto md:w-auto md:min-w-[320px] md:translate-x-0 z-[150] glass rounded-2xl px-6 py-4 card-shadow flex items-center justify-between gap-6 border border-white/10"
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
