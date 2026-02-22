import { create } from "zustand";
import { persist } from "zustand/middleware";

interface HubSpotStore {
  connected: boolean;
  setConnected: (v: boolean) => void;
}

export const useHubSpotStore = create<HubSpotStore>()(
  persist(
    (set) => ({
      connected: false,
      setConnected: (v) => set({ connected: v }),
    }),
    { name: "mark-hubspot" }
  )
);
