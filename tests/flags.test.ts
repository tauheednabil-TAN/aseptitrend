import { describe, it, expect } from "vitest";
import { detectFlags } from "@/lib/flags";
import type {
  FlagRule,
  Grade,
  Reading,
  SampleType,
  SeriesData,
  SeriesLimits,
} from "@/lib/types";
import { SAMPLE_TYPE_UNIT } from "@/lib/types";

function makeSeries(
  values: number[],
  opts: {
    grade?: Grade;
    sampleType?: SampleType;
    alert?: number;
    action?: number;
    spec?: number | null;
    monitoringStartIndex?: number;
  } = {},
): SeriesData {
  const grade = opts.grade ?? "C";
  const sampleType = opts.sampleType ?? "settle_plate";
  const room = "Test Room";
  const unit = SAMPLE_TYPE_UNIT[sampleType];
  const readings: Reading[] = values.map((v, i) => ({
    id: `r-${i}`,
    date: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(),
    room,
    grade,
    sampleType,
    value: v,
    unit,
  }));
  const limits: SeriesLimits = {
    room,
    grade,
    sampleType,
    alert: opts.alert ?? 10,
    action: opts.action ?? 20,
    spec: opts.spec ?? 50,
    sampleCount: values.length,
    provisional: false,
    exceededSpec: false,
    basis: "data-driven",
  };
  return {
    key: `${room}::${grade}::${sampleType}`,
    room,
    grade,
    sampleType,
    unit,
    readings,
    limits,
    monitoringStartIndex: opts.monitoringStartIndex ?? 0,
  };
}

function rules(flags: { rule: FlagRule }[]): FlagRule[] {
  return flags.map((f) => f.rule);
}

describe("Rule 1 — action breach", () => {
  it("fires on a single result at/above the action limit", () => {
    const flags = detectFlags([makeSeries([2, 3, 25], { alert: 10, action: 20 })]);
    expect(rules(flags)).toContain("action_breach");
    const f = flags.find((x) => x.rule === "action_breach")!;
    expect(f.value).toBe(25);
    expect(f.severity).toBe("high");
  });

  it("does not fire on clean data", () => {
    const flags = detectFlags([makeSeries([2, 3, 4, 5], { alert: 10, action: 20 })]);
    expect(rules(flags)).not.toContain("action_breach");
  });
});

describe("Rule 2 — alert breach", () => {
  it("fires when a result is between alert and action", () => {
    const flags = detectFlags([makeSeries([2, 3, 15], { alert: 10, action: 20 })]);
    expect(rules(flags)).toContain("alert_breach");
    expect(flags.find((f) => f.rule === "alert_breach")!.severity).toBe("medium");
  });

  it("does not fire below the alert limit", () => {
    const flags = detectFlags([makeSeries([2, 3, 9], { alert: 10, action: 20 })]);
    expect(rules(flags)).not.toContain("alert_breach");
  });
});

describe("Rule 3 — consecutive-rise trend", () => {
  it("fires on 3+ non-decreasing results ending at/above alert", () => {
    // 5,7,9,12 rising; alert 10 -> last (12) >= alert. Below action 20 so no breach.
    const flags = detectFlags([makeSeries([5, 7, 9, 12], { alert: 10, action: 20 })]);
    expect(rules(flags)).toContain("consecutive_rise");
    expect(flags.find((f) => f.rule === "consecutive_rise")!.severity).toBe("medium");
  });

  it("does not fire on a short or flat run", () => {
    expect(rules(detectFlags([makeSeries([5, 9], { alert: 10, action: 20 })]))).not.toContain(
      "consecutive_rise",
    );
    // flat at zero, never reaches alert
    expect(
      rules(detectFlags([makeSeries([0, 0, 0, 0], { alert: 10, action: 20 })])),
    ).not.toContain("consecutive_rise");
  });

  it("does not fire when the rise stays below the alert limit", () => {
    const flags = detectFlags([makeSeries([1, 2, 3, 4], { alert: 10, action: 20 })]);
    expect(rules(flags)).not.toContain("consecutive_rise");
  });
});

describe("Rule 4 — repeated alerts in window", () => {
  it("fires when 3+ alert-level results fall within 7 samples", () => {
    // alerts (>=10) at positions 0,2,4 within a 7-window. Keep below action(20).
    const flags = detectFlags([
      makeSeries([12, 2, 13, 2, 14, 2, 2], { alert: 10, action: 20 }),
    ]);
    expect(rules(flags)).toContain("repeated_alerts");
    expect(flags.find((f) => f.rule === "repeated_alerts")!.severity).toBe("medium-high");
  });

  it("does not fire with only two alerts", () => {
    const flags = detectFlags([
      makeSeries([12, 2, 13, 2, 2, 2, 2], { alert: 10, action: 20 }),
    ]);
    expect(rules(flags)).not.toContain("repeated_alerts");
  });
});

describe("Rule 5 — Grade A viable presence", () => {
  it("fires on any recovery >= 1 in Grade A viable", () => {
    const flags = detectFlags([
      makeSeries([0, 0, 1], { grade: "A", sampleType: "active_air", spec: 1, alert: 1, action: 1 }),
    ]);
    expect(rules(flags)).toContain("grade_a_viable");
    expect(flags.find((f) => f.rule === "grade_a_viable")!.severity).toBe("high");
  });

  it("does not fire on a clean no-growth Grade A series", () => {
    const flags = detectFlags([
      makeSeries([0, 0, 0, 0], { grade: "A", sampleType: "active_air", spec: 1, alert: 1, action: 1 }),
    ]);
    expect(flags).toHaveLength(0);
  });

  it("does not apply the generic breach rules to Grade A viable", () => {
    // A single count of 3 is a Grade A event, reported once as grade_a_viable only.
    const flags = detectFlags([
      makeSeries([0, 0, 3], { grade: "A", sampleType: "active_air", spec: 1, alert: 1, action: 1 }),
    ]);
    expect(rules(flags)).toEqual(["grade_a_viable"]);
  });
});

describe("Monitoring window screening", () => {
  it("does not flag baseline readings before the monitoring window", () => {
    // The breach at index 1 is in the baseline; screening starts at index 3.
    const flags = detectFlags([
      makeSeries([25, 2, 2, 3], { alert: 10, action: 20, monitoringStartIndex: 3 }),
    ]);
    expect(flags).toHaveLength(0);
  });
});
