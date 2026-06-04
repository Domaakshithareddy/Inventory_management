/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

// ── Reusable SearchableSelect ──────────────────────────────────────────────
function SearchableSelect({ options, value, onChange, placeholder = "Search...", required = false }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find(o => o.value === value);
  const filtered = query.trim() === ""
    ? options
    : options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
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
              display = (
                <>
                  {label.slice(0, idx)}
                  <strong style={{ color: "#C8102E" }}>{label.slice(idx, idx + lq.length)}</strong>
                  {label.slice(idx + lq.length)}
                </>
              );
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
              >
                {display}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ──────────────────────────────────────────────────────────────────────────

// Force UTC interpretation for IST display
const toIST = (raw) => {
  if (!raw) return new Date();
  const utc = raw.endsWith("Z") || raw.includes("+") ? raw : raw + "Z";
  return new Date(utc);
};

const emptyItem = {
  product_id: "",
  quantity_cases: "",
  quantity_units: "",
  price_per_unit: "",
};

const emptyFreeItem = { product_id: "", quantity_units: "" };

export default function CounterSales() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [editItem, setEditItem] = useState({ ...emptyItem });
  const [loadingNew, setLoadingNew] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [godowns, setGodowns] = useState([]);
  const [selectedGodown, setSelectedGodown] = useState("");
  const [newGodown, setNewGodown] = useState("");
  const [freeItems, setFreeItems] = useState([]);
  const [paymentMode, setPaymentMode] = useState("CASH");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = async () => {
    const res = await api.get("/counter-sales");
    let filtered = res.data;
    if (startDate) {
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      filtered = filtered.filter(s => toIST(s.created_at).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => toIST(s.created_at).getTime() <= end);
    }
    if (selectedGodown) {
      filtered = filtered.filter(s => s.godown_id === selectedGodown);
    }
    setSales(filtered);
  };

  useEffect(() => {
    load();
    api.get("/products").then(r => setProducts(r.data));
    if (isAdmin) api.get("/godowns").then(r => setGodowns(r.data));
  }, []);

  const applyFilter = () => load();
  const clearFilter = () => { setStartDate(""); setEndDate(""); setSelectedGodown(""); load(); };

  // ── New Sale Handlers ────────────────────────────────────────
  const updateItem = (index, field, value) => {
    setItems(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, [field]: value };
        if (field === "product_id") {
          const p = products.find(p => p.id === value);
          if (p) next.price_per_unit = p.selling_price_per_unit?.toString() || "";
        }
        return next;
      })
    );
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateFreeItem = (i, field, val) => {
    setFreeItems(prev => prev.map((fi, idx) => idx === i ? { ...fi, [field]: val } : fi));
  };
  const addFreeItem = () => setFreeItems(prev => [...prev, { ...emptyFreeItem }]);
  const removeFreeItem = (i) => setFreeItems(prev => prev.filter((_, idx) => idx !== i));

  const getBottles = (item) => {
    const p = products.find(p => p.id === item.product_id);
    const bpc = p?.bottles_per_case || 24;
    return (parseInt(item.quantity_cases || 0) * bpc) + parseInt(item.quantity_units || 0);
  };

  const getItemTotal = (item) => getBottles(item) * parseFloat(item.price_per_unit || 0);
  const grandTotal = items.reduce((s, item) => s + getItemTotal(item), 0);

  const handleSubmitNew = async (e) => {
    e.preventDefault();
    if (loadingNew) return;
    setLoadingNew(true);
    try {
      for (const item of items) {
        if (!item.product_id) continue;
        const totalBottles = getBottles(item);
        if (totalBottles <= 0) continue;
        await api.post("/counter-sales", {
          product_id: item.product_id,
          quantity_units: totalBottles,
          price_per_unit: parseFloat(item.price_per_unit || 0),
          payment_mode: paymentMode,
          godown_id: isAdmin ? newGodown : undefined
        });
      }
      for (const fi of freeItems) {
        if (!fi.product_id || !fi.quantity_units) continue;
        await api.post("/free-products", { product_id: fi.product_id, quantity_units: parseInt(fi.quantity_units), given_date: new Date().toISOString().split("T")[0], notes: "Given with counter sale", sale_type: "COUNTER" });
      }
      setModal(false);
      setItems([{ ...emptyItem }]);
      setFreeItems([]);
      setPaymentMode("CASH");
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to record sale");
    } finally {
      setLoadingNew(false);
    }
  };

  // ── Edit Handlers ─────────────────────────────────────────────
  const openEdit = (sale) => {
    const bpc = sale.bottles_per_case || 24;
    const cases = Math.floor(sale.quantity_units / bpc);
    const extra = sale.quantity_units % bpc;
    setEditItem({
      product_id: sale.product_id.toString(),
      quantity_cases: cases.toString(),
      quantity_units: extra.toString(),
      price_per_unit: sale.price_per_unit.toString(),
      payment_mode: sale.payment_mode || "CASH"
    });
    setEditModal(sale.id);
  };

  const updateEditItem = (field, value) => {
    setEditItem(prev => {
      const next = { ...prev, [field]: value };
      if (field === "product_id") {
        const p = products.find(p => p.id === value);
        if (p) next.price_per_unit = p.selling_price_per_unit?.toString() || "";
      }
      return next;
    });
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editModal || loadingEdit) return;
    setLoadingEdit(true);
    try {
      const p = products.find(prod => prod.id === editItem.product_id);
      if (!p) throw new Error("Product not found");
      const totalBottles = (parseInt(editItem.quantity_cases || 0) * (p.bottles_per_case || 24)) + parseInt(editItem.quantity_units || 0);
      if (totalBottles <= 0) { alert("Please enter valid quantity"); return; }
      await api.put(`/counter-sales/${editModal}`, {
        product_id: editItem.product_id,
        quantity_units: totalBottles,
        price_per_unit: parseFloat(editItem.price_per_unit || 0),
        payment_mode: editItem.payment_mode || "CASH"
      });
      setEditModal(null);
      setEditItem({ ...emptyItem });
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update sale");
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this sale? Inventory will be restored.")) return;
    try {
      await api.delete(`/counter-sales/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete sale");
    }
  };

  const labelStyle = {
    fontSize: "13px", color: "#111", textTransform: "uppercase",
    letterSpacing: "0.08em", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600
  };

  const actionBtn = (color) => ({
    color, fontSize: "15px", background: "none", border: "none", cursor: "pointer",
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.06em"
  });

  // Payment mode toggle button style
  const modeBtn = (active, color) => ({
    flex: 1, padding: "8px", border: `2px solid ${active ? color : "#e5e7eb"}`,
    background: active ? color : "transparent",
    color: active ? "#fff" : "#888",
    cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700, fontSize: "13px", textTransform: "uppercase",
    letterSpacing: "0.06em", borderRadius: "3px", transition: "all 0.1s"
  });

  const productOptions = products.map(p => ({ value: p.id, label: p.name }));

  const selectedProductForEdit = products.find(p => p.id === editItem.product_id);
  const editTotalBottles = selectedProductForEdit
    ? (parseInt(editItem.quantity_cases || 0) * (selectedProductForEdit.bottles_per_case || 24)) + parseInt(editItem.quantity_units || 0)
    : 0;
  const editItemTotal = editTotalBottles * parseFloat(editItem.price_per_unit || 0);

  // Table columns: conditionally include Godown for admin
  const tableHeaders = ["#", "Date", "Time", "Product", ...(isAdmin ? ["Godown"] : []), "Qty Sold", "Price / Bottle", "Mode", "Total", "Actions"];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", marginTop: "20px" }}>
        <div>
          <h1 className="section-title">Counter Sales</h1>
          <p style={{ fontSize: "15px", color: "#888", marginTop: "4px" }}>All sales • Latest on top</p>
        </div>
        <button className="btn-primary" onClick={() => { setItems([{ ...emptyItem }]); setModal(true); }}>
          + New Sale
        </button>
      </div>

      {/* Date Range Filter */}
      <div style={{ background: "#f8f8f8", borderLeft: "4px solid #C8102E", padding: "16px", marginBottom: "24px", borderRadius: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" className="input" style={{ marginTop: "6px" }} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input type="date" className="input" style={{ marginTop: "6px" }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          {isAdmin && (
            <div>
              <label style={labelStyle}>Godown</label>
              <select className="input" style={{ marginTop: "6px" }} value={selectedGodown} onChange={e => setSelectedGodown(e.target.value)}>
                <option value="">All Godowns</option>
                {godowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn-primary" onClick={applyFilter} style={{ marginTop: "20px" }}>Apply Filter</button>
            <button className="btn-outline" onClick={clearFilter} style={{ marginTop: "20px" }}>Clear</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
          <thead className="table-head">
            <tr>
              {tableHeaders.map(h => (
                <th key={h} style={{ padding: "12px 16px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.map((s, idx) => {
              const bpc = s.bottles_per_case || 24;
              const cases = Math.floor(s.quantity_units / bpc);
              const bottles = s.quantity_units % bpc;
              let qtyText = "";
              if (cases > 0) qtyText += `${cases}C`;
              if (bottles > 0) qtyText += `${qtyText ? " " : ""}${bottles}B`;
              if (!qtyText) qtyText = `${s.quantity_units}B`;
              const istDate = toIST(s.created_at);
              const isOnline = s.payment_mode === "ONLINE";

              return (
                <tr key={s.id} className="table-row">
                  <td style={{ color: "#bbb", fontSize: "13px", padding: "16px", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600 }}>
                    {sales.length - idx}
                  </td>
                  <td style={{ color: "#555", fontSize: "15px", padding: "16px" }}>
                    {istDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td style={{ color: "#888", fontSize: "14px", padding: "16px" }}>
                    {istDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: "16px", padding: "16px" }}>{s.product_name}</td>
                  {isAdmin && (
                    <td style={{ color: "#888", fontSize: "14px", padding: "16px" }}>{s.godown_name || "—"}</td>
                  )}
                  <td style={{ fontSize: "15px", fontWeight: 500, padding: "16px" }}>{qtyText}</td>
                  <td style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: "15px", padding: "16px" }}>
                    ₹{Number(s.price_per_unit).toLocaleString()}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{
                      fontSize: "12px", fontWeight: 700, padding: "3px 10px",
                      fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.05em",
                      background: isOnline ? "#eff6ff" : "#f0fdf4",
                      color: isOnline ? "#2563eb" : "#16a34a",
                      border: `1px solid ${isOnline ? "#bfdbfe" : "#bbf7d0"}`,
                      borderRadius: "3px"
                    }}>
                      {isOnline ? "Online" : "Cash"}
                    </span>
                  </td>
                  <td style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "19px", color: "#16a34a", padding: "16px" }}>
                    ₹{Number(s.total_amount).toLocaleString()}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <button onClick={() => openEdit(s)} style={actionBtn("#2563eb")}>Edit</button>
                      <button onClick={() => handleDelete(s.id)} style={actionBtn("#aaaaaa")}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sales.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.2rem", color: "#ccc", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              No counter sales yet
            </p>
          </div>
        )}
      </div>

      {/* New Sale Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "720px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ borderBottom: "2px solid #f0f0f0", paddingBottom: "16px", marginBottom: "20px" }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "2rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                New Counter Sale
              </h2>
            </div>
            <form onSubmit={handleSubmitNew}>
              {isAdmin && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={labelStyle}>Godown</label>
                  <select className="input" style={{ marginTop: "6px" }} value={newGodown} onChange={e => setNewGodown(e.target.value)} required>
                    <option value="">Select Godown</option>
                    {godowns.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              )}

              {items.map((item, i) => {
                const selectedProduct = products.find(p => p.id === item.product_id);
                const bpc = selectedProduct?.bottles_per_case || 24;
                const totalBottles = getBottles(item);
                const itemTotal = getItemTotal(item);

                return (
                  <div key={i} style={{ background: "#f8f8f8", borderLeft: "3px solid #e0e0e0", padding: "12px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <SearchableSelect
                          options={productOptions}
                          value={item.product_id}
                          onChange={val => updateItem(i, "product_id", val)}
                          placeholder="Search product..."
                          required
                        />
                      </div>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)}
                          style={{ color: "#aaa", background: "none", border: "none", cursor: "pointer", fontSize: "16px", marginTop: "8px", flexShrink: 0 }}>✕</button>
                      )}
                    </div>
                    {selectedProduct && (
                      <p style={{ fontSize: "13px", color: "#111", margin: "0 0 10px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>
                        ₹{selectedProduct.selling_price_per_unit}/bottle &nbsp;|&nbsp; {bpc} bottles/case
                      </p>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", alignItems: "end", marginBottom: "12px" }}>
                      <div>
                        <label style={labelStyle}>Cases</label>
                        <input type="number" className="input" style={{ marginTop: "4px" }}
                          value={item.quantity_cases} onChange={e => updateItem(i, "quantity_cases", e.target.value)} min="0" placeholder="0" />
                      </div>
                      <div>
                        <label style={labelStyle}>Extra Bottles</label>
                        <input type="number" className="input" style={{ marginTop: "4px" }}
                          value={item.quantity_units} onChange={e => updateItem(i, "quantity_units", e.target.value)} min="0" placeholder="0" />
                      </div>
                      <div>
                        <label style={labelStyle}>Price / Bottle</label>
                        <input type="number" className="input" style={{ marginTop: "4px" }}
                          value={item.price_per_unit} onChange={e => updateItem(i, "price_per_unit", e.target.value)} placeholder="0" required />
                      </div>
                    </div>
                    {totalBottles > 0 && (
                      <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "14px", color: "#555" }}>{totalBottles} bottles</span>
                        <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: "#16a34a" }}>₹{itemTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              <button type="button" onClick={addItem}
                style={{ color: "#C8102E", fontSize: "15px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "16px" }}>
                + Add Product
              </button>

              {grandTotal > 0 && (
                <div style={{ background: "#f8f8f8", borderLeft: "4px solid #16a34a", padding: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={labelStyle}>Grand Total</span>
                  <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: "1.8rem", fontWeight: 700, color: "#16a34a" }}>
                    ₹{grandTotal.toLocaleString()}
                  </span>
                </div>
              )}
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Payment Mode</label>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button type="button" style={modeBtn(paymentMode === "CASH", "#16a34a")} onClick={() => setPaymentMode("CASH")}>Cash</button>
                  <button type="button" style={modeBtn(paymentMode === "ONLINE", "#2563eb")} onClick={() => setPaymentMode("ONLINE")}>Online</button>
                </div>
              </div>
              <div style={{ borderTop: "2px solid #f0f0f0", paddingTop: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <label style={labelStyle}>Free Products <span style={{ color: "#111", fontWeight: 400, textTransform: "none", fontSize: "13px" }}>(optional)</span></label>
                    <p style={{ fontSize: "11px", color: "#bbb", margin: "2px 0 0", fontFamily: "'Barlow Condensed', sans-serif" }}>Won't affect inventory • Will appear in Free Products page</p>
                  </div>
                  <button type="button" onClick={addFreeItem} style={{ color: "#16a34a", fontSize: "12px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>+ Add Free Item</button>
                </div>
                {freeItems.length === 0 && (
                  <p style={{ fontSize: "13px", color: "#ccc", fontFamily: "'Barlow Condensed', sans-serif", textAlign: "center", padding: "8px 0" }}>No free products — click + Add Free Item to add</p>
                )}
                {freeItems.map((fi, i) => (
                  <div key={i} style={{ background: "#f0fdf4", borderLeft: "3px solid #16a34a", padding: "12px", marginBottom: "10px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...labelStyle, color: "#16a34a" }}>Product</label>
                        <SearchableSelect options={productOptions} value={fi.product_id} onChange={val => updateFreeItem(i, "product_id", val)} placeholder="Search product..." />
                      </div>
                      <button type="button" onClick={() => removeFreeItem(i)} style={{ color: "#aaa", background: "none", border: "none", cursor: "pointer", fontSize: "16px", marginTop: "22px", flexShrink: 0 }}>✕</button>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: "#16a34a" }}>Bottles (free)</label>
                      <input type="number" className="input" style={{ marginTop: "4px" }} value={fi.quantity_units} onChange={e => updateFreeItem(i, "quantity_units", e.target.value)} min="1" placeholder="0" />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loadingNew}>
                  {loadingNew ? "Saving..." : "Record Sale"}
                </button>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "720px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ borderBottom: "2px solid #f0f0f0", paddingBottom: "16px", marginBottom: "20px" }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "2rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Edit Counter Sale
              </h2>
            </div>
            <form onSubmit={handleSubmitEdit}>
              <div style={{ background: "#f8f8f8", borderLeft: "3px solid #e0e0e0", padding: "16px", marginBottom: "20px" }}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={labelStyle}>Product</label>
                  <SearchableSelect
                    options={productOptions}
                    value={editItem.product_id}
                    onChange={val => updateEditItem("product_id", val)}
                    placeholder="Search product..."
                    required
                  />
                  {selectedProductForEdit && (
                    <p style={{ fontSize: "11px", color: "#aaa", marginTop: "4px", fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {selectedProductForEdit.bottles_per_case || 24} bottles/case &nbsp;|&nbsp; ₹{selectedProductForEdit.selling_price_per_unit}/bottle
                    </p>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", alignItems: "end", marginBottom: "12px" }}>
                  <div>
                    <label style={labelStyle}>Cases</label>
                    <input type="number" className="input" style={{ marginTop: "6px" }}
                      value={editItem.quantity_cases} onChange={e => updateEditItem("quantity_cases", e.target.value)} min="0" placeholder="0" />
                  </div>
                  <div>
                    <label style={labelStyle}>Extra Bottles</label>
                    <input type="number" className="input" style={{ marginTop: "6px" }}
                      value={editItem.quantity_units} onChange={e => updateEditItem("quantity_units", e.target.value)} min="0" placeholder="0" />
                  </div>
                  <div>
                    <label style={labelStyle}>Price / Bottle</label>
                    <input type="number" className="input" style={{ marginTop: "6px" }}
                      value={editItem.price_per_unit} onChange={e => updateEditItem("price_per_unit", e.target.value)} placeholder="0" required />
                  </div>
                </div>

                {/* Payment Mode toggle in edit */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={labelStyle}>Payment Mode</label>
                  <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                    <button type="button"
                      style={{
                        flex: 1, padding: "8px", border: `2px solid ${editItem.payment_mode === "CASH" ? "#16a34a" : "#e5e7eb"}`,
                        background: editItem.payment_mode === "CASH" ? "#16a34a" : "transparent",
                        color: editItem.payment_mode === "CASH" ? "#fff" : "#888",
                        cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.06em", borderRadius: "3px"
                      }}
                      onClick={() => updateEditItem("payment_mode", "CASH")}>
                      Cash
                    </button>
                    <button type="button"
                      style={{
                        flex: 1, padding: "8px", border: `2px solid ${editItem.payment_mode === "ONLINE" ? "#2563eb" : "#e5e7eb"}`,
                        background: editItem.payment_mode === "ONLINE" ? "#2563eb" : "transparent",
                        color: editItem.payment_mode === "ONLINE" ? "#fff" : "#888",
                        cursor: "pointer", fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.06em", borderRadius: "3px"
                      }}
                      onClick={() => updateEditItem("payment_mode", "ONLINE")}>
                      Online
                    </button>
                  </div>
                </div>

                {editTotalBottles > 0 && (
                  <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", color: "#555", fontWeight: 500 }}>{editTotalBottles} bottles total</span>
                    <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "#16a34a" }}>
                      ₹{editItemTotal.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loadingEdit}>
                  {loadingEdit ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => { setEditModal(null); setEditItem({ ...emptyItem }); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}