import { NextResponse } from "next/server";
import {
  bulkLeadsBody,
  postLeadsBody,
  singleLeadBody,
} from "@/lib/validations/lead";
import {
  createLead,
  DuplicatePhoneError,
  listLeads,
} from "@/services/google-sheets-leads";
import { normalizePhoneDigits } from "@/utils/phone-format";
import type { Lead } from "@/types/lead";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const q = (searchParams.get("q") || "").trim();
    const callStatus = searchParams.get("callStatus") || "";
    const interestStatus = searchParams.get("interestStatus") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const body = await listLeads({
      page,
      limit,
      q,
      callStatus,
      interestStatus,
      sortBy,
      sortOrder,
    });

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
          const lead = await createLead({
            name: row.name.trim(),
            phone,
            mark: row.mark?.trim() ?? "",
          });
          results.ok.push(lead);
        } catch (err: unknown) {
          const code =
            err instanceof DuplicatePhoneError
              ? 11000
              : err && typeof err === "object" && "code" in err
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
    const lead = await createLead({
      name: one.name.trim(),
      phone,
      mark: one.mark?.trim() ?? "",
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof DuplicatePhoneError) {
      return NextResponse.json({ error: "Phone already exists" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
