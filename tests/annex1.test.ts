import { describe, it, expect } from "vitest";
import { annex1Limit, isGradeANoGrowth } from "@/lib/annex1";

describe("Annex 1 (2022) reference limits", () => {
  it("returns the viable CFU ceilings", () => {
    expect(annex1Limit("A", "settle_plate")).toBe(1);
    expect(annex1Limit("B", "settle_plate")).toBe(5);
    expect(annex1Limit("C", "settle_plate")).toBe(50);
    expect(annex1Limit("D", "settle_plate")).toBe(100);

    expect(annex1Limit("B", "contact_plate")).toBe(5);
    expect(annex1Limit("C", "contact_plate")).toBe(25);
    expect(annex1Limit("D", "contact_plate")).toBe(50);

    expect(annex1Limit("B", "active_air")).toBe(10);
    expect(annex1Limit("C", "active_air")).toBe(100);
    expect(annex1Limit("D", "active_air")).toBe(200);
  });

  it("returns the non-viable particle ceilings", () => {
    expect(annex1Limit("A", "nonviable_05um")).toBe(3520);
    expect(annex1Limit("B", "nonviable_05um")).toBe(352000);
    expect(annex1Limit("C", "nonviable_05um")).toBe(3520000);

    expect(annex1Limit("A", "nonviable_5um")).toBe(20);
    expect(annex1Limit("B", "nonviable_5um")).toBe(2930);
    expect(annex1Limit("C", "nonviable_5um")).toBe(29300);
  });

  it("leaves Grade D non-viable undefined (risk-based)", () => {
    expect(annex1Limit("D", "nonviable_05um")).toBeNull();
    expect(annex1Limit("D", "nonviable_5um")).toBeNull();
  });

  it("flags Grade A viable as no-growth", () => {
    expect(isGradeANoGrowth("A", "settle_plate")).toBe(true);
    expect(isGradeANoGrowth("A", "active_air")).toBe(true);
    expect(isGradeANoGrowth("A", "nonviable_05um")).toBe(false);
    expect(isGradeANoGrowth("B", "settle_plate")).toBe(false);
  });
});
