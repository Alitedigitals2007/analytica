import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeftIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";

const STAGES = [
  {
    label: "Data",
    hint: "Import · preview · dictionary · quality · cleaning",
    href: "data",
  },
  { label: "Analysis", hint: "Descriptives · tests · relationships" },
  { label: "Charts", hint: "Auto charts · chart builder" },
  { label: "Insights", hint: "AI findings · ask your data" },
  { label: "Reports", hint: "Builder · PDF / DOCX / PPTX export" },
];

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const rows = await getDb()
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, user.id)))
    .limit(1);

  const project = rows[0];
  if (!project) notFound();

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeftIcon width={16} height={16} />
        Dashboard
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold text-neutral-900">
          {project.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {project.description || "No description"}
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAGES.map((stage) => {
          const card = (
            <>
              <h2 className="text-sm font-semibold text-neutral-900">
                {stage.label}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">{stage.hint}</p>
              <p
                className={`mt-4 text-xs font-medium uppercase tracking-wide ${
                  stage.href ? "text-neutral-900" : "text-neutral-400"
                }`}
              >
                {stage.href ? "Open →" : "Coming soon"}
              </p>
            </>
          );
          if (stage.href) {
            return (
              <Link
                key={stage.label}
                href={`/projects/${project.id}/${stage.href}`}
                className="rounded-xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-sm"
              >
                {card}
              </Link>
            );
          }
          return (
            <div
              key={stage.label}
              className="rounded-xl border border-dashed border-neutral-300 bg-white p-5"
            >
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
