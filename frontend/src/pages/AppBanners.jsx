import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Plus, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { useToast } from "../App";
import "./Dashboard.css";
import "./AppBanners.css";

const MAX_IMAGE_MB = 5;

/* =======================================================
   APP BANNERS PAGE
   Manages the banner image of every movie / series
   (the one uploaded in Add Content > Media Assets).
   ======================================================= */

export default function AppBanners() {
  return (
    <div className="ab-page">
      <div className="ab-header">
        <div>
          <h1 className="pg-title">App Banners</h1>
          <p className="pg-sub">Banner images of your movies and series, as uploaded in Add Content. Replace, add or remove them here.</p>
        </div>
      </div>
      <ContentBannersSection />
    </div>
  );
}

/* =======================================================
   CONTENT BANNERS
   Banner image uploaded on each movie / series in Add Content.
   ======================================================= */

const CONTENT_FILTERS = [
  { id: "all", label: "All" },
  { id: "with", label: "With banner" },
  { id: "missing", label: "Missing banner" },
];

const CONTENT_LIMIT = 12;

function ContentBannersSection() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const targetRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/app-banners/content");
      setItems(res.data?.items || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load content banners", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const withB = items.filter((i) => i.banner).length;
    return { all: items.length, with: withB, missing: items.length - withB };
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === "with" && !i.banner) return false;
      if (filter === "missing" && i.banner) return false;
      return !q || i.title?.toLowerCase().includes(q);
    });
  }, [items, filter, query]);

  const visible = showAll ? shown : shown.slice(0, CONTENT_LIMIT);

  const pickFor = (item) => {
    targetRef.current = item;
    fileRef.current?.click();
  };

  const upload = async (file) => {
    const item = targetRef.current;
    if (!file || !item) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.type)) return showToast("Use a JPG, PNG or WebP image", "error");
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return showToast(`Image must be under ${MAX_IMAGE_MB} MB`, "error");
    setBusyId(item._id);
    try {
      const fd = new FormData();
      fd.append("banner", file);
      const res = await API.patch(`/admin/app-banners/content/${item.contentType}/${item._id}`, fd);
      setItems((list) => list.map((x) => (x._id === item._id ? { ...x, banner: res.data.banner } : x)));
      showToast(`Banner updated for "${item.title}"`, "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to upload banner", "error");
    } finally {
      setBusyId(null);
      targetRef.current = null;
    }
  };

  const remove = async () => {
    const item = confirmRemove;
    setBusyId(item._id);
    try {
      await API.delete(`/admin/app-banners/content/${item.contentType}/${item._id}`);
      setItems((list) => list.map((x) => (x._id === item._id ? { ...x, banner: "" } : x)));
      showToast(`Banner removed from "${item.title}"`, "success");
      setConfirmRemove(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to remove banner", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="ab-section">
      <div className="ab-section-head">
        <div>
          <h2 className="ab-section-title">
            Content banners <span className="ab-filter-count">{counts.with}</span>
          </h2>
          <p className="ab-section-sub">Click Upload or Replace on any title to change its banner.</p>
        </div>
        <div className="ab-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/dashboard/add-content")}>
            <Plus size={14} /> Add Content
          </button>
        </div>
      </div>

      <div className="ab-toolbar">
        <div className="ab-filters" role="tablist">
          {CONTENT_FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className={`ab-filter ${filter === f.id ? "active" : ""}`}
              onClick={() => { setFilter(f.id); setShowAll(false); }}
            >
              {f.label} <span className="ab-filter-count">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="ab-search ab-toolbar-search">
          <Search size={16} className="ab-search-icon" />
          <input
            className="form-input-styled"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowAll(false); }}
            placeholder="Search title"
          />
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="ab-grid-cards">
          {[0, 1, 2, 3].map((i) => <div key={i} className="ab-card ab-skeleton" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="ab-empty ab-empty-sm"><p>{items.length ? "No titles match." : "No movies or series yet."}</p></div>
      ) : (
        <>
          <div className="ab-grid-cards">
            {visible.map((i) => {
              const hidden = i.isPublished === false || i.isHide === true;
              const busy = busyId === i._id;
              return (
                <div key={i._id} className="ab-card">
                  <div className="ab-card-img">
                    {i.banner ? (
                      <img src={i.banner} alt="" loading="lazy" />
                    ) : (
                      <button type="button" className="ab-card-missing" onClick={() => pickFor(i)} disabled={busy}>
                        <ImagePlus size={22} />
                        <span>No banner. Upload one</span>
                      </button>
                    )}
                    {busy && <div className="ab-card-busy">Saving...</div>}
                  </div>
                  <div className="ab-card-body">
                    <div className="ab-card-title" title={i.title}>{i.title}</div>
                    <div className="ab-card-meta">
                      <span>{i.contentType === "series" ? "Series" : "Movie"}</span>
                      {hidden && (
                        <>
                          <span className="ab-dot" aria-hidden="true" />
                          <span>{i.isPublished === false ? "Unpublished" : "Hidden"}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ab-card-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => pickFor(i)} disabled={busy}>
                      <Upload size={14} /> {i.banner ? "Replace" : "Upload"}
                    </button>
                    {i.banner && (
                      <button className="icon-btn del" title="Remove banner" aria-label="Remove banner" onClick={() => setConfirmRemove(i)} disabled={busy}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {shown.length > CONTENT_LIMIT && (
            <div className="ab-more">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Show less" : `Show all ${shown.length}`}
              </button>
            </div>
          )}
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }}
      />

      {confirmRemove && (
        <div className="modal-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Remove banner</h3>
              <button className="modal-close" onClick={() => setConfirmRemove(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="ab-confirm-text">
                Remove the banner image from <strong>{confirmRemove.title}</strong>? The title stays, but the app will use its poster where the banner was shown.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setConfirmRemove(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={remove} disabled={busyId === confirmRemove._id}>
                <Trash2 size={16} /> {busyId === confirmRemove._id ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
