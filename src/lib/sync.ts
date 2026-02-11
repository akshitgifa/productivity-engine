import { db } from './db';
import { createClient } from './supabase';
import { useSyncStore } from '@/store/syncStore';

// ─── Debounce mechanism ────────────────────────────────────────────────────
// Rapid-fire processOutbox() calls (e.g. reorder writing 12 items) coalesce
// into a single sync pass after 300ms of quiet.

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncInProgress = false;

export function processOutbox() {
  if (debounceTimer) clearTimeout(debounceTimer);

  return new Promise<void>((resolve) => {
    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      if (syncInProgress) { resolve(); return; }
      try {
        await _processOutboxBatched();
      } catch (err) {
        console.error('[Sync] processOutbox error:', err);
      }
      resolve();
    }, 300);
  });
}

// ─── Batched Outbox Processing ─────────────────────────────────────────────
// Groups items by (tableName, action) and sends one Supabase call per group.

async function _processOutboxBatched() {
  if (!navigator.onLine) return;

  const outboxItems = await db.sync_outbox.orderBy('timestamp').toArray();
  if (outboxItems.length === 0) return;

  syncInProgress = true;
  const store = useSyncStore.getState();
  store.setPhase('pushing');

  console.log(`[Sync] Batching ${outboxItems.length} outbox items...`);
  const supabase = createClient();

  // Group by tableName + action
  const groups = new Map<string, typeof outboxItems>();
  for (const item of outboxItems) {
    const key = `${item.tableName}:${item.action}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  store.setPendingCount(groups.size);

  for (const [key, items] of groups) {
    const [tableName, action] = key.split(':');
    try {
      let error;

      if (action === 'insert') {
        // Batch insert via upsert (handles conflicts gracefully)
        const rows = items.map(i => i.data);
        ({ error } = await supabase.from(tableName).upsert(rows));
      } else if (action === 'update') {
        // Batch updates: merge all updates for the same ID, then upsert
        const mergedById = new Map<string, Record<string, any>>();
        for (const item of items) {
          const { id, ...fields } = item.data;
          const existing = mergedById.get(id) || {};
          mergedById.set(id, { ...existing, ...fields });
        }
        const rows = Array.from(mergedById.entries()).map(([id, fields]) => ({ id, ...fields }));
        ({ error } = await supabase.from(tableName).upsert(rows));
      } else if (action === 'delete') {
        const ids = items.map(i => i.data.id);
        ({ error } = await supabase.from(tableName).delete().in('id', ids));
      }

      if (!error) {
        // Clear all processed items from outbox
        const ids = items.map(i => i.id!).filter(Boolean);
        await db.sync_outbox.bulkDelete(ids);
        store.setPendingCount(Math.max(0, useSyncStore.getState().pendingCount - 1));
        console.log(`[Sync] ✓ ${tableName}:${action} (${items.length} items)`);
      } else {
        console.error(`[Sync] Error syncing ${key}:`, error);
        // Continue with other groups — don't block on one failure
      }
    } catch (err) {
      console.error(`[Sync] Critical error syncing ${key}:`, err);
    }
  }

  store.setPhase('idle');
  store.setPendingCount(0);
  syncInProgress = false;
}

// ─── Initial Sync ──────────────────────────────────────────────────────────

export async function initialSync() {
  if (!navigator.onLine) return;

  const store = useSyncStore.getState();
  store.setPhase('syncing');
  store.setProgress(0);

  console.log('[Sync] Performing initial data fetch...');
  const supabase = createClient();

  const tables = ['projects', 'tasks', 'notes', 'activity_logs', 'subtasks', 'context_cards'] as const;

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const { data, error } = await supabase.from(table).select('*');
    if (data && !error) {
       // @ts-ignore
      await db[table].bulkPut(data);
    }
    store.setProgress((i + 1) / tables.length);
  }

  store.setPhase('idle');
  console.log('[Sync] Initial sync complete.');
}

// ─── Background listeners ──────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Sync] Back online, processing outbox...');
    processOutbox();
  });

  // Periodic fallback (every 30 seconds)
  setInterval(() => {
    processOutbox();
  }, 30000);
}

