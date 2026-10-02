import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  inferDataType,
  isMissing,
  type Cell,
  type DataType,
} from "@/engines/data/types";

export type Aoa = Cell[][];

export type PreviewColumn = {
  name: string;
  type: DataType;
  missing: number;
};

export type Preview = {
  sheetNames: string[];
  columns: PreviewColumn[];
  totalRows: number;
  duplicateRows: number;
  sampleRows: Record<string, Cell>[];
};

export type DataTable = {
  columns: string[];
  rows: Record<string, Cell>[];
};

const CSV_EXTENSIONS = new Set([".csv", ".tsv", ".txt"]);

export function isCsvExtension(ext: string): boolean {
  return CSV_EXTENSIONS.has(ext);
}

export function listSheetNames(bytes: Buffer, ext: string): string[] {
  if (isCsvExtension(ext)) return ["Sheet1"];
  const wb = XLSX.read(bytes, { type: "buffer", bookSheets: true });
  return wb.SheetNames;
}

function decodeText(bytes: Buffer): string {
  const text = bytes.toString("utf8");
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseCsvAoa(bytes: Buffer): Aoa {
  const text = decodeText(bytes);
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });
  return (result.data as string[][]).map((row) => row.map((c) => c as Cell));
}

function parseXlsxAoa(bytes: Buffer, sheetName: string): Aoa {
  const wb = XLSX.read(bytes, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[sheetName] ?? wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("Workbook has no sheets");
  return XLSX.utils.sheet_to_json<Cell[]>(ws, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });
}

function sliceByRange(aoa: Aoa, rangeStr: string): Aoa {
  const range = XLSX.utils.decode_range(rangeStr);
  const out: Aoa = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = oaGet(aoa, r);
    const cells: Cell[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      cells.push(row ? oaGet(row, c) ?? null : null);
    }
    out.push(cells);
  }
  return out;
}

function oaGet<T>(arr: T[], index: number): T | undefined {
  return index >= 0 && index < arr.length ? arr[index] : undefined;
}

export function parseUpload(
  bytes: Buffer,
  ext: string,
  opts: { sheetName?: string; range?: string } = {},
): Aoa {
  let aoa = isCsvExtension(ext)
    ? parseCsvAoa(bytes)
    : parseXlsxAoa(bytes, opts.sheetName ?? "");
  if (opts.range) aoa = sliceByRange(aoa, opts.range);
  return aoa;
}

export function buildTable(aoa: Aoa, headerRow: number): DataTable {
  const headerIndex = Math.max(0, headerRow - 1);
  const rawHeaders = aoa[headerIndex] ?? [];

  const seen = new Map<string, number>();
  const columns = rawHeaders.map((cell, i) => {
    const base = isMissing(cell)
      ? `Column ${i + 1}`
      : String(cell).trim();
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });

  const rows: Record<string, Cell>[] = [];
  for (let i = headerIndex + 1; i < aoa.length; i++) {
    const source = aoa[i] ?? [];
    if (source.every(isMissing)) continue;
    const row: Record<string, Cell> = {};
    columns.forEach((name, c) => {
      row[name] = source[c] ?? null;
    });
    rows.push(row);
  }

  return { columns, rows };
}

export function buildPreview(table: DataTable): Preview {
  const { columns, rows } = table;

  const previewColumns: PreviewColumn[] = columns.map((name) => {
    const values = rows.map((r) => r[name]);
    let missing = 0;
    for (const v of values) if (isMissing(v)) missing++;
    return { name, type: inferDataType(values), missing };
  });

  const seen = new Map<string, number>();
  let duplicateRows = 0;
  for (const row of rows) {
    const key = JSON.stringify(columns.map((c) => row[c] ?? null));
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) duplicateRows++;
  }

  return {
    sheetNames: [],
    columns: previewColumns,
    totalRows: rows.length,
    duplicateRows,
    sampleRows: rows.slice(0, 15),
  };
}
