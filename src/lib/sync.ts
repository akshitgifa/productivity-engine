import { db } from './db';
import { createClient } from './supabase';
import { useSyncStore } from '@/store/syncStore';

// ─── Constants ─────────────────────────────────────────────────────────────
const SYNC_TABLES = ['projects', 'tasks', 'notes', 'activity_logs', 'subtasks', 'context_cards'] as const;
const LAST_SYNC_KEY = 'productivity_engine_last_sync';
const MAX_OUTBOX_RETRIES = 5;
const OUTBOX_BATCH_GROUP_LIMIT = 20;

// Tables that have updated_at columns (used for incremental sync)
const INCREMENTAL_TABLES = new Set(['projects', 'tasks', 'notes', 'activity_logs', 'subtasks', 'context_cards']);
// Tables that have is_deleted columns (used for archival purge)
const SOFT_DELETE_TABLES = new Set(['projects', 'tasks', 'notes', 'subtasks', 'context_cards']);

// ─── Debounce & Mutex ──────────────────────────────────────────────────────
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let localSyncInProgress = false;
let initialSyncInProgress = false;

export function processOutbox() {
  if (debounceTimer) clearTimeout(debounceTimer);

  return new Promise<void>((resolve) => {
    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      if (localSyncInProgress) { resolve(); return; }
      
      // Use Web Locks API to prevent multi-tab sync races
      if (typeof navigator !== 'undefined' && navigator.locks) {
        await navigator.locks.request('entropy_sync_lock', { ifAvailable: true }, async (lock) => {
          if (!lock) return; // Another tab is syncing
          try {
            await _processOutboxBatched();
          } catch (err) {
            console.error('[Sync] processOutbox error:', err);
          }
        });
      } else {
        // Fallback for environments without Web Locks
        try {
          await _processOutboxBatched();
        } catch (err) {
          console.error('[Sync] processOutbox error:', err);
        }
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

  // Filter out items that have failed too many times and sort by timestamp
  const outboxItems = await db.sync_outbox
    .where('retry_count')
    .below(MAX_OUTBOX_RETRIES)
    .toArray();
    
  outboxItems.sort((a, b) => a.timestamp - b.timestamp);

  localSyncInProgress = true;
  const store = useSyncStore.getState();
  store.setPhase('pushing');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.warn('[Sync] No user session found, skipping outbox processing');
    store.setPhase('idle');
    localSyncInProgress = false;
    return;
  }

  // Group items by table and action
  const groups = new Map<string, typeof outboxItems>();
  for (const item of outboxItems) {
    const key = `${item.tableName}:${item.action}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  // Limit processing to N groups per batch to keep it responsive
  const allGroupKeys = Array.from(groups.keys());
  const keysToProcess = allGroupKeys.slice(0, OUTBOX_BATCH_GROUP_LIMIT);
  
  store.setPendingCount(keysToProcess.length);
  // console.log(`[Sync] Processing ${keysToProcess.length} outbox groups (${outboxItems.length} total items)...`);

  for (const key of keysToProcess) {
    const items = groups.get(key)!;
    const [tableName, action] = key.split(':');
    try {
      let error;

      if (action === 'insert' || action === 'update') {
        const uniqueIds = Array.from(new Set(items.map((i: any) => i.data.id)));
        const fullRecordsFromDb = await (db as any)[tableName].bulkGet(uniqueIds);
        const recordMap = new Map();
        fullRecordsFromDb.forEach((r: any) => {
          if (r) recordMap.set(r.id, r);
        });

        const mergedById = new Map<string, Record<string, any>>();
        const tablesWithUserId = new Set(['projects', 'tasks', 'notes', 'activity_logs', 'subtasks', 'context_cards']);
        
        for (const item of items) {
          const { id, ...fields } = item.data;
          const base = recordMap.get(id) || {};
          const existing = mergedById.get(id) || base;
          const sanitizedFields = sanitizeForSupabase(fields);
          
          const record: Record<string, any> = { ...existing, ...sanitizedFields, id };
          if (tablesWithUserId.has(tableName)) {
            record.user_id = user.id;
          }
          mergedById.set(id, record);
        }
        const rows = Array.from(mergedById.values());
        
        const { error: supabaseError } = await supabase.from(tableName).upsert(rows);
        error = supabaseError;

        if (error) {
          console.error(`[Sync] Supabase rejection for ${key}:`, error);
        }
      } else if (action === 'delete') {
        const ids = items.map((i: any) => i.data.id);
        const { error: supabaseError } = await supabase.from(tableName).delete().in('id', ids);
        error = supabaseError;
      }

      if (!error) {
        const ids = items.map((i: any) => i.id!).filter(Boolean);
        await db.sync_outbox.bulkDelete(ids);
        store.setPendingCount(Math.max(0, useSyncStore.getState().pendingCount - 1));
      } else {
        // Increment retry count for failed items
        const ids = items.map((i: any) => i.id!).filter(Boolean);
        for (const id of ids) {
          const item = items.find((i: any) => i.id === id);
          if (item) {
            await db.sync_outbox.update(id, { retry_count: (item.retry_count || 0) + 1 });
          }
        }
      }
    } catch (err) {
      console.error(`[Sync] Critical error syncing ${key}:`, err);
    }
  }

  store.setPhase('idle');
  store.setPendingCount(0);
  localSyncInProgress = false;

  if (allGroupKeys.length > OUTBOX_BATCH_GROUP_LIMIT) {
    setTimeout(() => processOutbox(), 1000);
  }

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
  } else if (remoteMeta && remoteMeta[0]) {
    const remoteMax = remoteMeta[0].updated_at;
    if (lastSync && remoteMax <= lastSync) {
      return;
    }
  }

  // Pull records for the current user only
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
    // console.log(`[Sync] Pulled ${toPut.length} updates for ${tableName}`);
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
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (newRow && newRow.user_id && newRow.user_id !== user.id) return;
      if (oldRow && oldRow.user_id && oldRow.user_id !== user.id) return;

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const localItem = await (db as any)[table].get(newRow.id);
        const remoteUpdate = new Date(newRow.updated_at || 0).getTime();
        const localUpdate = new Date(localItem?.updated_at || 0).getTime();

        if (!localItem || remoteUpdate >= localUpdate) {
          await (db as any)[table].put(newRow);
          updateStoredTimestamp(table, newRow.updated_at);
        }
      } else if (eventType === 'DELETE') {
        const record = await (db as any)[table].get(oldRow.id);
        if (record && record.user_id === user.id) {
           await (db as any)[table].delete(oldRow.id);
        }
      }

      window.dispatchEvent(new CustomEvent('entropy:sync-complete', { detail: { table, eventType } }));
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Finds any local records with user_id: null and assigns the current user_id to them.
 * This allows a user who was working in a "loggedIn but unassigned" state to keep their data.
 */
async function claimUnassignedData(userId: string) {
  for (const table of SYNC_TABLES) {
    try {
      const unassigned = await (db as any)[table]
        .filter((r: any) => !r.user_id)
        .toArray();
      
      if (unassigned.length > 0) {
        console.log(`[Sync] Claiming ${unassigned.length} unassigned records in ${table}...`);
        const updates = unassigned.map((r: any) => ({ ...r, user_id: userId }));
        await (db as any)[table].bulkPut(updates);
        
        // Record these changes in outbox so they sync to Supabase
        for (const record of updates) {
          await db.recordAction(table, 'update', record);
        }
      }
    } catch (err) {
      console.warn(`[Sync] Could not claim data for ${table}:`, err);
    }
  }
}

export async function initialSync() {
  if (!navigator.onLine) return;

  const store = useSyncStore.getState();
  if (store.phase !== 'idle' || initialSyncInProgress) {
    // console.log('[Sync] Sync already in progress, skipping...');
    return; 
  }

  initialSyncInProgress = true;
  store.setPhase('syncing');
  store.setProgress(0);

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('[Sync] No authenticated user, skipping initial sync');
      store.setPhase('idle');
      return;
    }

    // 1. Claim any local data created before login
    await claimUnassignedData(user.id);

    // 2. Ensure basic structures and process outbox
    await db.ensureInbox();
    await _processOutboxBatched();

    const timestamps = getStoredTimestamps();

    let completed = 0;
    const syncPromises = SYNC_TABLES.map(async (table) => {
      await syncTable(table as string, supabase, timestamps[table] || null);
      completed++;
      store.setProgress(completed / SYNC_TABLES.length);
    });

    await Promise.all(syncPromises);
    // console.log('[Sync] Synchronization complete.');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('entropy:sync-complete'));
    }
  } finally {
    store.setPhase('idle');
    initialSyncInProgress = false;
  }
}

// ─── Local Archival ────────────────────────────────────────────────────────

export async function purgeLocalArchive() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffISO = cutoff.toISOString();

  for (const table of SOFT_DELETE_TABLES) {
    try {
      const records = await (db as any)[table]
        .where('is_deleted')
        .equals(1) 
        .toArray();
      
      const toDelete = records.filter((r: any) => 
        r.updated_at && r.updated_at < cutoffISO
      );

      if (toDelete.length > 0) {
        await (db as any)[table].bulkDelete(toDelete.map((r: any) => r.id));
      }
    } catch {
    }
  }
}

// ─── Background listeners ──────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processOutbox();
  });

  setInterval(() => {
    processOutbox();
  }, 30000);

  setTimeout(() => purgeLocalArchive(), 5000);
}
