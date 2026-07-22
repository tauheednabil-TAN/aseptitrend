import { describe, it, expect } from "vitest";
import {
  percentile,
  clampBelowSpec,
  computeLimits,
  MIN_HISTORY,
} from "@/lib/statistics";

describe("percentile (linear interpolation, type 7)", () => {
  it("returns exact values at the ends", () => {
    const data = [1, 2, 3, 4, 5];
    expect(percentile(data, 0)).toBe(1);
    expect(percentile(data, 1)).toBe(5);
  });

  it("computes the median correctly", () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });

  it("matches known 90th / 95th percentiles", () => {
    // 1..10, rank = (n-1)*p. n=10.
    // P90: rank = 9*0.9 = 8.1 -> between sorted[8]=9 and sorted[9]=10 -> 9.1
    // P95: rank = 9*0.95 = 8.55 -> 9 + 0.55*(10-9) = 9.55
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(data, 0.9)).toBeCloseTo(9.1, 10);
    expect(percentile(data, 0.95)).toBeCloseTo(9.55, 10);
  });

  it("is order-independent", () => {
    expect(percentile([10, 1, 5, 3, 8], 0.5)).toBe(5);
  });

  it("handles a single value", () => {
    expect(percentile([42], 0.9)).toBe(42);
  });

  it("rejects invalid input", () => {
    expect(() => percentile([], 0.5)).toThrow();
    expect(() => percentile([1], 1.5)).toThrow();
  });
});

describe("clampBelowSpec", () => {
  it("passes values below spec through unchanged", () => {
    expect(clampBelowSpec(40, 50)).toEqual({ value: 40, exceeded: false });
  });

  it("clamps values at or above spec to strictly below", () => {
    const r = clampBelowSpec(60, 50);
    expect(r.exceeded).toBe(true);
    expect(r.value).toBeLessThan(50);
    expect(r.value).toBeGreaterThanOrEqual(49);
  });

  it("does not clamp when spec is null", () => {
    expect(clampBelowSpec(9_999_999, null)).toEqual({ value: 9_999_999, exceeded: false });
  });
});

describe("computeLimits — Annex 1 capping", () => {
  it("never lets the data-driven limit reach the spec ceiling", () => {
    // Grade C settle plate: spec = 50. Data that would push P95 way over spec.
    const values = Array.from({ length: 30 }, (_, i) => (i < 25 ? 5 : 90));
    const limits = computeLimits(values, "Room X", "C", "settle_plate");
    expect(limits.spec).toBe(50);
    expect(limits.action).toBeLessThan(50);
    expect(limits.alert).toBeLessThan(50);
    expect(limits.exceededSpec).toBe(true);
  });

  it("keeps limits below spec even for ordinary data", () => {
    const values = Array.from({ length: 30 }, (_, i) => (i % 5) + 2); // 2..6
    const limits = computeLimits(values, "Room X", "C", "settle_plate");
    expect(limits.action).toBeLessThan(limits.spec!);
    expect(limits.exceededSpec).toBe(false);
    expect(limits.provisional).toBe(false);
  });

  it("marks limits provisional below the minimum history", () => {
    const values = Array.from({ length: MIN_HISTORY - 1 }, () => 5);
    const limits = computeLimits(values, "Room X", "C", "settle_plate");
    expect(limits.provisional).toBe(true);
    // Falls back to the spec ceiling.
    expect(limits.alert).toBe(50);
  });

  it("treats Grade A viable as no-growth (limit 1)", () => {
    const values = Array.from({ length: 30 }, () => 0);
    const limits = computeLimits(values, "Grade A point", "A", "active_air");
    expect(limits.alert).toBe(1);
    expect(limits.action).toBe(1);
  });
});
