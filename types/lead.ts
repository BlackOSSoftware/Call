export type CallStatus = "pending" | "read" | "picked" | "npc";
export type InterestStatus = "pending" | "interested" | "not_interested";

export type Lead = {
  _id: string;
  name: string;
  phone: string;
  mark: string;
  callStatus: CallStatus;
  interestStatus: InterestStatus;
  lastCalledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadsListResponse = {
  data: Lead[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type LeadFilters = {
  q: string;
  callStatus: "" | CallStatus;
  interestStatus: "" | InterestStatus;
  sortBy: "createdAt" | "updatedAt" | "name" | "lastCalledAt";
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
};
