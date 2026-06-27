import { NextResponse } from "next/server";
import { patchLeadBody, putLeadBody } from "@/lib/validations/lead";
import {
  deleteLead,
  DuplicatePhoneError,
  getLeadById,
  isValidLeadId,
  LeadNotFoundError,
  updateLead,
} from "@/services/google-sheets-leads";
import { normalizePhoneDigits } from "@/utils/phone-format";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!isValidLeadId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const lead = await getLeadById(id);
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(lead);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!isValidLeadId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = putLeadBody.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
    }
    const phone = normalizePhoneDigits(body.data.phone);
    const lead = await updateLead(id, {
      name: body.data.name.trim(),
      phone,
      mark: body.data.mark?.trim() ?? "",
      callStatus: body.data.callStatus,
      interestStatus: body.data.interestStatus,
    });
    return NextResponse.json(lead);
  } catch (e: unknown) {
    if (e instanceof LeadNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (e instanceof DuplicatePhoneError) {
      return NextResponse.json({ error: "Phone already exists" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!isValidLeadId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = patchLeadBody.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
    }
    const lead = await updateLead(id, { mark: body.data.mark.trim() });
    return NextResponse.json(lead);
  } catch (e) {
    if (e instanceof LeadNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update mark" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!isValidLeadId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await deleteLead(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof LeadNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
