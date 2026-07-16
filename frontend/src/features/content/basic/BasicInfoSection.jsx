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
  Plus,
  X,
  Check,
  Edit2,
} from "lucide-react";
import API from "../../../api/axios";

export default function BasicInfoSection({
  form,
  ch,
  setForm,
}) {
  const [allCategories, setAllCategories] = useState([]);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [updatingCat, setUpdatingCat] = useState(false);
  const [addError, setAddError] = useState("");

  // Load all categories from backend API on mount
  useEffect(() => {
    API.get("/admin/categories")
      .then((res) => {
        if (res.data?.data) {
          setAllCategories(res.data.data.map((c) => ({ label: c.name, value: c.slug, id: c._id })));
        }
      })
      .catch(() => {});
  }, []);

  const selectedCategories = Array.isArray(form.category) ? form.category : [];

  const toggleCategory = (value) => {
    const updated = selectedCategories.includes(value)
      ? selectedCategories.filter((c) => c !== value)
      : [...selectedCategories, value];
    setForm((f) => ({ ...f, category: updated }));
  };

  const handleAddCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    setAddingCat(true);
    try {
      const res = await API.post("/admin/categories", { name: trimmed });
      if (res.data?.data) {
        const created = res.data.data;
        const newEntry = { label: created.name, value: created.slug, id: created._id };
        setAllCategories((prev) => [...prev, newEntry]);
        setForm((f) => ({ ...f, category: [...(Array.isArray(f.category) ? f.category : []), created.slug] }));
        setAddError("");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to add category";
      console.error("Add category error:", msg);
      setAddError(msg);
    } finally {
      setAddingCat(false);
      setNewCatName("");
      setShowAddInput(false);
    }
  };

  const handleDeleteCategory = async (id, value) => {
    try {
      await API.delete(`/admin/categories/${id}`);
      setAllCategories((prev) => prev.filter((c) => c.id !== id));
      setForm((f) => ({
        ...f,
        category: (Array.isArray(f.category) ? f.category : []).filter((v) => v !== value),
      }));
      setAddError("");
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to delete category";
      console.error("Delete category error:", msg);
      setAddError(msg);
    }
  };

  const handleUpdateCategory = async (id, oldSlug) => {
    const trimmed = editingCatName.trim();
    if (!trimmed) return;
    setUpdatingCat(true);
    try {
      const res = await API.put(`/admin/categories/${id}`, { name: trimmed });
      if (res.data?.data) {
        const updated = res.data.data;
        setAllCategories((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, label: updated.name, value: updated.slug } : c
          )
        );
        if (selectedCategories.includes(oldSlug)) {
          setForm((f) => ({
            ...f,
            category: (Array.isArray(f.category) ? f.category : []).map((v) =>
              v === oldSlug ? updated.slug : v
            ),
          }));
        }
        setAddError("");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Failed to update category";
      console.error("Update category error:", msg);
      setAddError(msg);
    } finally {
      setUpdatingCat(false);
      setEditingCatId(null);
      setEditingCatName("");
    }
  };

  return (
    <div className="premium-card">
      <h3 className="section-title">
        <span>
          <Star size={18} />
        </span>

        Basic Information
      </h3>

      <div
        className="form-2col"
        style={{ marginBottom: 20 }}
      >
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
            <Globe
              size={14}
              style={{ marginRight: 4 }}
            />

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
            <Calendar
              size={14}
              style={{ marginRight: 4 }}
            />

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
            <Clock
              size={14}
              style={{ marginRight: 4 }}
            />

            {form.type === "movie"
              ? "Duration"
              : "Avg. Ep Duration"}
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
            <Tag
              size={14}
              style={{ marginRight: 4 }}
            />

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
            Category
          </label>

          {/* Chip container */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            padding: "10px 12px",
            background: "var(--input-bg, rgba(255,255,255,0.05))",
            border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
            borderRadius: "8px",
            minHeight: "46px",
            alignItems: "center",
          }}>
            {allCategories.map(({ label, value, id }) => {
              if (id && editingCatId === id) {
                return (
                  <div key={value} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <input
                      autoFocus
                      type="text"
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateCategory(id, value);
                        if (e.key === "Escape") { setEditingCatId(null); setEditingCatName(""); }
                      }}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "15px",
                        border: "1px solid #6c63ff",
                        background: "rgba(108,99,255,0.15)",
                        color: "#fff",
                        fontSize: "12px",
                        outline: "none",
                        width: "110px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateCategory(id, value)}
                      disabled={updatingCat || !editingCatName.trim()}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "15px",
                        border: "none",
                        background: "linear-gradient(135deg, #6c63ff, #4f46e5)",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: "600",
                        cursor: updatingCat ? "not-allowed" : "pointer",
                      }}
                      title="Save"
                    >
                      {updatingCat ? "..." : <Check size={11} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingCatId(null); setEditingCatName(""); }}
                      style={{
                        padding: "3px 6px",
                        borderRadius: "15px",
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "transparent",
                        color: "rgba(255,255,255,0.6)",
                        fontSize: "11px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                      title="Cancel"
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              }

              const selected = selectedCategories.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleCategory(value)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    border: selected
                      ? "1px solid #6c63ff"
                      : "1px solid rgba(255,255,255,0.18)",
                    background: selected
                      ? "linear-gradient(135deg, #6c63ff, #4f46e5)"
                      : "transparent",
                    color: selected ? "#fff" : "rgba(255,255,255,0.6)",
                    fontSize: "13px",
                    fontWeight: selected ? "600" : "400",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {selected && <Check size={11} />}
                  {label}
                  {id && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", marginLeft: "2px" }}>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCatId(id);
                          setEditingCatName(label);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "1px",
                          borderRadius: "50%",
                          opacity: 0.75,
                          cursor: "pointer",
                        }}
                        title="Rename category"
                      >
                        <Edit2 size={11} />
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(id, value);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "1px",
                          borderRadius: "50%",
                          opacity: 0.75,
                          cursor: "pointer",
                        }}
                        title="Delete category"
                      >
                        <X size={12} />
                      </span>
                    </span>
                  )}
                </button>
              );
            })}

            {/* +Add button or inline input */}
            {showAddInput ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  autoFocus
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCategory();
                    if (e.key === "Escape") { setShowAddInput(false); setNewCatName(""); }
                  }}
                  placeholder="Category name..."
                  style={{
                    padding: "4px 10px",
                    borderRadius: "20px",
                    border: "1px solid #6c63ff",
                    background: "rgba(108,99,255,0.1)",
                    color: "#fff",
                    fontSize: "13px",
                    outline: "none",
                    width: "130px",
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={addingCat || !newCatName.trim()}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "20px",
                    border: "none",
                    background: "linear-gradient(135deg, #6c63ff, #4f46e5)",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: addingCat ? "not-allowed" : "pointer",
                    opacity: addingCat ? 0.6 : 1,
                  }}
                >
                  {addingCat ? "..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddInput(false); setNewCatName(""); }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "20px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddInput(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  border: "1px dashed rgba(108,99,255,0.5)",
                  background: "transparent",
                  color: "#6c63ff",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <Plus size={13} />
                Add
              </button>
            )}
          </div>

          {/* Selected summary */}
          {selectedCategories.length > 0 && (
            <div style={{ marginTop: "6px", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
              Selected: {selectedCategories.join(", ")}
            </div>
          )}

          {/* Error message */}
          {addError && (
            <div style={{ marginTop: "6px", fontSize: "12px", color: "#ff6b6b", fontWeight: "500" }}>
              ⚠ {addError}
            </div>
          )}
        </div>


        <div className="form-row">
          <label className="form-label">
            <Star
              size={14}
              style={{ marginRight: 4 }}
            />

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
            <ArrowUpCircle
              size={14}
              style={{ marginRight: 4 }}
            />

            Priority (0 = Auto-assign)
          </label>

          <input
            className="form-input-styled"
            name="priority"
            type="number"
            min="0"
            placeholder="0 = Automatic (bottom), manually enter 1, 2, 3... to rank"
            onChange={ch}
            value={form.priority}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginTop: 24,
        }}
      >
        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
          }}
        >
          <input
            type="checkbox"
            name="isComingSoon"
            onChange={ch}
            checked={form.isComingSoon}
          />

          <span>
            <Rocket
              size={16}
              style={{ marginRight: 8 }}
            />

            Coming Soon
          </span>
        </label>

        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
            background:
              "rgba(229, 9, 20, 0.1)",
            borderColor:
              "rgba(229, 9, 20, 0.2)",
          }}
        >
          <input
            type="checkbox"
            name="isPremium"
            onChange={ch}
            checked={form.isPremium}
          />

          <span
            style={{
              color: "var(--primary)",
            }}
          >
            <Lock
              size={16}
              style={{ marginRight: 8 }}
            />

            Premium Content
          </span>
        </label>

        <div
          className="content-type-toggle"
          style={{
            flex: 2,
            minWidth: "300px",
            marginBottom: 0,
            padding: "4px",
            display: "inline-flex",
            alignItems: "center"
          }}
        >
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
            style={{
              flex: 1,
              justifyContent: "center",
              background: form.is18plus ? "orange" : "",
              boxShadow: form.is18plus ? "0 4px 12px rgba(255, 165, 0, 0.3)" : ""
            }}
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
        <div
          className="form-row"
          style={{
            marginTop: 20,
            animation: "pageIn 0.3s ease",
          }}
        >
          <label className="form-label">
            Scheduled Release Date & Time
          </label>

          <input
            className="form-input-styled"
            type="datetime-local"
            name="releaseDate"
            onChange={ch}
            value={form.releaseDate}
            required
          />
        </div>
      )}
    </div>
  );
}