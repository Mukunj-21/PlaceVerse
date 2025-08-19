// PURPOSE: A reusable dark header bar for all dashboards.
// Shows brand/title (left), and on the right: user's email, role, and a Logout button.
//
// How it works:
//  - Listens to Firebase Auth for the current user.
//  - Reads the user's profile from Firestore to get "role" (and any other fields).
//  - Renders a dark header with role pill, email, and Logout action.

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth } from "../firebase";
import "./Header.css"; // dark styles for this bar

export default function AppHeader() {
  // Local UI state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirestore();

    // Subscribe to auth changes (user login/logout)
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in — header will just show brand (no user info)
        setEmail("");
        setRole("");
        setLoading(false);
        return;
      }

      try {
        // Get Firestore profile users/{uid} to find their role, etc.
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setRole(data.role || "");
        }
        setEmail(user.email || "");
      } catch (e) {
        // If profile fetch fails, we still show email (role unknown)
        console.error("Header profile fetch failed:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Small helper to render a role badge
  const RolePill = () => {
    if (!role) return null;
    const cls =
      role === "admin" ? "hd-pill hd-admin" :
      role === "recruiter" ? "hd-pill hd-recruiter" :
      "hd-pill hd-student";
    return <span className={cls}>{role}</span>;
  };

  return (
    <header className="hd-wrap">
      {/* Left: brand / project title */}
      <div className="hd-left">
        <div className="hd-logo" aria-hidden>🧭</div>
        <div className="hd-brand">
          <div className="hd-title">PlaceVerse</div>
          <div className="hd-sub">Placement Portal</div>
        </div>
      </div>

      {/* Right: user info + logout (only if logged in) */}
      <div className="hd-right">
        {!loading && email ? (
          <>
            <RolePill />
            <div className="hd-email" title={email}>{email}</div>
            <button className="hd-btn" onClick={() => signOut(auth)}>Logout</button>
          </>
        ) : (
          // When not logged in (or still loading), just keep space minimal
          <div className="hd-ghost" />
        )}
      </div>
    </header>
  );
}
