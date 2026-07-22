"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { sortFlags } from "@/lib/dataStore";
import { Card, SeverityBadge, GradePill } from "@/components/ui";
import { FlagDetail } from "@/components/FlagDetail";
import { SAMPLE_TYPE_LABEL, FLAG_RULE_LABEL } from "@/lib/types";
import type { Severity } from "@/lib/types";
import { fmtDate, fmtNum, SEVERITY_DOT } from "@/lib/format";

const FILTERS: { key: Severity | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high", label: "High" },
  { key: "medium-high", label: "Medium-high" },
  { key: "medium", label: "Medium" },
];

export default function FlagsPage() {
  const { flags } = useData();
  const sorted = useMemo(() => sortFlags(flags), [flags]);
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(sorted[0]?.id ?? null);

  const visible =
    filter === "all" ? sorted : sorted.filter((f) => f.severity === filter);
  const selected =
    flags.find((f) => f.id === selectedId) ?? visible[0] ?? sorted[0] ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Flags & excursions</h1>
        <p className="text-sm text-slate-500">
          Append-only excursion records with full context — an audit-trail mindset.
          Select a flag to review it and draft an investigation note.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? sorted.length
              : sorted.filter((x) => x.severity === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-brand-700 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-5 gap-4 items-start">
        {/* List */}
        <Card className="lg:col-span-2 overflow-hidden">
          {visible.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">No flags to show.</p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto scroll-thin">
              {visible.map((f) => {
                const active = selected?.id === f.id;
                return (
                  <li key={f.id}>
                    <button
                      onClick={() => setSelectedId(f.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                        active ? "bg-brand-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${SEVERITY_DOT[f.severity]}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <GradePill grade={f.grade} />
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {f.room}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {FLAG_RULE_LABEL[f.rule]} · {fmtNum(f.value)} {" "}
                          {SAMPLE_TYPE_LABEL[f.sampleType]}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                        {fmtDate(f.timestamp)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Detail */}
        <Card className="lg:col-span-3">
          {selected ? (
            <FlagDetail key={selected.id} flag={selected} />
          ) : (
            <p className="p-6 text-sm text-slate-500 text-center">
              Select a flag to see details.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
