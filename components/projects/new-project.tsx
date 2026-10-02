"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { PlusIcon } from "@/components/icons";

export function NewProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
      }),
    });
    if (res.ok) {
      setOpen(false);
      setName("");
      setDescription("");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Could not create project");
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
      >
        <PlusIcon width={16} height={16} />
        New project
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full rounded-xl border border-neutral-200 bg-white p-4 sm:max-w-md"
    >
      <label htmlFor="project-name" className="block text-sm font-medium text-neutral-700">
        Project name
      </label>
      <input
        id="project-name"
        required
        maxLength={255}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Customer satisfaction survey"
        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
        autoFocus
      />
      <label
        htmlFor="project-description"
        className="mt-3 block text-sm font-medium text-neutral-700"
      >
        Description (optional)
      </label>
      <textarea
        id="project-description"
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
          className="min-h-11 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create project"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
