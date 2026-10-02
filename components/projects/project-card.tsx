"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { PencilIcon, TrashIcon } from "@/components/icons";

type Project = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
};

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
    });
    if (res.ok) {
      setMode("view");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Could not update project");
    setBusy(false);
  }

  async function onDelete() {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      return;
    }
    setBusy(false);
    setError("Could not delete project");
  }

  const updated = new Date(project.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (mode === "edit") {
    return (
      <form
        onSubmit={onSave}
        className="rounded-xl border border-neutral-900 bg-white p-4"
      >
        <label className="block text-sm font-medium text-neutral-700">
          Name
        </label>
        <input
          required
          maxLength={255}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
          autoFocus
        />
        <label className="mt-3 block text-sm font-medium text-neutral-700">
          Description
        </label>
        <textarea
          rows={2}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="min-h-11 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="group relative rounded-xl border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-sm">
      <Link href={`/projects/${project.id}`} className="block">
        <h3 className="truncate pr-16 text-sm font-semibold text-neutral-900">
          {project.name}
        </h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-neutral-500">
          {project.description || "No description"}
        </p>
        <p className="mt-3 text-xs text-neutral-400">Updated {updated}</p>
      </Link>
      <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <button
          onClick={() => setMode("edit")}
          aria-label="Rename project"
          className="rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        >
          <PencilIcon width={15} height={15} />
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          aria-label="Delete project"
          className="rounded-lg border border-neutral-200 p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <TrashIcon width={15} height={15} />
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
