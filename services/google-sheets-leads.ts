import { randomBytes } from "crypto";
import { google, type sheets_v4 } from "googleapis";
import {
  getGoogleServiceAccountCredentials,
  getGoogleSheetId,
  getGoogleSheetTabName,
} from "@/lib/google-credentials";
import type {
  CallStatus,
  InterestStatus,
  Lead,
  LeadsListResponse,
} from "@/types/lead";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const HEADERS = [
  "_id",
  "name",
  "phone",
  "mark",
  "call status",
  "interestStatus",
  "lastCalledAt",
  "createdAt",
  "updatedAt",
] as const;

type LeadRow = {
  _id: string;
  name: string;
  phone: string;
  mark: string;
  callStatus: CallStatus;
  interestStatus: InterestStatus;
  lastCalledAt: string | null;
  createdAt: string;
  updatedAt: string;
  rowIndex: number;
};

export class DuplicatePhoneError extends Error {
  code = 11000;

  constructor(phone: string) {
    super(`Phone already exists: ${phone}`);
    this.name = "DuplicatePhoneError";
  }
}

export class LeadNotFoundError extends Error {
  constructor(id: string) {
    super(`Lead not found: ${id}`);
    this.name = "LeadNotFoundError";
  }
}

export type CreateLeadInput = {
  name: string;
  phone: string;
  mark?: string;
  callStatus?: CallStatus;
  interestStatus?: InterestStatus;
  lastCalledAt?: string | null;
};

export type UpdateLeadInput = Partial<{
  name: string;
  phone: string;
  mark: string;
  callStatus: CallStatus;
  interestStatus: InterestStatus;
  lastCalledAt: string | null;
}>;

