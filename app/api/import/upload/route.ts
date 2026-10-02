import { NextResponse, type NextRequest } from "next/server";
import { getOwnedProject } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import {
  buildPreview,
  buildTable,
  isCsvExtension,
  listSheetNames,
  parseUpload,
} from "@/lib/import/parse";
import { saveUpload } from "@/lib/storage/uploads";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_ROWS = 100_000;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected form data" }, { status: 400 });
  }

  const projectId = String(form.get("projectId") ?? "");
  const file = form.get("file");
  if (!projectId || !(file instanceof File)) {
    return NextResponse.json(
      { error: "projectId and file are required" },
      { status: 400 },
    );
  }

  const project = await getOwnedProject(user.id, projectId);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large (max 25 MB)" },
      { status: 413 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  let sheetNames: string[];
  let saved: Awaited<ReturnType<typeof saveUpload>>;
  try {
    saved = await saveUpload(projectId, file.name, bytes);
    sheetNames = listSheetNames(bytes, saved.extension);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not read this file" },
      { status: 400 },
    );
  }

  try {
    const aoa = parseUpload(bytes, saved.extension, {
      sheetName: sheetNames[0],
    });
    const preview = buildPreview(buildTable(aoa, 1));
    if (preview.totalRows > MAX_ROWS) {
      return NextResponse.json(
        { error: `Too many rows (${preview.totalRows}) — max ${MAX_ROWS}` },
        { status: 413 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not read this file" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    key: saved.key,
    filename: file.name,
    size: saved.size,
    extension: saved.extension,
    source: isCsvExtension(saved.extension) ? "csv" : "xlsx",
    sheetNames,
  });
}
