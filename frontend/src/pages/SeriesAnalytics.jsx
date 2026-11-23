import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader, X } from "lucide-react";
import {
  CsvButton,
  KpiCard,
  RangePicker,
  SplitChart,
  TrendChart,
} from "../features/analytics/analyticsShared";
import {
  PLATFORM_LABELS,
  downloadCsv,
  fmtDateTime,
  fmtDuration,
  fmtNum,
  fmtPct,
  useAnalytics,
  useRangeParams,
} from "../features/analytics/analyticsUtils";
import "./Dashboard.css";
import "./Analytics.css";

const EPISODE_COLUMNS = [
  { key: "seasonNumber", label: "Season" },
  { key: "episodeNumber", label: "Episode" },
  { key: "title", label: "Title" },
  { key: "views", label: "Views" },
  { key: "uniqueViewers", label: "Unique viewers" },
  { key: "watchMinutes", label: "Watch time (min)" },
  { key: "avgWatchSec", label: "Avg watch / view (sec)" },
  { key: "avgWatchedPct", label: "Avg % watched" },
  { key: "completionRate", label: "Completion %" },
  { key: "reachPct", label: "Reach % of Ep 1 viewers" },
];

const epLabel = (e) => `S${e.seasonNumber} E${e.episodeNumber}`;

function SimpleTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="an-tooltip">
      <div className="an-tooltip-label">{label}</div>
      <div className="an-tooltip-row">
        <span className="an-swatch" style={{ background: "var(--an-series-1)" }} />
        <span>{payload[0].name}</span>
        <strong>{format ? format(payload[0].value) : payload[0].value}</strong>
      </div>
    </div>
  );
}

