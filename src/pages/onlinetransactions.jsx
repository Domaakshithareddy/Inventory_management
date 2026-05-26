import { useEffect, useState, useRef } from "react";
import api from "../api/axios";

const today = new Date().toISOString().split("T")[0];
const empty = { shop_id: "", is_counter_sale: false, amount: "", transaction_date: today, notes: "" };

const labelStyle = {
  fontSize: "11px", color: "#888", textTransform: "uppercase",
  letterSpacing: "0.08em", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600
};

const actionBtn = (color) => ({
  color, fontSize: "15px", background: "none", border: "none", cursor: "pointer",
  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.06em"
});

function SearchableSelect({ options, value, onChange, placeholder = "Search...", required = false }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => o.value === value);
  const filtered = query.trim() === ""
    ? options
    : options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (opt) => { onChange(opt.value); setQuery(""); setOpen(false); };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        className="input"
        style={{ marginTop: "6px", width: "100%", boxSizing: "border-box" }}
        value={open ? query : (selected ? selected.label : "")}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(""); }}
        onFocus={() => { setQuery(""); setOpen(true); }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {required && (
        <input tabIndex={-1} style={{ opacity: 0, height: 0, position: "absolute", pointerEvents: "none" }}
          value={value || ""} onChange={() => {}} required />
      )}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0,
          background: "#fff", border: "2px solid #e5e7eb", borderRadius: "4px",
          zIndex: 9999, maxHeight: "220px", overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)"
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "12px 16px", fontSize: "13px", color: "#aaa", fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase" }}>
              No results{query ? ` for "${query}"` : ""}
            </div>
          ) : filtered.map((opt, i) => {
            const isSelected = opt.value === value;
            const lq = query.trim().toLowerCase();
            const label = opt.label;
            let display = label;
            if (lq && label.toLowerCase().includes(lq)) {
              const idx = label.toLowerCase().indexOf(lq);
              display = (<>{label.slice(0, idx)}<strong style={{ color: "#C8102E" }}>{label.slice(idx, idx + lq.length)}</strong>{label.slice(idx + lq.length)}</>);
            }
            return (
              <div key={i} onMouseDown={() => handleSelect(opt)}
                style={{
                  padding: "10px 16px", fontSize: "14px", cursor: "pointer",
                  background: isSelected ? "#fff8f8" : "transparent",
                  borderLeft: isSelected ? "3px solid #C8102E" : "3px solid transparent",
                  borderBottom: "1px solid #f3f4f6",
                  fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.02em"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={e => e.currentTarget.style.background = isSelected ? "#fff8f8" : "transparent"}
              >{display}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OnlineTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [shops, setShops] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get("/online-transactions").then(r => setTransactions(Array.isArray(r.data) ? r.data : []));
  };

  useEffect(() => {
    load();
    api.get("/shops").then(r => setShops(Array.isArray(r.data) ? r.data : []));
  }, []);

  const shopOptions = shops.map(s => ({
    value: s.id,
    label: s.owner_name ? `${s.name} — ${s.owner_name}` : s.name
  }));

  const openAdd = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = (t) => {
    setForm({
      shop_id: t.shop_id || "",
      is_counter_sale: t.is_counter_sale || false,
      amount: t.amount,
      transaction_date: t.transaction_date?.split("T")[0] || today,
      notes: t.notes || ""
    });
    setEditing(t.id);
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (editing) await api.put(`/online-transactions/${editing}`, form);
      else await api.post("/online-transactions", form);
      setModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this transaction? This will reverse the payment from bills.")) return;
    await api.delete(`/online-transactions/${id}`);
    load();
  };

  const total = transactions.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const shopTotal = transactions.filter(t => !t.is_counter_sale).reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const counterTotal = transactions.filter(t => t.is_counter_sale).reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  const getDisplayName = (t) => {
    if (t.is_counter_sale) return "Counter Sale";
    return t.shop_name_resolved || "—";
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", marginTop: "20px" }}>
        <div>
          <h1 className="section-title">Online Transactions</h1>
          <p style={{ fontSize: "15px", color: "#888", marginTop: "4px" }}>
            Track online payments received • Latest on top
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Transaction</button>
      </div>

      {/* Summary */}
      {transactions.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div className="card" style={{ padding: "20px 24px" }}>
            <p style={labelStyle}>Total Online</p>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "1.8rem", fontWeight: 700, color: "#16a34a", margin: "6px 0 0" }}>
              ₹{total.toLocaleString()}
            </p>
          </div>
          <div className="card" style={{ padding: "20px 24px" }}>
            <p style={labelStyle}>From Shops</p>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "1.8rem", fontWeight: 700, color: "#2563eb", margin: "6px 0 0" }}>
              ₹{shopTotal.toLocaleString()}
            </p>
          </div>
          <div className="card" style={{ padding: "20px 24px" }}>
            <p style={labelStyle}>Counter Sales</p>
            <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "1.8rem", fontWeight: 700, color: "#92400e", margin: "6px 0 0" }}>
              ₹{counterTotal.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
          <thead className="table-head">
            <tr>
              {["Date", "Type", "Shop / Source", "Amount", "Notes", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} className="table-row">
                <td style={{ color: "#555", fontSize: "15px", padding: "16px" }}>
                  {new Date(t.transaction_date).toLocaleDateString("en-IN")}
                </td>
                <td style={{ padding: "16px" }}>
                  <span style={{
                    padding: "4px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600,
                    background: t.is_counter_sale ? "#fef9c3" : "#dbeafe",
                    color: t.is_counter_sale ? "#92400e" : "#1d4ed8"
                  }}>
                    {t.is_counter_sale ? "Counter Sale" : "Shop Payment"}
                  </span>
                </td>
                <td style={{ fontWeight: 600, fontSize: "15px", padding: "16px" }}>
                  {getDisplayName(t)}
                </td>
                <td style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "20px", color: "#16a34a", padding: "16px" }}>
                  ₹{Number(t.amount).toLocaleString()}
                </td>
                <td style={{ color: "#888", fontSize: "15px", padding: "16px" }}>
                  {t.notes || "—"}
                </td>
                <td style={{ padding: "16px" }}>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <button onClick={() => openEdit(t)} style={actionBtn("#C8102E")}>Edit</button>
                    <button onClick={() => handleDelete(t.id)} style={actionBtn("#aaaaaa")}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.2rem", color: "#ccc", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              No transactions yet
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "520px" }}>
            <div style={{ borderBottom: "2px solid #f0f0f0", paddingBottom: "16px", marginBottom: "20px" }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "2rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {editing ? "Edit Transaction" : "Add Transaction"}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>

              {/* Type toggle */}
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Payment Type</label>
                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button type="button"
                    onClick={() => setForm({ ...form, is_counter_sale: false, shop_id: "" })}
                    style={{
                      flex: 1, padding: "10px", border: "2px solid", borderRadius: "6px", cursor: "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "14px", textTransform: "uppercase",
                      borderColor: !form.is_counter_sale ? "#2563eb" : "#e5e7eb",
                      background: !form.is_counter_sale ? "#dbeafe" : "#fff",
                      color: !form.is_counter_sale ? "#1d4ed8" : "#888"
                    }}>
                    Shop Payment
                  </button>
                  <button type="button"
                    onClick={() => setForm({ ...form, is_counter_sale: true, shop_id: "" })}
                    style={{
                      flex: 1, padding: "10px", border: "2px solid", borderRadius: "6px", cursor: "pointer",
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: "14px", textTransform: "uppercase",
                      borderColor: form.is_counter_sale ? "#92400e" : "#e5e7eb",
                      background: form.is_counter_sale ? "#fef9c3" : "#fff",
                      color: form.is_counter_sale ? "#92400e" : "#888"
                    }}>
                    Counter Sale
                  </button>
                </div>
              </div>

              {/* Shop selector — only if not counter sale */}
              {!form.is_counter_sale && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={labelStyle}>Shop</label>
                  <SearchableSelect
                    options={shopOptions}
                    value={form.shop_id}
                    onChange={val => setForm({ ...form, shop_id: val })}
                    placeholder="Search shop name or owner..."
                    required
                  />
                  <p style={{ fontSize: "11px", color: "#888", marginTop: "6px", fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Payment will be auto-applied to oldest unpaid bill
                  </p>
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Amount ₹</label>
                <input type="number" className="input" style={{ marginTop: "6px" }}
                  value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="0" required min="1" />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Date</label>
                <input type="date" className="input" style={{ marginTop: "6px" }}
                  value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} required />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={labelStyle}>Notes</label>
                <textarea className="input" style={{ marginTop: "6px", minHeight: "70px" }}
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes..." />
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