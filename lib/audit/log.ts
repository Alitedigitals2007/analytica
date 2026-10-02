import "server-only";
import { getDb, schema } from "@/lib/db";

type AuditInput = {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
};

export async function auditLog(input: AuditInput): Promise<void> {
  try {
    await getDb()
      .insert(schema.auditLogs)
      .values({
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        meta: input.meta ?? null,
      });
  } catch (error) {
    console.error("[audit] failed to write log entry", error);
  }
}
