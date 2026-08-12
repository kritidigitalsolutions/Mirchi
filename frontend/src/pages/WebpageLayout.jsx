import { useState, useEffect, useRef } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import "./WebpageLayout.css";
import {
  Plus, Trash2, ChevronLeft, ChevronRight, Search, Check, X,
  LayoutGrid, Save, AlertCircle, PlayCircle, Sliders, ChevronDown, ChevronUp
} from "lucide-react";

export default function WebpageLayout() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("banners");

  const [heroBanners, setHeroBanners] = useState([]);
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [contentList, setContentList] = useState([]);

  const [bannerSearch, setBannerSearch] = useState("");
  const [bannerSearchResults, setBannerSearchResults] = useState([]);
  const [showBannerDropdown, setShowBannerDropdown] = useState(false);
  const bannerSearchRef = useRef(null);

  const [newSectionCategorySlug, setNewSectionCategorySlug] = useState("");
  const [expandedSections, setExpandedSections] = useState({});
  const [sectionSearches, setSectionSearches] = useState({});

  /* ── Load data ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [configRes, catRes, contentRes] = await Promise.all([
          API.get("/admin/webpage"),
          API.get("/admin/categories"),
          API.get("/admin/content/all"),
        ]);

        if (configRes.data?.success && configRes.data?.config) {
          const cfg = configRes.data.config;
          const cleanBanners = (cfg.heroBanners || []).filter(
            b => b.contentId && b.contentId.is18plus !== true
          );
          const cleanSections = (cfg.sections || []).map(s => ({
            ...s,
            items: (s.items || []).filter(
              item => item.contentId && item.contentId.is18plus !== true
            )
          }));
          setHeroBanners(cleanBanners);
          setSections(cleanSections);
          if (cleanSections.length > 0)
            setExpandedSections({ [cleanSections[0].categorySlug]: true });
        }
        if (catRes.data?.data)
          setCategories(catRes.data.data.filter(c => c.isActive !== false));
        if (contentRes.data?.success)
          setContentList(
            (contentRes.data.content || []).filter(
              i => i.isPublished !== false && i.isHide !== true && i.is18plus !== true
            )
          );
      } catch (err) {
        console.error(err);
        showToast("Failed to load layout config", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Close banner dropdown on outside click ── */
  useEffect(() => {
    const handler = e => {
      if (bannerSearchRef.current && !bannerSearchRef.current.contains(e.target))
        setShowBannerDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const imgUrl = url => (!url ? "" : url);

  /* ── Banner helpers ── */
  const onBannerSearch = e => {
    const q = e.target.value;
    setBannerSearch(q);
    if (!q.trim()) { setBannerSearchResults([]); setShowBannerDropdown(false); return; }
    const res = contentList.filter(
      i => i.title.toLowerCase().includes(q.toLowerCase()) &&
        !heroBanners.some(b => String(b.contentId?._id || b.contentId) === String(i._id))
    ).slice(0, 10);
    setBannerSearchResults(res);
    setShowBannerDropdown(true);
  };

  const addBanner = item => {
    setHeroBanners(prev => [...prev, { contentType: item.contentType === "movie" ? "Movie" : "Series", contentId: item }]);
    setBannerSearch(""); setBannerSearchResults([]); setShowBannerDropdown(false);
    showToast(`Added "${item.title}" to banners`, "success");
  };

  const removeBanner = idx => setHeroBanners(prev => prev.filter((_, i) => i !== idx));

  const swap = (arr, i, dir) => {
    const a = [...arr], j = i + dir;
    if (j < 0 || j >= a.length) return a;
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  };

  /* ── Section helpers ── */
  const addSection = slug => {
    if (!slug) return;
    if (sections.some(s => s.categorySlug === slug)) { showToast("Section already exists", "error"); return; }
    const cat = categories.find(c => c.slug === slug);
    setSections(prev => [...prev, { categorySlug: slug, title: cat ? cat.name : slug, items: [] }]);
    setExpandedSections(prev => ({ ...prev, [slug]: true }));
    showToast(`Added section: ${cat?.name || slug}`, "success");
  };

  const removeSection = (idx, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setSections(prev => prev.filter((_, i) => i !== idx));
    showToast("Section row removed. Click 'Publish Layout' to save changes.", "success");
  };

  const toggleSection = slug =>
    setExpandedSections(prev => ({ ...prev, [slug]: !prev[slug] }));

  const toggleItem = (secIdx, item, removing) => {
    setSections(prev => {
      const next = [...prev];
      const sec = { ...next[secIdx], items: [...next[secIdx].items] };
      if (removing) {
        sec.items = sec.items.filter(
          x => String(x.contentId?._id || x.contentId) !== String(item._id)
        );
      } else {
        sec.items = [...sec.items, {
          contentType: item.contentType === "movie" ? "Movie" : "Series",
          contentId: item,
        }];
      }
      next[secIdx] = sec;
      return next;
    });
  };

  const moveSectionItem = (secIdx, itemIdx, dir, e) => {
    e.stopPropagation();
    setSections(prev => {
      const next = [...prev];
      const sec = { ...next[secIdx], items: swap(next[secIdx].items, itemIdx, dir) };
      next[secIdx] = sec;
      return next;
    });
  };

  /* ── Save ── */
  const saveLayout = async () => {
    setSaving(true);
    try {
      const payload = {
        heroBanners: heroBanners.map(b => ({
          contentType: b.contentType,
          contentId: b.contentId?._id || b.contentId,
        })),
        sections: sections.map(s => ({
          categorySlug: s.categorySlug,
          title: s.title,
          items: s.items.map(i => ({
            contentType: i.contentType,
            contentId: i.contentId?._id || i.contentId,
          })),
        })),
      };
      const res = await API.post("/admin/webpage", payload);
      if (res.data?.success) {
        showToast("Layout saved!", "success");
        if (res.data.config) {
          setHeroBanners(res.data.config.heroBanners || []);
          setSections(res.data.config.sections || []);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Curator grid renderer ── */
  const renderCurator = (sec, secIdx) => {
    const slug = sec.categorySlug;
    const searchQ = sectionSearches[slug] || "";
    let connected = contentList.filter(i => Array.isArray(i.category) && i.category.includes(slug));

    if (connected.length === 0)
      return (
        <div className="wl-empty-connected">
          <AlertCircle size={18} />
          <span>No published content tagged with <code>{slug}</code>. Tag content from the Content Library first.</span>
        </div>
      );

    const selectedIds = new Set(sec.items.map(x => String(x.contentId?._id || x.contentId)));
    const selectedList = sec.items
      .map(x => connected.find(c => String(c._id) === String(x.contentId?._id || x.contentId)))
      .filter(Boolean);
    let unselected = connected.filter(c => !selectedIds.has(String(c._id)));
    if (searchQ.trim())
      unselected = unselected.filter(c => c.title.toLowerCase().includes(searchQ.toLowerCase()));

    return (
      <div className="wl-curator">
        <div className="wl-curator-toolbar">
          <span className="wl-count-label">{selectedList.length} selected for this row</span>
          <div className="search-bar wl-mini-search">
            <Search size={13} className="search-icon" />
            <input className="search-input" placeholder="Filter available content…"
              value={searchQ}
              onChange={e => setSectionSearches(p => ({ ...p, [slug]: e.target.value }))} />
            {searchQ && <button className="search-clear" onClick={() => setSectionSearches(p => ({ ...p, [slug]: "" }))}><X size={12} /></button>}
          </div>
        </div>

        <div className="wl-grid">
          {/* ── Selected ── */}
          {selectedList.map((item, idx) => (
            <div key={item._id} className="wl-card wl-card--selected">
              <div className="wl-card-media" onClick={() => toggleItem(secIdx, item, true)} title="Click to deselect">
                <img src={imgUrl(item.poster)} alt="" className="wl-poster" />
                <div className="wl-card-badge wl-card-badge--check"><Check size={10} /></div>
                <div className="wl-card-pos">#{idx + 1}</div>
              </div>
              <div className="wl-card-body">
                <p className="wl-card-title">{item.title}</p>
                <div className="wl-card-foot">
                  <span className={`wl-type ${item.contentType}`}>{item.contentType}</span>
                  <div className="wl-reorder">
                    <button className="wl-arrow" disabled={idx === 0}
                      onClick={e => moveSectionItem(secIdx, idx, -1, e)}><ChevronLeft size={13} /></button>
                    <button className="wl-arrow" disabled={idx === selectedList.length - 1}
                      onClick={e => moveSectionItem(secIdx, idx, 1, e)}><ChevronRight size={13} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* ── Unselected ── */}
          {unselected.map(item => (
            <div key={item._id} className="wl-card wl-card--dim">
              <div className="wl-card-media" onClick={() => toggleItem(secIdx, item, false)} title="Click to add">
                <img src={imgUrl(item.poster)} alt="" className="wl-poster" />
                <div className="wl-card-badge wl-card-badge--add"><Plus size={10} /></div>
              </div>
              <div className="wl-card-body">
                <p className="wl-card-title">{item.title}</p>
                <div className="wl-card-foot">
                  <span className={`wl-type ${item.contentType}`}>{item.contentType}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ── Loading screen ── */
  if (loading)
    return (
      <div className="wl-loading">
        <div className="wl-spinner" />
        <p>Loading layout…</p>
      </div>
    );

  /* ── Main render ── */
  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sliders size={28} style={{ color: "var(--primary)" }} />
            Webpage Layout Manager
          </h1>
          <p className="pg-sub">Configure the hero slider and carousel rows shown on the website.</p>
        </div>
        <button className="btn btn-primary wl-save-btn" onClick={saveLayout} disabled={saving}>
          {saving ? <><div className="wl-spinner-sm" /> Saving…</> : <><Save size={16} /> Publish Layout</>}
        </button>
      </div>

      {/* Tab bar */}
      <div className="wl-tabs">
        <button className={`wl-tab ${activeTab === "banners" ? "active" : ""}`} onClick={() => setActiveTab("banners")}>
          <PlayCircle size={16} /> Hero Banners <span className="wl-tab-count">{heroBanners.length}</span>
        </button>
        <button className={`wl-tab ${activeTab === "sections" ? "active" : ""}`} onClick={() => setActiveTab("sections")}>
          <LayoutGrid size={16} /> Carousel Rows <span className="wl-tab-count">{sections.length}</span>
        </button>
      </div>

      {/* ══ Tab: Banners ══ */}
      {activeTab === "banners" && (
        <div className="wl-panel">
          {/* Search */}
          <div className="wl-search-card">
            <div className="wl-search-card-info">
              <h3>Hero Slider Banners</h3>
              <p>Select movies or series to appear in the top hero slider on the website.</p>
            </div>
            <div className="search-wrapper" ref={bannerSearchRef}>
              <div className="search-bar wl-banner-search">
                <Search size={16} className="search-icon" />
                <input className="search-input" type="text"
                  placeholder="Search to add a movie or series…"
                  value={bannerSearch} onChange={onBannerSearch}
                  onFocus={() => bannerSearch.trim() && setShowBannerDropdown(true)} />
                {bannerSearch && <button className="search-clear" onClick={() => { setBannerSearch(""); setBannerSearchResults([]); }}><X size={15} /></button>}
              </div>
              {showBannerDropdown && bannerSearchResults.length > 0 && (
                <div className="wl-dropdown">
                  {bannerSearchResults.map(item => (
                    <div key={item._id} className="wl-dropdown-row" onClick={() => addBanner(item)}>
                      <img src={imgUrl(item.poster)} alt="" className="wl-dropdown-img" />
                      <div>
                        <div className="wl-dropdown-title">{item.title}</div>
                        <span className={`wl-type ${item.contentType}`}>{item.contentType}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Banner Cards */}
          {heroBanners.length === 0
            ? (
              <div className="wl-empty">
                <PlayCircle size={44} />
                <h4>No banners yet</h4>
                <p>Use the search above to add movies or series to the hero slider.</p>
              </div>
            )
            : (
              <div className="wl-banner-grid">
                {heroBanners.map((banner, idx) => {
                  const item = banner.contentId;
                  if (!item) return null;
                  return (
                    <div key={idx} className="wl-banner-card">
                      <div className="wl-banner-img" style={{ backgroundImage: `url(${imgUrl(item.banner || item.poster)})` }}>
                        <span className="wl-banner-num">0{idx + 1}</span>
                        <span className={`wl-type wl-type-abs ${(banner.contentType || "").toLowerCase()}`}>
                          {(banner.contentType || "").toUpperCase()}
                        </span>
                      </div>
                      <div className="wl-banner-foot">
                        <span className="wl-banner-title">{item.title}</span>
                        <div className="wl-banner-actions">
                          <button className="wl-arrow" disabled={idx === 0}
                            onClick={() => setHeroBanners(p => swap(p, idx, -1))}>
                            <ChevronLeft size={15} />
                          </button>
                          <button className="wl-arrow" disabled={idx === heroBanners.length - 1}
                            onClick={() => setHeroBanners(p => swap(p, idx, 1))}>
                            <ChevronRight size={15} />
                          </button>
                          <button className="wl-arrow wl-arrow--del" onClick={() => removeBanner(idx)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}

      {/* ══ Tab: Sections ══ */}
      {activeTab === "sections" && (
        <div className="wl-panel">
          {/* Add section toolbar */}
          <div className="wl-search-card wl-sections-toolbar">
            <div className="wl-search-card-info">
              <h3>Carousel Rows</h3>
              <p>Each row is linked to a category. Select a category to add a new row, then pick which items appear in it.</p>
            </div>
            <select className="wl-select" value={newSectionCategorySlug}
              onChange={e => { addSection(e.target.value); setNewSectionCategorySlug(""); }}>
              <option value="" disabled>+ Add row for category…</option>
              {categories
                .filter(c => !sections.some(s => s.categorySlug === c.slug))
                .map(c => <option key={c._id} value={c.slug}>{c.name}</option>)}
            </select>
          </div>

          {sections.length === 0
            ? (
              <div className="wl-empty">
                <LayoutGrid size={44} />
                <h4>No carousel rows yet</h4>
                <p>Add a row using the category dropdown above.</p>
              </div>
            )
            : (
              <div className="wl-accordion-stack">
                {sections.map((sec, idx) => {
                  const open = !!expandedSections[sec.categorySlug];
                  return (
                    <div key={sec.categorySlug} className={`wl-accordion ${open ? "wl-accordion--open" : ""}`}>
                      {/* Header */}
                      <div className="wl-accordion-header" onClick={() => toggleSection(sec.categorySlug)}>
                        <LayoutGrid size={18} className="wl-acc-icon" />
                        <div className="wl-acc-meta">
                          <input className="wl-acc-title-input"
                            value={sec.title}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setSections(p => p.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                            placeholder="Row title" />
                          <span className="wl-acc-slug">Category: <code>{sec.categorySlug}</code></span>
                        </div>
                        <div className="wl-acc-controls">
                          <button className="wl-arrow" disabled={idx === 0}
                            onClick={e => { e.stopPropagation(); setSections(p => swap(p, idx, -1)); }}>
                            <ChevronUp size={15} />
                          </button>
                          <button className="wl-arrow" disabled={idx === sections.length - 1}
                            onClick={e => { e.stopPropagation(); setSections(p => swap(p, idx, 1)); }}>
                            <ChevronDown size={15} />
                          </button>
                          <button type="button" className="wl-arrow wl-arrow--del" onClick={e => { e.stopPropagation(); removeSection(idx, e); }}>
                            <Trash2 size={15} />
                          </button>
                          <ChevronDown size={18} className={`wl-acc-chevron ${open ? "wl-acc-chevron--up" : ""}`} />
                        </div>
                      </div>
                      {/* Body */}
                      {open && <div className="wl-accordion-body">{renderCurator(sec, idx)}</div>}
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
