/**
 * Centralized Task Service — Single source of truth for all task mutations.
 * 
 * All task writes (create, update, delete, complete, reorder) go through here.
 * Business rules (sort_order reset on deadline, compaction on completion) are
 * applied automatically so every entry point (UI, AI, API) gets consistent behavior.
 * 
 * Client-side: Uses Dexie (local DB) + sync outbox for offline-first.
 * Server-side: AI tools import applyTaskUpdateRules() for Supabase writes.
 */

import { db } from "@/lib/db";
import { processOutbox } from "@/lib/sync";
import { compactSortOrder } from "@/lib/engine";

// ─── Business Rules ────────────────────────────────────────────────────────

/**
 * Apply business rules to a task update payload before writing.
 * This is the SINGLE place where sort_order logic lives.
 * 
 * Can be imported by server-side code (AI tools) that uses Supabase directly.
 */
export function applyTaskUpdateRules(updates: Record<string, any>): Record<string, any> {
  const result = { ...updates };

  // Rule: Setting a deadline resets sort_order to 0 (enters deadline-sorted pool)
  if ('due_date' in result && result.due_date !== undefined) {
    result.sort_order = 0;
  }

  // Rule: Setting a planned_date stamps it appropriately
  if ('planned_date' in result && result.planned_date) {
    // If setting to today or future, ensure we keep it
    // Logic can be expanded here if needed
  }

  // Always stamp updated_at
  if (!result.updated_at) {
    result.updated_at = new Date().toISOString();
  }

  return result;
}

// ─── Client-Side Task Operations (Dexie + Outbox) ──────────────────────────

