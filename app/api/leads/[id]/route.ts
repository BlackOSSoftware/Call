import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { LeadModel } from "@/models/Lead";
import { putLeadBody } from "@/lib/validations/lead";
import { normalizePhoneDigits } from "@/utils/phone-format";
import type { Lead } from "@/types/lead";

function serialize(doc: {
  _id: unknown;
  name: string;
  phone: string;
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
    callStatus: doc.callStatus as Lead["callStatus"],
    interestStatus: doc.interestStatus as Lead["interestStatus"],
    lastCalledAt: doc.lastCalledAt ? doc.lastCalledAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const doc = await LeadModel.findById(id).lean();
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
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = putLeadBody.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
    }
    await connectDB();
    const phone = normalizePhoneDigits(body.data.phone);
    const doc = await LeadModel.findByIdAndUpdate(
      id,
      {
        name: body.data.name.trim(),
        phone,
        callStatus: body.data.callStatus,
        interestStatus: body.data.interestStatus,
      },
      { new: true, runValidators: true },
    ).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      serialize({
        ...doc,
        createdAt: doc.createdAt as Date,
        updatedAt: doc.updatedAt as Date,
        lastCalledAt: doc.lastCalledAt ?? null,
      }),
    );
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? (e as { code?: number }).code
        : undefined;
    if (code === 11000) {
      return NextResponse.json({ error: "Phone already exists" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const res = await LeadModel.findByIdAndDelete(id);
    if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
