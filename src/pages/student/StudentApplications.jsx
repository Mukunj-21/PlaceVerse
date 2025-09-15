// src/pages/student/StudentApplications.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppHeader from "../../components/AppHeader.jsx";
import "/src/styles/Student.css";

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { auth } from "../../firebase.js";

// ---------- helpers ----------
const toDate = (v) => {
  if (!v) return null;
  if (v.toDate) return v.toDate(); // Firestore Timestamp
  const ms = typeof v === "number" ? v : Date.parse(v);
  return Number.isNaN(ms) ? null : new Date(ms);
};
const niceDate = (d) => (d ? d.toLocaleString() : "—");
const formatDateShort = (v) => {
  const d = toDate(v);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
};
const statusClass = (s) => {
  const key = (s || "").toLowerCase().replaceAll(" ", "");
  const map = {
    applied: "st-blue",
    submitted: "st-blue",
    underreview: "st-indigo",
    shortlisted: "st-amber",
    round1: "st-amber",
    round2: "st-amber",
    selected: "st-green",
    accepted: "st-green",
    rejected: "st-red",
  };
  return map[key] || "st-grey";
};
const getStatusIcon = (status) => {
  const s = (status || "").toLowerCase();
  if (s.includes("selected") || s.includes("accepted")) return "🎉";
  if (s.includes("rejected")) return "❌";
  if (s.includes("shortlisted") || s.includes("round")) return "⏳";
  if (s.includes("review")) return "👀";
  return "📤";
};