export type ListLeadsParams = {
  page: number;
  limit: number;
  q?: string;
  callStatus?: string;
  interestStatus?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

let sheetsClient: sheets_v4.Sheets | null = null;
let cachedSheetGid: number | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (!sheetsClient) {
    const auth = new google.auth.GoogleAuth({
      credentials: getGoogleServiceAccountCredentials(),
      scopes: SCOPES,
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  }
  return sheetsClient;
}

function sheetRange(tab: string, a1: string): string {
  return `'${tab.replace(/'/g, "''")}'!${a1}`;
}

export function isValidLeadId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

export function generateLeadId(): string {
  return randomBytes(12).toString("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

function toLeadResponse(row: LeadRow): Lead {
  return {
    _id: row._id,
    name: row.name,
    phone: row.phone,
    mark: row.mark,
    callStatus: row.callStatus,
    interestStatus: row.interestStatus,
    lastCalledAt: row.lastCalledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseCallStatus(value: string | undefined): CallStatus {
  const v = value?.trim();
  if (v === "pending" || v === "read" || v === "picked" || v === "npc") {
    return v;
  }
  return "pending";
}

function parseInterestStatus(value: string | undefined): InterestStatus {
  const v = value?.trim();
  if (v === "pending" || v === "interested" || v === "not_interested") {
    return v;
  }
  return "pending";
}

function parseLeadRow(cells: string[], rowIndex: number): LeadRow | null {
  const _id = cells[0]?.trim();
  if (!_id) return null;

  const lastCalledRaw = cells[6]?.trim();
  const createdRaw = cells[7]?.trim();
  const updatedRaw = cells[8]?.trim();
  const ts = nowIso();

  return {
    _id,
    name: cells[1]?.trim() ?? "",
    phone: cells[2]?.trim() ?? "",
    mark: cells[3]?.trim() ?? "",
    callStatus: parseCallStatus(cells[4]),
    interestStatus: parseInterestStatus(cells[5]),
    lastCalledAt: lastCalledRaw ? lastCalledRaw : null,
    createdAt: createdRaw || ts,
    updatedAt: updatedRaw || ts,
    rowIndex,
  };
}

function leadToSheetValues(row: Omit<LeadRow, "rowIndex">): string[] {
  return [
    row._id,
    row.name,
    row.phone,
    row.mark,
    row.callStatus,
    row.interestStatus,
    row.lastCalledAt ?? "",
    row.createdAt,
    row.updatedAt,
  ];
}

async function getSheetGid(): Promise<number> {
  if (cachedSheetGid != null) return cachedSheetGid;

  const tabName = getGoogleSheetTabName();
  const spreadsheetId = getGoogleSheetId();
  const meta = await getSheetsClient().spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === tabName,
  );
  const gid = sheet?.properties?.sheetId;
  if (gid == null) {
    throw new Error(`Sheet tab "${tabName}" not found`);
  }

  cachedSheetGid = gid;
  return gid;
}

async function readAllRows(): Promise<LeadRow[]> {
  const spreadsheetId = getGoogleSheetId();
  const tabName = getGoogleSheetTabName();
  const res = await getSheetsClient().spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(tabName, "A:I"),
  });

  const values = res.data.values ?? [];
  if (values.length === 0) return [];

  const header = values[0].map((c) => String(c).trim().toLowerCase());
  const expected = HEADERS.map((h) => h.toLowerCase());
  const headerOk =
    header.length >= expected.length &&
    expected.every((col, i) => header[i] === col);

  const dataStart = headerOk ? 1 : 0;
  const rows: LeadRow[] = [];

  for (let i = dataStart; i < values.length; i++) {
    const cells = values[i].map((c) => String(c));
    const parsed = parseLeadRow(cells, i + 1);
    if (parsed) rows.push(parsed);
  }

  return rows;
}

function assertUniquePhone(
  rows: LeadRow[],
  phone: string,
  excludeId?: string,
): void {
  const duplicate = rows.find(
    (r) => r.phone === phone && r._id !== excludeId,
  );
  if (duplicate) {
    throw new DuplicatePhoneError(phone);
  }
}

function filterRows(rows: LeadRow[], params: ListLeadsParams): LeadRow[] {
  let filtered = rows;

  const q = params.q?.trim();
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.phone.toLowerCase().includes(needle),
    );
  }

  if (
    params.callStatus &&
    ["pending", "read", "picked", "npc"].includes(params.callStatus)
  ) {
    filtered = filtered.filter((r) => r.callStatus === params.callStatus);
  }

  if (
    params.interestStatus &&
    ["pending", "interested", "not_interested"].includes(params.interestStatus)
  ) {
    filtered = filtered.filter(
      (r) => r.interestStatus === params.interestStatus,
    );
  }

  return filtered;
}

function sortRows(rows: LeadRow[], params: ListLeadsParams): LeadRow[] {
  const sortBy =
    params.sortBy === "name" ||
    params.sortBy === "updatedAt" ||
    params.sortBy === "lastCalledAt" ||
    params.sortBy === "createdAt"
      ? params.sortBy
      : "createdAt";
  const dir = params.sortOrder === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name) * dir;
    }

    const av = a[sortBy];
    const bv = b[sortBy];

    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    const ad = Date.parse(av);
    const bd = Date.parse(bv);
    if (Number.isNaN(ad) && Number.isNaN(bd)) return 0;
    if (Number.isNaN(ad)) return 1;
    if (Number.isNaN(bd)) return -1;
    return (ad - bd) * dir;
  });
}

function wrapGoogleError(err: unknown, action: string): Error {
  if (err instanceof DuplicatePhoneError || err instanceof LeadNotFoundError) {
    return err;
  }

  const message =
    err instanceof Error ? err.message : "Unknown Google Sheets error";
  const wrapped = new Error(`${action} failed: ${message}`);
  wrapped.cause = err;
  return wrapped;
}

export async function getAllLeads(): Promise<Lead[]> {
  try {
    const rows = await readAllRows();
    return rows.map(toLeadResponse);
  } catch (err) {
    throw wrapGoogleError(err, "Read leads");
  }
}

