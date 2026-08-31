import { useState, useEffect } from "react";
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

  // Load all active categories from backend API on mount
  useEffect(() => {
    API.get("/admin/categories")
      .then((res) => {
        if (res.data?.data) {
          // Filtering by isActive (if available) or just mapping them all.
          const activeCategories = res.data.data.filter(c => c.isActive !== false);
          setAllCategories(activeCategories.map((c) => ({ label: c.name, value: c.slug, id: c._id })));
        }
      })
      .catch(() => { });
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

        <div className="form-row" style={{ gridColumn: "span 3" }}>
          <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Layers size={14} />
            Selected Categories (Select Multiple)
          </label>

          <div style={{ width: "100%" }}>
            {allCategories.length === 0 ? (
              <div style={{ padding: "12px 0", color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
                Loading categories...
              </div>
            ) : (
              <div className="category-chips-container">
                {allCategories.map(({ label, value }) => {
                  const isSelected = selectedCategories.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleCategory(value)}
                      className={`category-chip ${isSelected ? "active" : ""}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <style>{`
            .category-chips-container {
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              margin-top: 10px;
            }
            .category-chip {
              display: inline-flex;
              align-items: center;
              padding: 10px 24px;
              border-radius: 100px;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              cursor: pointer;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              background: rgba(255, 255, 255, 0.02);
              border: 1px solid rgba(255, 255, 255, 0.08);
              color: rgba(255, 255, 255, 0.5);
              user-select: none;
            }
            .category-chip:hover {
              background: rgba(255, 255, 255, 0.06);
              border-color: rgba(255, 255, 255, 0.2);
              color: #fff;
              transform: translateY(-1px);
            }
            .category-chip.active {
              background: rgba(227, 9, 20, 0.12);
              border-color: var(--primary, #e30914);
              color: #fff;
              box-shadow: 0 0 14px rgba(227, 9, 20, 0.25);
            }
            .category-chip.active:hover {
              background: rgba(227, 9, 20, 0.2);
              box-shadow: 0 0 18px rgba(227, 9, 20, 0.35);
            }
          `}</style>
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
          <label className="form-label">
            SCHEDULED RELEASE DATE & TIME <span style={{ color: "#ff4d4d" }}>*</span>
          </label>
          <input className="form-input-styled" type="datetime-local" name="releaseDate" onChange={ch} value={form.releaseDate} />
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
            Must be a future date within the next 10 years
          </span>
        </div>
      )}
    </div>
  );
}