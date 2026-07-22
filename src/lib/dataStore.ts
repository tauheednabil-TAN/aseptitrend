// Dataset assembly: readings → series (+ limits) → flags, plus dashboard rollups.
//
// Pure functions only — no I/O, no React. The UI layer holds the readings in state
// and calls computeDataset() whenever data changes (seed load, regenerate, CSV upload).

import type {
  Flag,
  Grade,
  Reading,
  SampleType,
  SeriesData,
  Severity,
} from "./types";
import { GRADES, SAMPLE_TYPE_UNIT } from "./types";
import { computeLimits, MIN_HISTORY } from "./statistics";
import { detectFlags } from "./flags";

/** Number of most-recent samples treated as the current monitoring window. */
export const MONITORING_WINDOW = 8;

function seriesKey(room: string, grade: Grade, sampleType: SampleType): string {
  return `${room}::${grade}::${sampleType}`;
}

/** Groups readings into series, sorts each ascending, and computes limits. */
export function buildSeries(readings: Reading[]): SeriesData[] {
  const groups = new Map<string, Reading[]>();
  for (const r of readings) {
    const key = seriesKey(r.room, r.grade, r.sampleType);
    const arr = groups.get(key);
    if (arr) arr.push(r);
    else groups.set(key, [r]);
  }

  const series: SeriesData[] = [];
  for (const [key, group] of groups) {
    const sorted = [...group].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const { room, grade, sampleType } = sorted[0];

    // Split into baseline (defines limits) and monitoring window (screened).
    let monitoringStartIndex = 0;
    let baseline = sorted;
    if (sorted.length >= MIN_HISTORY + MONITORING_WINDOW) {
      monitoringStartIndex = sorted.length - MONITORING_WINDOW;
      baseline = sorted.slice(0, monitoringStartIndex);
    }

    const limits = computeLimits(
      baseline.map((r) => r.value),
      room,
      grade,
      sampleType,
    );

    series.push({
      key,
      room,
      grade,
      sampleType,
      unit: SAMPLE_TYPE_UNIT[sampleType],
      readings: sorted,
      limits,
      monitoringStartIndex,
    });
  }

  // Stable ordering: by grade then room then sample type.
  series.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
    if (a.room !== b.room) return a.room.localeCompare(b.room);
    return a.sampleType.localeCompare(b.sampleType);
  });

  return series;
}

export interface Dataset {
  readings: Reading[];
  series: SeriesData[];
  flags: Flag[];
}

/** Full pipeline: readings → series + flags. */
export function computeDataset(readings: Reading[]): Dataset {
  const series = buildSeries(readings);
  const flags = detectFlags(series);
  return { readings, series, flags };
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  high: 0,
  "medium-high": 1,
  medium: 2,
};

/** Counts of flags by severity. */
export function countBySeverity(flags: Flag[]): Record<Severity, number> {
  const out: Record<Severity, number> = { high: 0, "medium-high": 0, medium: 0 };
  for (const f of flags) out[f.severity]++;
  return out;
}

export interface GradeSnapshot {
  grade: Grade;
  seriesCount: number;
  flaggedSeries: number;
  openFlags: number;
  highFlags: number;
}

/** Per-grade compliance snapshot for the dashboard. */
export function gradeSnapshots(series: SeriesData[], flags: Flag[]): GradeSnapshot[] {
  return GRADES.map((grade) => {
    const gradeSeries = series.filter((s) => s.grade === grade);
    const gradeFlags = flags.filter((f) => f.grade === grade);
    const flaggedKeys = new Set(
      gradeFlags.map((f) => seriesKey(f.room, f.grade, f.sampleType)),
    );
    return {
      grade,
      seriesCount: gradeSeries.length,
      flaggedSeries: flaggedKeys.size,
      openFlags: gradeFlags.length,
      highFlags: gradeFlags.filter((f) => f.severity === "high").length,
    };
  });
}

/** Sorts flags most-severe first, then most-recent. */
export function sortFlags(flags: Flag[]): Flag[] {
  return [...flags].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/** Finds the series a flag belongs to. */
export function findSeriesForFlag(series: SeriesData[], flag: Flag): SeriesData | undefined {
  const key = seriesKey(flag.room, flag.grade, flag.sampleType);
  return series.find((s) => s.key === key);
}
