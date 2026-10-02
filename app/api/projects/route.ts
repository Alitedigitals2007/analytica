import { NextResponse, type NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auditLog } from "@/lib/audit/log";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await getDb()
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.userId, user.id))
    .orderBy(desc(schema.projects.updatedAt));

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { name, description } = parsed.data;
  const inserted = await getDb()
    .insert(schema.projects)
    .values({ userId: user.id, name, description: description || null })
    .returning();

  const project = inserted[0];
  await auditLog({
    userId: user.id,
    action: "project.create",
    entity: "projects",
    entityId: project.id,
    meta: { name },
  });

  return NextResponse.json({ project }, { status: 201 });
}
