import { create } from "zustand";

export type TimeConstraint = 15 | 30 | 60 | 120 | null;

interface UserState {
  timeAvailable: TimeConstraint;
  setTimeAvailable: (time: TimeConstraint) => void;
  // TODO: Add user session data from Supabase
}

export const useUserStore = create<UserState>((set) => ({
  timeAvailable: null, // null means "All Time"
  setTimeAvailable: (timeAvailable) => set({ timeAvailable }),
}));
