// src/pages/student/StudentNotifications.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import AppHeader from "../../components/AppHeader.jsx";
import { Link } from "react-router-dom";
import "/src/styles/Student.css";

export default function StudentNotifications() {
  const db = getFirestore();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | recent | important
  const [importantIds, setImportantIds] = useState(new Set());

  // ---- load starred ids from localStorage ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pv_important_notes");
      if (raw) setImportantIds(new Set(JSON.parse(raw)));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("pv_important_notes", JSON.stringify([...importantIds]));
    } catch {}
  }, [importantIds]);

  // ---- subscribe to pushed notifications, sort client-side ----
  useEffect(() => {
    // IMPORTANT: keep the where("pushed","==",true) so rules & data shape match
    const q = query(collection(db, "jobNotes"), where("pushed", "==", true));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => {
          const A = a.pushedAt?.toDate?.() || a.createdAt?.toDate?.() || 0;
          const B = b.pushedAt?.toDate?.() || b.createdAt?.toDate?.() || 0;
          return B - A;
        });
        setNotes(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Notification fetch error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [db]);

  // ---- helpers ----
  const formatTime = (ts) => {
    const date = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!date) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getNotificationIcon = (message) => {
    const msg = (message || "").toLowerCase();
    if (msg.includes("selected") || msg.includes("congratulations")) return "🎉";
    if (msg.includes("reject") || msg.includes("sorry")) return "😔";
    if (msg.includes("interview") || msg.includes("round")) return "📞";
    if (msg.includes("deadline") || msg.includes("apply")) return "⏰";
    if (msg.includes("update") || msg.includes("status")) return "📋";
    return "📢";
  };

  const toggleImportant = (id) => {
    setImportantIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ---- filtering ----
  const filteredNotes = useMemo(() => {
    if (filter === "recent") {
      return notes.filter((n) => {
        const d = n.pushedAt?.toDate?.() || n.createdAt?.toDate?.();
        return d && (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7;
      });
    }
    if (filter === "important") {
      return notes.filter((n) => importantIds.has(n.id));
    }
    return notes;
  }, [notes, filter, importantIds]);

  // ---- counts ----
  const recentCount = useMemo(
    () =>
      notes.filter((n) => {
        const d = n.pushedAt?.toDate?.() || n.createdAt?.toDate?.();
        return d && (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7;
      }).length,
    [notes]
  );

  // count only visible notes that are starred (avoid stale ids)
  const importantCount = useMemo(
    () => notes.filter((n) => importantIds.has(n.id)).length,
    [notes, importantIds]
  );

  // ---- skeleton ----
  const renderSkeleton = () => (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="notification-card skeleton">
          <div className="notification-icon">
            <div
              className="skel"
              style={{ width: 24, height: 24, borderRadius: "50%" }}
            />
          </div>
          <div className="notification-content">
            <div className="skel skel-line" style={{ width: "80%", marginBottom: 8 }} />
            <div className="skel skel-line" style={{ width: "60%", height: 12 }} />
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="student-page">
      <AppHeader />
      <div className="student-wrap">
        {/* Back to Dashboard – make sure your router has /student pointing to StudentDashboard */}
        <div className="header-row">
          <Link to="/student" className="stu-back">
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="stu-title">Notifications</h1>
        <p className="stu-info">
          Stay updated with the latest announcements and job updates
        </p>

        {/* Stats */}
        <div className="notifications-stats">
          <div className="stat-item">
            <div className="stat-num">{notes.length}</div>
            <div className="stat-label">Total Notifications</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{recentCount}</div>
            <div className="stat-label">This Week</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{importantCount}</div>
            <div className="stat-label">Important</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({notes.length})
          </button>
          <button
            className={`filter-tab ${filter === "recent" ? "active" : ""}`}
            onClick={() => setFilter("recent")}
          >
            Recent ({recentCount})
          </button>
          <button
            className={`filter-tab ${filter === "important" ? "active" : ""}`}
            onClick={() => setFilter("important")}
          >
            Important ({importantCount})
          </button>
        </div>

        {/* Notifications list */}
        <div className="notifications-list">
          {loading ? (
            renderSkeleton()
          ) : filteredNotes.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-empty-emoji">
                {filter === "recent" ? "📅" : filter === "important" ? "⭐" : "🔔"}
              </div>
              <h3>
                {filter === "recent"
                  ? "No recent notifications"
                  : filter === "important"
                  ? "No important notifications"
                  : "No notifications yet"}
              </h3>
              <p>
                {filter === "recent"
                  ? "Check back later for new updates."
                  : filter === "important"
                  ? "All caught up on important updates!"
                  : "You'll see announcements and job updates here."}
              </p>
            </div>
          ) : (
            filteredNotes.map((note, index) => {
              const isImportant = importantIds.has(note.id);
              return (
                <div
                  key={note.id}
                  className="notification-card"
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(note.message)}
                  </div>

                  <div className="notification-content">
                    <div className="notification-message">{note.message}</div>
                    <div className="notification-meta">
                      <span className="notification-time">
                        {formatTime(note.pushedAt || note.createdAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`star ${isImportant ? "star-active" : ""}`}
                    onClick={() => toggleImportant(note.id)}
                    aria-label={
                      isImportant ? "Unmark as important" : "Mark as important"
                    }
                    title={isImportant ? "Unmark important" : "Mark as important"}
                  >
                    ⭐
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
