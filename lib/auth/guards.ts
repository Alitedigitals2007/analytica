import { and, eq } from "drizzle-orm";
import { getDb, schema, type Project } from "@/lib/db";

export async function getOwnedProject(
  userId: string,
  projectId: string,
): Promise<Project | null> {
  const rows = await getDb()
    .select()
    .from(schema.projects)
    .where(
      and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export function projectIdFromUploadKey(key: string): string {
  return key.split("/")[0] ?? "";
}
