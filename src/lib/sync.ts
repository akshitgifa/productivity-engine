import { db } from './db';
import { createClient } from './supabase';
import { useSyncStore } from '@/store/syncStore';

export async function processOutbox() {
  if (!navigator.onLine) return;

  const outboxItems = await db.sync_outbox.orderBy('timestamp').toArray();
  if (outboxItems.length === 0) return;

  const store = useSyncStore.getState();
  store.setPhase('pushing');
  store.setPendingCount(outboxItems.length);

  console.log(`[Sync] Processing ${outboxItems.length} items from outbox...`);
  const supabase = createClient();

  for (const item of outboxItems) {
    try {
      let error;
      if (item.action === 'insert') {
        ({ error } = await supabase.from(item.tableName).insert(item.data));
      } else if (item.action === 'update') {
        const { id, ...updateData } = item.data;
        ({ error } = await supabase.from(item.tableName).update(updateData).eq('id', id));
      } else if (item.action === 'delete') {
        ({ error } = await supabase.from(item.tableName).delete().eq('id', item.data.id));
      }

      if (!error) {
        await db.sync_outbox.delete(item.id!);
        store.setPendingCount(Math.max(0, useSyncStore.getState().pendingCount - 1));
      } else {
        console.error(`[Sync] Error syncing ${item.tableName}:`, error);
        break;
      }
    } catch (err) {
      console.error(`[Sync] Critical error syncing ${item.tableName}:`, err);
      break;
    }
  }

  store.setPhase('idle');
  store.setPendingCount(0);
}

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

// Set up listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Sync] Back online, processing outbox...');
    processOutbox();
  });

  // Periodic check as a fallback (every 30 seconds)
  setInterval(() => {
    processOutbox();
  }, 30000);
}

