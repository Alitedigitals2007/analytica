import { notFound, redirect } from "next/navigation";
import { getOwnedProject } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { ImportWizard } from "@/components/import/import-wizard";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const project = await getOwnedProject(user.id, id);
  if (!project) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Import data</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {project.name} · CSV, TSV or Excel (.xlsx / .xls)
      </p>
      <div className="mt-6">
        <ImportWizard projectId={project.id} projectName={project.name} />
      </div>
    </div>
  );
}
