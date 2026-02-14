import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from './db';
import { processOutbox, initialSync } from './sync';
import { createClient } from './supabase';

// Mock Supabase stable methods
const mockFromMethods = {
  select: vi.fn(() => {
    const chain: any = {
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      gt: vi.fn(() => chain),
      then: (resolve: any) => resolve({ data: mockFromMethods._data || [], error: null }),
      catch: (reject: any) => reject(new Error('Mock Error')),
    };
    return chain;
  }),
  _data: [] as any[],
  insert: vi.fn().mockResolvedValue({ error: null }),
  update: vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })),
  upsert: vi.fn().mockResolvedValue({ error: null }),
  delete: vi.fn(() => ({
    in: vi.fn().mockResolvedValue({ error: null }),
    eq: vi.fn().mockResolvedValue({ error: null }),
  })),
};

const mockSupabase = {
  from: vi.fn(() => mockFromMethods),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null }),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
};

vi.mock('./supabase', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('./db', () => {
  const mockTable = () => {
    const table: any = {
      add: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
      toArray: vi.fn().mockResolvedValue([]),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      bulkGet: vi.fn().mockResolvedValue([]),
      bulkDelete: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
    };
    
    table.where = vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      }),
      below: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    });
    
    table.orderBy = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    });
    
    return table;
  };

  const outbox = mockTable();

  return {
    db: {
      projects: mockTable(),
      tasks: mockTable(),
      notes: mockTable(),
      activity_logs: mockTable(),
      subtasks: mockTable(),
      context_cards: mockTable(),
      documentation: mockTable(),
      sync_outbox: outbox,
      recordAction: async function(tableName: string, action: string, data: any) {
        await outbox.add({
          tableName,
          action,
          data,
          timestamp: Date.now()
        });
      },
      ensureInbox: vi.fn().mockResolvedValue('c0ffee00-0000-0000-0000-000000000000'),
    },
  };
});

describe('Database and Sync Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
      writable: true,
    });
  });

  describe('db.recordAction', () => {
    it('should add an item to the sync_outbox', async () => {
      const testData = { id: '1', title: 'Test Task' };
      await db.recordAction('tasks', 'insert', testData);
      
      expect(db.sync_outbox.add).toHaveBeenCalledWith(expect.objectContaining({
        tableName: 'tasks',
        action: 'insert',
        data: testData
      }));
    });
  });

  describe('processOutbox', () => {
    it('should not process if offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      await processOutbox();
      
      expect(db.sync_outbox.orderBy).not.toHaveBeenCalled();
    });

    it('should process items in the outbox when online', async () => {
      const mockOutboxItems = [
        { id: 1, tableName: 'tasks', action: 'insert', data: { id: 't1', title: 'Task 1' }, timestamp: 100, retry_count: 0 },
      ];
      
      (db.sync_outbox.where as any)().below.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockOutboxItems),
      });
      
      await processOutbox();

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
      expect(db.sync_outbox.bulkDelete).toHaveBeenCalledWith([1]);
    });
  });

  describe('initialSync', () => {
    it('should fetch data from Supabase and put into local DB', async () => {
      const mockData = [{ id: 'p1', name: 'Project 1', updated_at: new Date().toISOString() }];
      mockFromMethods._data = mockData;

      (db.sync_outbox.where as any)().below.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'd1', title: 'Doc 1' }]),
      });

      await initialSync();

      expect(db.projects.bulkPut).toHaveBeenCalledWith(mockData);
    });
  });
});
