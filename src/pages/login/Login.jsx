import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import "/src/styles/Login.css"; // ⬅️ add this line
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";


export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    
    const db = getFirestore();
    
    const onSubmit = async (e) => {
        e.preventDefault();
        setErr(""); setLoading(true);
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
        <div className="login-page">
            <div className="login-card">
                <h1 className="login-title">Login</h1>

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

                    <label className="login-label">
                        <span>Password</span>
                        <input
                            className="login-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </label>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "Signing in..." : "Login"}
                    </button>
                </form>
                <div style={{ marginTop: 8, textAlign: "center" }}>
                    <a href="/reset" style={{ fontSize: 13, color: "#2563eb", textDecoration: "none" }}>
                        Forgot password?
                    </a>
                </div>
            </div>
        </div>
    );
}
