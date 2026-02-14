import { db } from './db';
import { createClient } from './supabase';
import { useSyncStore } from '@/store/syncStore';

// ─── Constants ─────────────────────────────────────────────────────────────
const SYNC_TABLES = ['projects', 'tasks', 'notes', 'activity_logs', 'subtasks', 'context_cards'] as const;
const LAST_SYNC_KEY = 'productivity_engine_last_sync';

// Tables that have updated_at columns (used for incremental sync)
const INCREMENTAL_TABLES = new Set(['projects', 'tasks', 'notes', 'activity_logs', 'subtasks', 'context_cards']);
// Tables that have is_deleted columns (used for archival purge)
const SOFT_DELETE_TABLES = new Set(['projects', 'tasks', 'notes', 'subtasks', 'context_cards']);

// ─── Debounce mechanism ────────────────────────────────────────────────────
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

/**
 * Sanitizes data by removing any camelCase keys that might cause Supabase rejections.
 */
function sanitizeForSupabase(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!/[A-Z]/.test(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ─── Batched Outbox Processing ─────────────────────────────────────────────
async function _processOutboxBatched() {
  if (!navigator.onLine) return;

  const outboxItems = await db.sync_outbox.orderBy('timestamp').toArray();
  if (outboxItems.length === 0) return;

  syncInProgress = true;
  const store = useSyncStore.getState();
  store.setPhase('pushing');

  console.log(`[Sync] Batching ${outboxItems.length} outbox items...`);
  const supabase = createClient();

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

      if (action === 'insert' || action === 'update') {
        // Fetch full records from Dexie to satisfy NOT NULL constraints
        const uniqueIds = Array.from(new Set(items.map(i => i.data.id)));
        const fullRecordsFromDb = await (db as any)[tableName].bulkGet(uniqueIds);
        const recordMap = new Map();
        fullRecordsFromDb.forEach((r: any) => {
          if (r) recordMap.set(r.id, r);
        });

        const mergedById = new Map<string, Record<string, any>>();
        for (const item of items) {
          const { id, ...fields } = item.data;
          const base = recordMap.get(id) || {};
          const existing = mergedById.get(id) || base;
          const sanitizedFields = sanitizeForSupabase(fields);
          mergedById.set(id, { ...existing, ...sanitizedFields, id });
        }
        const rows = Array.from(mergedById.values());
        
        const { error: supabaseError } = await supabase.from(tableName).upsert(rows);
        error = supabaseError;

        if (error) {
          console.error(`[Sync] Supabase rejection for ${key}:`, error, { 
            tableName, action, rowsAttempted: rows 
          });
        }
      } else if (action === 'delete') {
        const ids = items.map(i => i.data.id);
        const { error: supabaseError } = await supabase.from(tableName).delete().in('id', ids);
        error = supabaseError;
      }

      if (!error) {
        const ids = items.map(i => i.id!).filter(Boolean);
        await db.sync_outbox.bulkDelete(ids);
        store.setPendingCount(Math.max(0, useSyncStore.getState().pendingCount - 1));
        console.log(`[Sync] ✓ ${tableName}:${action} (${items.length} items)`);
      }
    } catch (err) {
      console.error(`[Sync] Critical error syncing ${key}:`, err);
    }
  }

  store.setPhase('idle');
  store.setPendingCount(0);
  syncInProgress = false;

  // Dispatch global event to notify UI to refresh
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('entropy:sync-complete'));
  }
}

// ─── Incremental Sync (Merge Logic) ─────────────────────────────────────────

type SyncTimestamps = Record<string, string>;
const SYNC_TIMESTAMPS_KEY = 'entropy_sync_timestamps';

function getStoredTimestamps(): SyncTimestamps {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(SYNC_TIMESTAMPS_KEY) || '{}');
  } catch {
    return {};
  }
}

function updateStoredTimestamp(tableName: string, timestamp: string) {
  if (typeof window === 'undefined') return;
  const timestamps = getStoredTimestamps();
  timestamps[tableName] = timestamp;
  localStorage.setItem(SYNC_TIMESTAMPS_KEY, JSON.stringify(timestamps));
}

/**
 * Fetches only records updated since `lastSync` and merges them into Dexie
 * using timestamp comparison.
 */
