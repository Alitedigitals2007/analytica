"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import type { Cell, DataType } from "@/engines/data/types";

type UploadInfo = {
  key: string;
  filename: string;
  size: number;
  extension: string;
  source: "csv" | "xlsx";
  sheetNames: string[];
};

type PreviewData = {
  sheetNames: string[];
  columns: { name: string; type: DataType; missing: number }[];
  totalRows: number;
  duplicateRows: number;
  sampleRows: Record<string, Cell>[];
};

const TYPE_LABEL: Record<DataType, string> = {
  integer: "Integer",
  decimal: "Decimal",
  boolean: "Boolean",
  date: "Date",
  datetime: "DateTime",
  text: "Text",
};

function formatCell(value: Cell): string {
  if (value === null || value === undefined || value === "") return "—";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

export function ImportWizard({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"choose" | "configure" | "preview">(
    "choose",
  );
  const [tab, setTab] = useState<"file" | "paste">("file");
  const [pasteText, setPasteText] = useState("");
  const [upload, setUpload] = useState<UploadInfo | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [range, setRange] = useState("");
  const [datasetName, setDatasetName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function uploadFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("file", file);
      const res = await fetch("/api/import/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      const info = data as UploadInfo;
      setUpload(info);
      setSheetName(info.sheetNames[0] ?? "");
      setHeaderRow(1);
      setRange("");
      setDatasetName(info.filename.replace(/\.[^.]+$/, ""));
      setStep("configure");
    } finally {
      setBusy(false);
    }
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  }

  function onPasteImport() {
    if (!pasteText.trim()) {
      setError("Paste some CSV data first");
      return;
    }
    const file = new File([pasteText], "pasted-data.csv", {
      type: "text/csv",
    });
    void uploadFile(file);
  }

  async function loadPreview(e: FormEvent) {
    e.preventDefault();
    if (!upload) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: upload.key,
          sheetName: sheetName || undefined,
          headerRow,
          range: range || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not build preview");
        return;
      }
      setPreview(data as PreviewData);
      setStep("preview");
    } finally {
      setBusy(false);
    }
  }

  async function commitImport() {
    if (!upload) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: upload.key,
          projectId,
          name: datasetName.trim() || upload.filename,
          sheetName: sheetName || undefined,
          headerRow,
          range: range || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }
      router.push(`/projects/${projectId}/data/${data.datasetId}`);
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setUpload(null);
    setPreview(null);
    setError(null);
    setPasteText("");
    setStep("choose");
  }

  const missingTotal = preview
    ? preview.columns.reduce((sum, c) => sum + c.missing, 0)
    : 0;

  return (
    <div className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {step === "choose" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex gap-2" role="tablist">
            {(["file", "paste"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium ${
                  tab === t
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {t === "file" ? "Upload file" : "Paste data"}
              </button>
            ))}
          </div>

          {tab === "file" ? (
            <div className="mt-4">
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls"
                onChange={onFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInput.current?.click()}
                disabled={busy}
                className="min-h-11 w-full rounded-lg border-2 border-dashed border-neutral-300 px-4 py-8 text-sm font-medium text-neutral-600 hover:border-neutral-500 hover:text-neutral-900 disabled:opacity-50"
              >
                {busy
                  ? "Uploading and reading…"
                  : "Choose a CSV or Excel file"}
              </button>
              <p className="mt-2 text-xs text-neutral-400">
                Max 25 MB · up to 100,000 rows
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <label
                htmlFor="paste-area"
                className="block text-sm font-medium text-neutral-700"
              >
                Paste CSV data (first line = column names)
              </label>
              <textarea
                id="paste-area"
                rows={8}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"name,age,city\nAda,36,London\nAlan,41,London"}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm focus:border-neutral-900 focus:outline-none"
              />
              <button
                onClick={onPasteImport}
                disabled={busy}
                className="mt-3 min-h-11 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {busy ? "Reading…" : "Use pasted data"}
              </button>
            </div>
          )}
        </div>
      )}

      {step === "configure" && upload && (
        <form
          onSubmit={loadPreview}
          className="rounded-xl border border-neutral-200 bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                {upload.filename}
              </p>
              <p className="text-xs text-neutral-500">
                {(upload.size / 1024).toFixed(1)} KB ·{" "}
                {upload.sheetNames.length} sheet
                {upload.sheetNames.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              onClick={startOver}
              className="text-sm font-medium text-neutral-500 underline hover:text-neutral-900"
            >
              Choose a different file
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {upload.sheetNames.length > 1 && (
              <div className="sm:col-span-3">
                <label
                  htmlFor="sheet"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Worksheet
                </label>
                <select
                  id="sheet"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
                >
                  {upload.sheetNames.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label
                htmlFor="header-row"
                className="block text-sm font-medium text-neutral-700"
              >
                Header row #
              </label>
              <input
                id="header-row"
                type="number"
                min={1}
                value={headerRow}
                onChange={(e) => setHeaderRow(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="range"
                className="block text-sm font-medium text-neutral-700"
              >
                Range (optional)
              </label>
              <input
                id="range"
                value={range}
                onChange={(e) => setRange(e.target.value.toUpperCase())}
                placeholder="e.g. A1:D500"
                pattern="[A-Z]*\d*:[A-Z]*\d*"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="dataset-name"
              className="block text-sm font-medium text-neutral-700"
            >
              Dataset name
            </label>
            <input
              id="dataset-name"
              required
              maxLength={255}
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-5 min-h-11 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 sm:w-auto"
          >
            {busy ? "Building preview…" : "Preview data"}
          </button>
        </form>
      )}

      {step === "preview" && preview && upload && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Rows", value: preview.totalRows.toLocaleString() },
              { label: "Columns", value: preview.columns.length },
              { label: "Missing cells", value: missingTotal.toLocaleString() },
              { label: "Duplicate rows", value: preview.duplicateRows },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-neutral-200 bg-white p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {s.label}
                </p>
                <p className="mt-1 text-xl font-semibold text-neutral-900">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-medium text-neutral-700">Columns</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {preview.columns.map((c) => (
                <li
                  key={c.name}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs"
                >
                  <span className="font-medium text-neutral-900">
                    {c.name}
                  </span>
                  <span className="ml-2 text-neutral-500">
                    {TYPE_LABEL[c.type]}
                  </span>
                  {c.missing > 0 && (
                    <span className="ml-2 text-amber-600">
                      {c.missing} missing
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  {preview.columns.map((c) => (
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
                {preview.sampleRows.map((row, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    {preview.columns.map((c) => (
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
          <p className="text-xs text-neutral-400">
            Showing first {preview.sampleRows.length} of{" "}
            {preview.totalRows.toLocaleString()} rows · {projectName}
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={commitImport}
              disabled={busy}
              className="min-h-11 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {busy ? "Importing…" : `Import ${preview.totalRows.toLocaleString()} rows`}
            </button>
            <button
              onClick={() => setStep("configure")}
              disabled={busy}
              className="min-h-11 rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Back
            </button>
            <button
              onClick={startOver}
              disabled={busy}
              className="min-h-11 rounded-lg px-5 py-2.5 text-sm font-medium text-neutral-500 underline hover:text-neutral-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
