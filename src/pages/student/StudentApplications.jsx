// src/pages/student/StudentApplications.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
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

// Helper functions
const toDate = (tsOrMs) => {
  if (!tsOrMs) return null;
  if (tsOrMs.toDate) return tsOrMs.toDate();
  const ms = typeof tsOrMs === "number" ? tsOrMs : Date.parse(tsOrMs);
  return isNaN(ms) ? null : new Date(ms);
};

const niceDate = (d) => (d ? d.toLocaleString() : "—");

const formatDateShort = (d) => {
  const date = toDate(d);
  if (!date) return "—";
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
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
  if (s.includes('selected') || s.includes('accepted')) return '🎉';
  if (s.includes('rejected')) return '❌';
  if (s.includes('shortlisted') || s.includes('round')) return '⏳';
  if (s.includes('review')) return '👀';
  return '📤';
};

export default function StudentApplications() {
  const db = getFirestore();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [saved, setSaved] = useState([]);
  const [error, setError] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('applied');

  // Load applications
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

        // Join with job data
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

        // Sort newest first
        withJobs.sort((a, b) => {
          const ta = toDate(a.createdAt)?.getTime() || 0;
          const tb = toDate(b.createdAt)?.getTime() || 0;
          return tb - ta;
        });

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

  // Load saved jobs
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const bookmarksRef = collection(db, "users", uid, "bookmarks");
        const snap = await getDocs(bookmarksRef);
        const jobs = [];
        
        for (const d of snap.docs) {
          const jobRef = doc(db, "jobs", d.id);
          const jobSnap = await getDoc(jobRef);
          if (jobSnap.exists()) {
            jobs.push({ 
              id: jobSnap.id, 
              ...jobSnap.data(),
              savedAt: d.data().createdAt 
            });
          }
        }
        
        // Sort by saved date
        jobs.sort((a, b) => {
          const ta = toDate(a.savedAt)?.getTime() || 0;
          const tb = toDate(b.savedAt)?.getTime() || 0;
          return tb - ta;
        });
        
        setSaved(jobs);
      } catch (e) {
        console.warn("Saved jobs load warning:", e);
        setSaved([]);
      }
    };

    loadSaved();
  }, [db]);

  // Modal: load announcements
  const openApp = useCallback((app) => {
    setSelectedApp(app);
    setNotes([]);
    setNotesLoading(true);
    
    const q = query(collection(db, "jobNotes"), where("jobId", "==", app.jobId));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => {
        const da = toDate(a.createdAt)?.getTime() || 0;
        const db = toDate(b.createdAt)?.getTime() || 0;
        return db - da;
      });
      setNotes(items);
      setNotesLoading(false);
    }, (err) => {
      console.error("Announcements load error:", err);
      setNotes([]);
      setNotesLoading(false);
    });

    const onEsc = (e) => e.key === "Escape" && setSelectedApp(null);
    document.addEventListener("keydown", onEsc);
    
    return () => {
      document.removeEventListener("keydown", onEsc);
      unsub && unsub();
    };
  }, [db]);

  const closeModal = () => setSelectedApp(null);

  const appliedApps = useMemo(() => apps.filter((a) => a.job), [apps]);
  const rejectedApps = useMemo(() => appliedApps.filter(a => 
    (a.status || '').toLowerCase().includes('reject')), [appliedApps]);
  const selectedApps = useMemo(() => appliedApps.filter(a => 
    (a.status || '').toLowerCase().includes('select') || 
    (a.status || '').toLowerCase().includes('accept')), [appliedApps]);

  const renderSkeletonCards = () => (
    <>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="app-card app-card--ghost">
          <div className="skel skel-title"></div>
          <div className="skel skel-line" style={{width: '70%'}}></div>
          <div className="skel skel-line" style={{width: '50%'}}></div>
          <div className="skel skel-line" style={{width: '90%'}}></div>
        </div>
      ))}
    </>
  );

  const renderApplicationCard = (app, index) => (
    <div 
      key={app.id} 
      className="app-card"
      onClick={() => openApp(app)}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="app-card-head">
        <div>
          <h3 className="app-title">{app.job?.title || "Unknown Job"}</h3>
          <p className="app-sub">{app.job?.company || "Unknown Company"}</p>
        </div>
        <div className="status-chip-wrapper">
          <span className={`status-chip ${statusClass(app.status)}`}>
            {getStatusIcon(app.status)} {app.status || "Applied"}
          </span>
        </div>
      </div>

      <div className="app-lines">
        {app.job?.location && <span>📍 {app.job.location}</span>}
        {app.job?.ctc && <span>💰 {app.job.ctc}</span>}
        <span>📅 Applied {formatDateShort(app.createdAt)}</span>
      </div>

      {app.job?.description && (
        <div className="app-desc">
          {app.job.description.substring(0, 120)}
          {app.job.description.length > 120 && '...'}
        </div>
      )}

      <div className="app-foot">
        Click to view details and timeline
      </div>
    </div>
  );

  const renderSavedJobCard = (job, index) => (
    <div 
      key={job.id} 
      className="app-card"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="app-card-head">
        <div>
          <h3 className="app-title">{job.title}</h3>
          <p className="app-sub">{job.company}</p>
        </div>
        <div className="status-chip-wrapper">
          <span className="status-chip st-blue">
            🔖 Saved
          </span>
        </div>
      </div>

      <div className="app-lines">
        {job.location && <span>📍 {job.location}</span>}
        {job.ctc && <span>💰 {job.ctc}</span>}
        <span>💾 Saved {formatDateShort(job.savedAt)}</span>
      </div>

      {job.description && (
        <div className="app-desc">
          {job.description.substring(0, 120)}
          {job.description.length > 120 && '...'}
        </div>
      )}
    </div>
  );

  return (
    <div className="student-page">
      <AppHeader />
      <div className="student-wrap">
        <div className="header-row">
          <Link to="/student/dashboard" className="stu-back">
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="stu-title">My Applications</h1>
        <p className="stu-info">Track your job applications and saved opportunities</p>

        {/* Stats Overview */}
        <div className="applications-stats">
          <div className="stat-item">
            <div className="stat-num">{appliedApps.length}</div>
            <div className="stat-label">Total Applied</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">{selectedApps.length}</div>
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

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'applied' ? 'active' : ''}`}
            onClick={() => setActiveTab('applied')}
          >
            📤 Applied Jobs ({appliedApps.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            🔖 Saved Jobs ({saved.length})
          </button>
        </div>

        {error && (
          <div className="stu-error">{error}</div>
        )}

        {/* Content based on active tab */}
        <div className="tab-content">
          {activeTab === 'applied' && (
            <div className="stu-grid">
              {loading ? (
                renderSkeletonCards()
              ) : appliedApps.length === 0 ? (
                <div className="sd-empty">
                  <div className="sd-empty-emoji">📤</div>
                  <h3>No applications yet</h3>
                  <p>Start applying to jobs from your dashboard!</p>
                  <Link to="/student/dashboard" className="sd-btn">
                    Browse Jobs
                  </Link>
                </div>
              ) : (
                appliedApps.map((app, index) => renderApplicationCard(app, index))
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="stu-grid">
              {saved.length === 0 ? (
                <div className="sd-empty">
                  <div className="sd-empty-emoji">🔖</div>
                  <h3>No saved jobs yet</h3>
                  <p>Save interesting jobs to apply later!</p>
                  <Link to="/student/dashboard" className="sd-btn">
                    Browse Jobs
                  </Link>
                </div>
              ) : (
                saved.map((job, index) => renderSavedJobCard(job, index))
              )}
            </div>
          )}
        </div>

        {/* Enhanced Modal */}
        {selectedApp && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal app-modal" onClick={(e) => e.stopPropagation()}>
              <div className="appm-head">
                <div>
                  <h2 className="appm-title">{selectedApp.job?.title}</h2>
                  <p className="appm-sub">{selectedApp.job?.company}</p>
                </div>
                <button 
                  className="modal-close-btn"
                  onClick={closeModal}
                >
                  ✕
                </button>
              </div>

              <div className="facts">
                <div className="fact">Status: {selectedApp.status || "Applied"}</div>
                <div className="fact">Applied: {formatDateShort(selectedApp.createdAt)}</div>
                {selectedApp.job?.location && <div className="fact">📍 {selectedApp.job.location}</div>}
                {selectedApp.job?.ctc && <div className="fact">💰 {selectedApp.job.ctc}</div>}
              </div>

              {selectedApp.job?.description && (
                <div className="desc">
                  <h3>Job Description</h3>
                  <p>{selectedApp.job.description}</p>
                </div>
              )}

              <div className="timeline-section">
                <h3>Application Timeline</h3>
                {notesLoading ? (
                  <div className="timeline-loading">Loading updates...</div>
                ) : notes.length === 0 ? (
                  <div className="timeline-empty">No updates yet</div>
                ) : (
                  <div className="timeline">
                    {notes.map((note) => (
                      <div key={note.id} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-text">{note.message}</div>
                          <div className="timeline-date">
                            {niceDate(toDate(note.createdAt))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
