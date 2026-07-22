// Deterministic synthetic EM dataset generator.
//
// Produces ~90 days of environmental-monitoring results across all four cleanroom
// grades and multiple sample types, with realistic (mostly compliant) baselines.
// A small number of deliberate STORYLINES are injected so the trending engine has
// genuine signal to surface. All randomness is seeded, so output is reproducible.
//
// INJECTED STORYLINES (asserted by tests):
//   S1  Gradual upward drift → action breach.
//       Location: "Compounding Suite — Grade C", settle_plate.
//       The final six samples ramp monotonically to a value above the Annex 1
//       spec, producing both a consecutive-rise trend and an action breach.
//   S2  Isolated Grade A viable hit.
//       Location: "Filling Line 1 — Grade A (Point FA-1)", active_air.
//       Exactly one recovery of 2 CFU/m³ in an otherwise no-growth series.
//   S3  Repeated alert-level results at one location.
//       Location: "Equipment Prep — Grade C", contact_plate.
//       Four elevated results clustered within the final samples.
// Every other series is stable and largely compliant.

import type { Grade, Reading, SampleType } from "./types";
import { SAMPLE_TYPE_UNIT } from "./types";

export const DEFAULT_SEED = 20240617;
/** Number of sampling occasions (every 2 days over ~90 days). */
const N_SAMPLES = 45;
const SAMPLE_INTERVAL_DAYS = 2;
/** Fixed anchor so the newest sample date is reproducible. */
const END = Date.UTC(2025, 5, 30, 8, 0, 0); // 2025-06-30T08:00:00Z
const DAY_MS = 24 * 60 * 60 * 1000;

interface LocationDef {
  room: string;
  grade: Grade;
  sampleTypes: SampleType[];
}

const LOCATIONS: LocationDef[] = [
  // Grade A — first air / point of fill. "No growth" expected on viable.
  {
    room: "Filling Line 1 — Grade A (Point FA-1)",
    grade: "A",
    sampleTypes: ["settle_plate", "active_air", "nonviable_05um", "nonviable_5um"],
  },
  {
    room: "Filling Line 1 — Grade A (Point FA-2)",
    grade: "A",
    sampleTypes: ["settle_plate", "active_air"],
  },
  // Grade B — background to Grade A.
  {
    room: "Filling Line 1 — Grade B Background",
    grade: "B",
    sampleTypes: ["settle_plate", "contact_plate", "active_air", "nonviable_05um", "nonviable_5um"],
  },
  {
    room: "Aseptic Corridor — Grade B",
    grade: "B",
    sampleTypes: ["settle_plate", "active_air"],
  },
  // Grade C — preparation / support.
  {
    room: "Compounding Suite — Grade C",
    grade: "C",
    sampleTypes: ["settle_plate", "contact_plate", "active_air", "nonviable_05um"],
  },
  {
    room: "Equipment Prep — Grade C",
    grade: "C",
    sampleTypes: ["settle_plate", "contact_plate"],
  },
  // Grade D — lowest classified.
  {
    room: "Component Wash — Grade D",
    grade: "D",
    sampleTypes: ["settle_plate", "contact_plate", "active_air"],
  },
  {
    room: "Warehouse Airlock — Grade D",
    grade: "D",
    sampleTypes: ["contact_plate", "active_air"],
  },
];

/** Deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Poisson sampler (Knuth) — used for low-count viable recoveries. */
function poisson(lambda: number, rng: () => number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

/** Mean viable recovery (CFU) per grade — deliberately low, mostly compliant. */
function viableMean(grade: Grade, sampleType: SampleType): number {
  // Grade A viable is a strict "no growth" series: baseline is exactly zero.
  if (grade === "A") return 0;
  const base: Record<Grade, number> = { A: 0, B: 1, C: 5, D: 12 };
  const m = base[grade];
  // Active air tends to read a touch higher than plates.
  return sampleType === "active_air" ? m * 1.4 : m;
}

/** Baseline non-viable particle count and relative spread per grade/size. */
function nonviableBaseline(
  grade: Grade,
  sampleType: SampleType,
): { base: number; spread: number } {
  const half = sampleType === "nonviable_05um";
  const table: Record<Grade, { base: number; spread: number }> = half
    ? {
        A: { base: 1100, spread: 0.35 },
        B: { base: 120000, spread: 0.3 },
        C: { base: 900000, spread: 0.3 },
        D: { base: 2000000, spread: 0.3 },
      }
    : {
        A: { base: 5, spread: 0.5 },
        B: { base: 800, spread: 0.35 },
        C: { base: 9000, spread: 0.35 },
        D: { base: 40000, spread: 0.35 },
      };
  return table[grade];
}

function isViableType(t: SampleType): boolean {
  return t === "settle_plate" || t === "contact_plate" || t === "active_air";
}

/**
 * Storyline overrides. Given a series and a sample index, returns a forced value
 * or null to use the generated baseline. Keyed on room + sample type.
 */
function storylineValue(
  room: string,
  sampleType: SampleType,
  i: number,
  n: number,
): number | null {
  // S1 — drift culminating in an action breach (final six samples ramp up).
  if (room === "Compounding Suite — Grade C" && sampleType === "settle_plate") {
    const ramp = [12, 18, 26, 34, 45, 60];
    const start = n - ramp.length;
    if (i >= start) return ramp[i - start];
  }
  // S2 — one isolated Grade A viable hit.
  if (room === "Filling Line 1 — Grade A (Point FA-1)" && sampleType === "active_air") {
    if (i === n - 5) return 2;
  }
  // S3 — repeated alert-level results clustered near the end.
  if (room === "Equipment Prep — Grade C" && sampleType === "contact_plate") {
    const cluster: Record<number, number> = {
      [n - 7]: 14,
      [n - 5]: 17,
      [n - 3]: 15,
      [n - 1]: 16,
    };
    if (i in cluster) return cluster[i];
  }
  return null;
}

/** Generates the full synthetic dataset. Deterministic for a given seed. */
export function generateReadings(seed: number = DEFAULT_SEED): Reading[] {
  const readings: Reading[] = [];
  let seriesIndex = 0;

  for (const loc of LOCATIONS) {
    for (const sampleType of loc.sampleTypes) {
      const rng = mulberry32(seed + seriesIndex * 7919);
      seriesIndex++;
      const unit = SAMPLE_TYPE_UNIT[sampleType];
      const viable = isViableType(sampleType);

      for (let i = 0; i < N_SAMPLES; i++) {
        const ts = END - (N_SAMPLES - 1 - i) * SAMPLE_INTERVAL_DAYS * DAY_MS;
        const forced = storylineValue(loc.room, sampleType, i, N_SAMPLES);

        let value: number;
        if (forced !== null) {
          value = forced;
        } else if (viable) {
          value = poisson(viableMean(loc.grade, sampleType), rng);
        } else {
          const { base, spread } = nonviableBaseline(loc.grade, sampleType);
          const noise = (rng() - 0.5) * 2 * spread;
          value = Math.max(0, Math.round(base * (1 + noise)));
        }

        readings.push({
          id: `${loc.room}::${loc.grade}::${sampleType}::${i}`,
          date: new Date(ts).toISOString(),
          room: loc.room,
          grade: loc.grade,
          sampleType,
          value,
          unit,
        });
      }
    }
  }

  return readings;
}
