import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { NewProjectButton } from "@/components/projects/new-project";
import { ProjectCard } from "@/components/projects/project-card";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";

function describeAction(log: typeof schema.auditLogs.$inferSelect): string {
  const meta = (log.meta ?? {}) as { name?: string };
  const name = meta.name ? `“${meta.name}”` : "";
  switch (log.action) {
    case "project.create":
      return `Created project ${name}`;
    case "project.update":
      return `Updated project ${name}`;
    case "project.delete":
      return `Deleted project ${name}`;
    case "user.sign_up":
      return "Created account";
    case "user.sign_in":
      return "Signed in";
    default:
      return log.action;
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const db = getDb();

  const [projects, activity] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.userId, user.id))
      .orderBy(desc(schema.projects.updatedAt)),
    db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.userId, user.id))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(10),
  ]);

  const firstName = user.name?.split(" ")[0];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {firstName ? `Welcome, ${firstName}` : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {projects.length === 0
              ? "Create your first project to import data."
              : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <NewProjectButton />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section>
          <h2 className="text-sm font-medium text-neutral-500">Projects</h2>
          {projects.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <p className="text-sm text-neutral-600">
                No projects yet — create one to start importing CSV or Excel
                data.
              </p>
            </div>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={{ ...p, updatedAt: p.updatedAt.toISOString() }} />
              ))}
            </div>
          )}
        </section>

        <aside>
          <h2 className="text-sm font-medium text-neutral-500">Activity</h2>
          <ol className="mt-3 space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
            {activity.length === 0 && (
              <li className="text-sm text-neutral-400">No activity yet.</li>
            )}
            {activity.map((log) => (
              <li key={log.id} className="flex items-start justify-between gap-3">
                <span className="text-sm text-neutral-700">
                  {describeAction(log)}
                </span>
                <time
                  dateTime={log.createdAt.toISOString()}
                  className="shrink-0 text-xs text-neutral-400"
                >
                  {log.createdAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
