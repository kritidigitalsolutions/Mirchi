import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Download } from "lucide-react";
import { CATEGORY_SLOTS, RANGE_OPTIONS, bucketLabel, fmtNum, todayIso } from "./analyticsUtils";

export function RangePicker({ range, from, to, onChange }) {
  return (
    <div className="an-range" role="group" aria-label="Date range">
      <div className="an-range-tabs">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={range === opt.id ? "active" : ""}
            aria-pressed={range === opt.id}
            onClick={() =>
              onChange(
                opt.id === "custom"
                  ? { range: "custom", from: from || todayIso(), to: to || todayIso() }
                  : { range: opt.id }
              )
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div className="an-range-custom">
          <input type="date" value={from} max={to || undefined} onChange={(e) => onChange({ from: e.target.value })} aria-label="From date" />
          <span>to</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => onChange({ to: e.target.value })} aria-label="To date" />
        </div>
      )}
    </div>
  );
}

export function CsvButton({ onClick }) {
  return (
    <button type="button" className="btn btn-ghost an-csv" onClick={onClick}>
      <Download size={15} /> CSV
    </button>
  );
}

// ========================================
// KPI CARD
// ========================================

export function KpiCard({ label, value, sub, change, hint }) {
  const hasChange = change !== null && change !== undefined;
  const up = hasChange && change >= 0;
  return (
    <div className="an-kpi" title={hint}>
      <span className="an-kpi-label">{label}</span>
      <span className="an-kpi-value">{value}</span>
      <div className="an-kpi-foot">
        {hasChange && (
          <span className={`an-kpi-change ${up ? "up" : "down"}`}>
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(change)}%
            <span className="an-kpi-vs">vs previous</span>
          </span>
        )}
        {sub && <span className="an-kpi-sub">{sub}</span>}
      </div>
    </div>
  );
}

// ========================================
// CHARTS
// ========================================

function ChartTooltip({ active, payload, label, valueFormat, labelFormat }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="an-tooltip">
      <div className="an-tooltip-label">{labelFormat ? labelFormat(label) : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="an-tooltip-row">
          <span className="an-swatch" style={{ background: p.color }} />
          <span>{p.name}</span>
          <strong>{valueFormat ? valueFormat(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

const TREND_METRICS = [
  { id: "views", label: "Views", format: fmtNum },
  { id: "uniqueViewers", label: "Unique viewers", format: fmtNum },
  { id: "watchMinutes", label: "Watch time", format: (v) => `${fmtNum(v)} min` },
];

// One measure at a time (toggle) - never two y-scales on one chart.
export function TrendChart({ data = [], title = "Trend", metrics = TREND_METRICS, height = 280 }) {
  const [metric, setMetric] = useState(metrics[0].id);
  const active = metrics.find((m) => m.id === metric) || metrics[0];
  const empty = !data.length || data.every((d) => !d[active.id]);

  return (
    <div className="an-card">
      <div className="an-card-head">
        <h3>{title}</h3>
        <div className="an-toggle" role="group" aria-label="Chart metric">
          {metrics.map((m) => (
            <button key={m.id} type="button" className={metric === m.id ? "active" : ""} aria-pressed={metric === m.id} onClick={() => setMetric(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {empty ? (
        <div className="an-empty" style={{ height }}>No {active.label.toLowerCase()} in this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="anTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--an-series-1)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--an-series-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="key" tickFormatter={bucketLabel} stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis allowDecimals={false} stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip content={<ChartTooltip valueFormat={active.format} labelFormat={bucketLabel} />} cursor={{ stroke: "var(--border2)" }} />
            <Area
              type="linear"
              dataKey={active.id}
              name={active.label}
              stroke="var(--an-series-1)"
              strokeWidth={2}
              fill="url(#anTrendFill)"
              dot={data.length <= 31 ? { r: 3, fill: "var(--an-series-1)", strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: "var(--an-series-1)", stroke: "var(--bg2)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// Donut with legend + values (identity never colour-alone)
export function SplitChart({ title, data = [], labelFor = (n) => n }) {
  const total = data.reduce((a, d) => a + (d.views || 0), 0);
  return (
    <div className="an-card">
      <div className="an-card-head"><h3>{title}</h3></div>
      {!total ? (
        <div className="an-empty" style={{ height: 180 }}>No views in this period</div>
      ) : (
        <div className="an-split">
          <ResponsiveContainer width={150} height={150}>
            <PieChart>
              <Pie data={data} dataKey="views" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="var(--bg2)" strokeWidth={2}>
                {data.map((d) => (
                  <Cell key={String(d.name)} fill={CATEGORY_SLOTS[d.name] || "var(--an-series-4)"} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="an-tooltip">
                      <div className="an-tooltip-row">
                        <span className="an-swatch" style={{ background: payload[0].payload.fill }} />
                        <span>{labelFor(payload[0].name)}</span>
                        <strong>{fmtNum(payload[0].value)}</strong>
                      </div>
                    </div>
                  ) : null
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <ul className="an-legend">
            {data.map((d) => (
              <li key={String(d.name)}>
                <span className="an-swatch" style={{ background: CATEGORY_SLOTS[d.name] || "var(--an-series-4)" }} />
                <span className="an-legend-name">{labelFor(d.name)}</span>
                <span className="an-legend-value">{fmtNum(d.views)}</span>
                <span className="an-legend-pct">{Math.round(((d.views || 0) / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ========================================
// SORTABLE TABLE HEADER
// ========================================

export function SortTh({ id, label, sort, order, onSort, align = "right", title }) {
  const active = sort === id;
  return (
    <th
      className={`an-sortable ${active ? "active" : ""}`}
      style={{ textAlign: align }}
      onClick={() => onSort(id)}
      title={title}
      aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
    >
      {label} {active ? (order === "asc" ? "▲" : "▼") : ""}
    </th>
  );
}
