import { z } from "zod";

export const singleLeadBody = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(3).max(32),
});

export const bulkLeadsBody = z.object({
  leads: z.array(singleLeadBody).min(1).max(500),
});

export const postLeadsBody = z.union([bulkLeadsBody, singleLeadBody]);

export const patchStatusBody = z.object({
  callStatus: z.enum(["pending", "picked", "npc"]).optional(),
  interestStatus: z
    .enum(["pending", "interested", "not_interested"])
    .optional(),
});

export const putLeadBody = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(3).max(32),
  callStatus: z.enum(["pending", "picked", "npc"]),
  interestStatus: z.enum(["pending", "interested", "not_interested"]),
});
