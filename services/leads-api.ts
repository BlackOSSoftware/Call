import type { Lead, LeadsListResponse } from "@/types/lead";

function jsonHeaders() {
  return { "Content-Type": "application/json" } as const;
}

export function buildLeadsQuery(params: {
  page: number;
  limit: number;
  q: string;
  callStatus: string;
  interestStatus: string;
  sortBy: string;
  sortOrder: string;
}) {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  if (params.q) sp.set("q", params.q);
  if (params.callStatus) sp.set("callStatus", params.callStatus);
  if (params.interestStatus) sp.set("interestStatus", params.interestStatus);
  sp.set("sortBy", params.sortBy);
  sp.set("sortOrder", params.sortOrder);
  return sp.toString();
}

export async function fetchLeadsList(search: string): Promise<LeadsListResponse> {
  const res = await fetch(`/api/leads?${search}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to load leads");
  }
  return res.json();
}

export async function patchLeadStatus(
  id: string,
  body: Partial<{ callStatus: string; interestStatus: string }>,
): Promise<Lead> {
  const res = await fetch(`/api/leads/${id}/status`, {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Update failed");
  }
  return res.json();
}

export async function patchLeadMark(id: string, mark: string): Promise<Lead> {
  const res = await fetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify({ mark }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Mark update failed");
  }
  return res.json();
}

export async function deleteLead(id: string): Promise<void> {
  const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
}
