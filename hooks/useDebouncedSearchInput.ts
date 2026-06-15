"use client";

import { useEffect, useState } from "react";
import { useCrmStore } from "@/store/useCrmStore";

export function useDebouncedSearchInput() {
  const qStore = useCrmStore((s) => s.filters.q);
  const setFilters = useCrmStore((s) => s.setFilters);
  const resetPage = useCrmStore((s) => s.resetPage);
  const [local, setLocal] = useState(qStore);

  useEffect(() => {
    setLocal(qStore);
  }, [qStore]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (local === qStore) return;
      setFilters({ q: local });
      resetPage();
    }, 320);
    return () => window.clearTimeout(t);
  }, [local, qStore, setFilters, resetPage]);

  return { local, setLocal };
}
