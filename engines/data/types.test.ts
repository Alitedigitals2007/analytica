import { describe, expect, it } from "vitest";
import { inferDataType, isMissing } from "./types";

describe("isMissing", () => {
  it("treats null, undefined, empty and whitespace as missing", () => {
    expect(isMissing(null)).toBe(true);
    expect(isMissing(undefined)).toBe(true);
    expect(isMissing("")).toBe(true);
    expect(isMissing("   ")).toBe(true);
    expect(isMissing(0)).toBe(false);
    expect(isMissing(false)).toBe(false);
    expect(isMissing("a")).toBe(false);
  });
});

describe("inferDataType", () => {
  it("detects integers", () => {
    expect(inferDataType([1, 2, 3, "4", "10"])).toBe("integer");
  });

  it("detects decimals", () => {
    expect(inferDataType(["1.5", "2", "3.25"])).toBe("decimal");
  });

  it("promotes integer+decimal mixes to decimal", () => {
    expect(inferDataType([1, 2, 3, 4, 5, 6, 7, 8, 9, 10.5])).toBe("decimal");
  });

  it("detects booleans", () => {
    expect(inferDataType(["yes", "no", "true", "false"])).toBe("boolean");
  });

  it("detects dates", () => {
    expect(inferDataType(["2024-01-15", "2024-02-01", "3/15/2024"])).toBe(
      "date",
    );
  });

  it("detects datetimes", () => {
    expect(inferDataType(["2024-01-15 10:30", "2024-01-16T11:00:00"])).toBe(
      "datetime",
    );
  });

  it("returns text for mixed columns", () => {
    expect(inferDataType(["abc", "123", "2024-01-01", "x", "y", "z"])).toBe(
      "text",
    );
  });

  it("returns text when everything is missing", () => {
    expect(inferDataType([null, "", "  "])).toBe("text");
  });

  it("ignores missing values when scoring", () => {
    expect(inferDataType([1, 2, 3, null, "", 4, 5])).toBe("integer");
  });
});
