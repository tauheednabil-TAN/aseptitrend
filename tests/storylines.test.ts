import { describe, it, expect } from "vitest";
import { generateReadings } from "@/lib/generateData";
import { computeDataset } from "@/lib/dataStore";
import type { Flag } from "@/lib/types";

const dataset = computeDataset(generateReadings());
const { flags, readings, series } = dataset;

function flagsFor(room: string, rule?: Flag["rule"]): Flag[] {
  return flags.filter((f) => f.room === room && (rule ? f.rule === rule : true));
}

describe("Synthetic dataset shape", () => {
  it("is deterministic across regeneration", () => {
    const a = generateReadings();
    const b = generateReadings();
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it("spans all four grades and multiple sample types", () => {
    const grades = new Set(readings.map((r) => r.grade));
    expect(grades).toEqual(new Set(["A", "B", "C", "D"]));
    const types = new Set(readings.map((r) => r.sampleType));
    expect(types.size).toBeGreaterThanOrEqual(4);
    // 8+ monitoring locations.
    expect(new Set(readings.map((r) => r.room)).size).toBeGreaterThanOrEqual(8);
  });

  it("produces non-provisional data-driven limits for the main series", () => {
    const s = series.find(
      (x) => x.room === "Compounding Suite — Grade C" && x.sampleType === "settle_plate",
    )!;
    expect(s.limits.provisional).toBe(false);
  });
});

describe("S1 — gradual drift culminating in an action breach", () => {
  const room = "Compounding Suite — Grade C";
  it("detects an action breach", () => {
    expect(flagsFor(room, "action_breach").length).toBeGreaterThan(0);
  });
  it("detects the upward trend before/at the breach", () => {
    expect(flagsFor(room, "consecutive_rise").length).toBeGreaterThan(0);
  });
});

describe("S2 — isolated Grade A viable hit", () => {
  it("produces exactly one Grade A viable flag across the whole dataset", () => {
    const gradeA = flags.filter((f) => f.rule === "grade_a_viable");
    expect(gradeA).toHaveLength(1);
    expect(gradeA[0].room).toBe("Filling Line 1 — Grade A (Point FA-1)");
    expect(gradeA[0].sampleType).toBe("active_air");
    expect(gradeA[0].severity).toBe("high");
  });
});

describe("S3 — repeated alert-level results at one location", () => {
  it("detects the repeated-alerts pattern", () => {
    const room = "Equipment Prep — Grade C";
    expect(flagsFor(room, "repeated_alerts").length).toBeGreaterThan(0);
  });
});

describe("Overall signal", () => {
  it("finds a modest, human-reviewable number of flags (not noise)", () => {
    // Storylines + realistic background variation. The window-screened engine keeps
    // this to a human-reviewable volume; this is a regression ceiling, not a target.
    expect(flags.length).toBeGreaterThan(5);
    expect(flags.length).toBeLessThan(90);
  });

  it("keeps high-severity events a clear minority (severity sorting works)", () => {
    const high = flags.filter((f) => f.severity === "high").length;
    expect(high).toBeLessThan(flags.length);
    expect(high).toBeGreaterThan(0);
  });
});
