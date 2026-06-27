import { MongoClient } from "mongodb";
import { google } from "googleapis";
import {
  getGoogleServiceAccountCredentials,
  getGoogleSheetId,
  getGoogleSheetTabName,
} from "../lib/google-credentials";

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
];

type MongoLead = {
  _id: { toString(): string };
  name?: string;
  phone?: string;
  mark?: string | null;
  callStatus?: string;
  interestStatus?: string;
  lastCalledAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function toIso(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function leadToRow(doc: MongoLead): string[] {
  return [
    doc._id.toString(),
    (doc.name ?? "").trim(),
    (doc.phone ?? "").trim(),
    (doc.mark ?? "").trim(),
    doc.callStatus ?? "pending",
    doc.interestStatus ?? "pending",
    doc.lastCalledAt ? toIso(doc.lastCalledAt) : "",
    toIso(doc.createdAt) || new Date().toISOString(),
    toIso(doc.updatedAt) || new Date().toISOString(),
  ];
}

function sheetRange(tab: string, a1: string): string {
  return `'${tab.replace(/'/g, "''")}'!${a1}`;
}

async function findLeadsCollection(client: MongoClient) {
  const admin = client.db().admin();
  const { databases } = await admin.listDatabases();

  for (const dbInfo of databases) {
    if (["admin", "local", "config"].includes(dbInfo.name)) continue;

    const db = client.db(dbInfo.name);
    const collections = await db.listCollections({ name: "leads" }).toArray();
    if (collections.length === 0) continue;

    const count = await db.collection("leads").countDocuments();
    if (count > 0) {
      return { db, count };
    }
  }

  throw new Error('No "leads" collection with documents found in MongoDB');
}

async function main() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const { db, count } = await findLeadsCollection(client);
    console.log(`Found ${count} leads in database "${db.databaseName}"`);

    const docs = (await db
      .collection("leads")
      .find({})
      .sort({ createdAt: -1 })
      .toArray()) as MongoLead[];

    const auth = new google.auth.GoogleAuth({
      credentials: getGoogleServiceAccountCredentials(),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = getGoogleSheetId();
    const tabName = getGoogleSheetTabName();
    const values = [HEADERS, ...docs.map(leadToRow)];

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: sheetRange(tabName, "A:I"),
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: sheetRange(tabName, "A1"),
      valueInputOption: "RAW",
      requestBody: { values },
    });

    console.log(`Imported ${docs.length} leads into Google Sheet tab "${tabName}"`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
