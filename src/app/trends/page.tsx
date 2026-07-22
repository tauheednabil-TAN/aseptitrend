"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { TrendChart } from "@/components/TrendChart";
import { Card, GradePill, BasisBadge, SeverityBadge } from "@/components/ui";
import { SAMPLE_TYPE_LABEL } from "@/lib/types";
import { fmtNum, fmtDate } from "@/lib/format";

export default function TrendsPage() {
  const { series, flags } = useData();

  const rooms = useMemo(
    () => Array.from(new Set(series.map((s) => s.room))),
    [series],
  );
  const [room, setRoom] = useState(rooms[0] ?? "");

  const roomSeries = series.filter((s) => s.room === room);
  const [sampleType, setSampleType] = useState<string>(
    roomSeries[0]?.sampleType ?? "",
  );

  // Keep sampleType valid when room changes.
  const activeTypes = roomSeries.map((s) => s.sampleType as string);
  const currentType = activeTypes.includes(sampleType)
    ? sampleType
    : (activeTypes[0] ?? "");

  const selected = roomSeries.find((s) => s.sampleType === currentType);
  const seriesFlags = flags.filter(
    (f) => f.room === room && f.sampleType === currentType,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Trend view</h1>
        <p className="text-sm text-slate-500">
          Time series with alert, action and Annex 1 specification limits drawn in.
          Baseline points define the limits; the monitoring window is screened.
        </p>
      </div>

      <Card className="p-5">
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">
              Monitoring location
            </span>
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            >
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Sample type</span>
            <select
              value={currentType}
              onChange={(e) => setSampleType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            >
              {roomSeries.map((s) => (
                <option key={s.sampleType} value={s.sampleType}>
                  {SAMPLE_TYPE_LABEL[s.sampleType]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selected ? (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <GradePill grade={selected.grade} />
              <span className="text-sm font-medium text-slate-800">
                {SAMPLE_TYPE_LABEL[selected.sampleType]}
              </span>
              <span className="text-xs text-slate-400">({selected.unit})</span>
              <BasisBadge basis={selected.limits.basis} />
              {selected.limits.exceededSpec && (
                <span className="rounded-full bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20 px-2 py-0.5 text-[11px] font-medium">
                  data-driven limit exceeds spec — spec governs
                </span>
              )}
            </div>
            <TrendChart series={selected} />
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Legend swatch="#0f766e" label="Result" />
              <Legend swatch="#d97706" label={`Alert ${fmtNum(selected.limits.alert)}`} />
              <Legend swatch="#dc2626" label={`Action ${fmtNum(selected.limits.action)}`} />
              <Legend
                swatch="#334155"
                label={
                  selected.limits.spec !== null
                    ? `Annex 1 spec ${fmtNum(selected.limits.spec)}`
                    : "Spec not defined"
                }
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">No series for this selection.</p>
        )}
      </Card>

      {selected && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            Flags on this series
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            {seriesFlags.length} flag{seriesFlags.length === 1 ? "" : "s"} in the
            current monitoring window.
          </p>
          {seriesFlags.length === 0 ? (
            <p className="text-sm text-slate-500">
              No excursions — this series is within limits.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {seriesFlags.map((f) => (
                <li key={f.id} className="py-2 flex items-start gap-3">
                  <span className="text-xs text-slate-400 tabular-nums w-20 shrink-0">
                    {fmtDate(f.timestamp)}
                  </span>
                  <span className="text-sm text-slate-700 flex-1">{f.reason}</span>
                  <SeverityBadge severity={f.severity} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-600">
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ backgroundColor: swatch }}
      />
      {label}
    </div>
  );
}
