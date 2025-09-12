// src/pages/StudentNotifications.jsx
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.js";
import AppHeader from "../../components/AppHeader.jsx";

export default function StudentNotifications() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "jobNotes"),
      where("pushed", "==", true),
      orderBy("pushedAt", "desc") // admin sets pushedAt on push
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // If some legacy notes don’t have pushedAt, keep a stable order:
        rows.sort((a, b) => {
          const A = a.pushedAt?.toDate?.() || a.createdAt?.toDate?.() || 0;
          const B = b.pushedAt?.toDate?.() || b.createdAt?.toDate?.() || 0;
          return B - A;
        });
        setNotes(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const fmt = (ts) => (ts?.toDate ? ts.toDate().toLocaleString() : "");

  return (
    <div className="student-page">
      <AppHeader />
      <div className="student-wrap">
        <h1 className="stu-title">Notifications</h1>
        {loading ? (
          <div className="stu-info">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="stu-info">No announcements yet.</div>
        ) : (
          <div className="stu-grid">
            {notes.map((n) => (
              <div key={n.id} className="stu-notification">
                <div style={{ fontWeight: 800 }}>{n.title || "Announcement"}</div>
                <div style={{ marginTop: 6 }}>{n.message || n.text || "—"}</div>
                <div className="stu-notification-time">{fmt(n.pushedAt || n.createdAt)}</div>
                {n.company && <div className="stu-info" style={{ marginTop: 6 }}>Company: {n.company}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
