"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  type DotProps,
} from "recharts";
import type { SeriesData } from "@/lib/types";
import { fmtDate, fmtNum } from "@/lib/format";

interface Point {
  idx: number;
  label: string;
  value: number;
  monitored: boolean;
}

export function TrendChart({ series }: { series: SeriesData }) {
  const { limits } = series;
  const data: Point[] = series.readings.map((r, i) => ({
    idx: i,
    label: fmtDate(r.date),
    value: r.value,
    monitored: i >= series.monitoringStartIndex,
  }));

  const alert = limits.alert;
  const action = limits.action;
  const spec = limits.spec;

  // y-domain headroom so reference lines are visible.
  const maxVal = Math.max(
    ...data.map((d) => d.value),
    action,
    spec ?? 0,
    alert,
  );
  const yMax = Math.ceil(maxVal * 1.1) || 1;

  const monitoringLabel = data[series.monitoringStartIndex]?.label;

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 8, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            minTickGap={28}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            domain={[0, yMax]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={(v) => fmtNum(v as number)}
          />
          <Tooltip content={<TrendTooltip series={series} />} />

          {monitoringLabel && series.monitoringStartIndex > 0 && (
            <ReferenceLine
              x={monitoringLabel}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{
                value: "monitoring window",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#94a3b8",
              }}
            />
          )}

          {spec !== null && (
            <ReferenceLine
              y={spec}
              stroke="#334155"
              strokeDasharray="6 3"
              label={{
                value: `Annex 1 spec ${fmtNum(spec)}`,
                position: "insideTopLeft",
                fontSize: 10,
                fill: "#334155",
              }}
            />
          )}
          <ReferenceLine
            y={action}
            stroke="#dc2626"
            label={{
              value: `Action ${fmtNum(action)}`,
              position: "insideBottomLeft",
              fontSize: 10,
              fill: "#dc2626",
            }}
          />
          <ReferenceLine
            y={alert}
            stroke="#d97706"
            strokeDasharray="5 3"
            label={{
              value: `Alert ${fmtNum(alert)}`,
              position: "insideBottomLeft",
              fontSize: 10,
              fill: "#d97706",
            }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#0f766e"
            strokeWidth={2}
            dot={(props) => {
              const { key, ...rest } = props as DotProps & {
                key?: string;
                payload?: Point;
              };
              return <TrendDot key={key} {...rest} series={series} />;
            }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendDot(props: DotProps & { payload?: Point; series: SeriesData }) {
  const { cx, cy, payload, series } = props;
  if (cx == null || cy == null || !payload) return <g />;
  const { alert, action } = series.limits;
  let fill = "#0f766e";
  let r = 2.5;
  if (payload.monitored && payload.value >= action) {
    fill = "#dc2626";
    r = 4;
  } else if (payload.monitored && payload.value >= alert) {
    fill = "#d97706";
    r = 3.5;
  }
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke="white" strokeWidth={1} />;
}

function TrendTooltip({
  active,
  payload,
  series,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  series: SeriesData;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const { alert, action, spec } = series.limits;
  let level = "Within limits";
  let color = "text-brand-700";
  if (p.monitored && p.value >= action) {
    level = "Action-level";
    color = "text-red-600";
  } else if (p.monitored && p.value >= alert) {
    level = "Alert-level";
    color = "text-amber-600";
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-xs">
      <div className="font-medium text-slate-900">{p.label}</div>
      <div className="mt-1 tabular-nums text-slate-700">
        {fmtNum(p.value)} {series.unit}
      </div>
      <div className={`mt-0.5 font-medium ${color}`}>{level}</div>
      <div className="mt-1 text-[11px] text-slate-400">
        alert {fmtNum(alert)} · action {fmtNum(action)}
        {spec !== null ? ` · spec ${fmtNum(spec)}` : ""}
      </div>
      {!p.monitored && (
        <div className="mt-1 text-[11px] text-slate-400">baseline (defines limits)</div>
      )}
    </div>
  );
}
