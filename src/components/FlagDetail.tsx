"use client";

import { useState } from "react";
import type { Flag } from "@/lib/types";
import { SAMPLE_TYPE_LABEL, FLAG_RULE_LABEL } from "@/lib/types";
import { useData } from "@/components/DataProvider";
import { findSeriesForFlag } from "@/lib/dataStore";
import { SeverityBadge, GradePill, BasisBadge } from "@/components/ui";
import { fmtDateTime, fmtNum } from "@/lib/format";

const DRAFT_LABEL = "AI-generated draft — for human review only. Not a quality decision.";

export function FlagDetail({ flag }: { flag: Flag }) {
  const { series } = useData();
  const s = findSeriesForFlag(series, flag);
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "unavailable" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string>("");

  const recent = s
    ? s.readings
        .filter((r) => new Date(r.date).getTime() <= new Date(flag.timestamp).getTime())
        .slice(-8)
    : [];

  async function generate() {
    if (!s) return;
    setStatus("loading");
    setDraft(null);
    setMessage("");
    try {
      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: flag.room,
          grade: flag.grade,
          sampleType: flag.sampleType,
          unit: s.unit,
          value: flag.value,
          rule: flag.rule,
          ruleLabel: FLAG_RULE_LABEL[flag.rule],
          severity: flag.severity,
          reason: flag.reason,
          timestamp: flag.timestamp,
          alert: s.limits.alert,
          action: s.limits.action,
          spec: s.limits.spec,
          basis: s.limits.basis,
          recent: recent.map((r) => ({ date: r.date, value: r.value })),
        }),
      });
      const data = await res.json();
      if (data.available === false) {
        setStatus("unavailable");
        setMessage(data.message);
      } else if (data.error) {
        setStatus("error");
        setMessage(data.error);
      } else {
        setStatus("idle");
        setDraft(data.draft as string);
      }
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Request failed.");
    }
  }

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GradePill grade={flag.grade} />
            <h3 className="text-sm font-semibold text-slate-900">{flag.room}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {SAMPLE_TYPE_LABEL[flag.sampleType]} · {fmtDateTime(flag.timestamp)}
          </p>
        </div>
        <SeverityBadge severity={flag.severity} />
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <Stat label="Result" value={`${fmtNum(flag.value)} ${s?.unit ?? ""}`} highlight />
        <Stat label="Alert limit" value={fmtNum(s?.limits.alert ?? null)} />
        <Stat label="Action limit" value={fmtNum(s?.limits.action ?? null)} />
        <Stat label="Annex 1 spec" value={fmtNum(s?.limits.spec ?? null)} />
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {FLAG_RULE_LABEL[flag.rule]}
        </p>
        <p className="text-sm text-slate-700 mt-1">{flag.reason}</p>
      </div>

      {recent.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
            Recent results at this location
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((r) => {
              const breach = s && r.value >= s.limits.action;
              const alertLvl = s && !breach && r.value >= s.limits.alert;
              return (
                <span
                  key={r.id}
                  className={`rounded px-1.5 py-0.5 text-xs tabular-nums ${
                    breach
                      ? "bg-red-100 text-red-800"
                      : alertLvl
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                  }`}
                  title={r.date.slice(0, 10)}
                >
                  {fmtNum(r.value)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        {s && s.limits.basis !== "data-driven" && (
          <div className="mb-3">
            <BasisBadge basis={s.limits.basis} />
          </div>
        )}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              AI investigation draft
            </p>
            <p className="text-xs text-slate-500">
              Drafts an investigation note for a human to review and complete.
            </p>
          </div>
          <button
            onClick={generate}
            disabled={status === "loading"}
            className="rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60 transition-colors"
          >
            {status === "loading" ? "Drafting…" : "Generate investigation draft"}
          </button>
        </div>

        {status === "unavailable" && (
          <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
            {message}
          </div>
        )}
        {status === "error" && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            {message}
          </div>
        )}

        {draft && (
          <div className="mt-3">
            <div className="flex items-center gap-2 rounded-t-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <span aria-hidden className="text-amber-600">
                ⚠
              </span>
              <span className="text-[11px] font-semibold text-amber-800">
                {DRAFT_LABEL}
              </span>
            </div>
            <div className="rounded-b-lg border border-t-0 border-amber-200 bg-white p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                {draft}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-2 ${
        highlight ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div
        className={`text-sm font-semibold tabular-nums ${
          highlight ? "text-brand-800" : "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
