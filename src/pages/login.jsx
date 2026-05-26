import { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", form);
      login(res.data);
      router.replace("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = {
    fontSize: "11px",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 600,
    display: "block",
    marginBottom: "6px"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#111111",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      borderLeft: "4px solid #C8102E"
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "3.5rem",
            fontWeight: 800,
            color: "white",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            lineHeight: 1
          }}>
            <span style={{ color: "#C8102E" }}>INV</span>ENTORY
          </h1>
          <div style={{
            marginTop: "12px",
            display: "inline-block",
            background: "#C8102E",
            padding: "3px 12px"
          }}>
            <p style={{
              color: "white",
              fontSize: "11px",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em"
            }}>
              Management System
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "white",
          borderRadius: "4px",
          padding: "32px",
          borderTop: "4px solid #C8102E"
        }}>
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "1.8rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: "24px",
            color: "#111"
          }}>
            Sign In
          </h2>

          {error && (
            <div style={{
              background: "#fff5f5",
              borderLeft: "4px solid #C8102E",
              padding: "12px 16px",
              marginBottom: "20px",
              borderRadius: "2px"
            }}>
              <p style={{ color: "#C8102E", fontSize: "14px", fontWeight: 600 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Username</label>
              <input
                type="text"
                className="input"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="Enter username"
                required
              />
            </div>

            <div style={{ marginBottom: "28px" }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", padding: "14px", fontSize: "16px" }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: "center",
          marginTop: "24px",
          color: "#333",
          fontSize: "10px",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.05em",
          textTransform: "uppercase"
        }}>
          © 2026 Inventory
        </p>

      </div>
    </div>
  );
}