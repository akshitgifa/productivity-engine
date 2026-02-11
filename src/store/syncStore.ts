import { create } from "zustand";

export type SyncPhase = "idle" | "syncing" | "pushing";

interface SyncState {
  phase: SyncPhase;
  /** Progress 0–1 for initial sync (tables loaded / total tables) */
  progress: number;
  /** Number of outbox items remaining */
  pendingCount: number;
  setPhase: (phase: SyncPhase) => void;
  setProgress: (progress: number) => void;
  setPendingCount: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  phase: "idle",
  progress: 0,
  pendingCount: 0,
  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),
  setPendingCount: (count) => set({ pendingCount: count }),
}));
