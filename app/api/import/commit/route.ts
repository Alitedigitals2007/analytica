import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/log";
import { getOwnedProject, projectIdFromUploadKey } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import {
  buildTable,
  isCsvExtension,
  listSheetNames,
  parseUpload,
} from "@/lib/import/parse";
import { extensionOfKey, readUpload } from "@/lib/storage/uploads";
import { inferDataType, isMissing } from "@/engines/data/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ROWS = 100_000;

const commitSchema = z.object({
  key: z.string().min(1).max(512),
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(255),
  sheetName: z.string().min(1).max(255).optional(),
  headerRow: z.number().int().min(1).max(10_000).default(1),
  range: z
    .string()
    .regex(/^[A-Z]+\d+:[A-Z]+\d+$/i, "Range must look like A1:D100")
    .optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = commitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { key, projectId, name, sheetName, headerRow, range } = parsed.data;

  if (projectIdFromUploadKey(key) !== projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const project = await getOwnedProject(user.id, projectId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readUpload(key);
  } catch {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  const ext = extensionOfKey(key);

  let table;
  try {
    listSheetNames(bytes, ext);
    const aoa = parseUpload(bytes, ext, { sheetName, range });
    if (headerRow > aoa.length) {
      return NextResponse.json(
        { error: "Header row is past the end of the data" },
        { status: 400 },
      );
    }
    table = buildTable(aoa, headerRow);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not parse file" },
      { status: 400 },
    );
  }

  if (table.rows.length === 0) {
    return NextResponse.json(
      { error: "No data rows found below the header" },
      { status: 400 },
    );
  }
  if (table.rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (${table.rows.length}) — max ${MAX_ROWS}` },
      { status: 413 },
    );
  }

  const columns = table.columns.map((colName) => ({
    name: colName,
    type: inferDataType(table.rows.map((r) => r[colName])),
    missing: table.rows.filter((r) => isMissing(r[colName])).length,
  }));

  const db = getDb();
  const [dataset] = await db
    .insert(schema.datasets)
    .values({
      projectId,
      name,
      source: isCsvExtension(ext) ? "csv" : "xlsx",
    })
    .returning();

  const [version] = await db
    .insert(schema.datasetVersions)
    .values({
      datasetId: dataset.id,
      versionNumber: 1,
      rows: table.rows,
      columns,
      operation: "import",
    })
    .returning({ id: schema.datasetVersions.id });

  await auditLog({
    userId: user.id,
    action: "dataset.import",
    entity: "datasets",
    entityId: dataset.id,
    meta: {
      name,
      rows: table.rows.length,
      columns: table.columns.length,
      project: project.name,
    },
  });

  return NextResponse.json(
    { datasetId: dataset.id, versionId: version.id, rows: table.rows.length },
    { status: 201 },
  );
}
