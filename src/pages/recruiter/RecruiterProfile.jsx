// src/pages/RecruiterProfile.jsx
// PURPOSE: Show recruiter’s profile info (read-only for now)

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth } from "../../firebase";

export default function RecruiterProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

  const db = getFirestore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          setError("Profile not found. Contact admin.");
        }
      } catch (e) {
        setError("Could not load profile.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [db]);

  const Row = ({ label, children }) => (
    <div className="rec-row">
      <div className="rec-label">{label}</div>
      <div className="rec-value">{children || "—"}</div>
    </div>
  );

  return (
    <div className="rec-card">
      <h1 className="rec-title">My Profile</h1>
      {loading && <div className="rec-info">Loading…</div>}
      {error && <div className="rec-error">{error}</div>}

      {!loading && !error && profile && (
        <div className="rec-grid">
          <Row label="Name">{profile.name}</Row>
          <Row label="Email">{profile.email}</Row>
          <Row label="Company">{profile.company}</Row>
          <Row label="Designation">{profile.title}</Row>
          <Row label="Phone">{profile.phone}</Row>
          <Row label="Website">{profile.website}</Row>
          <Row label="Status">{profile.active ? "Active" : "Inactive"}</Row>
        </div>
      )}
    </div>
  );
}
