import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, PlusIcon } from "@/components/icons";
import { getOwnedProject } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const project = await getOwnedProject(user.id, id);
  if (!project) notFound();

  const db = getDb();
  const datasets = await db
    .select()
    .from(schema.datasets)
    .where(eq(schema.datasets.projectId, id))
    .orderBy(desc(schema.datasets.updatedAt));

  const counts =
    datasets.length === 0
      ? []
      : await db
          .select({
            datasetId: schema.datasetVersions.datasetId,
            rowCount: sql<number>`jsonb_array_length(${schema.datasetVersions.rows})`,
            colCount: sql<number>`jsonb_array_length(${schema.datasetVersions.columns})`,
          })
          .from(schema.datasetVersions)
          .where(eq(schema.datasetVersions.versionNumber, 1));

  const countFor = (datasetId: string) =>
    counts.find((c) => c.datasetId === datasetId);

  return (
    <div>
      <Link
        href={`/projects/${project.id}`}
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeftIcon width={16} height={16} />
        {project.name}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Data</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {datasets.length === 0
              ? "No datasets yet."
              : `${datasets.length} dataset${datasets.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href={`/projects/${project.id}/data/import`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <PlusIcon width={16} height={16} />
          Import data
        </Link>
      </div>

      {datasets.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="text-sm text-neutral-600">
            Import a CSV or Excel file to get started.
          </p>
          <Link
            href={`/projects/${project.id}/data/import`}
            className="mt-4 inline-block rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
          >
            Import data
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {datasets.map((d) => {
            const c = countFor(d.id);
            return (
              <li key={d.id}>
                <Link
                  href={`/projects/${project.id}/data/${d.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 hover:shadow-sm"
                >
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900">
                      {d.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {c ? `${c.rowCount} rows · ${c.colCount} columns · ` : ""}
                      {d.source.toUpperCase()} · imported{" "}
                      {d.createdAt.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                    v1
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
