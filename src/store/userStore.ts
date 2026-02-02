import { create } from "zustand";
import { SessionMode } from "@/lib/engine";

export type TimeConstraint = 15 | 30 | 60 | 120 | null;

interface UserState {
  mode: SessionMode;
  timeAvailable: TimeConstraint;
  setMode: (mode: SessionMode) => void;
  setTimeAvailable: (time: TimeConstraint) => void;
  // TODO: Add user session data from Supabase
}

export const useUserStore = create<UserState>((set) => ({
  mode: "Deep Work",
  timeAvailable: null, // null means "All Time"
  setMode: (mode) => set({ mode }),
  setTimeAvailable: (timeAvailable) => set({ timeAvailable }),
}));
