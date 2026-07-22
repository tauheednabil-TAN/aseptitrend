"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { parseCsv, type CsvParseResult } from "@/lib/csv";
import { Card, SectionTitle, GradePill } from "@/components/ui";
import { SAMPLE_TYPE_LABEL } from "@/lib/types";
import { fmtNum, fmtDate } from "@/lib/format";

const CSV_TEMPLATE = "date,room,grade,sample_type,value,unit";

export default function DataPage() {
  const { readings, series, regenerate, replaceReadings, appendReadings, isSeed } =
    useData();
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [notice, setNotice] = useState<string>("");

  const recent = useMemo(
    () =>
      [...readings]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 60),
    [readings],
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setNotice("");
    const text = await file.text();
    setResult(parseCsv(text));
  }

  function applyReplace() {
    if (result?.readings.length) {
      replaceReadings(result.readings);
      setNotice(`Replaced dataset with ${result.readings.length} imported results.`);
      setResult(null);
    }
  }
  function applyAppend() {
    if (result?.readings.length) {
      appendReadings(result.readings);
      setNotice(`Appended ${result.readings.length} imported results.`);
      setResult(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Data</h1>
        <p className="text-sm text-slate-500">
          {readings.length.toLocaleString()} results across {series.length} series.{" "}
          {isSeed ? "Showing the bundled synthetic seed dataset." : "Custom dataset in use."}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Regenerate */}
        <Card className="p-5">
          <SectionTitle
            title="Synthetic dataset"
            subtitle="Deterministic, reproducible seed data with injected storylines."
          />
          <p className="text-sm text-slate-600">
            The bundled dataset spans ~90 days across all four cleanroom grades. It
            includes a gradual drift culminating in an action breach, an isolated Grade
            A viable recovery, and a location with repeated alert-level results.
          </p>
          <button
            onClick={() => {
              regenerate();
              setResult(null);
              setNotice("Reset to the synthetic seed dataset.");
            }}
            className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100 transition-colors"
          >
            Regenerate synthetic data
          </button>
        </Card>

        {/* CSV upload */}
        <Card className="p-5">
          <SectionTitle
            title="Import CSV"
            subtitle="Bring your own results. Validated and normalised on import."
          />
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 mb-3">
            <code className="text-xs text-slate-600">{CSV_TEMPLATE}</code>
          </div>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
            <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            Choose CSV file
          </label>
          {fileName && (
            <span className="ml-2 text-xs text-slate-500">{fileName}</span>
          )}

          {result && (
            <div className="mt-3 space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="text-brand-700 font-medium">
                  {result.acceptedRows} accepted
                </span>
                <span className="text-red-600 font-medium">
                  {result.errors.length} rejected
                </span>
                <span className="text-slate-400">of {result.totalRows} rows</span>
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto scroll-thin rounded-lg bg-red-50 border border-red-200 p-2 space-y-0.5">
                  {result.errors.slice(0, 40).map((err, i) => (
                    <div key={i} className="text-[11px] text-red-700">
                      {err}
                    </div>
                  ))}
                </div>
              )}
              {result.acceptedRows > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={applyReplace}
                    className="rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
                  >
                    Replace dataset
                  </button>
                  <button
                    onClick={applyAppend}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Append
                  </button>
                </div>
              )}
            </div>
          )}
          {notice && <p className="mt-3 text-xs text-brand-700">{notice}</p>}
        </Card>
      </div>

      {/* Recent readings table */}
      <Card className="p-5">
        <SectionTitle
          title="Recent results"
          subtitle="Most recent 60 results in the current dataset."
        />
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 pr-4 font-medium">Grade</th>
                <th className="py-2 pr-4 font-medium">Sample type</th>
                <th className="py-2 pr-4 font-medium text-right">Value</th>
                <th className="py-2 font-medium">Unit</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="py-1.5 pr-4 tabular-nums text-slate-500">
                    {fmtDate(r.date)}
                  </td>
                  <td className="py-1.5 pr-4 text-slate-800">{r.room}</td>
                  <td className="py-1.5 pr-4">
                    <GradePill grade={r.grade} />
                  </td>
                  <td className="py-1.5 pr-4 text-slate-600">
                    {SAMPLE_TYPE_LABEL[r.sampleType]}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums text-slate-800">
                    {fmtNum(r.value)}
                  </td>
                  <td className="py-1.5 text-slate-400">{r.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
