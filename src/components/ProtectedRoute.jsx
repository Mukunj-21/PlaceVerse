import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth } from "../firebase";

/**
 * ProtectedRoute wraps around dashboard pages and ensures:
 *  1. user is logged in
 *  2. user is "active" in Firestore
 *  3. user's role matches the allowed roles
 *
 * Example usage:
 *   <ProtectedRoute allow={["admin"]}><AdminDashboard/></ProtectedRoute>
 */
export default function ProtectedRoute({ children, allow }) {
  // loading → true while Firebase is checking user state
  const [loading, setLoading] = useState(true);

  // ok → true if user passes all checks (auth + active + role)
  const [ok, setOk] = useState(false);

  // role → we store the user's role here (student, recruiter, admin)
  const [role, setRole] = useState(null);

  // location → used so we can redirect back later if needed
  const location = useLocation();

  useEffect(() => {
    const db = getFirestore();

    // subscribe to Firebase auth changes (login/logout)
    const unsub = onAuthStateChanged(auth, (user) => {
      (async () => {
        if (!user) {
          // no user signed in → block access
          setOk(false);
          setLoading(false);
          return;
        }

        try {
          // get Firestore doc for this user
          const ref = doc(db, "users", user.uid);
          const snap = await getDoc(ref);
          const data = snap.exists() ? snap.data() : null;

          // must exist + active === true
          if (!data || data.active !== true) {
            await signOut(auth); // sign out inactive user
            setOk(false);
            setLoading(false);
            return;
          }

          // store their role (admin/student/recruiter)
          setRole(data.role || null);

          // if "allow" prop is passed, check if role is inside that list
          if (Array.isArray(allow) && allow.length > 0) {
            const allowed = allow.includes(data.role);
            setOk(allowed);
          } else {
            // if no "allow" provided → just require login+active
            setOk(true);
          }
        } catch (e) {
          // if error occurs → fail closed (block user)
          await signOut(auth);
          setOk(false);
        } finally {
          // in all cases, we finished loading
          setLoading(false);
        }
      })();
    });

    return () => unsub(); // cleanup on unmount
  }, [allow]);

  // while checking auth state → render nothing (avoids flicker)
  if (loading) return null;

  // if user not ok → decide where to send them
  if (!ok) {
    // if user had a role but was denied → go to Not Authorized page
    if (role && Array.isArray(allow) && allow.length > 0 && !allow.includes(role)) {
      return <Navigate to="/not-authorized" replace state={{ from: location }} />;
    }
    // otherwise (not logged in or inactive) → back to login
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // if all checks pass → render the child page (dashboard)
  return children;
}
