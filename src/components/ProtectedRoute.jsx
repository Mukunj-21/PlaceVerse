import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth } from "../firebase";

export default function ProtectedRoute({ children, allow }) {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [role, setRole] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const db = getFirestore();

    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setOk(false);
          return;
        }

        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? snap.data() : null;

        if (!data || data.active !== true) {
          setOk(false);
          return;
        }

        setRole(data.role || null);

        if (Array.isArray(allow) && allow.length > 0) {
          setOk(allow.includes(data.role));
        } else {
          setOk(true);
        }
      } catch (_) {
        // fail closed, but don't signOut here
        setOk(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [allow]);

  if (loading) return null; // prevents flicker

  if (!ok) {
    if (role && Array.isArray(allow) && allow.length > 0 && !allow.includes(role)) {
      return <Navigate to="/not-authorized" replace state={{ from: location }} />;
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
