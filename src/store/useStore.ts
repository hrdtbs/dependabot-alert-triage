import { create } from "zustand";

export interface ActiveScope {
  type: "user" | "org";
  name: string;
}

interface AppState {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  activeScope: ActiveScope | null;
  setActiveScope: (scope: ActiveScope | null) => void;
}

export const useStore = create<AppState>((set) => ({
  apiKey: null,
  setApiKey: (key) => set({ apiKey: key }),
  activeScope: null,
  setActiveScope: (scope) => set({ activeScope: scope }),
}));
