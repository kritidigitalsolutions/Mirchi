import { useState, useEffect, useRef } from "react";
import {
  Star,
  Globe,
  Calendar,
  Clock,
  Tag,
  Layers,
  Rocket,
  Lock,
  ArrowUpCircle,
  Plus,
  X,
  Check,
  Edit2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from "lucide-react";
import API from "../../../api/axios";

export default function BasicInfoSection({
  form,
  ch,
  setForm,
}) {
  const [allCategories, setAllCategories] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Load all active categories from backend API on mount
  useEffect(() => {
    API.get("/admin/categories")
      .then((res) => {
        if (res.data?.data) {
          // You mentioned the backend should fetch existing categories.
          // Filtering by isActive (if available) or just mapping them all.
          const activeCategories = res.data.data.filter(c => c.isActive !== false);
          setAllCategories(activeCategories.map((c) => ({ label: c.name, value: c.slug, id: c._id })));
        }
      })
      .catch(() => { });
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCategories = Array.isArray(form.category) ? form.category : [];

  const toggleCategory = (value) => {
    const updated = selectedCategories.includes(value)
      ? selectedCategories.filter((c) => c !== value)
      : [...selectedCategories, value];
    setForm((f) => ({ ...f, category: updated }));
  };

  return (
    <div className="premium-card">
      <h3 className="section-title">
        <span>
          <Star size={18} />
        </span>
        Basic Information
      </h3>

      <div className="form-2col" style={{ marginBottom: 20 }}>
        <div className="form-row form-full">
          <label className="form-label">
            Content Title *
          </label>
          <input
            className="form-input-styled"
            name="title"
            placeholder="e.g. Inception"
            onChange={ch}
            value={form.title}
            required
          />
        </div>

        <div className="form-row form-full">
          <label className="form-label">
            Synopsis / Description *
          </label>
          <textarea
            className="form-input-styled"
            name="description"
            placeholder="A brief summary of the plot..."
            rows={3}
            onChange={ch}
            value={form.description}
            required
          />
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-row">
          <label className="form-label">
            <Globe size={14} style={{ marginRight: 4 }} />
            Language
          </label>
          <input
            className="form-input-styled"
            name="language"
            placeholder="English, Hindi, etc."
            onChange={ch}
            value={form.language}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Calendar size={14} style={{ marginRight: 4 }} />
            Release Year
          </label>
          <input
            className="form-input-styled"
            name="releaseYear"
            type="number"
            placeholder="2024"
            onChange={ch}
            value={form.releaseYear}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Clock size={14} style={{ marginRight: 4 }} />
            {form.type === "movie" ? "Duration" : "Avg. Ep Duration"}
          </label>
          <input
            className="form-input-styled"
            name="duration"
            placeholder="e.g. 2h 15m"
            onChange={ch}
            value={form.duration}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Tag size={14} style={{ marginRight: 4 }} />
            Genres
          </label>
          <input
            className="form-input-styled"
            name="genre"
            placeholder="Action, Sci-Fi, Drama"
            onChange={ch}
            value={form.genre}
          />
        </div>

        <div className="form-row" style={{ gridColumn: "span 2" }}>
          <label className="form-label">
            <Layers size={14} style={{ marginRight: 4 }} />
            Categories
          </label>

          <div
            ref={dropdownRef}
            style={{ position: "relative", width: "100%" }}
          >
            {/* The Select Box */}
            <div
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                padding: "10px 40px 10px 12px", // Space for chevron
                background: "var(--input-bg, rgba(255,255,255,0.02))",
                border: dropdownOpen ? "1px solid var(--primary)" : "1px solid var(--border, rgba(255,255,255,0.1))",
                borderRadius: "8px",
                minHeight: "46px",
                alignItems: "center",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {selectedCategories.length === 0 ? (
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
                  Select categories...
                </span>
              ) : (
                selectedCategories.map((val) => {
                  const cat = allCategories.find((c) => c.value === val);
                  if (!cat) return null;
                  return (
                    <span
                      key={val}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        border: "1px solid var(--primary)",
                        background: "transparent",
                        color: "var(--primary)",
                        fontSize: "13px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(val);
                      }}
                    >
                      {cat.label}
                      <X size={12} style={{ cursor: "pointer", opacity: 0.7 }} />
                    </span>
                  );
                })
              )}

              <div style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.5)" }}>
                {dropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* The Dropdown Menu */}
            {dropdownOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "#121422", // Solid dark background to prevent transparency
                border: "1px solid var(--primary)",
                borderRadius: "8px",
                zIndex: 9999, // Ensure it sits above all other form fields
                maxHeight: "220px",
                overflowY: "auto",
                boxShadow: "0 10px 30px rgba(0,0,0,0.8)"
              }}>
                {allCategories.length === 0 ? (
                  <div style={{ padding: "12px", color: "rgba(255,255,255,0.5)", fontSize: "14px", textAlign: "center" }}>
                    No categories found.
                  </div>
                ) : (
                  allCategories.map(({ label, value }) => {
                    const selected = selectedCategories.includes(value);
                    return (
                      <div
                        key={value}
                        onClick={() => toggleCategory(value)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          cursor: "pointer",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          color: selected ? "var(--primary)" : "#fff",
                          background: selected ? "rgba(229, 9, 20, 0.1)" : "transparent",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => {
                          if (!selected) e.currentTarget.style.background = "var(--surface-hover, rgba(255,255,255,0.05))";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = selected ? "rgba(229, 9, 20, 0.1)" : "transparent";
                        }}
                      >
                        <span style={{ fontSize: "14px", fontWeight: selected ? "500" : "400" }}>{label}</span>
                        {selected && <Check size={16} color="var(--primary)" />}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">
            <Star size={14} style={{ marginRight: 4 }} />
            IMDb Rating (0 - 10)
          </label>
          <input
            className="form-input-styled"
            name="rating"
            type="number"
            step="0.1"
            min="0"
            max="10"
            placeholder="8.5"
            onChange={ch}
            value={form.rating}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <ArrowUpCircle size={14} style={{ marginRight: 4 }} />
            Priority (0 = Auto-assign)
          </label>
          <input
            className="form-input-styled"
            name="priority"
            type="number"
            min="0"
            placeholder="0"
            onChange={ch}
            value={form.priority}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 24 }}>
        <label className="checkbox-row" style={{ flex: 1, minWidth: "150px" }}>
          <input
            type="checkbox"
            name="isPublished"
            onChange={ch}
            checked={form.isPublished !== false}
          />
          <span style={{ color: form.isPublished !== false ? "var(--primary)" : "rgba(255,255,255,0.5)" }}>
            {form.isPublished !== false ? <Eye size={16} style={{ marginRight: 8 }} /> : <EyeOff size={16} style={{ marginRight: 8 }} />}
            {form.isPublished !== false ? "Published" : "Draft"}
          </span>
        </label>

        <label className="checkbox-row" style={{ flex: 1, minWidth: "150px" }}>
          <input
            type="checkbox"
            name="isComingSoon"
            onChange={ch}
            checked={form.isComingSoon}
          />
          <span><Rocket size={16} style={{ marginRight: 8 }} /> Coming Soon</span>
        </label>

        <label className="checkbox-row" style={{ flex: 1, minWidth: "200px", background: "rgba(229, 9, 20, 0.1)", borderColor: "rgba(229, 9, 20, 0.2)" }}>
          <input
            type="checkbox"
            name="isPremium"
            onChange={ch}
            checked={form.isPremium}
          />
          <span style={{ color: "var(--primary)" }}><Lock size={16} style={{ marginRight: 8 }} /> Premium Content</span>
        </label>

        <div className="content-type-toggle" style={{ flex: 2, minWidth: "300px", marginBottom: 0, padding: "4px", display: "inline-flex", alignItems: "center" }}>
          <button
            type="button"
            className={`toggle-btn ${form.allAges ? "active" : ""}`}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => {
              ch({ target: { name: "allAges", type: "checkbox", checked: true } });
              ch({ target: { name: "is18plus", type: "checkbox", checked: false } });
            }}
          >
            All ages Content (Non-Adult)
          </button>
          <button
            type="button"
            className={`toggle-btn ${form.is18plus ? "active" : ""}`}
            style={{ flex: 1, justifyContent: "center", background: form.is18plus ? "orange" : "", boxShadow: form.is18plus ? "0 4px 12px rgba(255, 165, 0, 0.3)" : "" }}
            onClick={() => {
              ch({ target: { name: "allAges", type: "checkbox", checked: false } });
              ch({ target: { name: "is18plus", type: "checkbox", checked: true } });
            }}
          >
            18+ Content (Adult)
          </button>
        </div>
      </div>

      {form.isComingSoon && (
        <div className="form-row" style={{ marginTop: 20, animation: "pageIn 0.3s ease" }}>
          <label className="form-label">Scheduled Release Date & Time</label>
          <input className="form-input-styled" type="datetime-local" name="releaseDate" onChange={ch} value={form.releaseDate} required />
        </div>
      )}
    </div>
  );
}