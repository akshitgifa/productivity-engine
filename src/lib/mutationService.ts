/**
 * mutationService.ts - Unified layer for all database writes.
 * 
 * Centralizes the Dexie + Outbox pattern for all tables (projects, tasks, notes, etc.).
 * Automatically handles updated_at stamps, outbox recording, and background sync triggers.
 */

import { db } from "@/lib/db";
import { processOutbox } from "@/lib/sync";
import { taskService } from "./taskService";

type TableName = 'projects' | 'tasks' | 'notes' | 'activity_logs' | 'subtasks' | 'context_cards';

export const mutationService = {
  /**
   * Universal insert helper
   */
  async insert(tableName: TableName, data: Record<string, any>): Promise<void> {
    const now = new Date().toISOString();
    const record = {
      id: data.id || crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      is_deleted: false,
      ...data,
    };

    await (db as any)[tableName].add(record);
    await db.recordAction(tableName, 'insert', record);
    processOutbox().catch(() => {});
  },

  /**
   * Universal update helper
   */
  async update(tableName: TableName, id: string, updates: Record<string, any>): Promise<void> {
    const now = new Date().toISOString();
    const processedUpdates = {
      ...updates,
      updated_at: now,
    };

    await (db as any)[tableName].update(id, processedUpdates);
    await db.recordAction(tableName, 'update', { id, ...processedUpdates });
    processOutbox().catch(() => {});
  },

  /**
   * Soft-delete helper
   */
  async delete(tableName: TableName, id: string): Promise<any> {
    const record = await (db as any)[tableName].get(id);
    const now = new Date().toISOString();
    const update = { is_deleted: true, updated_at: now };
    
    await (db as any)[tableName].update(id, update);
    await db.recordAction(tableName, 'update', { id, ...update });
    processOutbox().catch(() => {});
    
    return record;
  },

  /**
   * Restore soft-deleted item
   */
  async undoDelete(tableName: TableName, id: string): Promise<void> {
    const now = new Date().toISOString();
    const update = { is_deleted: false, updated_at: now };
    
    await (db as any)[tableName].update(id, update);
    await db.recordAction(tableName, 'update', { id, ...update });
    processOutbox().catch(() => {});
  },

  /**
   * Task-specific operations (delegated to taskService but unified here)
   */
  tasks: taskService,

  /**
   * Note-specific operations
   */
  notes: {
    async create(noteData: Record<string, any>) {
      await mutationService.insert('notes', {
        sort_order: 0,
        ...noteData
      });
    },
    async update(id: string, updates: Record<string, any>) {
      await mutationService.update('notes', id, updates);
    }
  },

  /**
   * Subtask-specific operations
   */
  subtasks: {
    async create(subtaskData: Record<string, any>) {
      await mutationService.insert('subtasks', {
        is_completed: false,
        ...subtaskData
      });
    },
    async toggle(id: string, isCompleted: boolean) {
      await mutationService.update('subtasks', id, { is_completed: isCompleted });
    }
  }
};
