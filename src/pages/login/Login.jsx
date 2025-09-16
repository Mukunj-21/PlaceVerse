// src/pages/login/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import "../../styles/Login.css"; // ✅ make sure file exists in src/styles/login.css

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // read profile
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);

      if (!snap.exists() || snap.data()?.active !== true) {
        await signOut(auth);
        setErr("Your account is not activated. Please contact the admin.");
        return;
      }

      const role = snap.data()?.role;
      if (role === "admin") navigate("/admin");
      else if (role === "recruiter") navigate("/recruiter");
      else navigate("/student");
    } catch (e) {
      setErr(mapErr(e.code) || e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const mapErr = (code) =>
    ({
      "auth/invalid-email": "Invalid email.",
      "auth/user-not-found": "No user with that email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/too-many-requests": "Too many attempts. Try later.",
    }[code] || "");

  return (
    <div className="login-wrapper">
      <div className="login-page">
        <div className="login-box">
          <h1 className="login-title">Login</h1>

          {err && <p className="login-error">{err}</p>}

          <form onSubmit={onSubmit} className="login-form">
            <div className="login-input-box">
              <input
                className="login-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label className="login-label">Email</label>
            </div>

            <div className="login-input-box">
              <input
                className="login-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label className="login-label">Password</label>
            </div>

            <div className="login-links">
              <a href="/reset" className="login-link">
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>

            <div className="login-links">
              <a href="/register" className="login-link">
                Signup
              </a>
            </div>
          </form>
        </div>

        {/* animated spans for glowing circular background */}
        {Array.from({ length: 50 }).map((_, i) => (
          <span key={i} style={{ ["--i"]: `${i}` }}></span>
        ))}
      </div>
    </div>
  );
}