export default function SeriesAnalytics() {
  const { id } = useParams();
  const { range, from, to, query, update } = useRangeParams();
  const [params, setParams] = useSearchParams();
  const episodeId = params.get("episode");
  const { data, loading, error } = useAnalytics(`/admin/analytics/series/${id}`, query);

  const openEpisode = (epId) => {
    const next = new URLSearchParams(params);
    if (epId) next.set("episode", epId);
    else next.delete("episode");
    setParams(next, { replace: true });
  };

  const k = data?.kpis || {};
  const change = data?.change || {};
  const episodes = data?.episodes || [];
  const funnel = episodes.map((e) => ({ name: epLabel(e), viewers: e.uniqueViewers, reachPct: e.reachPct }));
  const backQuery = new URLSearchParams(query).toString();

  return (
    <div className="page-section an-page">
      <Link to={`/dashboard/analytics?${backQuery}`} className="an-back"><ArrowLeft size={16} /> All series</Link>

      <div className="pg-header">
        <div className="an-title-cell an-title-lg">
          {data?.series?.poster ? <img src={data.series.poster} alt="" /> : <span className="an-poster-ph" />}
          <div>
            <h1 className="pg-title">{data?.series?.title || (loading ? "Loading…" : "Series")}</h1>
            {data?.series && (
              <p className="pg-sub">
                {data.series.totalEpisodes} episodes{data.series.isPremium ? " · Premium" : ""} · all-time {fmtNum(data.series.allTime?.views)} views,{" "}
                {fmtNum(Math.round((data.series.allTime?.watchTimeSec || 0) / 60))} min watch time
              </p>
            )}
          </div>
        </div>
      </div>

      <RangePicker range={range} from={from} to={to} onChange={update} />
      {error && <div className="an-error">{error}</div>}

      <div className="an-kpis">
        <KpiCard label="Views" value={fmtNum(k.views)} change={change.views} sub={`${fmtNum(k.plays)} plays started`} />
        <KpiCard label="Unique viewers" value={fmtNum(k.uniqueViewers)} change={change.uniqueViewers} />
        <KpiCard label="Watch time" value={`${fmtNum(k.watchMinutes)} min`} change={change.watchMinutes} sub={`${fmtDuration(k.avgWatchSec)} avg per view`} />
        <KpiCard label="Completion rate" value={fmtPct(k.completionRate)} change={change.completionRate} sub={k.avgWatchedPct !== null && k.avgWatchedPct !== undefined ? `${k.avgWatchedPct}% watched on average` : null} />
        <KpiCard label="Likes" value={fmtNum(k.likes)} sub="in this period" />
        <KpiCard label="Shares" value={fmtNum(k.shares)} sub="in this period" />
        <KpiCard label="Watchlist adds" value={fmtNum(k.watchlistAdds)} sub="in this period" />
      </div>

      {loading && !data ? (
        <div className="an-card an-empty" style={{ height: 280 }}><Loader size={20} className="spin" /> Loading…</div>
      ) : (
        <>
          <TrendChart data={data?.trend} title="Viewing trend" />

          <div className="an-card">
            <div className="an-card-head">
              <h3>Viewer drop-off by episode</h3>
              <span className="an-muted">Unique viewers per episode. Shows where people stop watching the series.</span>
            </div>
            {!funnel.some((f) => f.viewers) ? (
              <div className="an-empty" style={{ height: 220 }}>No views in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={funnel} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    cursor={{ fill: "var(--border)" }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="an-tooltip">
                          <div className="an-tooltip-label">{label}</div>
                          <div className="an-tooltip-row"><span className="an-swatch" style={{ background: "var(--an-series-1)" }} /><span>Unique viewers</span><strong>{fmtNum(payload[0].value)}</strong></div>
                          <div className="an-tooltip-row"><span /><span>Reach vs Ep 1</span><strong>{payload[0].payload.reachPct}%</strong></div>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="viewers" name="Unique viewers" fill="var(--an-series-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="an-card">
            <div className="an-card-head">
              <h3>Episodes</h3>
              <CsvButton onClick={() => downloadCsv(`${data?.series?.title || "series"}-episodes-${range}.csv`, EPISODE_COLUMNS, episodes)} />
            </div>
            <div className="tbl-wrap">
              <table className="tbl an-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Episode</th>
                    <th>Views</th>
                    <th>Unique</th>
                    <th>Watch time</th>
                    <th>Avg / view</th>
                    <th title="Average share of the episode watched">Avg watched</th>
                    <th>Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {!episodes.length ? (
                    <tr><td colSpan={7} className="an-empty-row">No episodes yet.</td></tr>
                  ) : (
                    episodes.map((e) => (
                      <tr key={e._id} className="an-row-link" onClick={() => openEpisode(e._id)}>
                        <td>
                          <div className="an-strong">{epLabel(e)}</div>
                          <div className="an-muted an-ellipsis">{e.title}</div>
                        </td>
                        <td className="num an-strong">{fmtNum(e.views)}</td>
                        <td className="num">{fmtNum(e.uniqueViewers)}</td>
                        <td className="num">{fmtNum(e.watchMinutes)} min</td>
                        <td className="num">{fmtDuration(e.avgWatchSec)}</td>
                        <td className="num">{fmtPct(e.avgWatchedPct)}</td>
                        <td className="num">{fmtPct(e.completionRate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <SplitChart title="Subscribers vs free viewers" data={data?.audience} />
        </>
      )}

      {episodeId && <EpisodeDrawer episodeId={episodeId} query={query} onClose={() => openEpisode(null)} />}
    </div>
  );
}

// ========================================
// EPISODE DRAWER
// ========================================

function EpisodeDrawer({ episodeId, query, onClose }) {
  const [tab, setTab] = useState("tracked");
  const [page, setPage] = useState(1);
  const { data, loading, error } = useAnalytics(`/admin/analytics/episodes/${episodeId}`, { ...query, page, limit: 15 });
  const bunnyParams = query.range === "custom" ? { from: query.from, to: query.to } : {};
  const bunny = useAnalytics(tab === "bunny" ? `/admin/analytics/bunny/${episodeId}` : null, bunnyParams);

  const k = data?.kpis || {};
  const ep = data?.episode;
  const vp = data?.viewersPagination;

  return (
    <div className="an-drawer-overlay" onClick={onClose}>
      <aside className="an-drawer" onClick={(e) => e.stopPropagation()} aria-label="Episode analytics">
        <div className="an-drawer-head">
          <div>
            <div className="an-muted">{data?.series?.title}</div>
            <h3>{ep ? `S${ep.seasonNumber} E${ep.episodeNumber} · ${ep.title}` : "Episode"}</h3>
            {ep && (
              <div className="an-muted">
                Length {ep.durationSec ? fmtDuration(ep.durationSec) : ep.duration || "unknown"} · all-time {fmtNum(ep.allTime?.views)} views
              </div>
            )}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>

        <div className="an-toggle an-drawer-tabs" role="tablist">
          <button type="button" className={tab === "tracked" ? "active" : ""} onClick={() => setTab("tracked")}>In-app tracking</button>
          <button type="button" className={tab === "bunny" ? "active" : ""} onClick={() => setTab("bunny")}>Bunny Stream stats</button>
        </div>

        {tab === "tracked" ? (
          loading && !data ? (
            <div className="an-empty" style={{ height: 200 }}><Loader size={18} className="spin" /> Loading…</div>
          ) : error ? (
            <div className="an-error">{error}</div>
          ) : (
            <>
              <div className="an-kpis an-kpis-sm">
                <KpiCard label="Views" value={fmtNum(k.views)} sub={`${fmtNum(k.plays)} plays`} />
                <KpiCard label="Unique viewers" value={fmtNum(k.uniqueViewers)} />
                <KpiCard label="Watch time" value={`${fmtNum(k.watchMinutes)} min`} sub={`${fmtDuration(k.avgWatchSec)} / view`} />
                <KpiCard label="Completion" value={fmtPct(k.completionRate)} />
                <KpiCard label="Shares" value={fmtNum(k.shares)} />
              </div>

              <TrendChart data={data?.trend} title="Trend" height={200} />

              <div className="an-card">
                <div className="an-card-head">
                  <h3>Audience retention</h3>
                  <span className="an-muted">% of plays still watching at each point</span>
                </div>
                {!data?.retention?.[0]?.pct ? (
                  <div className="an-empty" style={{ height: 180 }}>Needs plays with a known episode length</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data.retention} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="position" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} unit="%" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={52} />
                      <Tooltip content={<SimpleTooltip format={(v) => `${v}%`} />} cursor={{ stroke: "var(--border2)" }} />
                      <Line type="linear" dataKey="pct" name="Still watching" stroke="var(--an-series-1)" strokeWidth={2} dot={{ r: 4, fill: "var(--an-series-1)", strokeWidth: 0 }} activeDot={{ r: 6, stroke: "var(--bg2)", strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>


              <div className="an-card">
                <div className="an-card-head"><h3>Recent viewers</h3></div>
                <div className="tbl-wrap">
                  <table className="tbl an-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Viewer</th>
                        <th style={{ textAlign: "left" }}>When</th>
                        <th>Watched</th>
                        <th>Reached</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!data?.viewers?.length ? (
                        <tr><td colSpan={4} className="an-empty-row">No plays in this period.</td></tr>
                      ) : (
                        data.viewers.map((v) => (
                          <tr key={v._id}>
                            <td>
                              <div className="an-strong">{v.user?.name || (v.guest ? "Guest" : "Deleted user")}</div>
                              <div className="an-muted">
                                {v.user?.phone || ""} {PLATFORM_LABELS[v.platform] || v.platform}{v.isSubscriber ? " · Subscriber" : ""}
                              </div>
                            </td>
                            <td className="an-nowrap">{fmtDateTime(v.startedAt)}</td>
                            <td className="num">{fmtDuration(v.watchedSec)}</td>
                            <td className="num">
                              {v.completed ? "Completed" : fmtPct(v.watchedPct)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {vp && vp.totalPages > 1 && (
                  <div className="an-pager">
                    <span>Page {vp.currentPage} of {vp.totalPages} · {fmtNum(vp.total)} plays</span>
                    <div>
                      <button className="btn btn-ghost" onClick={() => setPage((p) => p - 1)} disabled={vp.currentPage === 1}><ChevronLeft size={16} /></button>
                      <button className="btn btn-ghost" onClick={() => setPage((p) => p + 1)} disabled={vp.currentPage === vp.totalPages}><ChevronRight size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )
        ) : (
          <BunnyPanel state={bunny} />
        )}
      </aside>
    </div>
  );
}

function BunnyPanel({ state }) {
  const { data, loading, error } = state;
  if (loading && !data) return <div className="an-empty" style={{ height: 200 }}><Loader size={18} className="spin" /> Loading Bunny stats…</div>;
  if (error) return <div className="an-error">{error}</div>;
  if (!data?.available) return <div className="an-empty" style={{ height: 160 }}>{data?.message || "Not available"}</div>;

  return (
    <>
      <p className="an-muted an-note">
        Numbers reported by Bunny Stream for {data.dateFrom} to {data.dateTo} (last 30 days by default; use a custom range to change it).
        Includes plays from before in-app tracking went live, with no per-user detail.
      </p>
      <div className="an-kpis an-kpis-sm">
        <KpiCard label="Views (Bunny)" value={fmtNum(data.totals?.views)} />
        <KpiCard label="Watch time (Bunny)" value={`${fmtNum(data.totals?.watchMinutes)} min`} />
      </div>
      <TrendChart
        data={data.chart}
        title="Bunny daily trend"
        height={200}
        metrics={[
          { id: "views", label: "Views", format: fmtNum },
          { id: "watchMinutes", label: "Watch time", format: (v) => `${fmtNum(v)} min` },
        ]}
      />
      {!!data.countries?.length && (
        <div className="an-card">
          <div className="an-card-head"><h3>Top countries</h3></div>
          <ul className="an-legend an-legend-block">
            {data.countries.map((c) => (
              <li key={c.country}>
                <span className="an-legend-name">{c.country}</span>
                <span className="an-legend-value">{fmtNum(c.views)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
