import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MailList {
  id: string;
  name: string;
  emails: string[];
}

interface MailListState {
  lists: MailList[];
  addList: (list: MailList) => void;
  removeList: (id: string) => void;
}

export const useMailListStore = create<MailListState>()(
  persist(
    (set) => ({
      lists: [],
      addList: (list) => set((state) => ({ lists: [...state.lists, list] })),
      removeList: (id) =>
        set((state) => ({ lists: state.lists.filter((l) => l.id !== id) })),
    }),
    { name: "mail-lists" }
  )
);
