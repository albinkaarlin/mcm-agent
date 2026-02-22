import { create } from "zustand";
import { persist } from "zustand/middleware";
import { parseContactSegments, type HubSpotSegment, type CrmData } from "./crm-parser";

interface HubSpotContactsState {
  segments: HubSpotSegment[];
  lastFetchedAt: string | null;
  populateSegments: (data: CrmData) => void;
  clearSegments: () => void;
}

export const useHubSpotContactsStore = create<HubSpotContactsState>()(
  persist(
    (set) => ({
      segments: [],
      lastFetchedAt: null,
      populateSegments: (data) => {
        const segments = parseContactSegments(data);
        set({ segments, lastFetchedAt: data.fetchedAt });
      },
      clearSegments: () => set({ segments: [], lastFetchedAt: null }),
    }),
    { name: "mark-hubspot-contacts" }
  )
);
