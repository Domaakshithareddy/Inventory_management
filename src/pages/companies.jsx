import { useEffect, useState } from "react";
import api from "../api/axios";

const empty = { name: "", phone: "", address: "" };

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api.get("/companies").then(r => setCompanies(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = (c) => { setForm({ name: c.name, phone: c.phone || "", address: c.address || "" }); setEditing(c.id); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (editing) await api.put(`/companies/${editing}`, form);
      else await api.post("/companies", form);
      setModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save company");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this company?")) return;
    await api.delete(`/companies/${id}`);
    load();
  };

  const labelStyle = {
    fontSize: "11px", color: "#888", textTransform: "uppercase",
    letterSpacing: "0.08em", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600
  };

  const actionBtn = (color) => ({
    color, fontSize: "15px", background: "none", border: "none", cursor: "pointer",
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.06em"
  });

  const totalOutstanding = companies.reduce((s, c) => s + parseFloat(c.outstanding_balance || 0), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", marginTop: "20px" }}>
        <div>
          <h1 className="section-title">Companies</h1>
          <p style={{ fontSize: "15px", color: "#888", marginTop: "4px" }}>
            All registered companies
          </p>
        </div>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          {totalOutstanding > 0 && (
            <div style={{ textAlign: "right" }}>
              <p style={labelStyle}>Total Outstanding</p>
              <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "1.8rem", fontWeight: 700, color: "#C8102E" }}>
                ₹{totalOutstanding.toLocaleString()}
              </p>
            </div>
          )}
          <button className="btn-primary" onClick={openAdd}>
            + Add Company
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
          <thead className="table-head">
            <tr>
              {["Name", "Phone", "Address", "Total Purchased", "Outstanding", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map(c => {
              const outstanding = parseFloat(c.outstanding_balance || 0);
              return (
                <tr key={c.id} className="table-row">
                  <td style={{ fontWeight: 600, fontSize: "16px", padding: "16px" }}>
                    {c.name}
                  </td>
                  <td style={{ fontSize: "15px", padding: "16px" }}>
                    {c.phone || "—"}
                  </td>
                  <td style={{ color: "#888", fontSize: "15px", padding: "16px" }}>
                    {c.address || "—"}
                  </td>
                  <td style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: "15px", padding: "16px" }}>
                    ₹{Number(c.total_purchased || 0).toLocaleString()}
                    <span style={{ fontSize: "12px", color: "#aaa", marginLeft: "6px" }}>
                      ({c.total_purchases || 0} orders)
                    </span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    {outstanding > 0 ? (
                      <div>
                        <span style={{
                          fontFamily: "'IBM Plex Sans', sans-serif",
                          fontWeight: 700,
                          fontSize: "19px",
                          color: "#C8102E"
                        }}>
                          ₹{outstanding.toLocaleString()}
                        </span>
                        <p style={{ fontSize: "11px", color: "#aaa", marginTop: "2px", fontFamily: "'Barlow Condensed', sans-serif" }}>
                          PENDING PAYMENT
                        </p>
                      </div>
                    ) : (
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700,
                        fontSize: "13px",
                        padding: "4px 12px",
                        background: "#dcfce7",
                        color: "#15803d"
                      }}>
                        CLEARED
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <button onClick={() => openEdit(c)} style={actionBtn("#C8102E")}>Edit</button>
                      <button onClick={() => handleDelete(c.id)} style={actionBtn("#aaaaaa")}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {companies.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.2rem", color: "#ccc", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              No companies yet
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ borderBottom: "2px solid #f0f0f0", paddingBottom: "16px", marginBottom: "20px" }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "2rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {editing ? "Edit Company" : "Add Company"}
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Company Name</label>
                <input className="input" style={{ marginTop: "6px" }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Phone</label>
                <input className="input" style={{ marginTop: "6px" }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label style={labelStyle}>Address</label>
                <textarea className="input" style={{ marginTop: "6px", minHeight: "80px" }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
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