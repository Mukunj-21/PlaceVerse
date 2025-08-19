// src/pages/RecruiterApplicants.jsx
// PURPOSE: List applicants for recruiter’s jobs.

import { useState, useEffect } from "react";
import { auth } from "../../firebase";
import {
  getFirestore, collection, query, where,
  orderBy, getDocs, doc, updateDoc
} from "firebase/firestore";

export default function RecruiterApplicants() {
  const db = getFirestore();

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadApps = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "applications"),
        where("recruiterId", "==", auth.currentUser?.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setApps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadApps(); }, []);

  const changeStatus = async (app, status) => {
    await updateDoc(doc(db, "applications", app.id), { status });
    setApps(list => list.map(a => a.id === app.id ? { ...a, status } : a));
  };

  return (
    <div className="rec-card">
      <h1 className="rec-title">Applicants</h1>
      {loading && <div>Loading…</div>}
      {!loading && apps.length === 0 && <div>No applications yet.</div>}

      <div className="apps-grid">
        {apps.map(app => (
          <div className="app-card" key={app.id}>
            <div><strong>{app.studentName}</strong> ({app.studentEmail})</div>
            <div>Applied for: {app.jobTitle}</div>
            <div>Status: {app.status || "Pending"}</div>
            <div className="app-actions">
              <button onClick={() => changeStatus(app, "Shortlisted")}>Shortlist</button>
              <button onClick={() => changeStatus(app, "Rejected")}>Reject</button>
              <button onClick={() => changeStatus(app, "Selected")}>Select</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
