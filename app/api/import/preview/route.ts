import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOwnedProject, projectIdFromUploadKey } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import {
  buildPreview,
  buildTable,
  listSheetNames,
  parseUpload,
} from "@/lib/import/parse";
import { extensionOfKey, readUpload } from "@/lib/storage/uploads";

export const runtime = "nodejs";
export const maxDuration = 60;

const previewSchema = z.object({
  key: z.string().min(1).max(512),
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

  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { key, sheetName, headerRow, range } = parsed.data;
  const projectId = projectIdFromUploadKey(key);
  const project = await getOwnedProject(user.id, projectId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readUpload(key);
  } catch {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  try {
    const ext = extensionOfKey(key);
    const sheetNames = listSheetNames(bytes, ext);
    const aoa = parseUpload(bytes, ext, { sheetName, range });
    if (headerRow > aoa.length) {
      return NextResponse.json(
        { error: "Header row is past the end of the data" },
        { status: 400 },
      );
    }
    const table = buildTable(aoa, headerRow);
    const preview = buildPreview(table);
    return NextResponse.json({ ...preview, sheetNames });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not parse file" },
      { status: 400 },
    );
  }
}
