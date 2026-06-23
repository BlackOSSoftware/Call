import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { LeadModel } from "@/models/Lead";
import { patchStatusBody } from "@/lib/validations/lead";
import type { Lead } from "@/types/lead";

function serialize(doc: {
  _id: unknown;
  name: string;
  phone: string;
  mark?: string | null;
  callStatus: string;
  interestStatus: string;
  lastCalledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Lead {
  return {
    _id: String(doc._id),
    name: doc.name,
    phone: doc.phone,
    mark: doc.mark ?? "",
    callStatus: doc.callStatus as Lead["callStatus"],
    interestStatus: doc.interestStatus as Lead["interestStatus"],
    lastCalledAt: doc.lastCalledAt ? doc.lastCalledAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const parsed = patchStatusBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const patch: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.callStatus !== undefined) {
      patch.lastCalledAt = new Date();
    }
    await connectDB();
    const doc = await LeadModel.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      serialize({
        ...doc,
        createdAt: doc.createdAt as Date,
        updatedAt: doc.updatedAt as Date,
        lastCalledAt: doc.lastCalledAt ?? null,
      }),
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
