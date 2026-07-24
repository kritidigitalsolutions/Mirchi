import { useEffect, useState } from "react";
import API from "../api/axios";
import { Layers, Plus, Search, ChevronUp, ChevronDown, Edit2, Trash2, X, Check, RefreshCw, Eye, EyeOff } from "lucide-react";
import "./Dashboard.css";

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All"); // All, Active, Inactive

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/categories");
      setCategories(res.data.data || []);
    } catch (err) {
      console.error(err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setEditId(null);
    setName("");
    setPriority("0");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setIsEditing(true);
    setEditId(cat._id);
    setName(cat.name);
    setPriority(cat.priority?.toString() || "0");
    setIsActive(cat.isActive !== false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setName("");
    setPriority("0");
    setIsActive(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Name is required");
    setSaving(true);
    try {
      const payload = { 
        name: name.trim(),
        isActive
      };
      if (priority) payload.priority = priority;

      if (isEditing) {
        await API.put(`/admin/categories/${editId}`, payload);
      } else {
        await API.post("/admin/categories", payload);
      }
      closeModal();
      fetchCategories();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await API.delete(`/admin/categories/${id}`);
      fetchCategories();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete category");
    }
  };

  const updatePriority = async (id, currentPriority, increment) => {
    const newPriority = currentPriority + increment;
    if (newPriority < 1) return; // Priority can't be less than 1
    
    const cat = categories.find(c => c._id === id);
    if (!cat) return;
    
    try {
      await API.put(`/admin/categories/${id}`, { 
        name: cat.name, 
        priority: newPriority,
        isActive: cat.isActive
      });
      fetchCategories(); 
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update priority");
    }
  };

  const handleToggleActive = async (id, currentActive, name) => {
    try {
      await API.put(`/admin/categories/${id}`, { 
        name, 
        isActive: !currentActive 
      });
      fetchCategories(); 
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update status");
    }
  };

  const totalCount = categories.length;
  const activeCount = categories.filter(c => c.isActive !== false).length;
  const inactiveCount = totalCount - activeCount;

  const filteredCategories = categories.filter(c => {
    if (activeTab === "Active" && c.isActive === false) return false;
    if (activeTab === "Inactive" && c.isActive !== false) return false;
    if (searchQuery) {
      return c.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="page-section">
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Layers size={28} style={{ display: "inline-block", marginRight: 8, color: "var(--primary)" }} /> Categories</h1>
          <p className="pg-sub">Manage content categories displayed across the platform</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-ghost" onClick={fetchCategories}>
            <RefreshCw size={16} style={{ marginRight: 6 }} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} style={{ marginRight: 6 }} /> Add Category
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px", marginBottom: "25px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px 25px", minWidth: "160px", borderTop: "3px solid var(--primary)" }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>{totalCount}</div>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", fontWeight: "600" }}>TOTAL</div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px 25px", minWidth: "160px", borderTop: "3px solid var(--success)" }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>{activeCount}</div>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", fontWeight: "600" }}>ACTIVE</div>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px 25px", minWidth: "160px", borderTop: "3px solid var(--danger)" }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>{inactiveCount}</div>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", fontWeight: "600" }}>INACTIVE</div>
        </div>
      </div>

      <div className="content-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
          <div style={{ position: "relative", width: "300px" }}>
            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input 
              type="text" 
              placeholder="Search categories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "40px", borderRadius: "20px" }}
            />
          </div>
          
          <div style={{ display: "flex", background: "var(--surface-hover)", border: "1px solid var(--border)", borderRadius: "20px", padding: "4px" }}>
            {["All", "Active", "Inactive"].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? "var(--primary)" : "transparent",
                  color: activeTab === tab ? "#fff" : "var(--text-muted)",
                  border: "none",
                  padding: "6px 16px",
                  borderRadius: "16px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th>CATEGORY</th>
                <th>SLUG</th>
                <th>↑↓ PRIORITY</th>
                <th>STATUS</th>
                <th>CREATED</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((c, index) => (
                <tr key={c._id}>
                  <td style={{ color: 'var(--text-muted)' }}>{index + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", fontWeight: "500" }}>
                      <div style={{ 
                        width: "32px", height: "32px", borderRadius: "8px", 
                        background: "rgba(229, 9, 20, 0.1)", color: "var(--primary)", 
                        display: "flex", alignItems: "center", justifyContent: "center", 
                        fontWeight: "700", marginRight: "12px" 
                      }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      {c.name}
                    </div>
                  </td>
                  <td>
                    <span style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
                      {c.slug}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <button onClick={() => updatePriority(c._id, c.priority, 1)} title="Increase Priority" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-muted)", width: "20px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "3px" }}><ChevronUp size={12} /></button>
                        <button onClick={() => updatePriority(c._id, c.priority, -1)} title="Decrease Priority" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)", color: "var(--text-muted)", width: "20px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "3px" }}><ChevronDown size={12} /></button>
                      </div>
                      <span style={{ color: "var(--primary)", fontWeight: "700", fontSize: "15px" }}>{c.priority || 0}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${c.isActive !== false ? "badge-active" : "badge-blocked"}`}>
                      {c.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{formatDate(c.createdAt)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="tbl-actions" style={{ justifyContent: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", marginRight: "8px" }} title={c.isActive !== false ? "Deactivate" : "Activate"}>
                        <label style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={c.isActive !== false} 
                            onChange={() => handleToggleActive(c._id, c.isActive !== false, c.name)} 
                            style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                          />
                          <div style={{
                            width: "34px", height: "20px",
                            backgroundColor: c.isActive !== false ? "#10b981" : "#3f3f46",
                            borderRadius: "20px", position: "relative", transition: "background-color 0.2s"
                          }}>
                            <div style={{
                              position: "absolute", top: "2px", left: "2px",
                              width: "16px", height: "16px", backgroundColor: "#fff",
                              borderRadius: "50%", transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                              transform: c.isActive !== false ? "translateX(14px)" : "translateX(0)",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                            }} />
                          </div>
                        </label>
                      </div>
                      <button className="icon-btn" onClick={() => openEditModal(c)}><Edit2 size={16} /></button>
                      <button className="icon-btn del" onClick={() => handleDelete(c._id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="modal-head">
              <h3><Layers size={18} style={{ display: "inline-block", marginRight: 8, color: "var(--primary)" }} /> {isEditing ? "Edit Category" : "Add New Category"}</h3>
              <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>CATEGORY NAME <span style={{ color: "var(--primary)" }}>*</span></label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Trending, Action, Romance..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}># PRIORITY</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  min="0"
                />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
                  Higher value = appears first in category listings
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderTop: "1px solid var(--border)" }}>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#fff" }}>Active Category</h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Visible to users across the platform</p>
                </div>
                <label style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={isActive} 
                    onChange={(e) => setIsActive(e.target.checked)} 
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                  />
                  <div style={{
                    width: "44px", height: "24px",
                    backgroundColor: isActive ? "#10b981" : "#3f3f46",
                    borderRadius: "24px", position: "relative", transition: "background-color 0.2s"
                  }}>
                    <div style={{
                      position: "absolute", top: "3px", left: "3px",
                      width: "18px", height: "18px", backgroundColor: "#fff",
                      borderRadius: "50%", transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform: isActive ? "translateX(20px)" : "translateX(0)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }} />
                  </div>
                </label>
              </div>
            </div>
            
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? "Saving..." : (isEditing ? "Update Category" : "Create Category")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
