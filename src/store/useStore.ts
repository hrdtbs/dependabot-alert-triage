import { create } from "zustand";

interface AppState {
  apiKey: string | null;
  setApiKey: (key: string) => void;
}

export const useStore = create<AppState>((set) => ({
  apiKey: null,
  setApiKey: (key) => set({ apiKey: key }),
}));
