import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../../api/axios";

// ========================================
// RANGE (kept in the URL so back/forward and shared links keep it)
// ========================================

export const RANGE_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This week (Mon–Sun)" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
];

export const todayIso = () => {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
};

export function useRangeParams() {
  const [params, setParams] = useSearchParams();
  const range = RANGE_OPTIONS.some((r) => r.id === params.get("range")) ? params.get("range") : "week";
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  const update = useCallback(
    (patch) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      if (patch.range && patch.range !== "custom") {
        next.delete("from");
        next.delete("to");
      }
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const query = range === "custom" ? { range, from, to } : { range };
  return { range, from, to, query, update };
}

// ========================================
// DATA FETCHING
// ========================================

export function useAnalytics(url, params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const key = url ? `${url}?${new URLSearchParams(params || {}).toString()}` : "";

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    try {
      const res = await API.get(url, { params });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load analytics");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

// ========================================
// FORMATTERS
// ========================================

export const fmtNum = (n) => (Number(n) || 0).toLocaleString("en-IN");

export const fmtDuration = (sec) => {
  const s = Math.round(Number(sec) || 0);
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
};

export const fmtPct = (n) => (n === null || n === undefined ? "—" : `${n}%`);

export const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })
    : "—";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Bucket keys from the API: "YYYY-MM-DD HH:00" | "YYYY-MM-DD" | "YYYY-MM"
export const bucketLabel = (key = "") => {
  const [date, time] = key.split(" ");
  const [y, m, d] = date.split("-");
  if (time) {
    const h = Number(time.slice(0, 2));
    return `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
  }
  if (d) return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
  return `${MONTHS[Number(m) - 1]} ${String(y).slice(2)}`;
};

export const PLATFORM_LABELS = { android: "Android", ios: "iOS", web: "Web", other: "Other" };

// Fixed categorical order (validated palette slots 1-4) - colour follows the
// entity, never its rank.
export const CATEGORY_SLOTS = {
  android: "var(--an-series-1)",
  ios: "var(--an-series-2)",
  web: "var(--an-series-3)",
  other: "var(--an-series-4)",
  Subscribers: "var(--an-series-1)",
  "Free / guests": "var(--an-series-2)",
};

// ========================================
// CSV EXPORT (client side)
// ========================================

export function downloadCsv(filename, columns, rows) {
  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.map((c) => escape(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => escape(c.csv ? c.csv(row) : row[c.key])).join(",")),
  ];
  const BOM = String.fromCharCode(0xfeff); // lets Excel open the CSV as UTF-8
  const blob = new Blob([BOM + lines.join(String.fromCharCode(10))], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
