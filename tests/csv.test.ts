import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/csv";

const HEADER = "date,room,grade,sample_type,value,unit";

describe("CSV import validation", () => {
  it("accepts well-formed rows", () => {
    const csv = [
      HEADER,
      "2025-01-15,Filling Line A,A,settle_plate,0,CFU",
      "2025-01-15,Prep Room,C,contact_plate,7,CFU/plate",
      "2025-01-16T08:00:00Z,Corridor,B,active_air,3,CFU/m³",
    ].join("\n");
    const r = parseCsv(csv);
    expect(r.errors).toHaveLength(0);
    expect(r.acceptedRows).toBe(3);
    expect(r.readings[0].grade).toBe("A");
    expect(r.readings[0].date).toContain("2025-01-15");
  });

  it("rejects a bad header", () => {
    const r = parseCsv("foo,bar\n1,2");
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.acceptedRows).toBe(0);
  });

  it("rejects malformed rows but keeps good ones", () => {
    const csv = [
      HEADER,
      "2025-01-15,Good Room,C,settle_plate,5,CFU", // ok
      "not-a-date,Room,C,settle_plate,5,CFU", // bad date
      "2025-01-15,Room,Z,settle_plate,5,CFU", // bad grade
      "2025-01-15,Room,C,teleporter,5,CFU", // bad sample_type
      "2025-01-15,Room,C,settle_plate,-3,CFU", // negative value
      "2025-01-15,Room,C,settle_plate,abc,CFU", // non-numeric value
      "2025-01-15,,C,settle_plate,5,CFU", // missing room
      "2025-01-15,Room,C,settle_plate,5", // too few columns
    ].join("\n");
    const r = parseCsv(csv);
    expect(r.acceptedRows).toBe(1);
    expect(r.totalRows).toBe(8);
    expect(r.errors).toHaveLength(7);
    // Errors are row-numbered.
    expect(r.errors.some((e) => e.includes("Row 3") && e.includes("date"))).toBe(true);
    expect(r.errors.some((e) => e.includes("Row 4") && e.includes("grade"))).toBe(true);
    expect(r.errors.some((e) => e.includes("Row 5") && e.includes("sample_type"))).toBe(true);
  });

  it("normalises grade casing", () => {
    const r = parseCsv(`${HEADER}\n2025-01-15,Room,c,settle_plate,5,CFU`);
    expect(r.acceptedRows).toBe(1);
    expect(r.readings[0].grade).toBe("C");
  });

  it("reports an empty file", () => {
    const r = parseCsv("");
    expect(r.errors.length).toBeGreaterThan(0);
  });
});
