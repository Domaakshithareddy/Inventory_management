import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ marginLeft: "220px", flex: 1, minHeight: "100vh", background: "white" }}>
        <Navbar />
        <main style={{ paddingTop: "56px", padding: "56px 24px 24px 24px" }}>{children}</main>
      </div>
    </div>
  );
}
