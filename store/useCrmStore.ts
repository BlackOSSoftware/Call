import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LeadFilters } from "@/types/lead";

export type RecentCall = {
  phone: string;
  name?: string;
  at: string;
};

type PendingPostCall = { leadId: string | null; phone: string; name: string };

const defaultFilters: LeadFilters = {
  q: "",
  callStatus: "",
  interestStatus: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 20,
};

type CrmState = {
  filters: LeadFilters;
  currentLeadId: string | null;
  lastCalledPhone: string | null;
  lastCalledName: string | null;
  recentCalls: RecentCall[];
  pendingPostCall: PendingPostCall | null;
  callSessionActive: boolean;
  setFilters: (patch: Partial<LeadFilters>) => void;
  resetPage: () => void;
  setCurrentLeadId: (id: string | null) => void;
  setPendingPostCall: (v: PendingPostCall | null) => void;
  setCallSessionActive: (v: boolean) => void;
  recordCallLocal: (phone: string, name?: string) => void;
  clearPendingPostCall: () => void;
};

export const useCrmStore = create<CrmState>()(
  persist(
    (set) => ({
      filters: { ...defaultFilters },
      currentLeadId: null,
      lastCalledPhone: null,
      lastCalledName: null,
      recentCalls: [],
      pendingPostCall: null,
      callSessionActive: false,

      setFilters: (patch) =>
        set((s) => ({
          filters: { ...s.filters, ...patch, page: patch.page ?? s.filters.page },
        })),

      resetPage: () =>
        set((s) => ({ filters: { ...s.filters, page: 1 } })),

      setCurrentLeadId: (id) => set({ currentLeadId: id }),

      setPendingPostCall: (v) => set({ pendingPostCall: v }),

      setCallSessionActive: (v) => set({ callSessionActive: v }),

      recordCallLocal: (phone, name) => {
        const entry: RecentCall = {
          phone,
          name,
          at: new Date().toISOString(),
        };
        set((s) => ({
          lastCalledPhone: phone,
          lastCalledName: name ?? null,
          recentCalls: [
            entry,
            ...s.recentCalls.filter((r) => r.phone !== phone),
          ].slice(0, 40),
        }));
      },

      clearPendingPostCall: () => set({ pendingPostCall: null }),
    }),
    {
      name: "lead-calling-crm",
      partialize: (s) => ({
        recentCalls: s.recentCalls,
        lastCalledPhone: s.lastCalledPhone,
        lastCalledName: s.lastCalledName,
        filters: s.filters,
      }),
    },
  ),
);