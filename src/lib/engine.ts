import { getProjectColor } from "./colors";

export type ProjectTier = 1 | 2 | 3 | 4;

export interface Task {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  projectTier: ProjectTier;
  lastTouchedAt: Date;
  decayThresholdDays: number;
  dueDate?: Date;
  durationMinutes: number;
  recurrenceIntervalDays?: number;
  recurrenceType: 'completion' | 'schedule';
  state: 'Active' | 'Waiting' | 'Blocked' | 'Completed' | 'Decayed' | 'Done';
  description?: string;
  subtasksCount?: number;
  completedSubtasksCount?: number;
  waitingUntil?: Date | null;
  projectColor?: string;
  sortOrder: number;
  plannedDate?: string;
  plannedDateType?: 'on' | 'before';
  isMissed?: boolean;
  isCompleted?: boolean;
}

const TIER_WEIGHTS: Record<ProjectTier, number> = {
  1: 2.0,
  2: 1.5,
  3: 1.0,
  4: 0.5,
};

export function calculateUrgencyScore(task: Task, now: Date = new Date()): number {
  
  // 1. Mission Critical Override (< 24h)
  if (task.dueDate) {
    const hoursUntilDue = (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue < 24 && hoursUntilDue > 0) return 9999 + (24 - hoursUntilDue);
  }

  // 2. Base Entropy (Time Decay relative to project threshold)
  const lastTouched = task.lastTouchedAt instanceof Date ? task.lastTouchedAt : new Date(task.lastTouchedAt || now);
  const diffInMs = Math.max(0, now.getTime() - lastTouched.getTime());
  const daysSinceLastTouch = diffInMs / (1000 * 60 * 60 * 24);
  const entropyRatio = daysSinceLastTouch / (task.decayThresholdDays || 15);
  
  // 3. Tier Multiplier
  const tierWeight = TIER_WEIGHTS[task.projectTier || 3];
  
  // Formula: Score = (Tier Weight) × (Entropy Ratio^1.5 for non-linear decay)
  let score = tierWeight * Math.pow(entropyRatio, 1.5);

  // 4. Soft Window Pressure
  if (task.plannedDate && task.plannedDateType === 'before') {
    const plannedDate = new Date(task.plannedDate);
    const msUntilPlanned = plannedDate.getTime() - now.getTime();
    const daysUntilPlanned = msUntilPlanned / (1000 * 60 * 60 * 24);
    
    // As we get closer to the "before" date, pressure increases
    // If it's 3 days away, pressure is low. If it's today, pressure is high.
    if (daysUntilPlanned <= 3 && daysUntilPlanned > 0) {
      score += (3 - daysUntilPlanned) * 2; // Add up to 6 points of "soft urgency"
    } else if (daysUntilPlanned <= 0) {
      score += 10; // Moderate boost for flexible tasks that hit their window
    }
  }
  
  return parseFloat(score.toFixed(4));
}

export function mapTaskData(t: any): Task {
  return {
    id: t.id,
    title: t.title,
    projectId: t.project_id,
    projectName: t.projects?.name || (t.project_id && t.project_id !== 'c0ffee00-0000-0000-0000-000000000000' ? "Project..." : "Inbox"),
    projectTier: t.projects?.tier || 3,
    lastTouchedAt: new Date(t.last_touched_at || t.created_at || new Date()),
    decayThresholdDays: t.projects?.decay_threshold_days || 15,
    dueDate: t.due_date ? new Date(t.due_date) : undefined,
    durationMinutes: t.est_duration_minutes || 30,
    recurrenceIntervalDays: t.recurrence_interval_days,
    recurrenceType: t.recurrence_type || 'completion',
    state: t.state || 'Active',
    description: t.description || "",
    subtasksCount: t.subtasks?.length || 0,
    completedSubtasksCount: t.subtasks?.filter((st: any) => st.is_completed).length || 0,
    waitingUntil: t.waiting_until ? new Date(t.waiting_until) : null,
    projectColor: getProjectColor(t.projects?.name || (t.project_id && t.project_id !== 'c0ffee00-0000-0000-0000-000000000000' ? "Project..." : "Inbox"), t.projects?.color),
    sortOrder: t.sort_order ?? 0,
    plannedDate: t.planned_date,
    plannedDateType: t.planned_date_type || 'on',
    isMissed: t.isMissed,
    isCompleted: t.isCompleted
  };
}

export function sortTasksByUrgency(tasks: Task[]): Task[] {
  const now = new Date();
  return [...tasks].sort((a, b) => {
    const scoreA = calculateUrgencyScore(a, now);
    const scoreB = calculateUrgencyScore(b, now);
    return scoreB - scoreA;
  });
}

/**
 * Sort tasks with deadline-aware ordering:
 * 1. Tasks WITH deadlines → above non-deadlined tasks
 * 2. Among deadlined: manual sort_order (if explicitly set) > deadline order (soonest first)
 * 3. Tasks WITHOUT deadlines → sorted by manual sort_order (ascending)
 * 4. Tiebreaker → urgency score (higher first)
 */
