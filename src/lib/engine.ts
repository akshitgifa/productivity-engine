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
  energyTag: 'Deep' | 'Normal' | 'Shallow';
  durationMinutes: number;
  recurrenceIntervalDays?: number;
  state: 'Active' | 'Waiting' | 'Blocked' | 'Completed' | 'Decayed' | 'Done';
  description?: string;
  subtasksCount?: number;
  completedSubtasksCount?: number;
  waitingUntil?: Date | null;
  projectColor?: string;
  sortOrder: number;
}

export type SessionMode = 'Deep Work' | 'Low Energy' | 'Creative' | 'Admin';

const TIER_WEIGHTS: Record<ProjectTier, number> = {
  1: 2.0,
  2: 1.5,
  3: 1.0,
  4: 0.5,
};

const MODE_TAG_MAP: Record<SessionMode, Task['energyTag'][]> = {
  'Deep Work': ['Deep', 'Normal'],
  'Low Energy': ['Shallow'],
  'Creative': ['Deep'],
  'Admin': ['Shallow'],
};

export function calculateUrgencyScore(task: Task, currentMode: SessionMode): number {
  const now = new Date();
  
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
  
  // 4. Contextual Alignment
  let contextMultiplier = 0.5; // Neutral-ish penalty for mismatch
  if (MODE_TAG_MAP[currentMode].includes(task.energyTag)) {
    contextMultiplier = 2.0; // Significant boost for focused sessions
  }

  // Formula: Score = (Tier Weight) × (Entropy Ratio^1.5 for non-linear decay) × (Context Multiplier)
  const score = tierWeight * Math.pow(entropyRatio, 1.5) * contextMultiplier;
  
  return parseFloat(score.toFixed(4));
}

export function mapTaskData(t: any): Task {
  return {
    id: t.id,
    title: t.title,
    projectId: t.project_id,
    projectName: t.projects?.name || "Inbox",
    projectTier: t.projects?.tier || 3,
    lastTouchedAt: new Date(t.last_touched_at || t.created_at || new Date()),
    decayThresholdDays: t.projects?.decay_threshold_days || 15,
    dueDate: t.due_date ? new Date(t.due_date) : undefined,
    energyTag: t.energy_tag || "Shallow",
    durationMinutes: t.est_duration_minutes || 30,
    recurrenceIntervalDays: t.recurrence_interval_days,
    state: t.state || 'Active',
    description: t.description || "",
    subtasksCount: t.subtasks?.length || 0,
    completedSubtasksCount: t.subtasks?.filter((st: any) => st.is_completed).length || 0,
    waitingUntil: t.waiting_until ? new Date(t.waiting_until) : null,
    projectColor: getProjectColor(t.projects?.name || "Inbox", t.projects?.color),
    sortOrder: t.sort_order ?? 0
  };
}

export function filterAdminTasks(tasks: Task[]): { focus: Task[], admin: Task[] } {
  const admin = tasks.filter(t => t.durationMinutes < 10); // Batch anything < 10 mins
  const focus = tasks.filter(t => t.durationMinutes >= 10);
  return { focus, admin };
}

export function sortTasksByUrgency(tasks: Task[], currentMode: SessionMode): Task[] {
  return [...tasks].sort((a, b) => {
    const scoreA = calculateUrgencyScore(a, currentMode);
    const scoreB = calculateUrgencyScore(b, currentMode);
    return scoreB - scoreA;
  });
}

/**
 * Sort tasks with deadline-aware ordering:
 * 1. Tasks WITH deadlines → above non-deadlined tasks
 * 2. Among deadlined: manual sort_order (if explicitly set) > deadline order (soonest first)
 * 3. Tasks WITHOUT deadlines → sorted by manual sort_order (ascending)
 * 4. Tiebreaker → urgency score (higher first)
 *
 * Key insight: sort_order 0 = "unranked" (default). When a user sets a deadline,
 * sort_order resets to 0 so it enters deadline-sorted pool. When the user drags
 * to reorder, sort_order gets a real value (>0) that overrides deadline ordering.
 */
export function sortTasksByUserOrder(tasks: Task[], currentMode: SessionMode): Task[] {
  return [...tasks].sort((a, b) => {
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

    // Tiebreaker: urgency score (descending — higher urgency first)
    return calculateUrgencyScore(b, currentMode) - calculateUrgencyScore(a, currentMode);
  });
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
