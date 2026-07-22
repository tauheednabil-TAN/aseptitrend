import type { ReactNode } from "react";
import type { LimitBasis, Severity } from "@/lib/types";
import { SEVERITY_BADGE, SEVERITY_LABEL } from "@/lib/format";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${SEVERITY_BADGE[severity]}`}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

const GRADE_STYLES: Record<string, string> = {
  A: "bg-brand-700 text-white",
  B: "bg-brand-500 text-white",
  C: "bg-slate-500 text-white",
  D: "bg-slate-400 text-white",
};

export function GradePill({ grade }: { grade: string }) {
  return (
    <span
      className={`inline-grid h-5 w-5 place-items-center rounded text-[11px] font-bold ${
        GRADE_STYLES[grade] ?? "bg-slate-300 text-slate-800"
      }`}
      title={`Grade ${grade}`}
    >
      {grade}
    </span>
  );
}

const BASIS_LABEL: Record<LimitBasis, string> = {
  "data-driven": "Data-driven (P90/P95)",
  "low-count": "Annex 1 ceiling (low-count)",
  provisional: "Provisional (insufficient history)",
};

const BASIS_STYLE: Record<LimitBasis, string> = {
  "data-driven": "bg-brand-50 text-brand-800 ring-brand-600/20",
  "low-count": "bg-sky-50 text-sky-800 ring-sky-600/20",
  provisional: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function BasisBadge({ basis }: { basis: LimitBasis }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${BASIS_STYLE[basis]}`}
    >
      {BASIS_LABEL[basis]}
    </span>
  );
}
