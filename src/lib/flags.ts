// Excursion & adverse-trend detection.
//
// Implements the five rules that make this tool credible. Each produces an
// append-only Flag record with full context. Flags never make a decision — they
// surface patterns for a human investigator, including the "pattern a spreadsheet
// hides" (a slow upward drift that never yet breached a limit).

import type { Flag, FlagRule, Reading, SeriesData, Severity } from "./types";
import { SAMPLE_TYPE_LABEL } from "./types";
import { isGradeANoGrowth } from "./annex1";

/** Rolling window (in samples) used by the "repeated alerts" rule. */
export const REPEATED_ALERT_WINDOW = 7;
/** Number of alert-level results within the window that triggers the rule. */
export const REPEATED_ALERT_COUNT = 3;
/** Minimum length of a non-decreasing run for the consecutive-rise rule. */
export const CONSECUTIVE_RISE_LEN = 3;

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function flagId(rule: FlagRule, readingId: string): string {
  return `${rule}:${readingId}`;
}

/**
 * Detects all applicable flags across every series. Input readings within each
 * series must be sorted ascending by date (this function sorts defensively).
 */
export function detectFlags(series: SeriesData[]): Flag[] {
  const flags: Flag[] = [];
  for (const s of series) {
    const readings = [...s.readings].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    detectSeriesFlags(s, readings, flags);
  }
  // Newest first for display.
  return flags.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function detectSeriesFlags(s: SeriesData, readings: Reading[], out: Flag[]): void {
  const { room, grade, sampleType } = s;
  const { alert, action } = s.limits;
  const typeLabel = SAMPLE_TYPE_LABEL[sampleType];

  // Excursion screening applies to the current monitoring window; the earlier
  // baseline points are what defined the limits and are not retroactively flagged.
  const screenFrom = s.monitoringStartIndex ?? 0;

  const push = (
    r: Reading,
    rule: FlagRule,
    limitType: Flag["limitType"],
    limitValue: number | null,
    severity: Severity,
    reason: string,
  ) => {
    out.push({
      id: flagId(rule, r.id),
      timestamp: r.date,
      room,
      grade,
      sampleType,
      value: r.value,
      rule,
      limitType,
      limitValue,
      severity,
      reason,
      readingId: r.id,
    });
  };

  // Rule 5 — Grade A viable presence. For Grade A viable series this is the only
  // rule we apply: any recovery is an action-level event, so the generic
  // alert/action rules would only add noise.
  if (isGradeANoGrowth(grade, sampleType)) {
    for (let idx = 0; idx < readings.length; idx++) {
      if (idx < screenFrom) continue;
      const r = readings[idx];
      if (r.value >= 1) {
        push(
          r,
          "grade_a_viable",
          "spec",
          1,
          "high",
          `Grade A viable recovery of ${fmt(r.value)} ${r.unit} — Grade A expects no growth; any recovery is an immediate action-level event.`,
        );
      }
    }
    return;
  }

  // Rules 1 & 2 — single-result breaches.
  for (let idx = 0; idx < readings.length; idx++) {
    if (idx < screenFrom) continue;
    const r = readings[idx];
    if (r.value >= action) {
      push(
        r,
        "action_breach",
        "action",
        action,
        "high",
        `Result ${fmt(r.value)} ${r.unit} at or above the action limit (${fmt(action)}) for ${typeLabel} in ${room} (Grade ${grade}).`,
      );
    } else if (r.value >= alert) {
      push(
        r,
        "alert_breach",
        "alert",
        alert,
        "medium",
        `Result ${fmt(r.value)} ${r.unit} at or above the alert limit (${fmt(alert)}) but below the action limit (${fmt(action)}).`,
      );
    }
  }

  // Rule 3 — Consecutive-rise trend. Find maximal non-decreasing runs of length
  // ≥3 that actually rise overall and end at or above the alert limit. Flag the
  // latest reading of each such run once. This is the drift a table hides.
  let runStart = 0;
  for (let i = 1; i <= readings.length; i++) {
    const broke =
      i === readings.length || readings[i].value < readings[i - 1].value;
    if (broke) {
      const runLen = i - runStart;
      const last = readings[i - 1];
      const first = readings[runStart];
      if (
        runLen >= CONSECUTIVE_RISE_LEN &&
        last.value > first.value &&
        last.value >= alert &&
        i - 1 >= screenFrom
      ) {
        push(
          last,
          "consecutive_rise",
          "trend",
          alert,
          "medium",
          `${runLen} consecutive non-decreasing results (${fmt(first.value)} → ${fmt(last.value)} ${last.unit}) trending toward the action limit for ${typeLabel} in ${room}.`,
        );
      }
      runStart = i;
    }
  }

  // Rule 4 — Repeated alerts in a rolling window. First window of the most recent
  // REPEATED_ALERT_WINDOW samples containing ≥REPEATED_ALERT_COUNT alert-level
  // results. Flag the reading that completes the condition, once per series.
  for (let i = REPEATED_ALERT_COUNT - 1; i < readings.length; i++) {
    if (i < screenFrom) continue;
    const from = Math.max(0, i - (REPEATED_ALERT_WINDOW - 1));
    let count = 0;
    for (let j = from; j <= i; j++) {
      if (readings[j].value >= alert) count++;
    }
    if (count >= REPEATED_ALERT_COUNT) {
      const r = readings[i];
      push(
        r,
        "repeated_alerts",
        "alert",
        alert,
        "medium-high",
        `${count} alert-level results within ${REPEATED_ALERT_WINDOW} samples at ${typeLabel} in ${room} — a recurring pattern warranting review.`,
      );
      break;
    }
  }
}
