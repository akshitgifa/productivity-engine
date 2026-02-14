import Dexie, { Table } from 'dexie';

export interface SyncOutbox {
  id?: number;
  tableName: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retry_count: number;
}

export interface Project {
  id: string;
  user_id?: string;
  name: string;
  tier: number;
  decay_threshold_days: number;
  last_touched_at: string;
  kpi_name?: string;
  kpi_value: number;
  color?: string;
  is_deleted?: boolean;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id?: string;
  project_id?: string;
  title: string;
  description?: string;
  state: 'Active' | 'Waiting' | 'Blocked' | 'Done';
  due_date?: string;
  waiting_until?: string;
  est_duration_minutes: number;
  blocked_by_id?: string;
  recurrence_interval_days?: number;
  recurrence_type?: 'completion' | 'schedule';
  planned_date?: string | null;
  sort_order: number;
  is_deleted?: boolean;
  last_touched_at: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  task_id?: string;
  project_id?: string;
  completed_at: string;
  duration_minutes: number;
  updated_at?: string;
}

export interface Note {
  id: string;
  user_id?: string;
  project_id?: string;
  task_id?: string;
  title: string;
  content: string;
  is_read?: boolean;
  is_deleted?: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  user_id?: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  is_deleted?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ContextCard {
  content: string;
  updated_at: string;
}

export interface ProjectCustomization {
  projectId: string; // matches Project.id
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  sortOrder?: number;
  theme?: 'light' | 'dark' | 'glass' | 'neo-brutal' | 'cyberpunk';
  customStyles?: {
    color?: string;
    bgColor?: string;
    fontFamily?: string;
  };
  updated_at: string;
}



export class EntropyDatabase extends Dexie {
  projects!: Table<Project>;
  tasks!: Table<Task>;
  activity_logs!: Table<ActivityLog>;
  notes!: Table<Note>;
  subtasks!: Table<Subtask>;
  context_cards!: Table<ContextCard>;
  project_customizations!: Table<ProjectCustomization>;
  sync_outbox!: Table<SyncOutbox>;

  constructor() {
    super('EntropyDatabase');
    this.version(4).stores({
      projects: 'id, name, last_touched_at',
      tasks: 'id, project_id, state, due_date, sort_order',
      activity_logs: 'id, task_id, project_id',
      notes: 'id, project_id, task_id, sort_order',
      sync_outbox: '++id, timestamp'
    });
    this.version(5).stores({
      projects: 'id, name, last_touched_at',
      tasks: 'id, project_id, state, due_date, sort_order',
      activity_logs: 'id, task_id, project_id',
      notes: 'id, project_id, task_id, sort_order, is_read',
      subtasks: 'id, task_id',
      context_cards: 'id, project_id',
      sync_outbox: '++id, timestamp'
    });
    this.version(6).stores({
      projects: 'id, name, last_touched_at, is_deleted',
      tasks: 'id, project_id, state, due_date, sort_order, is_deleted',
      activity_logs: 'id, task_id, project_id',
      notes: 'id, project_id, task_id, sort_order, is_read, is_deleted',
      subtasks: 'id, task_id, is_deleted',
      context_cards: 'id, project_id, is_deleted',
      sync_outbox: '++id, timestamp'
    });
    this.version(11).stores({
      projects: 'id, user_id, name, last_touched_at, is_deleted',
      tasks: 'id, user_id, project_id, state, due_date, sort_order, is_deleted, planned_date',
      activity_logs: 'id, user_id, task_id, project_id',
      notes: 'id, user_id, project_id, task_id, sort_order, is_read, is_deleted',
      subtasks: 'id, user_id, task_id, is_deleted',
      context_cards: 'id, user_id, project_id, is_deleted',
      sync_outbox: '++id, timestamp, retry_count'
    });
    this.version(12).stores({
      projects: 'id, user_id, name, last_touched_at, is_deleted',
      tasks: 'id, user_id, project_id, state, due_date, sort_order, is_deleted, planned_date',
      activity_logs: 'id, user_id, task_id, project_id',
      notes: 'id, user_id, project_id, task_id, sort_order, is_read, is_deleted',
      subtasks: 'id, user_id, task_id, is_deleted',
      context_cards: 'id, user_id, project_id, is_deleted',
      project_customizations: 'projectId',
      sync_outbox: '++id, timestamp, retry_count'
    });
  }

