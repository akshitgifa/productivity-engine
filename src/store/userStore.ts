import { create } from "zustand";
import { SessionMode } from "@/lib/engine";

interface UserState {
  mode: SessionMode;
  setMode: (mode: SessionMode) => void;
  // TODO: Add user session data from Supabase
}

export const useUserStore = create<UserState>((set) => ({
  mode: "Deep Work",
  setMode: (mode) => set({ mode }),
}));
