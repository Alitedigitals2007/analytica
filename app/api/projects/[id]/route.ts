import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auditLog } from "@/lib/audit/log";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

async function findOwnedProject(userId: string, id: string) {
  const rows = await getDb()
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await findOwnedProject(user.id, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ project });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await findOwnedProject(user.id, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const values: Partial<typeof schema.projects.$inferInsert> = {};
  if (parsed.data.name !== undefined) values.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    values.description = parsed.data.description;
  values.updatedAt = new Date();

  const updated = await getDb()
    .update(schema.projects)
    .set(values)
    .where(eq(schema.projects.id, id))
    .returning();

  await auditLog({
    userId: user.id,
    action: "project.update",
    entity: "projects",
    entityId: id,
    meta: { name: updated[0].name },
  });

  return NextResponse.json({ project: updated[0] });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await findOwnedProject(user.id, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await getDb().delete(schema.projects).where(eq(schema.projects.id, id));

  await auditLog({
    userId: user.id,
    action: "project.delete",
    entity: "projects",
    entityId: id,
    meta: { name: project.name },
  });

  return NextResponse.json({ ok: true });
}
