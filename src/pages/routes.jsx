import React, { useEffect, useState } from "react";
import api from "../api/axios";

const empty = { name: "" };

export default function AppRoutes() {
  const [routes, setRoutes] = useState([]);
  const [shops, setShops] = useState([]);
  const [bills, setBills] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get("/routes").then(r => setRoutes(Array.isArray(r.data) ? r.data : []));
    api.get("/shops").then(r => setShops(Array.isArray(r.data) ? r.data : []));
    api.get("/bills").then(r => setBills(Array.isArray(r.data) ? r.data : []));
  };
  useEffect(() => { load(); }, []);

  const getRouteShops = (routeId) => shops.filter(s => s.route_id === routeId);

  const getShopPending = (shopId) => {
    const shopBills = bills.filter(b => b.shop_id === shopId && b.status !== "CLEARED");
    return shopBills.reduce((s, b) => s + parseFloat(b.pending_amount || 0), 0);
  };

  const openAdd = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = (r) => { setForm({ name: r.name }); setEditing(r.id); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (editing) await api.put(`/routes/${editing}`, form);
      else await api.post("/routes", form);
      setModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save route");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this route?")) return;
    await api.delete(`/routes/${id}`);
    load();
  };

  const labelStyle = {
    fontSize: "11px",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 600
  };

  const actionBtn = (color) => ({
    color,
    fontSize: "15px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em"
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", marginTop: "20px" }}>
        <div>
          <h1 className="section-title">Routes</h1>
          <p style={{ fontSize: "15px", color: "#888", marginTop: "4px" }}>
            All delivery routes • Latest on top
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          + Add Route
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
          <thead className="table-head">
            <tr>
              {["Route Name", "Shops", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.map(r => {
              const routeShops = getRouteShops(r.id);
              const isExpanded = expandedRoute === r.id;
              const totalPending = routeShops.reduce((s, shop) => s + getShopPending(shop.id), 0);

              return (
                <React.Fragment key={r.id}>
                  <tr className="table-row">
                    <td style={{ fontWeight: 600, fontSize: "16px", padding: "16px" }}>
                      {r.name}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          padding: "6px 12px",
                          background: "#f1f5f9",
                          borderRadius: "6px",
                          color: "#475569"
                        }}>
                          {routeShops.length} shops
                        </span>
                        {totalPending > 0 && (
                          <span style={{ fontSize: "15px", color: "#C8102E", fontWeight: 700 }}>
                            ₹{totalPending.toLocaleString()} pending
                          </span>
                        )}
                        {routeShops.length > 0 && (
                          <button
                            onClick={() => setExpandedRoute(isExpanded ? null : r.id)}
                            style={{
                              fontSize: "13px",
                              color: "#2563eb",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0
                            }}
                          >
                            {isExpanded ? "▲ Hide" : "▼ View"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", gap: "16px" }}>
                        <button onClick={() => openEdit(r)} style={actionBtn("#C8102E")}>Edit</button>
                        <button onClick={() => handleDelete(r.id)} style={actionBtn("#aaaaaa")}>Delete</button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded shops */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={3} style={{ padding: "0 16px 16px 32px", background: "#f9fafb" }}>
                        <div style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#444",
                          textTransform: "uppercase",
                          marginBottom: "8px",
                          paddingTop: "12px"
                        }}>
                          Shops in {r.name}
                        </div>
                        <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                              {["Shop Name", "Owner", "Phone", "Outstanding"].map(h => (
                                <th key={h} style={{
                                  textAlign: "left",
                                  padding: "8px 12px",
                                  color: "#888",
                                  fontSize: "11px",
                                  textTransform: "uppercase",
                                  fontWeight: 600
                                }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {routeShops.map(shop => {
                              const pending = getShopPending(shop.id);
                              return (
                                <tr key={shop.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{shop.name}</td>
                                  <td style={{ padding: "10px 12px", color: "#555" }}>{shop.owner_name || "—"}</td>
                                  <td style={{ padding: "10px 12px", color: "#555" }}>{shop.phone || "—"}</td>
                                  <td style={{ padding: "10px 12px" }}>
                                    {pending > 0 ? (
                                      <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "16px", color: "#C8102E" }}>
                                        ₹{pending.toLocaleString()}
                                      </span>
                                    ) : (
                                      <span className="badge-green">Cleared</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {routeShops.length === 0 && (
                          <p style={{ color: "#888", fontSize: "15px", padding: "12px" }}>
                            No shops assigned to this route
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {routes.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "1.2rem",
              color: "#ccc",
              textTransform: "uppercase",
              letterSpacing: "0.1em"
            }}>
              No routes yet
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ borderBottom: "2px solid #f0f0f0", paddingBottom: "16px", marginBottom: "20px" }}>
              <h2 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: "2rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}>
                {editing ? "Edit Route" : "Add Route"}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label style={labelStyle}>Route Name</label>
                <input
                  className="input"
                  style={{ marginTop: "6px" }}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </button>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}