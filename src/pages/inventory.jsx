import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const r = await api.get("/inventory");
      setInventory(r.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div style={{ color: "#888", fontSize: "15px", padding: "48px 24px", textAlign: "center" }}>
      Loading inventory...
    </div>
  );

  if (error) return (
    <div style={{ color: "#C8102E", fontSize: "15px", padding: "48px 24px", textAlign: "center" }}>
      Error: {error}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", marginTop: "20px" }}>
        <div>
          <h1 className="section-title">Inventory</h1>
          <p style={{ fontSize: "15px", color: "#888", marginTop: "4px" }}>
            Current stock • All godowns
          </p>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <span style={{
            fontSize: "14px",
            fontWeight: 600,
            padding: "8px 16px",
            background: "#f1f5f9",
            borderRadius: "8px",
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}>
            {inventory.length} Products
          </span>
          <button
            onClick={load}
            className="btn-outline"
            style={{
              fontSize: "14px",
              fontWeight: 700,
              padding: "8px 16px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              background: "none",
              color: "#374151",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
          <thead className="table-head">
            <tr>
              {["Product", "Category", "Size", "Godown", "Cases", "Extra Bottles", "Total Bottles", "Stock Value"].map(h => (
                <th key={h} style={{ padding: "12px 16px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inventory.map(i => {
              const bpc = parseInt(i.bottles_per_case) || 1;
              const cases = parseInt(i.quantity_cases) || 0;
              const units = parseInt(i.quantity_units) || 0;
              const totalBottles = (cases * bpc) + units;

              return (
                <tr key={i.id} className="table-row">
                  <td style={{ fontWeight: 600, fontSize: "16px", padding: "16px" }}>
                    {i.product_name}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span className="badge-red">{i.category}</span>
                  </td>
                  <td style={{ color: "#888", fontSize: "15px", padding: "16px" }}>
                    {i.size || "—"}
                  </td>
                  <td style={{ color: "#888", fontSize: "15px", padding: "16px" }}>
                    {i.godown_name}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "19px",
                      color: cases < 5 ? "#C8102E" : "#111"
                    }}>
                      {cases}
                    </span>
                    <span style={{ fontSize: "13px", color: "#888", marginLeft: "6px" }}>cases</span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "19px",
                      color: units > 0 ? "#2563eb" : "#888"
                    }}>
                      {units}
                    </span>
                    <span style={{ fontSize: "13px", color: "#888", marginLeft: "6px" }}>bottles</span>
                  </td>
                  <td style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "19px",
                    padding: "16px"
                  }}>
                    {totalBottles} bottles
                  </td>
                  <td style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "19px",
                    color: "#16a34a",
                    padding: "16px"
                  }}>
                    ₹{Number(i.stock_value || 0).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {inventory.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "1.2rem",
              color: "#ccc",
              textTransform: "uppercase",
              letterSpacing: "0.1em"
            }}>
              No inventory yet
            </p>
            <p style={{
              color: "#888",
              fontSize: "15px",
              marginTop: "12px"
            }}>
              Add a purchase to see inventory here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}