import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import "./Login.css"; // re-use the same clean card styles

export default function Reset() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setInfo(""); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setInfo("If this email exists, a reset link has been sent. Check your inbox and spam.");
    } catch (e) {
      // Friendly messages
      const map = {
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-not-found": "If this email exists, a link will be sent. (We don't reveal accounts.)",
        "auth/too-many-requests": "Too many attempts. Try again later.",
      };
      setErr(map[e.code] || "Could not send reset email. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Reset password</h1>

        {info && <p className="login-error" style={{ color: "#059669" }}>{info}</p>}
        {err && <p className="login-error">{err}</p>}

        <form onSubmit={onSubmit} className="login-form">
          <label className="login-label">
            <span>Email</span>
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div style={{ marginTop: 10, textAlign: "center" }}>
          <a href="/login" style={{ fontSize: 13, color: "#2563eb", textDecoration: "none" }}>
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