  /**
   * Clears all tables in the database. 
   * Used during logout to ensure no local data remains.
   */
  async clearAllData() {
    await Promise.all([
      this.projects.clear(),
      this.tasks.clear(),
      this.activity_logs.clear(),
      this.notes.clear(),
      this.subtasks.clear(),
      this.context_cards.clear(),
      this.sync_outbox.clear()
    ]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('entropy_sync_timestamps');
    }
  }

  // Helper to record an action in the outbox
  async recordAction(tableName: string, action: 'insert' | 'update' | 'delete', data: any) {
    await this.sync_outbox.add({
      tableName,
      action,
      data,
      timestamp: Date.now(),
      retry_count: 0
    });
  }

  /**
   * Returns all non-deleted projects, sorted by name.
   */
  async getActiveProjects(): Promise<Project[]> {
    const all = await this.projects.toArray();
    return all.filter(p => !p.is_deleted);
  }

  /**
   * Returns non-deleted tasks, filtered by state/project if provided.
   * Also ensures the parent project isn't deleted.
   */
  async getActiveTasks(opts?: { state?: string; projectId?: string }): Promise<Task[]> {
    // 1. Resolve deleted projects to filter out their tasks
    const allProjects = await this.projects.toArray();
    const deletedProjectIds = new Set(allProjects.filter(p => p.is_deleted).map(p => p.id));

    // 2. Query tasks
    const allTasks = await this.tasks.toArray();
    
    return allTasks.filter((t: Task) => {
      if (t.is_deleted) return false;
      if (opts?.state && t.state !== opts.state) return false;
      if (opts?.projectId && t.project_id !== opts.projectId) return false;
      if (t.project_id && deletedProjectIds.has(t.project_id)) return false;
      return true;
    });
  }

  /**
   * Returns non-deleted notes.
   */
  async getActiveNotes(opts?: { projectId?: string }): Promise<Note[]> {
    const allProjects = await this.projects.toArray();
    const deletedProjectIds = new Set(allProjects.filter(p => p.is_deleted).map(p => p.id));

    const allNotes = await this.notes.toArray();
    
    return allNotes.filter((n: Note) => {
      if (n.is_deleted) return false;
      if (opts?.projectId && n.project_id !== opts.projectId) return false;
      if (n.project_id && deletedProjectIds.has(n.project_id)) return false;
      return true;
    });
  }

  /**
   * Ensures a persistent "Inbox" project exists and returns its ID.
   */
  async ensureInbox(): Promise<string> {
    const INBOX_ID = 'c0ffee00-0000-0000-0000-000000000000';
    const existing = await this.projects.get(INBOX_ID);
    
    if (!existing) {
      const now = new Date().toISOString();
      const inbox = {
        id: INBOX_ID,
        name: 'Inbox',
        tier: 4, // Lowest tier for Inbox
        decay_threshold_days: 15,
        last_touched_at: now,
        kpi_value: 0,
        color: '#71717a',
        created_at: now,
        updated_at: now
      };
      await this.projects.add(inbox);
      await this.recordAction('projects', 'insert', inbox);
    }
    
    return INBOX_ID;
  }

  async getProjectCustomization(projectId: string): Promise<ProjectCustomization | undefined> {
    return await this.project_customizations.get(projectId);
  }

  async setProjectCustomization(customization: ProjectCustomization) {
    await this.project_customizations.put(customization);
  }

  async getAllProjectCustomizations(): Promise<ProjectCustomization[]> {
    return await this.project_customizations.toArray();
  }
}

export const db = new EntropyDatabase();
