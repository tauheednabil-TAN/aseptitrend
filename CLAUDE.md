# CLAUDE.md — AseptiTrend

Project brief and architecture for future AI-assisted sessions.

## What this is

A proactive environmental-monitoring (EM) trending & excursion assistant for pharmaceutical aseptic filling. Personal portfolio proof-of-concept. **Synthetic data only. Not validated, not GMP-qualified. Never makes a batch/release/quality decision — human-in-the-loop always.** These guardrails must remain visible in the product (persistent banner, AI-draft labelling) and must never be weakened.

## Stack

- Next.js 14 (App Router) + TypeScript, React 18, Tailwind CSS 3.
- Recharts for charts.
- Google Gemini API for AI investigation drafts — **server-side only** (`src/app/api/investigate/route.ts`), key in `GEMINI_API_KEY` (falls back to `GOOGLE_API_KEY`), model via `GEMINI_MODEL` (default `gemini-2.0-flash`). Never expose the key to the client.
- No database. Bundled synthetic seed (`src/data/seed.json`) + in-memory React state + optional CSV import.
- Vitest for unit tests. The statistics and flagging logic must stay fully tested — correctness there is the tool's credibility.

## Architecture

Pure domain logic (no React, no I/O) lives in `src/lib` and is unit-tested:

- `types.ts` — domain types (`Grade`, `SampleType`, `Reading`, `Flag`, `SeriesData`, `SeriesLimits`).
- `annex1.ts` — EU GMP Annex 1 (2022) reference limits as the regulatory ceiling; `annex1Limit(grade, sampleType)`; Grade A "no growth" helper.
- `statistics.ts` — `percentile` (type-7 linear interpolation), `clampBelowSpec`, `computeLimits`. Alert = P90, action = P95, both capped strictly below spec. Guardrails: low-count viable → adopt Annex ceiling; minimum alert/action separation; `< MIN_HISTORY` (20) → provisional.
- `flags.ts` — the five excursion/adverse-trend rules; screens only the monitoring window (`monitoringStartIndex`).
- `generateData.ts` — deterministic (seeded) synthetic generator with three injected storylines (documented in-file and asserted by tests).
- `csv.ts` — CSV import/validation (`date,room,grade,sample_type,value,unit`).
- `dataStore.ts` — assembles readings → series (+ limits, baseline/monitoring split) → flags; dashboard rollups. `MONITORING_WINDOW = 8`.

UI (`src/app`, `src/components`) is a thin client layer over that logic. `DataProvider` holds readings in state and recomputes the dataset via `computeDataset` on any change. Pages: `/` dashboard, `/trends`, `/flags`, `/data`.

## Domain rules (do not change without care)

- Alert = 90th percentile, Action = 95th percentile of the baseline; recompute on data change; cap strictly below the Annex 1 max and flag if the data-driven value meets/exceeds spec.
- ≥ 20 baseline points before trusting a data-driven limit; else provisional (Annex ceiling).
- Grade A viable: any CFU ≥ 1 is an action-level event (severity high) regardless of statistics.
- Five flag rules: action breach (high), alert breach (medium), consecutive-rise trend (medium), repeated alerts in 7-sample window (medium-high), Grade A viable presence (high). Flags are append-only records with full context and ISO/UTC timestamps.
- AI drafts assist writing only — never disposition, release, pass/fail, or CAPA outcome — and carry the label "AI-generated draft — for human review only. Not a quality decision."

## Commands

`npm run dev` · `npm test` · `npm run build` · `npm run seed` (regenerate `src/data/seed.json`).

## Deployment

Vercel. Set `GEMINI_API_KEY` as an environment variable in the host to enable AI drafts; the app degrades gracefully without it.
