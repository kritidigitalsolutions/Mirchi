import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart2, ChevronLeft, ChevronRight, Loader, RefreshCw, Search } from "lucide-react";
import {
  CsvButton,
  KpiCard,
  RangePicker,
  SortTh,
  SplitChart,
  TrendChart,
} from "../features/analytics/analyticsShared";
import {
  downloadCsv,
  fmtNum,
  useAnalytics,
  useRangeParams,
} from "../features/analytics/analyticsUtils";
import API from "../api/axios";
import "./Dashboard.css";
import "./Analytics.css";

const TREND_METRICS = [
  { id: "views", label: "Views", format: fmtNum },
  { id: "watchMinutes", label: "Watch time", format: (v) => `${fmtNum(v)} min` },
];

const SERIES_COLUMNS = [
  { key: "title", label: "Series" },
  { key: "views", label: "Views" },
  { key: "watchMinutes", label: "Watch time (min)" },
  { key: "likes", label: "Likes" },
  { key: "shares", label: "Shares" },
  { key: "watchlistAdds", label: "Watchlist adds" },
  { key: "totalEpisodes", label: "Episodes" },
];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { range, from, to, query, update } = useRangeParams();
  const overview = useAnalytics("/admin/analytics/overview", query);

  // Series table state
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("views");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const seriesList = useAnalytics("/admin/analytics/series", { ...query, search: debounced, sort, order, page, limit: 20 });

  const onSort = (id) => {
    if (sort === id) setOrder(order === "desc" ? "asc" : "desc");
    else { setSort(id); setOrder(id === "title" ? "asc" : "desc"); }
    setPage(1);
  };

  const exportSeries = async () => {
    // export every row for the range, not just this page
    const res = await API.get("/admin/analytics/series", { params: { ...query, search: debounced, sort, order, page: 1, limit: 200 } });
    downloadCsv(`series-analytics-${range}.csv`, SERIES_COLUMNS, res.data.series || []);
  };

  const k = overview.data?.kpis || {};
  const change = overview.data?.change || {};
  const pagination = seriesList.data?.pagination;
  const withRange = (path) => `${path}?${new URLSearchParams(query).toString()}`;

  return (
    <div className="page-section an-page">
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><BarChart2 size={28} style={{ display: "inline-block", marginRight: 8 }} /> Content Analytics</h1>
          <p className="pg-sub">Views, watch time and engagement for every series and episode (India time).</p>
        </div>
        <button className="btn btn-ghost" onClick={() => { overview.reload(); seriesList.reload(); }} disabled={overview.loading}>
          <RefreshCw size={16} className={overview.loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      <RangePicker range={range} from={from} to={to} onChange={(patch) => { update(patch); setPage(1); }} />

      {overview.error && <div className="an-error">{overview.error}</div>}

      {/* KPI tiles */}
      <div className="an-kpis">
        <KpiCard label="Views" value={fmtNum(k.views)} change={change.views} sub={`${fmtNum(k.plays)} plays started`} hint="A view counts once someone watches at least 10 seconds" />
        <KpiCard label="Watch time" value={`${fmtNum(k.watchMinutes)} min`} change={change.watchMinutes} />
        <KpiCard label="Likes" value={fmtNum(k.likes)} sub="in this period" />
        <KpiCard label="Shares" value={fmtNum(k.shares)} sub="in this period" />
        <KpiCard label="Watchlist adds" value={fmtNum(k.watchlistAdds)} sub="in this period" />
      </div>

      {overview.loading && !overview.data ? (
        <div className="an-card an-empty" style={{ height: 280 }}><Loader size={20} className="spin" /> Loading…</div>
      ) : (
        <>
          <TrendChart data={overview.data?.trend} title="Viewing trend" metrics={TREND_METRICS} />

          <div className="an-grid-2">
            <div className="an-card">
              <div className="an-card-head"><h3>Top series</h3></div>
              <RankList
                rows={overview.data?.topSeries || []}
                render={(r) => (
                  <Link to={withRange(`/dashboard/analytics/series/${r._id}`)} className="an-rank-title">{r.title}</Link>
                )}
              />
            </div>
            <div className="an-card">
              <div className="an-card-head"><h3>Top episodes</h3></div>
              <RankList
                rows={overview.data?.topEpisodes || []}
                render={(r) => (
                  <Link
                    to={withRange(`/dashboard/analytics/series/${r.seriesId}`) + `&episode=${r._id}`}
                    className="an-rank-title"
                  >
                    {r.seriesTitle} <span className="an-muted">· S{r.seasonNumber} E{r.episodeNumber} {r.title}</span>
                  </Link>
                )}
              />
            </div>
          </div>

          <SplitChart title="Subscribers vs free viewers" data={overview.data?.audience} />
        </>
      )}

      {/* All series table */}
      <div className="an-card">
        <div className="an-card-head">
          <h3>All series</h3>
          <div className="an-card-actions">
            <label className="an-search">
              <Search size={16} />
              <input type="search" placeholder="Search series…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <CsvButton onClick={exportSeries} />
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl an-table">
            <thead>
              <tr>
                <SortTh id="title" label="Series" align="left" sort={sort} order={order} onSort={onSort} />
                <SortTh id="views" label="Views" sort={sort} order={order} onSort={onSort} />
                <SortTh id="watchMinutes" label="Watch time" sort={sort} order={order} onSort={onSort} />
                <SortTh id="likes" label="Likes" sort={sort} order={order} onSort={onSort} />
                <SortTh id="shares" label="Shares" sort={sort} order={order} onSort={onSort} />
                <SortTh id="watchlistAdds" label="Watchlist" sort={sort} order={order} onSort={onSort} />
              </tr>
            </thead>
            <tbody>
              {seriesList.loading && !seriesList.data ? (
                <tr><td colSpan={6} className="an-empty-row"><Loader size={16} className="spin" /> Loading…</td></tr>
              ) : !seriesList.data?.series?.length ? (
                <tr><td colSpan={6} className="an-empty-row">No series found.</td></tr>
              ) : (
                seriesList.data.series.map((s) => (
                  <tr key={s._id} className="an-row-link" onClick={() => navigate(withRange(`/dashboard/analytics/series/${s._id}`))}>
                    <td>
                      <div className="an-title-cell">
                        {s.poster ? <img src={s.poster} alt="" /> : <span className="an-poster-ph" />}
                        <div>
                          <div className="an-strong">{s.title}</div>
                          <div className="an-muted">
                            {s.totalEpisodes} eps{s.isPremium ? " · Premium" : ""}{!s.isPublished ? " · Hidden" : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="num an-strong">{fmtNum(s.views)}</td>
                    <td className="num">{fmtNum(s.watchMinutes)} min</td>
                    <td className="num">{fmtNum(s.likes)}</td>
                    <td className="num">{fmtNum(s.shares)}</td>
                    <td className="num">{fmtNum(s.watchlistAdds)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.total > 0 && (
          <div className="an-pager">
            <span>Page {pagination.currentPage} of {pagination.totalPages} · {pagination.total} series</span>
            <div>
              <button className="btn btn-ghost" onClick={() => setPage((p) => p - 1)} disabled={pagination.currentPage === 1}>
                <ChevronLeft size={16} /> Previous
              </button>
              <button className="btn btn-ghost" onClick={() => setPage((p) => p + 1)} disabled={pagination.currentPage === pagination.totalPages}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Ranked list with an inline magnitude bar (one hue = magnitude)
function RankList({ rows, render }) {
  if (!rows.length) return <div className="an-empty" style={{ height: 160 }}>No views in this period</div>;
  const max = Math.max(...rows.map((r) => r.views), 1);
  return (
    <ol className="an-rank">
      {rows.map((r, i) => (
        <li key={r._id}>
          <span className="an-rank-n">{i + 1}</span>
          <div className="an-rank-body">
            {render(r)}
            <div className="an-rank-bar"><span style={{ width: `${(r.views / max) * 100}%` }} /></div>
          </div>
          <div className="an-rank-stats">
            <strong>{fmtNum(r.views)}</strong>
            <span className="an-muted">{fmtNum(r.watchMinutes)} min</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