export function sortTasksByUserOrder(tasks: Task[]): Task[] {
  const hardCommitments = tasks.filter(t => t.plannedDateType === 'on' || !t.plannedDateType);
  const flexibleCommitments = tasks.filter(t => t.plannedDateType === 'before');

  const now = new Date();

  const sortedHard = [...hardCommitments].sort((a, b) => {
    const aHasDeadline = !!a.dueDate;
    const bHasDeadline = !!b.dueDate;

    // Layer 1: Deadlined tasks always above non-deadlined
    if (aHasDeadline && !bHasDeadline) return -1;
    if (!aHasDeadline && bHasDeadline) return 1;

    // Layer 2: Among deadlined tasks
    if (aHasDeadline && bHasDeadline) {
      const aManual = a.sortOrder > 0;
      const bManual = b.sortOrder > 0;

      // Both manually ordered → respect drag order
      if (aManual && bManual) {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      }
      // One manual, one default → manual comes first (user explicitly placed it)
      if (aManual && !bManual) return -1;
      if (!aManual && bManual) return 1;
      // Both unranked → soonest deadline first
      const deadlineDiff = a.dueDate!.getTime() - b.dueDate!.getTime();
      if (deadlineDiff !== 0) return deadlineDiff;
    }

    // Layer 3: Among non-deadlined → manual sort_order ascending
    if (!aHasDeadline && !bHasDeadline) {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    }

    // Tiebreaker: urgency score
    return calculateUrgencyScore(b, now) - calculateUrgencyScore(a, now);
  });

  const sortedFlexible = [...flexibleCommitments].sort((a, b) => {
    if (!a.plannedDate || !b.plannedDate) return 0;
    const diff = a.plannedDate.localeCompare(b.plannedDate);
    if (diff !== 0) return diff;
    return calculateUrgencyScore(b, now) - calculateUrgencyScore(a, now);
  });

  return [...sortedHard, ...sortedFlexible];
}

/**
 * Compact sort_order values for a list of tasks to close gaps (1, 2, 3...).
 * Returns an array of { id, newSortOrder } for tasks whose sort_order changed.
 */
export function compactSortOrder(tasks: { id: string; sortOrder: number }[]): { id: string; newSortOrder: number }[] {
  const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
  const updates: { id: string; newSortOrder: number }[] = [];
  sorted.forEach((t, i) => {
    const newOrder = i + 1;
    if (t.sortOrder !== newOrder) {
      updates.push({ id: t.id, newSortOrder: newOrder });
    }
  });
  return updates;
}

/**
 * Distributes 'before' tasks evenly across their available window.
 * Returns a map of date strings to lists of task IDs.
 * IMPORTANT: This is a DISPLAY-only distribution, it doesn't mutate the tasks.
 */
export function distributeSoftPool(tasks: Task[], todayStr: string): Map<string, string[]> {
  const distribution = new Map<string, string[]>();
  
  // 1. Filter for active 'before' tasks that aren't overdue
  const pool = tasks.filter(t => 
    t.state === 'Active' && 
    t.plannedDate && 
    t.plannedDateType === 'before' && 
    t.plannedDate >= todayStr
  );

  if (pool.length === 0) return distribution;

  // 2. Sort by plannedDate ASC (tightest window first)
  const sortedPool = [...pool].sort((a, b) => a.plannedDate!.localeCompare(b.plannedDate!));

  // 3. Keep track of current count per day
  const dailyCounts: Record<string, number> = {};

  sortedPool.forEach(task => {
    const deadline = task.plannedDate!;
    let bestDate = todayStr;
    let minCount = Infinity;

    // Iterate from today until the deadline
    const start = new Date(todayStr);
    const end = new Date(deadline);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      const count = dailyCounts[dStr] || 0;
      if (count < minCount) {
        minCount = count;
        bestDate = dStr;
      }
    }

    // Assign to the best date
    if (!distribution.has(bestDate)) {
      distribution.set(bestDate, []);
    }
    distribution.get(bestDate)!.push(task.id);
    dailyCounts[bestDate] = (dailyCounts[bestDate] || 0) + 1;
  });

  return distribution;
}

/**
 * Checks if a task is "decayed" (untouched for longer than its threshold).
 * For Phase 3, we define decay as being 3+ days overdue from its planned_date.
 */
export function isTaskDecayed(task: Task, todayStr: string): boolean {
  if (task.state !== 'Active' || !task.plannedDate) return false;
  
  // If it's a future task, it's not decayed
  if (task.plannedDate >= todayStr) return false;

  // Calculate days overdue
  const planned = new Date(task.plannedDate);
  const today = new Date(todayStr);
  const diffTime = Math.abs(today.getTime() - planned.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 3;
}

/**
 * Returns tasks that need triage because they have decayed.
 */
export function identifyDecayedTasks(tasks: Task[], todayStr: string): Task[] {
  return tasks.filter(t => isTaskDecayed(t, todayStr));
}
