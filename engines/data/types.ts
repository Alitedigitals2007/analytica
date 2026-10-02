export type Cell = string | number | boolean | Date | null;

export type DataType =
  | "integer"
  | "decimal"
  | "boolean"
  | "date"
  | "datetime"
  | "text";

const INT_RE = /^[+-]?\d+$/;
const DECIMAL_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const DATE_RE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})$/;
const DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}[T ]\d{1,2}:\d{2}(:\d{2})?|\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}/;
const BOOL_RE = /^(true|false|yes|no)$/i;
const CURRENCY_RE = /^[+-]?[$€£¥]\s?\d/;

export function isMissing(value: Cell | undefined): boolean {
  return value === null || value === undefined || value === "" ||
    (typeof value === "string" && value.trim() === "");
}

function classify(value: Cell): DataType {
  if (value instanceof Date) {
    return "datetime";
  }
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "decimal";
  }
  if (typeof value === "string") {
    const v = value.trim();
    if (BOOL_RE.test(v)) return "boolean";
    if (INT_RE.test(v)) return "integer";
    if (DECIMAL_RE.test(v)) return "decimal";
    if (DATETIME_RE.test(v)) return "datetime";
    if (DATE_RE.test(v)) return "date";
    if (CURRENCY_RE.test(v)) return "decimal";
    return "text";
  }
  return "text";
}

/**
 * Infers a column's data type from its values.
 * Family-based 90% rule: numeric (integer/decimal), temporal (date/datetime)
 * and boolean each pool their related types; if a family covers ≥90% of
 * non-missing sampled values, the more specific type in that family wins.
 * Otherwise the column is text.
 */
export function inferDataType(values: readonly Cell[]): DataType {
  const sample = values.filter((v) => !isMissing(v)).slice(0, 1000);
  if (sample.length === 0) return "text";

  const counts = new Map<DataType, number>();
  for (const value of sample) {
    const t = classify(value);
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  const total = sample.length;
  const numeric =
    (counts.get("integer") ?? 0) + (counts.get("decimal") ?? 0);
  const temporal = (counts.get("date") ?? 0) + (counts.get("datetime") ?? 0);
  const boolean = counts.get("boolean") ?? 0;

  if (numeric / total >= 0.9) {
    return (counts.get("decimal") ?? 0) > 0 ? "decimal" : "integer";
  }
  if (temporal / total >= 0.9) {
    return (counts.get("datetime") ?? 0) > 0 ? "datetime" : "date";
  }
  if (boolean / total >= 0.9) return "boolean";
  return "text";
}
