import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const today = new Date().toISOString().split("T")[0];
const emptyForm = { type: "DEPOSIT", amount: "", notes: "", transaction_date: today, company_id: "" };

const TYPE_CONFIG = {
  DEPOSIT:     { label: "Deposit to Bank",    badge: "↑ Deposit to Bank",    color: "#15803d", bg: "#dcfce7" },
  WITHDRAWAL:  { label: "Bank Withdrawal",     badge: "↓ Bank Withdrawal",     color: "#991b1b", bg: "#fee2e2" },
  BORROW_CASH: { label: "Borrowed from Cash",  badge: "Borrowed from Cash",    color: "#92400e", bg: "#fef9c3" },
  RETURN_CASH: { label: "Returned to Cash",    badge: "Returned to Cash",      color: "#5b21b6", bg: "#ede9fe" },
  BORROW_BANK: { label: "Borrowed from Bank",  badge: "Borrowed from Bank",    color: "#92400e", bg: "#fef9c3" },
  RETURN_BANK: { label: "Returned to Bank",    badge: "Returned to Bank",      color: "#5b21b6", bg: "#ede9fe" }
};

export default function CashFlow() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canEdit = !isAdmin;

  const [summary, setSummary] = useState({
    counter_sales_total: 0, bills_paid_total: 0,
    total_deposits: 0, total_withdrawals: 0,
    total_borrow_cash: 0, total_borrow_bank: 0,
    total_return_cash: 0, total_return_bank: 0,
    cash_in_hand: 0, cash_in_bank: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await api.get("/bank-transactions");
    setSummary(res.data.summary);
    setTransactions(Array.isArray(res.data.transactions) ? res.data.transactions : []);
  };

  useEffect(() => {
    load();
    api.get("/companies").then(r => setCompanies(r.data));
  }, []);

  const openAdd = (type = "DEPOSIT") => {
    setForm({ ...emptyForm, type });
    setEditing(null);
    setModal(true);
  };

  const openEdit = (tx) => {
    setForm({
      type: tx.type,
      amount: tx.amount,
      notes: tx.notes || "",
      transaction_date: tx.transaction_date?.split("T")[0] || today,
      company_id: tx.company_id || ""
    });
    setEditing(tx.id);
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (editing) await api.put(`/bank-transactions/${editing}`, form);
      else await api.post("/bank-transactions", form);
      setModal(false);
      setForm(emptyForm);
      setEditing(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/bank-transactions/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete");
    }
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

  const cardBtn = (bg, border, color) => ({
    flex: 1, padding: "7px 10px", background: bg, border: `1px solid ${border}`,
    borderRadius: "6px", color, fontSize: "13px", fontWeight: 700, cursor: "pointer",
    fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em"
  });

  const cfg = TYPE_CONFIG[form.type] || TYPE_CONFIG.DEPOSIT;

  const previewText = () => {
    const amt = `₹${Number(form.amount).toLocaleString()}`;
    const company = companies.find(c => c.id === form.company_id);
    switch (form.type) {
      case "DEPOSIT":     return `${amt} moves from Cash → Bank`;
      case "WITHDRAWAL":  return company ? `${amt} paid to ${company.name} — reduces their outstanding` : `${amt} deducted from Bank`;
      case "BORROW_CASH": return `${amt} lent out — Cash in hand decreases`;
      case "RETURN_CASH": return `${amt} returned — Cash in hand increases`;
      case "BORROW_BANK": return `${amt} lent out — Bank balance decreases`;
      case "RETURN_BANK": return `${amt} returned — Bank balance increases`;
      default: return "";
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", marginTop: "20px" }}>
        <div>
          <h1 className="section-title">Cash Flow</h1>
          <p style={{ fontSize: "15px", color: "#888", marginTop: "4px" }}>Track cash in hand and cash in bank</p>
          {isAdmin && (
            <p style={{ color: "#d97706", fontSize: "14px", marginTop: "4px" }}>
              👁️ Admin View-Only Mode
            </p>
          )}
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn-primary" onClick={() => openAdd("DEPOSIT")}>+ Deposit to Bank</button>
            <button className="btn-outline" onClick={() => openAdd("WITHDRAWAL")}>− Bank Withdrawal</button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>

        {/* Cash in Hand */}
        <div className="card" style={{ padding: "24px" }}>
          <p style={labelStyle}>Value in Cash</p>
          <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "2.4rem", fontWeight: 700, color: "#C8102E", margin: "8px 0 16px" }}>
            ₹{Number(summary.cash_in_hand).toLocaleString()}
          </p>
          <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <SummaryRow label="Counter Sales" value={`₹${Number(summary.counter_sales_total).toLocaleString()}`} />
            <SummaryRow label="Bills Collected" value={`₹${Number(summary.bills_paid_total).toLocaleString()}`} />
            <SummaryRow label="Deposited to Bank" value={`− ₹${Number(summary.total_deposits).toLocaleString()}`} color="#C8102E" />
            {summary.total_borrow_cash > 0 && <SummaryRow label="Borrowed from Cash" value={`− ₹${Number(summary.total_borrow_cash).toLocaleString()}`} color="#92400e" />}
            {summary.total_return_cash > 0 && <SummaryRow label="Returned to Cash" value={`+ ₹${Number(summary.total_return_cash).toLocaleString()}`} color="#16a34a" />}
            {canEdit && (
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f0f0f0" }}>
                <button style={cardBtn("#fef9c3", "#fbbf24", "#92400e")} onClick={() => openAdd("BORROW_CASH")}>Borrow Cash</button>
                <button style={cardBtn("#ede9fe", "#c4b5fd", "#5b21b6")} onClick={() => openAdd("RETURN_CASH")}>Return Cash</button>
              </div>
            )}
          </div>
        </div>

        {/* Cash in Bank */}
        <div className="card" style={{ padding: "24px" }}>
          <p style={labelStyle}>Cash in Bank</p>
          <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "2.4rem", fontWeight: 700, color: "#16a34a", margin: "8px 0 16px" }}>
            ₹{Number(summary.cash_in_bank).toLocaleString()}
          </p>
          <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <SummaryRow label="Total Deposited" value={`₹${Number(summary.total_deposits).toLocaleString()}`} color="#16a34a" />
            <SummaryRow label="Total Withdrawn" value={`− ₹${Number(summary.total_withdrawals).toLocaleString()}`} color="#C8102E" />
            {summary.total_borrow_bank > 0 && <SummaryRow label="Borrowed from Bank" value={`− ₹${Number(summary.total_borrow_bank).toLocaleString()}`} color="#92400e" />}
            {summary.total_return_bank > 0 && <SummaryRow label="Returned to Bank" value={`+ ₹${Number(summary.total_return_bank).toLocaleString()}`} color="#16a34a" />}
            {canEdit && (
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f0f0f0" }}>
                <button style={cardBtn("#fef9c3", "#fbbf24", "#92400e")} onClick={() => openAdd("BORROW_BANK")}>Borrow Bank</button>
                <button style={cardBtn("#ede9fe", "#c4b5fd", "#5b21b6")} onClick={() => openAdd("RETURN_BANK")}>Return Bank</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div style={{ marginBottom: "12px" }}>
        <p style={{ ...labelStyle, fontSize: "13px" }}>Transaction History</p>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
          <thead className="table-head">
            <tr>
              {["Date", "Type", "Company Paid", "Amount", "Notes", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => {
              const tcfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.DEPOSIT;
              return (
                <tr key={tx.id} className="table-row">
                  <td style={{ color: "#555", fontSize: "15px", padding: "16px" }}>
                    {new Date(tx.transaction_date).toLocaleDateString("en-IN")}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{
                      padding: "4px 12px", borderRadius: "9999px", fontSize: "13px",
                      fontWeight: 600, background: tcfg.bg, color: tcfg.color, whiteSpace: "nowrap"
                    }}>
                      {tcfg.badge}
                    </span>
                  </td>
                  <td style={{ padding: "16px", fontSize: "15px", fontWeight: 600, color: tx.company_name ? "#111" : "#ccc" }}>
                    {tx.company_name || "—"}
                  </td>
                  <td style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "19px", color: tcfg.color, padding: "16px" }}>
                    ₹{Number(tx.amount).toLocaleString()}
                  </td>
                  <td style={{ color: "#888", fontSize: "15px", padding: "16px" }}>
                    {tx.notes || "—"}
                  </td>
                  <td style={{ padding: "16px" }}>
                    {canEdit && (
                      <div style={{ display: "flex", gap: "16px" }}>
                        <button onClick={() => openEdit(tx)} style={actionBtn("#C8102E")}>Edit</button>
                        <button onClick={() => handleDelete(tx.id)} style={actionBtn("#aaaaaa")}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
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
      {modal && canEdit && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ borderBottom: "2px solid #f0f0f0", paddingBottom: "16px", marginBottom: "20px" }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "2rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {editing ? "Edit Transaction" : cfg.label}
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              {editing && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={labelStyle}>Transaction Type</label>
                  <select className="input" style={{ marginTop: "6px" }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="DEPOSIT">↑ Deposit to Bank</option>
                    <option value="WITHDRAWAL">↓ Bank Withdrawal</option>
                    <option value="BORROW_CASH">Borrowed from Cash</option>
                    <option value="RETURN_CASH">Returned to Cash</option>
                    <option value="BORROW_BANK">Borrowed from Bank</option>
                    <option value="RETURN_BANK">Returned to Bank</option>
                  </select>
                </div>
              )}

              {form.type === "WITHDRAWAL" && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={labelStyle}>Pay To Company (optional)</label>
                  <select className="input" style={{ marginTop: "6px" }} value={form.company_id || ""} onChange={e => setForm({ ...form, company_id: e.target.value })}>
                    <option value="">— No Company —</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {form.company_id && (
                    <p style={{ fontSize: "12px", color: "#16a34a", marginTop: "6px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>
                      Will reduce outstanding balance for this company
                    </p>
                  )}
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Amount ₹</label>
                <input type="number" className="input" style={{ marginTop: "6px" }} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="1" />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Date</label>
                <input type="date" className="input" style={{ marginTop: "6px" }} value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} required />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={labelStyle}>Notes</label>
                <textarea className="input" style={{ marginTop: "6px", minHeight: "80px" }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
              </div>

              {form.amount > 0 && (
                <div style={{ background: cfg.bg, borderLeft: `4px solid ${cfg.color}`, padding: "12px", marginBottom: "20px", borderRadius: "4px" }}>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: cfg.color, margin: 0 }}>
                    {previewText()}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </button>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => { setModal(false); setEditing(null); setForm(emptyForm); }}>
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

function SummaryRow({ label, value, color = "#111" }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ fontSize: "13px", color: "#888" }}>{label}</span>
      <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: "14px", color }}>{value}</span>
    </div>
  );
}