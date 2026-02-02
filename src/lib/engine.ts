export type ProjectTier = 1 | 2 | 3 | 4;

export interface Task {
  id: string;
  title: string;
  projectId: string;
  projectTier: ProjectTier;
  lastTouchedAt: Date;
  decayThresholdDays: number;
  dueDate?: Date;
  energyTag: 'Grind' | 'Creative' | 'Shallow';
  durationMinutes: number;
}

export type SessionMode = 'Deep Work' | 'Low Energy' | 'Creative' | 'Admin';

const TIER_WEIGHTS: Record<ProjectTier, number> = {
  1: 2.0,
  2: 1.5,
  3: 1.0,
  4: 0.5,
};

const MODE_TAG_MAP: Record<SessionMode, Task['energyTag'][]> = {
  'Deep Work': ['Creative', 'Grind'],
  'Low Energy': ['Shallow'],
  'Creative': ['Creative'],
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
  const diffInMs = Math.max(0, now.getTime() - task.lastTouchedAt.getTime());
  const daysSinceLastTouch = diffInMs / (1000 * 60 * 60 * 24);
  const entropyRatio = daysSinceLastTouch / task.decayThresholdDays;
  
  // 3. Tier Multiplier
  const tierWeight = TIER_WEIGHTS[task.projectTier];
  
  // 4. Contextual Alignment
  let contextMultiplier = 0.5; // Neutral-ish penalty for mismatch
  if (MODE_TAG_MAP[currentMode].includes(task.energyTag)) {
    contextMultiplier = 2.0; // Significant boost for focused sessions
  }

  // Formula: Score = (Tier Weight) × (Entropy Ratio^1.5 for non-linear decay) × (Context Multiplier)
  const score = tierWeight * Math.pow(entropyRatio, 1.5) * contextMultiplier;
  
  return parseFloat(score.toFixed(4));
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