export const taskService = {
  /**
   * Create a new task in local DB + outbox.
   */
  async create(taskData: Record<string, any>): Promise<void> {
    const now = new Date().toISOString();
    const newTask = {
      id: crypto.randomUUID(),
      sort_order: 0,
      state: 'Active',
      is_deleted: false,
      created_at: now,
      updated_at: now,
      last_touched_at: now,
      ...taskData,
    };

    // Apply rules (e.g., if task has a deadline, sort_order stays 0 — which is default)
    const processed = applyTaskUpdateRules(newTask);

    await db.tasks.add(processed as any);
    await db.recordAction('tasks', 'insert', processed);
    processOutbox().catch(() => {});
  },

  /**
   * Update a task in local DB + outbox. Business rules auto-applied.
   */
  async update(taskId: string, updates: Record<string, any>): Promise<void> {
    const processed = applyTaskUpdateRules(updates);
    await db.tasks.update(taskId, processed);
    await db.recordAction('tasks', 'update', { id: taskId, ...processed });
    processOutbox().catch(() => {});
  },

  /**
   * Soft-delete a task. Sets is_deleted = true instead of erasing.
   * Returns the deleted task data so the UI can offer "Undo".
   */
  async delete(taskId: string): Promise<any> {
    const task = await db.tasks.get(taskId);
    const now = new Date().toISOString();
    const update = { is_deleted: true, updated_at: now };
    await db.tasks.update(taskId, update);
    await db.recordAction('tasks', 'update', { id: taskId, ...update });
    processOutbox().catch(() => {});
    return task; // Return so caller can offer "Undo"
  },

  /**
   * Undo a soft-delete by restoring is_deleted to false.
   */
  async undoDelete(taskId: string): Promise<void> {
    const now = new Date().toISOString();
    const update = { is_deleted: false, updated_at: now };
    await db.tasks.update(taskId, update);
    await db.recordAction('tasks', 'update', { id: taskId, ...update });
    processOutbox().catch(() => {});
  },

  /**
   * Reorder tasks — sets sequential sort_order values.
   * Used by drag-and-drop handlers.
   */
  async reorder(orderedTaskIds: { id: string; currentSortOrder: number }[]): Promise<void> {
    for (let i = 0; i < orderedTaskIds.length; i++) {
      const { id, currentSortOrder } = orderedTaskIds[i];
      const newOrder = i + 1;
      if (currentSortOrder !== newOrder) {
        const update = { sort_order: newOrder, updated_at: new Date().toISOString() };
        await db.tasks.update(id, update);
        await db.recordAction('tasks', 'update', { id, ...update });
      }
    }
    processOutbox().catch(() => {});
  },

  /**
   * Set or unset the planned date (Daily Agenda commitment).
   */
  async setPlannedDate(taskId: string, date: string | null): Promise<void> {
    const update = { planned_date: date, updated_at: new Date().toISOString() };
    await db.tasks.update(taskId, update);
    await db.recordAction('tasks', 'update', { id: taskId, ...update });
    processOutbox().catch(() => {});
  },

  /**
   * Complete a task — marks done, logs activity, rejuvenates project,
   * handles recurrence, and compacts sort_order.
   */
  async complete(task: {
    id: string;
    title: string;
    projectId?: string;
    durationMinutes?: number;
    recurrenceIntervalDays?: number;
    energyTag?: string;
    sessionMode?: string;
  }): Promise<{ success: boolean }> {
    const now = new Date().toISOString();

    // 1. Mark task as done
    await db.tasks.update(task.id, { state: "Done", updated_at: now });
    await db.recordAction("tasks", "update", { id: task.id, state: "Done", updated_at: now });

    // 2. Log activity
    const activityLog = {
      id: crypto.randomUUID(),
      task_id: task.id,
      project_id: task.projectId,
      duration_minutes: task.durationMinutes || 30,
      session_mode: task.sessionMode || "Deep Work",
      completed_at: now,
    };
    await db.activity_logs.add(activityLog);
    await db.recordAction("activity_logs", "insert", activityLog);

    // 3. Rejuvenate project health
    if (task.projectId) {
      const update = { last_touched_at: now };
      await db.projects.update(task.projectId, update);
      await db.recordAction("projects", "update", { id: task.projectId, ...update });
    }

    // 4. Handle Smart Recurrence
    const dbTask = await db.tasks.get(task.id);
    if (dbTask && dbTask.recurrence_interval_days) {
      const interval = dbTask.recurrence_interval_days;
      const type = dbTask.recurrence_type || 'completion';
      
      const nextRunDate = new Date();
      if (type === 'schedule' && dbTask.due_date) {
        const baseDate = new Date(dbTask.due_date);
        nextRunDate.setTime(baseDate.getTime() + (interval * 24 * 60 * 60 * 1000));
      } else {
        nextRunDate.setDate(nextRunDate.getDate() + interval);
      }

      const newTask = {
        id: crypto.randomUUID(),
        title: dbTask.title,
        description: dbTask.description || undefined,
        project_id: dbTask.project_id,
        est_duration_minutes: dbTask.est_duration_minutes || 30,
        energy_tag: dbTask.energy_tag || "Shallow",
        state: "Active" as const,
        is_deleted: false,
        recurrence_interval_days: interval,
        recurrence_type: type,
        waiting_until: nextRunDate.toISOString(),
        sort_order: 0,
        created_at: now,
        updated_at: now,
        last_touched_at: now,
      };

      await db.tasks.add(newTask);
      await db.recordAction("tasks", "insert", newTask);
    }

    // 5. Compact sort_order for remaining active tasks
    try {
      const activeTasks = await db.tasks.where("state").equals("Active").toArray();
      const tasksForCompaction = activeTasks
        .filter(t => !t.is_deleted)
        .map((t) => ({
          id: t.id,
          sortOrder: t.sort_order ?? 0,
        }));
      const updates = compactSortOrder(tasksForCompaction);
      for (const u of updates) {
        const upd = { sort_order: u.newSortOrder, updated_at: now };
        await db.tasks.update(u.id, upd);
        await db.recordAction("tasks", "update", { id: u.id, ...upd });
      }
    } catch (err) {
      console.error("[Sort Compaction] Failed:", err);
    }

    // Trigger background sync
    processOutbox().catch((err) =>
      console.error("[Sync] Background process failed:", err)
    );

    return { success: true };
  },
};