export async function getLeadById(id: string): Promise<Lead | null> {
  try {
    const rows = await readAllRows();
    const found = rows.find((r) => r._id === id);
    return found ? toLeadResponse(found) : null;
  } catch (err) {
    throw wrapGoogleError(err, "Get lead");
  }
}

export async function listLeads(
  params: ListLeadsParams,
): Promise<LeadsListResponse> {
  try {
    const rows = await readAllRows();
    const filtered = filterRows(rows, params);
    const sorted = sortRows(filtered, params);
    const total = sorted.length;
    const page = Math.max(1, params.page);
    const limit = Math.min(50, Math.max(1, params.limit));
    const skip = (page - 1) * limit;
    const pageRows = sorted.slice(skip, skip + limit);

    return {
      data: pageRows.map(toLeadResponse),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  } catch (err) {
    throw wrapGoogleError(err, "List leads");
  }
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  try {
    const rows = await readAllRows();
    assertUniquePhone(rows, input.phone);

    const ts = nowIso();
    const lead: Omit<LeadRow, "rowIndex"> = {
      _id: generateLeadId(),
      name: input.name.trim(),
      phone: input.phone,
      mark: input.mark?.trim() ?? "",
      callStatus: input.callStatus ?? "pending",
      interestStatus: input.interestStatus ?? "pending",
      lastCalledAt: input.lastCalledAt ?? null,
      createdAt: ts,
      updatedAt: ts,
    };

    const spreadsheetId = getGoogleSheetId();
    const tabName = getGoogleSheetTabName();
    await getSheetsClient().spreadsheets.values.append({
      spreadsheetId,
      range: sheetRange(tabName, "A:I"),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [leadToSheetValues(lead)],
      },
    });

    return toLeadResponse({ ...lead, rowIndex: -1 });
  } catch (err) {
    throw wrapGoogleError(err, "Create lead");
  }
}

export async function updateLead(
  id: string,
  patch: UpdateLeadInput,
): Promise<Lead> {
  try {
    const rows = await readAllRows();
    const current = rows.find((r) => r._id === id);
    if (!current) throw new LeadNotFoundError(id);

    if (patch.phone !== undefined) {
      assertUniquePhone(rows, patch.phone, id);
    }

    const updated: Omit<LeadRow, "rowIndex"> = {
      _id: current._id,
      name: patch.name !== undefined ? patch.name.trim() : current.name,
      phone: patch.phone ?? current.phone,
      mark: patch.mark !== undefined ? patch.mark.trim() : current.mark,
      callStatus: patch.callStatus ?? current.callStatus,
      interestStatus: patch.interestStatus ?? current.interestStatus,
      lastCalledAt:
        patch.lastCalledAt !== undefined
          ? patch.lastCalledAt
          : current.lastCalledAt,
      createdAt: current.createdAt,
      updatedAt: nowIso(),
    };

    const spreadsheetId = getGoogleSheetId();
    const tabName = getGoogleSheetTabName();
    await getSheetsClient().spreadsheets.values.update({
      spreadsheetId,
      range: sheetRange(tabName, `A${current.rowIndex}:I${current.rowIndex}`),
      valueInputOption: "RAW",
      requestBody: {
        values: [leadToSheetValues(updated)],
      },
    });

    return toLeadResponse({ ...updated, rowIndex: current.rowIndex });
  } catch (err) {
    throw wrapGoogleError(err, "Update lead");
  }
}

export async function deleteLead(id: string): Promise<void> {
  try {
    const rows = await readAllRows();
    const current = rows.find((r) => r._id === id);
    if (!current) throw new LeadNotFoundError(id);

    const spreadsheetId = getGoogleSheetId();
    const sheetId = await getSheetGid();

    await getSheetsClient().spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: current.rowIndex - 1,
                endIndex: current.rowIndex,
              },
            },
          },
        ],
      },
    });
  } catch (err) {
    throw wrapGoogleError(err, "Delete lead");
  }
}
