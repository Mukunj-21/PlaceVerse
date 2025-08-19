import { Link } from "react-router-dom";

/**
 * Shown when a logged-in user tries to access a page
 * their role is not allowed to view.
 */
export default function NotAuthorized() {
  // simple inline styles (for quick clean look)
  const page = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    padding: "20px",
  };
  const card = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    padding: 24,
    minWidth: 320,
    textAlign: "center",
  };
  const btn = {
    display: "inline-block",
    marginTop: 12,
    padding: "8px 12px",
    borderRadius: 8,
    background: "#111827",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
  };

  return (
    <div style={page}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Not authorized</h2>
        <p style={{ color: "#6b7280" }}>
          You don’t have permission to view this page.
        </p>
        <Link to="/login" style={btn}>
          Back to login
        </Link>
      </div>
    </div>
  );
}
