"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/trends", label: "Trends" },
  { href: "/flags", label: "Flags" },
  { href: "/data", label: "Data" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-700 text-white text-[13px] font-bold">
              A
            </span>
            <span className="font-semibold tracking-tight text-slate-900">
              AseptiTrend
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 font-medium">
              EM trending assistant
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {LINKS.map((l) => {
              const active =
                l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                    active
                      ? "bg-brand-50 text-brand-800"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
