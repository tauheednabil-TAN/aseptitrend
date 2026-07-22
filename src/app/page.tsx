"use client";

import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { countBySeverity, gradeSnapshots, sortFlags } from "@/lib/dataStore";
import { Card, SectionTitle, SeverityBadge, GradePill } from "@/components/ui";
import { SAMPLE_TYPE_LABEL } from "@/lib/types";
import { fmtDate, fmtNum, SEVERITY_DOT } from "@/lib/format";

export default function DashboardPage() {
  const { flags, series, readings } = useData();
  const sev = countBySeverity(flags);
  const snapshots = gradeSnapshots(series, flags);
  const topFlags = sortFlags(flags).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Monitoring overview</h1>
        <p className="text-sm text-slate-500">
          {readings.length.toLocaleString()} results · {series.length} monitoring
          series · {flags.length} open flags across the current monitoring window.
        </p>
      </div>

      {/* Severity summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryTile label="Open flags" value={flags.length} tone="slate" />
        <SummaryTile label="High severity" value={sev.high} tone="high" />
        <SummaryTile label="Medium-high" value={sev["medium-high"]} tone="medium-high" />
        <SummaryTile label="Medium" value={sev.medium} tone="medium" />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Active excursions */}
        <Card className="lg:col-span-3 p-5">
          <SectionTitle
            title="Active excursions & adverse trends"
            subtitle="Most severe first"
            right={
              <Link
                href="/flags"
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                View all →
              </Link>
            }
          />
          {topFlags.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No open flags. All monitored series are within limits.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {topFlags.map((f) => (
                <li key={f.id} className="py-2.5 flex items-start gap-3">
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${SEVERITY_DOT[f.severity]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <GradePill grade={f.grade} />
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {f.room}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {f.reason}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <SeverityBadge severity={f.severity} />
                    <div className="text-[11px] text-slate-400 mt-1">
                      {fmtDate(f.timestamp)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Per-grade snapshot */}
        <Card className="lg:col-span-2 p-5">
          <SectionTitle
            title="Per-grade compliance snapshot"
            subtitle="Series flagged in the current window"
          />
          <div className="space-y-2">
            {snapshots.map((g) => {
              const clean = g.openFlags === 0;
              return (
                <div
                  key={g.grade}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                >
                  <GradePill grade={g.grade} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">
                      Grade {g.grade}
                    </div>
                    <div className="text-xs text-slate-500">
                      {g.seriesCount} series ·{" "}
                      {clean ? (
                        <span className="text-brand-700 font-medium">within limits</span>
                      ) : (
                        <span>
                          {g.flaggedSeries} flagged · {g.highFlags} high
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`text-lg font-semibold tabular-nums ${
                      clean ? "text-brand-600" : "text-slate-800"
                    }`}
                  >
                    {g.openFlags}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Watchlist: series whose data-driven limit meets/exceeds spec */}
      <ExceedanceNote />
    </div>
  );
}

function ExceedanceNote() {
  const { series } = useData();
  const flagged = series.filter((s) => s.limits.exceededSpec);
  if (flagged.length === 0) return null;
  return (
    <Card className="p-5 border-amber-200 bg-amber-50/40">
      <SectionTitle
        title="Data-driven limit exceeds specification"
        subtitle="For these series the computed limit met or exceeded the Annex 1 spec — the specification governs."
      />
      <div className="flex flex-wrap gap-2">
        {flagged.map((s) => (
          <span
            key={s.key}
            className="rounded-md bg-white border border-amber-200 px-2.5 py-1 text-xs text-slate-700"
          >
            {s.room} · {SAMPLE_TYPE_LABEL[s.sampleType]} (spec {fmtNum(s.limits.spec)})
          </span>
        ))}
      </div>
    </Card>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "high" | "medium-high" | "medium";
}) {
  const toneMap = {
    slate: "text-slate-900",
    high: "text-red-600",
    "medium-high": "text-orange-600",
    medium: "text-amber-600",
  } as const;
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold tabular-nums ${toneMap[tone]}`}>
        {value}
      </div>
    </Card>
  );
}
