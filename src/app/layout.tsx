import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/components/DataProvider";
import { ScopeBanner } from "@/components/ScopeBanner";
import { AppNav } from "@/components/AppNav";

export const metadata: Metadata = {
  title: "AseptiTrend — EM trending & excursion assistant",
  description:
    "Proactive environmental-monitoring trending and excursion assistant for aseptic filling. Synthetic data, not validated, human-in-the-loop.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <DataProvider>
          <ScopeBanner />
          <AppNav />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">
            {children}
          </main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-slate-400 flex flex-wrap gap-x-2 gap-y-1 justify-between">
              <span>
                AseptiTrend · Proactive EM trending on synthetic data · Not for GMP
                use.
              </span>
              <span>Limits referenced against EU GMP Annex 1 (2022).</span>
            </div>
          </footer>
        </DataProvider>
      </body>
    </html>
  );
}
