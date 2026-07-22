// EU GMP Annex 1 (2022) reference limits.
//
// Source: EudraLex Volume 4, Annex 1 "Manufacture of Sterile Medicinal Products"
// (2022 revision). The figures below are the *maximum permitted* values "in operation"
// and are stored here as the regulatory CEILING. Data-driven alert/action limits
// computed elsewhere in the app are always capped strictly BELOW these values —
// the specification governs.
//
// IMPORTANT: These are reproduced for a synthetic proof-of-concept only. This tool is
// not validated and makes no GMP decision. Always confirm against the current
// regulatory text before any real use.

import type { Grade, SampleType } from "./types";
import { isViable } from "./types";

/**
 * Viable microbial limits — maximum CFU. Grade A is "no growth expected":
 * any recovery of ≥1 CFU is treated as an action-level event regardless of statistics.
 * We encode the ceiling as 1 (i.e. the result must be < 1), and handle the
 * "any growth" semantics explicitly in the flagging logic.
 */
const VIABLE_LIMITS: Record<SampleType, Record<Grade, number | null>> = {
  // Settle plate (90 mm, 4 h exposure) — max CFU
  settle_plate: { A: 1, B: 5, C: 50, D: 100 },
  // Contact plate (55 mm) — max CFU/plate
  contact_plate: { A: 1, B: 5, C: 25, D: 50 },
  // Active air — max CFU/m³
  active_air: { A: 1, B: 10, C: 100, D: 200 },
  // Non-viable types have no viable CFU limit.
  nonviable_05um: { A: null, B: null, C: null, D: null },
  nonviable_5um: { A: null, B: null, C: null, D: null },
};

/**
 * Non-viable airborne particle limits — maximum particles/m³, in operation.
 * Grade D is risk-based / not defined in the 2022 revision for the in-operation state.
 */
const NONVIABLE_LIMITS: Record<"nonviable_05um" | "nonviable_5um", Record<Grade, number | null>> = {
  // ≥0.5 µm
  nonviable_05um: { A: 3520, B: 352000, C: 3520000, D: null },
  // ≥5 µm
  nonviable_5um: { A: 20, B: 2930, C: 29300, D: null },
};

/**
 * Returns the Annex 1 (2022) specification maximum for a given grade and sample type,
 * or `null` where the standard does not define one (e.g. Grade D non-viable).
 */
export function annex1Limit(grade: Grade, sampleType: SampleType): number | null {
  if (sampleType === "nonviable_05um" || sampleType === "nonviable_5um") {
    return NONVIABLE_LIMITS[sampleType][grade];
  }
  return VIABLE_LIMITS[sampleType][grade];
}

/**
 * Grade A viable monitoring is a special case: the expectation is "no growth",
 * so any viable recovery (≥1 CFU) is an immediate action-level event.
 */
export function isGradeANoGrowth(grade: Grade, sampleType: SampleType): boolean {
  return grade === "A" && isViable(sampleType);
}