async function syncTable(tableName: string, supabase: any, lastSync: string | null) {
  // Metadata check: get the latest updated_at in the cloud for this table
  const { data: remoteMeta, error: metaError } = await supabase
    .from(tableName)
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (metaError) {
    console.error(`[Sync] Metadata check failed for ${tableName}:`, metaError);
    // Fallback: try regular sync if metadata check fails
  } else if (remoteMeta && remoteMeta[0]) {
    const remoteMax = remoteMeta[0].updated_at;
    if (lastSync && remoteMax <= lastSync) {
      // console.log(`[Sync] ✓ ${tableName} is up-to-date (Cloud: ${remoteMax}, Local: ${lastSync})`);
      return;
    }
  }

  let query = supabase.from(tableName).select('*');
  
  if (lastSync && INCREMENTAL_TABLES.has(tableName)) {
    query = query.gt('updated_at', lastSync);
  }

  const { data: remoteData, error } = await query;
  if (error || !remoteData) {
    console.error(`[Sync] Failed to fetch ${tableName}:`, error);
    return;
  }

  if (remoteData.length === 0) return;

  const localData = await (db as any)[tableName].bulkGet(
    remoteData.map((r: any) => r.id)
  );
  const localMap = new Map();
  localData.forEach((item: any) => {
    if (item) localMap.set(item.id, item);
  });

  const toPut: any[] = [];
  let maxUpdate: string | null = lastSync;
  
  for (const remoteItem of remoteData) {
    const localItem = localMap.get(remoteItem.id);
    const remoteUpdateStr = (remoteItem as any).updated_at;
    
    if (remoteUpdateStr && (!maxUpdate || remoteUpdateStr > maxUpdate)) {
      maxUpdate = remoteUpdateStr;
    }

    if (!localItem) {
      toPut.push(remoteItem);
    } else {
      const remoteUpdate = new Date(remoteUpdateStr || 0).getTime();
      const localUpdate = new Date((localItem as any).updated_at || 0).getTime();
      if (remoteUpdate >= localUpdate) {
        toPut.push(remoteItem);
      }
    }
  }

  if (toPut.length > 0) {
    await (db as any)[tableName].bulkPut(toPut);
    console.log(`[Sync] Pulled ${toPut.length} updates for ${tableName}`);
  }

  if (maxUpdate) {
    updateStoredTimestamp(tableName, maxUpdate);
  }
}

// ─── Real-time Subscriptions ──────────────────────────────────────────────

export function setupSubscriptions() {
  if (typeof window === 'undefined') return () => {};
  
  const supabase = createClient();
  console.log('[Sync] Initializing real-time subscriptions...');

  const channel = supabase
    .channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, async (payload: any) => {
      const { table, eventType, new: newRow, old: oldRow } = payload;
      // console.log(`[Sync] Real-time ${eventType} on ${table}`);

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const localItem = await (db as any)[table].get(newRow.id);
        const remoteUpdate = new Date(newRow.updated_at || 0).getTime();
        const localUpdate = new Date(localItem?.updated_at || 0).getTime();

        if (!localItem || remoteUpdate >= localUpdate) {
          await (db as any)[table].put(newRow);
          updateStoredTimestamp(table, newRow.updated_at);
        }
      } else if (eventType === 'DELETE') {
        await (db as any)[table].delete(oldRow.id);
      }

      window.dispatchEvent(new CustomEvent('entropy:sync-complete', { detail: { table, eventType } }));
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function initialSync() {
  if (!navigator.onLine) return;

  const store = useSyncStore.getState();
  if (store.phase !== 'idle') return; // Prevent concurrent initial syncs

  store.setPhase('syncing');
  store.setProgress(0);

  try {
    await db.ensureInbox();
    await _processOutboxBatched();

    const timestamps = getStoredTimestamps();
    const supabase = createClient();

    let completed = 0;
    const syncPromises = SYNC_TABLES.map(async (table) => {
      await syncTable(table as string, supabase, timestamps[table] || null);
      completed++;
      store.setProgress(completed / SYNC_TABLES.length);
    });

    await Promise.all(syncPromises);
    console.log('[Sync] Synchronization complete.');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('entropy:sync-complete'));
    }
  } catch (err) {
    console.error('[Sync] Initial sync failure:', err);
  } finally {
    store.setPhase('idle');
  }
}

// ─── Local Archival ────────────────────────────────────────────────────────

/**
 * Purge soft-deleted records older than 30 days from local Dexie.
 * These records are still in Supabase cloud for safety.
 */
export async function purgeLocalArchive() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffISO = cutoff.toISOString();

  for (const table of SOFT_DELETE_TABLES) {
    try {
      const records = await (db as any)[table]
        .where('is_deleted')
        .equals(1) // Dexie stores booleans as 0/1
        .toArray();
      
      const toDelete = records.filter((r: any) => 
        r.updated_at && r.updated_at < cutoffISO
      );

      if (toDelete.length > 0) {
        await (db as any)[table].bulkDelete(toDelete.map((r: any) => r.id));
        console.log(`[Archive] Purged ${toDelete.length} old records from ${table}`);
      }
    } catch {
      // Table might not have is_deleted column (e.g., activity_logs)
    }
  }
}

// ─── Background listeners ──────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Sync] Back online, processing outbox...');
    processOutbox();
  });

  // Periodic outbox processing (every 30 seconds)
  setInterval(() => {
    processOutbox();
  }, 30000);

  // Daily local archive purge
  setTimeout(() => purgeLocalArchive(), 5000);
}
