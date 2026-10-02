import { describe, expect, it } from "vitest";
import { buildPreview, buildTable } from "./parse";

const aoa = [
  ["Name", "Age", "City"],
  ["Ada", 36, "London"],
  ["Alan", 41, "London"],
  ["Ada", 36, "London"],
  [null, null, null],
  ["Grace", null, "New York"],
];

describe("buildTable", () => {
  it("uses the header row and skips blanks above it", () => {
    const table = buildTable([["ignore"], ...aoa], 2);
    expect(table.columns).toEqual(["Name", "Age", "City"]);
    expect(table.rows).toHaveLength(4);
  });

  it("deduplicates column names", () => {
    const table = buildTable(
      [
        ["x", "x", "x"],
        ["1", "2", "3"],
      ],
      1,
    );
    expect(table.columns).toEqual(["x", "x (2)", "x (3)"]);
  });

  it("names empty headers by position", () => {
    const table = buildTable(
      [
        [null, "b"],
        ["1", "2"],
      ],
      1,
    );
    expect(table.columns).toEqual(["Column 1", "b"]);
  });
});

describe("buildPreview", () => {
  it("counts rows, missing cells and duplicates", () => {
    const table = buildTable(aoa, 1);
    const preview = buildPreview(table);
    expect(preview.totalRows).toBe(4);
    expect(preview.duplicateRows).toBe(1);
    const age = preview.columns.find((c) => c.name === "Age");
    expect(age?.missing).toBe(1);
    expect(age?.type).toBe("integer");
    expect(preview.sampleRows.length).toBe(4);
  });
});
