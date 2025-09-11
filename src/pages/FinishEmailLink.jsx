// src/pages/FinishEmailLink.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAuth,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export default function FinishEmailLink() {
  const [msg, setMsg] = useState("Finishing sign-in…");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    (async () => {
      try {
        // Ensure the URL is an email-link sign-in
        if (!isSignInWithEmailLink(auth, window.location.href)) {
          setError("Invalid sign-in link.");
          return;
        }

        // Retrieve the email (we usually store it before sending the link)
        let email = window.localStorage.getItem("emailForSignIn");
        if (!email) {
          email = window.prompt("Please confirm your email to complete sign-in");
          if (!email) {
            setError("Email is required to finish sign-in.");
            return;
          }
        }

        setMsg("Verifying link…");
        const result = await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem("emailForSignIn");

        // Lookup user role to route
        setMsg("Fetching your profile…");
        const uid = result.user.uid;
        const snap = await getDoc(doc(db, "users", uid));
        const role = snap.exists() ? snap.data()?.role : null;

        // Route by role (fallback to /login if unknown)
        if (role === "admin") navigate("/admin", { replace: true });
        else if (role === "recruiter") navigate("/recruiter", { replace: true });
        else if (role === "student") navigate("/student", { replace: true });
        else navigate("/login", { replace: true });
      } catch (e) {
        console.error(e);
        setError(e?.message || "Failed to complete email link sign-in.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 24, color: "#e2e8f0" }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Finish Sign-in</h1>
      <p style={{ marginTop: 8, color: "#94a3b8" }}>
        {error ? <span style={{ color: "#fca5a5" }}>{error}</span> : msg}
      </p>
    </div>
  );
}
