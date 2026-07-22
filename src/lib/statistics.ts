// Statistical control-limit setting for EM series.
//
// Primary method (per the tool's design):
//   Alert limit  = 90th percentile of historical results
//   Action limit = 95th percentile of historical results
//   Both capped strictly below the Annex 1 (2022) specification maximum.
//
// Two domain-driven guardrails keep the limits meaningful:
//   1. Low-count viable data: when counts sit near zero, percentiles collapse and a
//      data-driven "action limit of 2 CFU" is not credible. We fall back to the
//      Annex 1 ceiling as the action limit (standard practice for Grade A/B viable).
//   2. Minimum alert/action separation: when the 90th and 95th percentiles are almost
//      equal (tight distributions), we hold the action limit a small margin above the
//      alert limit so ordinary top-decile variation reads as a medium "alert" rather
//      than a high "action breach".

import type { Grade, SampleType, SeriesLimits } from "./types";
import { isViable } from "./types";
import { annex1Limit, isGradeANoGrowth } from "./annex1";

/** Minimum history required before a data-driven limit is trusted. */
export const MIN_HISTORY = 20;

/**
 * Below this raw 95th-percentile CFU count, viable percentiles are unreliable
 * (a "data-driven action limit of 2–3 CFU" is not credible); adopt the Annex 1 ceiling.
 */
export const LOW_COUNT_THRESHOLD = 4;

/**
 * Percentile using the linear-interpolation method (type 7, the NumPy/Excel
 * PERCENTILE.INC default). `p` is a fraction in [0, 1].
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) throw new Error("percentile: empty input");
  if (p < 0 || p > 1) throw new Error("percentile: p must be in [0, 1]");
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const rank = (sorted.length - 1) * p;
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

/** Largest clean value strictly below the spec ceiling. */
function justUnderSpec(spec: number): number {
  if (Number.isInteger(spec) && spec >= 2) return spec - 1;
  return spec - Math.max(Math.abs(spec) * 1e-6, 1e-9);
}

/**
 * Clamps a computed limit strictly below the spec ceiling. Returns the possibly
 * clamped value plus whether clamping occurred. A null spec passes through.
 */
export function clampBelowSpec(
  value: number,
  spec: number | null,
): { value: number; exceeded: boolean } {
  if (spec === null) return { value, exceeded: false };
  if (value >= spec) return { value: justUnderSpec(spec), exceeded: true };
  return { value, exceeded: false };
}

/**
 * Computes alert (P90) and action (P95) limits for a single series, capped below
 * the Annex 1 spec, with the two guardrails described above.
 */
export function computeLimits(
  values: number[],
  room: string,
  grade: Grade,
  sampleType: SampleType,
): SeriesLimits {
  const spec = annex1Limit(grade, sampleType);
  const sampleCount = values.length;
  const viable = isViable(sampleType);

  const base = { room, grade, sampleType, spec, sampleCount };

  // Grade A viable: "no growth" — any recovery (≥1) is an action-level event.
  if (isGradeANoGrowth(grade, sampleType)) {
    const provisional = sampleCount < MIN_HISTORY;
    return {
      ...base,
      alert: 1,
      action: 1,
      provisional,
      exceededSpec: false,
      basis: provisional ? "provisional" : "data-driven",
    };
  }

  // Insufficient history — fall back to the Annex 1 ceiling and label provisional.
  if (sampleCount < MIN_HISTORY) {
    const fallback = spec ?? (sampleCount > 0 ? Math.max(...values) : 0);
    return {
      ...base,
      alert: fallback,
      action: fallback,
      provisional: true,
      exceededSpec: false,
      basis: "provisional",
    };
  }

  const alertRaw = percentile(values, 0.9);
  const actionRaw = percentile(values, 0.95);

  // Guardrail 1 — low-count viable: adopt the Annex 1 ceiling as the action limit.
  if (viable && spec !== null && actionRaw < LOW_COUNT_THRESHOLD) {
    return {
      ...base,
      alert: Math.max(1, Math.ceil(spec / 2)),
      action: spec,
      provisional: false,
      exceededSpec: false,
      basis: "low-count",
    };
  }

  // Data-driven, with a minimum alert/action separation.
  let alert = alertRaw;
  let action = actionRaw;
  const minSep = viable ? 1 : alert * 0.15;
  if (action - alert < minSep) action = alert + minSep;

  const alertClamped = clampBelowSpec(alert, spec);
  const actionClamped = clampBelowSpec(action, spec);
  alert = roundValue(alertClamped.value, viable);
  action = roundValue(actionClamped.value, viable);

  // Preserve separation after rounding, without breaching spec.
  if (action <= alert) {
    const bumped = viable ? alert + 1 : alert + Math.max(1, roundValue(alert * 0.15, viable));
    if (spec === null || bumped < spec) action = bumped;
  }

  return {
    ...base,
    alert,
    action,
    provisional: false,
    exceededSpec: alertClamped.exceeded || actionClamped.exceeded,
    basis: "data-driven",
  };
}

function roundValue(v: number, viable: boolean): number {
  if (viable) return Math.round(v);
  return Math.round(v);
}