export default function StudentApplications() {
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]); // [{id, ...application, job}]
  const [saved, setSaved] = useState([]);
  const [error, setError] = useState("");

  const [selectedApp, setSelectedApp] = useState(null);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("applied");

  // ---------- load applications ----------
  useEffect(() => {
    const loadApps = async () => {
      setLoading(true);
      setError("");
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          setLoading(false);
          return;
        }

        const qApps = query(
          collection(db, "applications"),
          where("studentId", "==", uid)
        );
        const snap = await getDocs(qApps);
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // join job doc
        const withJobs = await Promise.all(
          rows.map(async (a) => {
            try {
              const jsnap = await getDoc(doc(db, "jobs", a.jobId));
              return {
                ...a,
                job: jsnap.exists() ? { id: jsnap.id, ...jsnap.data() } : null,
              };
            } catch {
              return { ...a, job: null };
            }
          })
        );

        // newest first (by createdAt)
        withJobs.sort(
          (a, b) =>
            (toDate(b.createdAt)?.getTime() || 0) -
            (toDate(a.createdAt)?.getTime() || 0)
        );

        setApps(withJobs);
      } catch (e) {
        console.error("Applications load error:", e);
        setError("Failed to load applications.");
      } finally {
        setLoading(false);
      }
    };

    loadApps();
  }, [db]);

  // ---------- load saved jobs ----------
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const bookmarksRef = collection(db, "users", uid, "bookmarks");
        const snap = await getDocs(bookmarksRef);

        const jobs = [];
        for (const d of snap.docs) {
          const jobRef = doc(db, "jobs", d.id); // bookmark docId == jobId
          const jobSnap = await getDoc(jobRef);
          if (jobSnap.exists()) {
            jobs.push({
              id: jobSnap.id,
              ...jobSnap.data(),
              savedAt: d.data().createdAt,
            });
          }
        }

        jobs.sort(
          (a, b) =>
            (toDate(b.savedAt)?.getTime() || 0) -
            (toDate(a.savedAt)?.getTime() || 0)
        );
        setSaved(jobs);
      } catch (e) {
        console.warn("Saved jobs load warning:", e);
        setSaved([]);
      }
    };

    loadSaved();
  }, [db]);

  // ---------- subscribe to announcements when a card is opened ----------
  useEffect(() => {
    if (!selectedApp) return;

    setNotes([]);
    setNotesLoading(true);

    const qNotes = query(
      collection(db, "jobNotes"),
      where("jobId", "==", selectedApp.jobId),
      where("pushed", "==", true)
    );

    const unsub = onSnapshot(
      qNotes,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort(
          (a, b) =>
            (toDate(b.pushedAt)?.getTime() ||
              toDate(b.createdAt)?.getTime() ||
              0) -
            (toDate(a.pushedAt)?.getTime() ||
              toDate(a.createdAt)?.getTime() ||
              0)
        );
        setNotes(items);
        setNotesLoading(false);
      },
      (err) => {
        console.error("Announcements load error:", err);
        setNotes([]);
        setNotesLoading(false);
      }
    );

    return () => unsub();
  }, [db, selectedApp]);

  const closeModal = () => setSelectedApp(null);

  // ---------- computed ----------
  const appliedApps = useMemo(() => apps.filter((a) => a.job), [apps]);
  const rejectedApps = useMemo(
    () =>
      appliedApps.filter((a) =>
        (a.status || "").toLowerCase().includes("reject")
      ),
    [appliedApps]
  );
  const selectedOnly = useMemo(
    () =>
      appliedApps.filter(
        (a) =>
          (a.status || "").toLowerCase().includes("select") ||
          (a.status || "").toLowerCase().includes("accept")
      ),
    [appliedApps]
  );

  // ---------- render ----------
  return (
    <div className="student-page">
      <AppHeader />

      <div className="student-wrap">
        {/* Back button – FIXED */}
        <div className="header-row">
          <Link to="/student" className="stu-back">
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="stu-title">My Applications</h1>
        <p className="stu-info">
          Track your job applications and saved opportunities
        </p>

        {/* Stats */}
        <div className="applications-stats">
          <div className="stat-item">
            <div className="stat-num">{appliedApps.length}</div>
            <div className="stat-label">Total Applied</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{selectedOnly.length}</div>
            <div className="stat-label">Selected</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{rejectedApps.length}</div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{saved.length}</div>
            <div className="stat-label">Saved Jobs</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === "applied" ? "active" : ""}`}
            onClick={() => setActiveTab("applied")}
          >
            📤 Applied Jobs ({appliedApps.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "saved" ? "active" : ""}`}
            onClick={() => setActiveTab("saved")}
          >
            🔖 Saved Jobs ({saved.length})
          </button>
        </div>

        {error && <div className="stu-error">{error}</div>}

        {/* Applied tab */}
        {activeTab === "applied" && (
          <div className="stu-grid">
            {loading ? (
              <div className="sd-empty">Loading…</div>
            ) : appliedApps.length === 0 ? (
              <div className="sd-empty">
                <div className="sd-empty-emoji">📤</div>
                <h3>No applications yet</h3>
                <p>Start applying to jobs from your dashboard!</p>
                <Link to="/student" className="sd-btn">
                  Browse Jobs
                </Link>
              </div>
            ) : (
              appliedApps.map((app) => (
                <div
                  key={app.id}
                  className="app-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedApp(app)}
                  onKeyDown={(e) =>
                    e.key === "Enter" ? setSelectedApp(app) : null
                  }
                >
                  <div className="app-card-head">
                    <div>
                      <h3 className="app-title">{app.job?.title || "Job"}</h3>
                      <p className="app-sub">{app.job?.company || "—"}</p>
                    </div>
                    <span className={`status-chip ${statusClass(app.status)}`}>
                      {getStatusIcon(app.status)} {app.status || "Applied"}
                    </span>
                  </div>

                  <div className="app-lines">
                    {app.job?.location && <span>📍 {app.job.location}</span>}
                    {app.job?.ctc && <span>💰 {app.job.ctc}</span>}
                    <span>📅 Applied {formatDateShort(app.createdAt)}</span>
                  </div>

                  {app.job?.description && (
                    <div className="app-desc">
                      {app.job.description.slice(0, 120)}
                      {app.job.description.length > 120 ? "…" : ""}
                    </div>
                  )}

                  <div className="app-foot">
                    Click to view details and timeline
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Saved tab */}
        {activeTab === "saved" && (
          <div className="stu-grid">
            {saved.length === 0 ? (
              <div className="sd-empty">
                <div className="sd-empty-emoji">🔖</div>
                <h3>No saved jobs yet</h3>
                <p>Save interesting jobs to apply later!</p>
                <Link to="/student" className="sd-btn">
                  Browse Jobs
                </Link>
              </div>
            ) : (
              saved.map((j) => (
                <div key={j.id} className="app-card">
                  <div className="app-card-head">
                    <div>
                      <h3 className="app-title">{j.title}</h3>
                      <p className="app-sub">{j.company}</p>
                    </div>
                    <span className="status-chip st-blue">SAVED</span>
                  </div>
                  <div className="app-lines">
                    {j.location && <span>📍 {j.location}</span>}
                    {j.ctc && <span>💰 {j.ctc}</span>}
                    <span>💾 Saved {formatDateShort(j.savedAt)}</span>
                  </div>
                  {j.description && (
                    <div className="app-desc">
                      {j.description.slice(0, 120)}
                      {j.description.length > 120 ? "…" : ""}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal with improved announcements timeline */}
        {selectedApp && (
          <div className="modal-overlay" onClick={closeModal}>
            <div
              className="modal app-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="appm-head">
                <div>
                  <h2 className="appm-title">{selectedApp.job?.title}</h2>
                  <p className="appm-sub">{selectedApp.job?.company}</p>
                </div>
                <button className="modal-close-btn" onClick={closeModal}>
                  ✕
                </button>
              </div>

              <div className="facts">
                <div className="fact">
                  Status: {selectedApp.status || "Applied"}
                </div>
                <div className="fact">
                  Applied: {formatDateShort(selectedApp.createdAt)}
                </div>
                {selectedApp.job?.location && (
                  <div className="fact">📍 {selectedApp.job.location}</div>
                )}
                {selectedApp.job?.ctc && (
                  <div className="fact">💰 {selectedApp.job.ctc}</div>
                )}
              </div>

              <h3>Announcements</h3>
              {notesLoading ? (
                <div className="timeline-loading">Loading announcements…</div>
              ) : notes.length === 0 ? (
                <div className="timeline-empty">No announcements yet.</div>
              ) : (
                <div className="timeline-wrapper">
                  <div className="timeline">
                    {notes.map((n) => (
                      <div key={n.id} className="timeline-item">
                        <div className="timeline-dot" />
                        <div className="timeline-line" />
                        <div className="timeline-card">
                          <div className="timeline-msg">{n.message}</div>
                          <div className="timeline-date">
                            {niceDate(toDate(n.pushedAt || n.createdAt))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button className="stu-btn-outline" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
