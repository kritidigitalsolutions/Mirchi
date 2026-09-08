import { useState, useEffect, useRef } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import "./WebpageLayout.css";
import {
  Plus, Trash2, Edit2, Search, Check, X,
  LayoutGrid, Save, AlertCircle, PlayCircle, Sliders, ChevronDown, ChevronUp, ChevronLeft, ChevronRight
} from "lucide-react";

const HideArrowsStyle = () => (
  <style>{`
    .wl-pos-input::-webkit-outer-spin-button,
    .wl-pos-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .wl-pos-input { -moz-appearance: textfield; }
  `}</style>
);

function PositionInput({ currentPos, onSave }) {
  const [val, setVal] = useState(currentPos);

  useEffect(() => {
    setVal(currentPos);
  }, [currentPos]);

  const commitChange = () => {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num !== currentPos) {
      onSave(num);
    } else {
      setVal(currentPos);
    }
  };

  return (
    <div
      className="cat-pos-box"
      onClick={e => e.stopPropagation()}
      title="Type position and press Enter or click outside"
    >
      <span className="cat-pos-label">POS</span>
      <input
        type="number"
        className="cat-pos-input"
        value={val}
        min={1}
        onChange={e => setVal(e.target.value)}
        onBlur={commitChange}
        onKeyDown={e => {
          if (e.key === "Enter") {
            commitChange();
            e.target.blur();
          }
        }}
      />
    </div>
  );
}

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

  const moveSectionItemToPos = (secIdx, currentIdx, newPosVal) => {
    let targetIdx = parseInt(newPosVal, 10) - 1;
    if (isNaN(targetIdx)) return;
    setSections(prev => {
      const next = [...prev];
      const items = [...next[secIdx].items];
      if (targetIdx < 0) targetIdx = 0;
      if (targetIdx >= items.length) targetIdx = items.length - 1;
      if (currentIdx === targetIdx) return prev;
      const [moved] = items.splice(currentIdx, 1);
      items.splice(targetIdx, 0, moved);
      next[secIdx] = { ...next[secIdx], items };
      return next;
    });
  };

  const moveSectionItemStep = (secIdx, currentIdx, direction) => {
    setSections(prev => {
      const next = [...prev];
      const items = [...next[secIdx].items];
      const targetIdx = currentIdx + direction;
      if (targetIdx < 0 || targetIdx >= items.length) return prev;
      const [moved] = items.splice(currentIdx, 1);
      items.splice(targetIdx, 0, moved);
      next[secIdx] = { ...next[secIdx], items };
      return next;
    });
  };

  const addAllToSection = (secIdx, connectedItems) => {
    setSections(prev => {
      const next = [...prev];
      const items = connectedItems.map(i => ({
        contentType: i.contentType === "movie" ? "Movie" : "Series",
        contentId: i,
      }));
      next[secIdx] = { ...next[secIdx], items };
      return next;
    });
    showToast("Added all items to section. Click 'Publish Layout' to save.", "success");
  };

  const clearSectionItems = (secIdx) => {
    setSections(prev => {
      const next = [...prev];
      next[secIdx] = { ...next[secIdx], items: [] };
      return next;
    });
    showToast("Cleared section items. Click 'Publish Layout' to save.", "success");
  };

  const moveBannerToPos = (currentIdx, newPosVal) => {
    let newPos = parseInt(newPosVal, 10) - 1;
    if (isNaN(newPos)) return;
    setHeroBanners(prev => {
      const items = [...prev];
      if (newPos < 0) newPos = 0;
      if (newPos >= items.length) newPos = items.length - 1;
      if (currentIdx === newPos) return prev;
      const [moved] = items.splice(currentIdx, 1);
      items.splice(newPos, 0, moved);
      return items;
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

    const rawItems = sec.items || [];
    const selectedList = [];

    rawItems.forEach(item => {
      const idStr = String(item.contentId?._id || item.contentId);
      const found = connected.find(c => String(c._id) === idStr);
      if (found) {
        selectedList.push(found);
      }
    });

    const selectedIds = new Set(selectedList.map(x => String(x._id)));
    let unselected = connected.filter(c => !selectedIds.has(String(c._id)));
    if (searchQ.trim())
      unselected = unselected.filter(c => c.title.toLowerCase().includes(searchQ.toLowerCase()));

    return (
      <div className="wl-curator">
        <div className="wl-curator-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span className="wl-count-label" style={{ fontWeight: "700" }}>
              {selectedList.length} of {connected.length} selected
            </span>

            <div className="wl-curator-actions">
              {unselected.length > 0 && (
                <button
                  type="button"
                  className="wl-btn-action"
                  onClick={() => addAllToSection(secIdx, connected)}
                  title="Add all tagged series to this row"
                >
                  <Plus size={13} /> Add All ({unselected.length})
                </button>
              )}
              {selectedList.length > 0 && (
                <button
                  type="button"
                  className="wl-btn-action wl-btn-action--danger"
                  onClick={() => clearSectionItems(secIdx)}
                  title="Clear all items from this row"
                >
                  <Trash2 size={13} /> Clear Row
                </button>
              )}
            </div>
          </div>

          <div className="search-bar wl-mini-search">
            <Search size={13} className="search-icon" />
            <input className="search-input" placeholder="Filter available content…"
              value={searchQ}
              onChange={e => setSectionSearches(p => ({ ...p, [slug]: e.target.value }))} />
            {searchQ && <button className="search-clear" onClick={() => setSectionSearches(p => ({ ...p, [slug]: "" }))}><X size={12} /></button>}
          </div>
        </div>

        {selectedList.length > 0 && (
          <div>
            <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
              Curated Display Order (Type Position to Reorder):
            </div>
            <div className="wl-grid">
              {selectedList.map((item, idx) => (
                <div key={item._id} className="wl-card wl-card--selected">
                  <div className="wl-card-media" title={item.title}>
                    <img src={imgUrl(item.poster)} alt="" className="wl-poster" />
                    <div className="wl-card-badge wl-card-badge--check"><Check size={10} /></div>

                    {/* Top Right Explicit Remove Button */}
                    <button
                      type="button"
                      className="wl-card-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleItem(secIdx, item, true);
                      }}
                      title="Remove from row"
                    >
                      <X size={13} />
                    </button>

                    {/* Bottom Position Bar with Step Arrows and Typeable Input */}
                    <div className="wl-pos-controls" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className="wl-step-btn"
                        disabled={idx === 0}
                        onClick={() => moveSectionItemStep(secIdx, idx, -1)}
                        title="Move Left"
                      >
                        <ChevronLeft size={14} />
                      </button>

                      <PositionInput
                        currentPos={idx + 1}
                        onSave={(newPos) => moveSectionItemToPos(secIdx, idx, newPos)}
                      />

                      <button
                        type="button"
                        className="wl-step-btn"
                        disabled={idx === selectedList.length - 1}
                        onClick={() => moveSectionItemStep(secIdx, idx, 1)}
                        title="Move Right"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
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
        )}

        {unselected.length > 0 && (
          <div style={{ marginTop: selectedList.length > 0 ? "20px" : "10px" }}>
            <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--text-muted)", display: "inline-block" }}></span>
              Available Content ({unselected.length}) — Click card to add:
            </div>
            <div className="wl-grid">
              {unselected.map(item => (
                <div key={item._id} className="wl-card wl-card--dim">
                  <div className="wl-card-media" onClick={() => toggleItem(secIdx, item, false)} title={`Click to add "${item.title}"`}>
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
        )}
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
      <HideArrowsStyle />
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
                          <label style={{ display: 'flex', alignItems: 'center', background: 'var(--primary)', padding: '4px 8px', borderRadius: '6px', cursor: 'text', gap: 4 }} title="Type position">
                            <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#fff' }}>Pos</span>
                            <input
                              className="wl-pos-input"
                              key={`bnpos-${idx}`}
                              type="number"
                              defaultValue={idx + 1}
                              onBlur={e => moveBannerToPos(idx, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                              style={{ width: '32px', background: 'rgba(255,255,255,0.2)', border: '1px dashed rgba(255,255,255,0.6)', color: '#fff', fontWeight: 'bold', fontSize: '13px', outline: 'none', textAlign: 'center', padding: '2px 0', borderRadius: '4px' }}
                              min="1" max={heroBanners.length}
                            />
                            <Edit2 size={11} style={{ color: '#fff', opacity: 0.9 }} />
                          </label>
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
