"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildLeadsQuery, fetchLeadsList } from "@/services/leads-api";
import { useCrmStore } from "@/store/useCrmStore";

export function useLeadsQuery() {
  const filters = useCrmStore((s) => s.filters);
  const search = useMemo(
    () => buildLeadsQuery(filters),
    [filters],
  );

  return useQuery({
    queryKey: ["leads", search],
    queryFn: () => fetchLeadsList(search),
    staleTime: 20_000,
  });
}
