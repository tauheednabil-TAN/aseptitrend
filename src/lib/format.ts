// Presentation helpers shared across the UI.

import type { Severity } from "./types";

/** Formats an ISO timestamp as a compact UTC date. */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

/** Formats an ISO timestamp as date + time (UTC). */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}

/** Formats a numeric result/limit with thousands separators. */
export function fmtNum(n: number | null): string {
  if (n === null) return "—";
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  high: "High",
  "medium-high": "Medium-High",
  medium: "Medium",
};

/** Tailwind class bundles per severity for badges. */
export const SEVERITY_BADGE: Record<Severity, string> = {
  high: "bg-red-100 text-red-800 ring-red-600/20",
  "medium-high": "bg-orange-100 text-orange-800 ring-orange-600/20",
  medium: "bg-amber-100 text-amber-800 ring-amber-600/20",
};

/** Dot colour per severity. */
export const SEVERITY_DOT: Record<Severity, string> = {
  high: "bg-red-500",
  "medium-high": "bg-orange-500",
  medium: "bg-amber-500",
};
