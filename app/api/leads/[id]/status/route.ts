import { NextResponse } from "next/server";
import { patchStatusBody } from "@/lib/validations/lead";
import {
  isValidLeadId,
  LeadNotFoundError,
  updateLead,
} from "@/services/google-sheets-leads";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!isValidLeadId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const parsed = patchStatusBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const patch: Parameters<typeof updateLead>[1] = { ...parsed.data };
    if (parsed.data.callStatus !== undefined) {
      patch.lastCalledAt = new Date().toISOString();
    }

    const lead = await updateLead(id, patch);
    return NextResponse.json(lead);
  } catch (e) {
    if (e instanceof LeadNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
