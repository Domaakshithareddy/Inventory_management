import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <div style={{
      height: "56px",
      background: "white",
      borderBottom: "3px solid #111111",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 32px",
      position: "fixed",
      top: 0,
      right: 0,
      left: "220px",
      zIndex: 10,
    }}>
      {/* Left — breadcrumb style current page indicator */}
      <div style={{
        width: "3px",
        height: "24px",
        background: "#C8102E",
        marginRight: "12px"
      }} />

      {/* Right — user info + logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px", marginLeft: "auto" }}>
        <div style={{ textAlign: "right" }}>
          <p style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "16px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#111",
            lineHeight: 1
          }}>
            {user?.username}
          </p>
          <p style={{
            fontSize: "10px",
            color: "#C8102E",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em"
          }}>
            {user?.role}
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            background: "#111111",
            color: "white",
            border: "none",
            padding: "8px 16px",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: "13px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            cursor: "pointer",
            transition: "background 0.15s"
          }}
          onMouseOver={e => e.target.style.background = "#C8102E"}
          onMouseOut={e => e.target.style.background = "#111111"}
        >
          Logout
        </button>
      </div>
    </div>
  );
}