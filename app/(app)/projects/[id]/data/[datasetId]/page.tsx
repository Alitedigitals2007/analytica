import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import { getOwnedProject } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import type { Cell, DataType } from "@/engines/data/types";

export const dynamic = "force-dynamic";

const MAX_SHOWN = 100;

const TYPE_LABEL: Record<DataType, string> = {
  integer: "Integer",
  decimal: "Decimal",
  boolean: "Boolean",
  date: "Date",
  datetime: "DateTime",
  text: "Text",
};

type ColumnMeta = { name: string; type?: DataType; missing?: number };

function formatCell(value: Cell): string {
  if (value === null || value === undefined || value === "") return "—";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ id: string; datasetId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id, datasetId } = await params;
  const project = await getOwnedProject(user.id, id);
  if (!project) notFound();

  const db = getDb();
  const datasets = await db
    .select()
    .from(schema.datasets)
    .where(
      and(
        eq(schema.datasets.id, datasetId),
        eq(schema.datasets.projectId, id),
      ),
    )
    .limit(1);
  const dataset = datasets[0];
  if (!dataset) notFound();

  const versions = await db
    .select()
    .from(schema.datasetVersions)
    .where(eq(schema.datasetVersions.datasetId, datasetId))
    .orderBy(desc(schema.datasetVersions.versionNumber))
    .limit(1);
  const version = versions[0];
  if (!version) notFound();

  const columns = version.columns as ColumnMeta[];
  const rows = version.rows as Record<string, Cell>[];
  const shown = rows.slice(0, MAX_SHOWN);

  return (
    <div>
      <Link
        href={`/projects/${project.id}/data`}
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeftIcon width={16} height={16} />
        Data
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {dataset.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {rows.length.toLocaleString()} rows · {columns.length} columns ·{" "}
            {dataset.source.toUpperCase()} · version {version.versionNumber} (
            {version.operation})
          </p>
        </div>
        <Link
          href={`/projects/${project.id}/data/import`}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Import another
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {columns.map((c) => (
          <span
            key={c.name}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs"
          >
            <span className="font-medium text-neutral-900">{c.name}</span>
            {c.type && (
              <span className="ml-2 text-neutral-500">
                {TYPE_LABEL[c.type]}
              </span>
            )}
            {typeof c.missing === "number" && c.missing > 0 && (
              <span className="ml-2 text-amber-600">{c.missing} missing</span>
            )}
          </span>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="w-12 px-3 py-2.5 text-xs font-medium text-neutral-400">
                #
              </th>
              {columns.map((c) => (
                <th
                  key={c.name}
                  className="whitespace-nowrap px-4 py-2.5 font-medium text-neutral-700"
                >
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i} className="border-b border-neutral-100">
                <td className="px-3 py-2 text-xs text-neutral-400">{i + 1}</td>
                {columns.map((c) => (
                  <td
                    key={c.name}
                    className="whitespace-nowrap px-4 py-2 text-neutral-700"
                  >
                    {formatCell(row[c.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-400">
        Showing first {shown.length} of {rows.length.toLocaleString()} rows
        {rows.length > MAX_SHOWN ? " (full data used in analyses)" : ""}
      </p>
    </div>
  );
}
