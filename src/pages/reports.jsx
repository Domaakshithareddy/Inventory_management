import { useState } from "react";
import api from "../api/axios";

const DOWNLOAD_OPTIONS = [
  { type: "daily", label: "Daily Summary (Today)", icon: "📅", color: "#111111", todayOnly: true },
  { type: "bills", label: "Shop Bills Only", icon: "🧾", color: "#2563eb" },
  { type: "counter", label: "Counter Sales Only", icon: "🏷️", color: "#7c3aed" },
  { type: "complete", label: "Complete Sales (Shop + Counter)", icon: "📊", color: "#16a34a" },
  { type: "delivery", label: "Delivery Report (Driver + Route + Pending)", icon: "🚛", color: "#d97706" },
  { type: "purchases", label: "Purchases Only", icon: "🛒", color: "#0891b2" },
  { type: "expenses", label: "Expenses + Free Products + Breakage", icon: "💸", color: "#C8102E" },
  { type: "full", label: "Purchases + All Expenses", icon: "📋", color: "#374151" },
];

export default function Reports() {
  const today = new Date().toISOString().split("T")[0];
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [sales, setSales] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const fetchSales = async () => {
    const r = await api.get(`/reports/sales?from=${from}&to=${to}`);
    setSales(r.data);
    setLoaded(true);
  };

  const downloadExcel = async (type) => {
    try {
      setDownloading(type);
      // Daily summary always uses today regardless of date picker
      const useFrom = type === "daily" ? today : from;
      const useTo   = type === "daily" ? today : to;
      const response = await api.get(`/reports/download/${type}?from=${useFrom}&to=${useTo}`, {
        responseType: "blob"
      });
      const typeNames = {
        bills: 'Shop_Sales', counter: 'Counter_Sales', complete: 'Complete_Sales',
        purchases: 'Purchases', expenses: 'Expenses', full: 'Purchase_Expenses',
        delivery: 'Delivery_Report', daily: 'Daily_Summary'
      };
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${typeNames[type]}_${useFrom}_${useTo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed: " + (err.response?.data?.error || err.message));
    } finally {
      setDownloading(null);
    }
  };

  const total = sales.reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);
  const totalPaid = sales.reduce((s, b) => s + parseFloat(b.paid_amount || 0), 0);
  const totalPending = sales.reduce((s, b) => s + parseFloat(b.pending_amount || 0), 0);

  const labelStyle = {
    fontSize: "11px",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 600
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", marginTop: "20px" }}>
        <h1 className="section-title">Reports</h1>
        <button className="btn-primary" onClick={fetchSales}>
          View Sales Report
        </button>
      </div>

      {/* Date Range */}
      <div style={{
        background: "#f8f8f8",
        borderLeft: "4px solid #C8102E",
        padding: "16px",
        marginBottom: "24px",
        borderRadius: "4px"
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "16px" }}>
          <div>
            <label style={labelStyle}>From Date</label>
            <input type="date" className="input" style={{ marginTop: "6px" }} value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>To Date</label>
            <input type="date" className="input" style={{ marginTop: "6px" }} value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={fetchSales} style={{ marginTop: "20px" }}>
            View Sales Report
          </button>
        </div>
      </div>

      {/* Download Options */}
      <div style={{
        background: "#f8f8f8",
        borderLeft: "4px solid #2563eb",
        padding: "16px",
        marginBottom: "24px",
        borderRadius: "4px"
      }}>
        <p style={labelStyle}>Download Excel Reports</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", marginTop: "12px" }}>
          {DOWNLOAD_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => downloadExcel(opt.type)}
              disabled={downloading !== null}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px",
                borderRadius: "12px",
                cursor: downloading ? "not-allowed" : "pointer",
                border: `2px solid ${downloading === opt.type ? opt.color : '#e2e8f0'}`,
                background: downloading === opt.type ? opt.color : "white",
                color: downloading === opt.type ? "white" : "#111",
                opacity: downloading !== null && downloading !== opt.type ? 0.5 : 1,
                transition: "all 0.2s",
                textAlign: "left",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}
            >
              <span style={{ fontSize: "24px" }}>{opt.icon}</span>
              <div>
                <div style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  {downloading === opt.type ? "Downloading..." : opt.label}
                </div>
                <div style={{ fontSize: "12px", color: downloading === opt.type ? "rgba(255,255,255,0.8)" : "#888", marginTop: "2px" }}>
                  {opt.todayOnly ? `Today — ${today}` : `${from} → ${to}`}
                </div>
              </div>
              {downloading !== opt.type && (
                <span style={{ marginLeft: "auto", color: opt.color, fontSize: "20px", fontWeight: 700 }}>⬇</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loaded Sales Report */}
      {loaded && (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <p style={labelStyle}>Total Billed</p>
              <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "2rem", fontWeight: 700, color: "#111" }}>
                ₹{total.toLocaleString()}
              </p>
              <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
                {sales.length} bill{sales.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <p style={labelStyle}>Collected</p>
              <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "2rem", fontWeight: 700, color: "#16a34a" }}>
                ₹{totalPaid.toLocaleString()}
              </p>
            </div>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <p style={labelStyle}>Pending</p>
              <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "2rem", fontWeight: 700, color: "#C8102E" }}>
                ₹{totalPending.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Sales Table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
              <thead className="table-head">
                <tr>
                  {["Bill #", "Date", "Shop", "Godown", "Total", "Paid", "Pending", "Status"].map(h => (
                    <th key={h} style={{ padding: "12px 16px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map(b => (
                  <tr key={b.id} className="table-row">
                    <td style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "19px", color: "#C8102E", padding: "16px" }}>
                      #{b.bill_number}
                    </td>
                    <td style={{ color: "#555", fontSize: "15px", padding: "16px" }}>
                      {new Date(b.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: "16px", padding: "16px" }}>{b.shop_name}</td>
                    <td style={{ color: "#888", fontSize: "15px", padding: "16px" }}>{b.godown_name}</td>
                    <td style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "19px", padding: "16px" }}>
                      ₹{Number(b.total_amount).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "19px", color: "#16a34a", padding: "16px" }}>
                      ₹{Number(b.paid_amount || 0).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "19px", color: "#C8102E", padding: "16px" }}>
                      ₹{Number(b.pending_amount || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span className={b.status === "CLEARED" ? "badge-green" : b.status === "PARTIAL" ? "badge-red" : "badge-gray"}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sales.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 24px" }}>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.2rem", color: "#ccc", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  No sales in this period
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}