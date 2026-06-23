import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { LeadModel } from "@/models/Lead";
import {
  bulkLeadsBody,
  postLeadsBody,
  singleLeadBody,
} from "@/lib/validations/lead";
import { normalizePhoneDigits } from "@/utils/phone-format";
import type { Lead, LeadsListResponse } from "@/types/lead";

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

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const q = (searchParams.get("q") || "").trim();
    const callStatus = searchParams.get("callStatus") || "";
    const interestStatus = searchParams.get("interestStatus") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const filter: Record<string, unknown> = {};
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: rx }, { phone: rx }];
    }
    if (callStatus && ["pending", "read", "picked", "npc"].includes(callStatus)) {
      filter.callStatus = callStatus;
    }
    if (
      interestStatus &&
      ["pending", "interested", "not_interested"].includes(interestStatus)
    ) {
      filter.interestStatus = interestStatus;
    }

    const sortField =
      sortBy === "name" ||
      sortBy === "updatedAt" ||
      sortBy === "lastCalledAt" ||
      sortBy === "createdAt"
        ? sortBy
        : "createdAt";

    const skip = (page - 1) * limit;
    const [total, rows] = await Promise.all([
      LeadModel.countDocuments(filter),
      LeadModel.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const body: LeadsListResponse = {
      data: rows.map((r) =>
        serialize({
          ...r,
          createdAt: r.createdAt as Date,
          updatedAt: r.updatedAt as Date,
          lastCalledAt: r.lastCalledAt ?? null,
        }),
      ),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load leads" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = postLeadsBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await connectDB();
    const data = parsed.data;

    if ("leads" in data) {
      const bulk = bulkLeadsBody.parse(data);
      const results: { ok: Lead[]; errors: { index: number; message: string }[] } = {
        ok: [],
        errors: [],
      };
      for (let i = 0; i < bulk.leads.length; i++) {
        const row = bulk.leads[i];
        const phone = normalizePhoneDigits(row.phone);
        try {
          const doc = await LeadModel.create({
            name: row.name.trim(),
            phone,
            callStatus: "pending",
            interestStatus: "pending",
            mark: row.mark?.trim() ?? "",
            lastCalledAt: null,
          });
          const lean = doc.toObject();
          results.ok.push(
            serialize({
              ...lean,
              lastCalledAt: lean.lastCalledAt ?? null,
              createdAt: lean.createdAt as Date,
              updatedAt: lean.updatedAt as Date,
            }),
          );
        } catch (err: unknown) {
          const code =
            err && typeof err === "object" && "code" in err
              ? (err as { code?: number }).code
              : undefined;
          const msg =
            code === 11000
              ? "Duplicate phone"
              : err instanceof Error
                ? err.message
                : "Error";
          results.errors.push({ index: i, message: msg });
        }
      }
      return NextResponse.json(results, { status: 201 });
    }

    const one = singleLeadBody.parse(data);
    const phone = normalizePhoneDigits(one.phone);
    const doc = await LeadModel.create({
      name: one.name.trim(),
      phone,
      callStatus: "pending",
      interestStatus: "pending",
      mark: one.mark?.trim() ?? "",
      lastCalledAt: null,
    });
    const lean = doc.toObject();
    return NextResponse.json(
      serialize({
        ...lean,
        lastCalledAt: lean.lastCalledAt ?? null,
        createdAt: lean.createdAt as Date,
        updatedAt: lean.updatedAt as Date,
      }),
      {
        status: 201,
      },
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
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
