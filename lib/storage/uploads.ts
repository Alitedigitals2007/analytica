import { randomBytes } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const BASE = path.join(process.cwd(), "storage", "uploads");

const ALLOWED_EXTENSIONS = new Set([".csv", ".tsv", ".txt", ".xlsx", ".xls"]);

function extensionOf(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) ? ext : "";
}

export async function saveUpload(
  projectId: string,
  filename: string,
  bytes: Buffer,
): Promise<{ key: string; size: number; extension: string }> {
  const extension = extensionOf(filename);
  if (!extension) {
    throw new Error("Unsupported file type");
  }
  const dir = path.join(BASE, projectId);
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(16).toString("hex")}${extension}`;
  await writeFile(path.join(dir, name), bytes);
  return { key: `${projectId}/${name}`, size: bytes.length, extension };
}

export async function readUpload(key: string): Promise<Buffer> {
  const resolved = path.resolve(BASE, key);
  if (!resolved.startsWith(BASE + path.sep)) {
    throw new Error("Invalid upload key");
  }
  return readFile(resolved);
}

export function extensionOfKey(key: string): string {
  return path.extname(key).toLowerCase();
}
