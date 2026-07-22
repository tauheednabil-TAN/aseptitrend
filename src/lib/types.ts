// Core domain types for AseptiTrend.
//
// SCOPE: synthetic-data proof-of-concept. Not validated, not GMP-qualified.
// Nothing here makes a batch, release, or quality decision — a human always reviews.

export type Grade = "A" | "B" | "C" | "D";

export const GRADES: Grade[] = ["A", "B", "C", "D"];

/**
 * Sample types modelled by the tool. Viable types report microbial recovery (CFU);
 * non-viable types report airborne particle counts at a given size threshold.
 */
export type SampleType =
  | "settle_plate" // Viable — settle plate (90 mm, 4 h exposure), CFU
  | "contact_plate" // Viable — contact plate (55 mm), CFU/plate
  | "active_air" // Viable — active air, CFU/m³
  | "nonviable_05um" // Non-viable particles ≥0.5 µm, particles/m³
  | "nonviable_5um"; // Non-viable particles ≥5 µm, particles/m³

export const VIABLE_TYPES: SampleType[] = [
  "settle_plate",
  "contact_plate",
  "active_air",
];

export const NONVIABLE_TYPES: SampleType[] = ["nonviable_05um", "nonviable_5um"];

export function isViable(sampleType: SampleType): boolean {
  return VIABLE_TYPES.includes(sampleType);
}

export const SAMPLE_TYPE_LABEL: Record<SampleType, string> = {
  settle_plate: "Viable — settle plate (4h)",
  contact_plate: "Viable — contact plate",
  active_air: "Viable — active air",
  nonviable_05um: "Non-viable ≥0.5 µm",
  nonviable_5um: "Non-viable ≥5 µm",
};

export const SAMPLE_TYPE_UNIT: Record<SampleType, string> = {
  settle_plate: "CFU",
  contact_plate: "CFU/plate",
  active_air: "CFU/m³",
  nonviable_05um: "particles/m³",
  nonviable_5um: "particles/m³",
};

/** A single environmental-monitoring result. */
export interface Reading {
  id: string;
  /** ISO 8601 timestamp, UTC. */
  date: string;
  /** Monitoring location / room identifier. */
  room: string;
  grade: Grade;
  sampleType: SampleType;
  value: number;
  unit: string;
}

export type Severity = "high" | "medium-high" | "medium";

export type FlagRule =
  | "action_breach"
  | "alert_breach"
  | "consecutive_rise"
  | "repeated_alerts"
  | "grade_a_viable";

export const FLAG_RULE_LABEL: Record<FlagRule, string> = {
  action_breach: "Action limit breach",
  alert_breach: "Alert limit breach",
  consecutive_rise: "Consecutive upward trend",
  repeated_alerts: "Repeated alerts in window",
  grade_a_viable: "Grade A viable presence",
};

/**
 * An append-only excursion / adverse-trend record. Treated with an audit-trail
 * mindset: each flag captures the full context that triggered it and when.
 */
export interface Flag {
  id: string;
  /** ISO 8601 timestamp (UTC) of the reading that triggered the flag. */
  timestamp: string;
  room: string;
  grade: Grade;
  sampleType: SampleType;
  value: number;
  rule: FlagRule;
  /** Which limit was breached (alert / action / spec), if applicable. */
  limitType: "alert" | "action" | "spec" | "trend";
  limitValue: number | null;
  severity: Severity;
  reason: string;
  /** Id of the triggering reading. */
  readingId: string;
}

/**
 * How a series' control limits were derived:
 * - "data-driven": P90/P95 of ≥MIN_HISTORY baseline points, capped below spec.
 * - "low-count": viable counts too low for meaningful percentiles; Annex 1 ceiling
 *   adopted as the action limit.
 * - "provisional": insufficient history; fell back to the Annex 1 ceiling.
 */
export type LimitBasis = "data-driven" | "low-count" | "provisional";

/** Computed control limits for one (room, grade, sampleType) series. */
export interface SeriesLimits {
  room: string;
  grade: Grade;
  sampleType: SampleType;
  /** 90th-percentile-derived alert limit, capped below spec. */
  alert: number;
  /** 95th-percentile-derived action limit, capped below spec. */
  action: number;
  /** Annex 1 (2022) specification maximum; null where not defined. */
  spec: number | null;
  sampleCount: number;
  /** True when fewer than the minimum history points exist. */
  provisional: boolean;
  /** True when the data-driven limit was clamped because it met/exceeded spec. */
  exceededSpec: boolean;
  /** How these limits were derived. */
  basis: LimitBasis;
}

export interface SeriesData {
  key: string; // `${room}::${grade}::${sampleType}`
  room: string;
  grade: Grade;
  sampleType: SampleType;
  unit: string;
  readings: Reading[]; // sorted ascending by date
  limits: SeriesLimits;
  /**
   * Index into `readings` where the current monitoring window begins. Limits are
   * derived from the baseline (readings before this index); excursion screening
   * applies from this index onward. 0 means the whole series is screened.
   */
  monitoringStartIndex: number;
}
