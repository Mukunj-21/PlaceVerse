// src/pages/StudentDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  addDoc,
} from "firebase/firestore";
import { auth } from "../../firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import AppHeader from "../../components/AppHeader.jsx";
import { Link } from "react-router-dom";
import "/src/styles/Student.css";

export default function StudentDashboard() {
  const db = getFirestore();

  // UI state
  const [stats, setStats] = useState({ companies: 0, jobs: 0, applied: 0 });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters / search / sort
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ location: "" });
  const [sortBy, setSortBy] = useState("newest");

  // auth + per-user state
  const [uid, setUid] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());

  // ---- AUTH ----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // ---- REAL-TIME: OPEN JOBS (also updates companies + open jobs count) ----
  useEffect(() => {
    let stopped = false;
    const q = query(collection(db, "jobs"), where("open", "==", true));

    const off = onSnapshot(
      q,
      (snap) => {
        if (stopped) return;
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // sort newest (client-side)
        const toDate = (t) => (t?.toDate ? t.toDate() : new Date(t));
        rows.sort(
          (a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0)
        );

        const companies = new Set(rows.map((r) => r.company).filter(Boolean));
        setJobs(rows);
        setStats((s) => ({ ...s, jobs: rows.length, companies: companies.size }));
        setLoading(false);
      },
      (err) => {
        console.error("Jobs snapshot error:", err);
        setLoading(false);
      }
    );

    return () => {
      stopped = true;
      off();
    };
  }, [db]);

  // ---- REAL-TIME: MY APPLICATIONS + SAVED (only after auth ready) ----
  useEffect(() => {
    if (!authReady) return;

    // if signed out, clear and bail
    if (!uid) {
      setAppliedIds(new Set());
      setSavedIds(new Set());
      setStats((s) => ({ ...s, applied: 0 }));
      return;
    }

    // subscribe to my applications
    const appsQ = query(collection(db, "applications"), where("studentId", "==", uid));
    const offApps = onSnapshot(
      appsQ,
      (snap) => {
        const set = new Set();
        snap.forEach((d) => set.add(d.data().jobId));
        setAppliedIds(set);
        setStats((s) => ({ ...s, applied: snap.size }));
      },
      (err) => console.error("Applications snapshot error:", err)
    );

    // subscribe to my bookmarks
    const offSaved = onSnapshot(
      collection(db, "users", uid, "bookmarks"),
      (snap) => {
        const set = new Set();
        snap.forEach((d) => set.add(d.id));
        setSavedIds(set);
      },
      (err) => console.error("Bookmarks snapshot error:", err)
    );

    return () => {
      offApps();
      offSaved();
    };
  }, [db, uid, authReady]);

  // ---- helpers ----
  const toDate = (t) => {
    if (!t) return null;
    if (t.toDate) return t.toDate();
    const ms = typeof t === "number" ? t : Date.parse(t);
    return isNaN(ms) ? null : new Date(ms);
  };
  const isNew = (createdAt) => {
    const d = toDate(createdAt);
    if (!d) return false;
    return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7;
  };
  const deadlineSoon = (deadline) => {
    const d = toDate(deadline);
    if (!d) return false;
    const days = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 5;
  };

  // ---- filter + sort view ----
  const filtered = useMemo(() => {
    let list = jobs.filter(
      (j) =>
        (j.title || "").toLowerCase().includes(search.toLowerCase()) &&
        (filter.location === "" || j.location === filter.location)
    );

    if (sortBy === "deadline") {
      list = [...list].sort(
        (a, b) => (toDate(a.deadline)?.getTime() || Infinity) - (toDate(b.deadline)?.getTime() || Infinity)
      );
    } else if (sortBy === "ctc") {
      const toNum = (x) => {
        if (!x) return 0;
        const m = String(x).match(/[\d.]+/g);
        return m ? parseFloat(m.join("")) : 0;
      };
      list = [...list].sort((a, b) => toNum(b.ctc) - toNum(a.ctc));
    } else {
      // newest (already sorted by snapshot, but keep stable)
      list = [...list];
    }
    return list;
  }, [jobs, search, filter, sortBy]);

  // ---- actions ----
  const handleApply = async (job) => {
    if (!uid) return alert("Please sign in.");
    if (appliedIds.has(job.id)) return;

    try {
      await addDoc(collection(db, "applications"), {
        jobId: job.id,
        studentId: uid,
        resumeUrl: "",
        statement: "Excited to apply!",
        status: "applied",
        createdAt: new Date(),
      });
      // onSnapshot will update UI; keep a tiny optimistic feel:
      setAppliedIds((prev) => new Set(prev).add(job.id));
      setStats((s) => ({ ...s, applied: s.applied + 1 }));
    } catch (e) {
      console.error(e);
      alert("Failed to apply ❌");
    }
  };

  const handleBookmark = async (jobId) => {
    if (!uid) return alert("Please sign in.");
    if (savedIds.has(jobId)) return;

    try {
      await setDoc(doc(db, "users", uid, "bookmarks", jobId), { createdAt: new Date() });
      // onSnapshot will update; do a quick optimistic toggle too
      setSavedIds((prev) => new Set(prev).add(jobId));
    } catch (e) {
      console.error(e);
      alert("Could not save job ❌");
    }
  };

  return (
    <div className="student-page">
      <AppHeader />

      <div className="student-wrap">
        {/* Hero */}
        <div className="sd-hero">
          <div>
            <h1 className="sd-title">Student Dashboard</h1>
            <p className="sd-kicker">Find opportunities, track progress, and stay in the loop.</p>
          </div>
          <div className="sd-linkbar">
            <Link to="/student/profile" className="sd-link">My Profile</Link>
            <Link to="/student/applications" className="sd-link">My Applications</Link>
            <Link to="/student/notifications" className="sd-link">Notifications</Link>
          </div>
        </div>

        {/* Stats */}
        <div className="sd-stats">
          <div className="sd-stat">
            <div className="sd-stat-icon">🏢</div>
            <div className="sd-stat-num">{stats.companies}</div>
            <div className="sd-stat-label">Active Companies</div>
          </div>
          <div className="sd-stat">
            <div className="sd-stat-icon">💼</div>
            <div className="sd-stat-num">{stats.jobs}</div>
            <div className="sd-stat-label">Open Jobs</div>
          </div>
          <div className="sd-stat">
            <div className="sd-stat-icon">📄</div>
            <div className="sd-stat-num">{stats.applied}</div>
            <div className="sd-stat-label">My Applications</div>
          </div>
        </div>

        {/* Filters */}
        <div className="sd-filters">
          <input
            className="sd-input flex-1"
            placeholder="Search role or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="sd-input"
            value={filter.location}
            onChange={(e) => setFilter({ ...filter, location: e.target.value })}
          >
            <option value="">All Locations</option>
            <option value="Remote">Remote</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Bangalore">Bangalore</option>
          </select>
          <select className="sd-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Sort: Newest</option>
            <option value="deadline">Sort: Deadline</option>
            <option value="ctc">Sort: CTC (high→low)</option>
          </select>
        </div>

        {/* Jobs */}
        <h2 className="stu-h2">Open Jobs</h2>

        {loading ? (
          <div className="sd-grid">
            <div className="sd-skel-card"><div className="skel skel-title" /><div className="skel skel-line" /><div className="skel skel-line" /><div className="skel skel-btns" /></div>
            <div className="sd-skel-card"><div className="skel skel-title" /><div className="skel skel-line" /><div className="skel skel-line" /><div className="skel skel-btns" /></div>
            <div className="sd-skel-card"><div className="skel skel-title" /><div className="skel skel-line" /><div className="skel skel-line" /><div className="skel skel-btns" /></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sd-empty">
            <div className="sd-empty-emoji">🔎</div>
            <div>No jobs match your filters.</div>
          </div>
        ) : (
          <div className="sd-grid">
            {filtered.map((j) => {
              const deadline = toDate(j.deadline);
              const isApplied = appliedIds.has(j.id);
              const isSaved = savedIds.has(j.id);

              return (
                <div key={j.id} className="sd-card">
                  <div className="sd-card-top">
                    <div>
                      <div className="sd-title-sm">{j.title || "Untitled Role"}</div>
                      <div className="sd-sub">{j.company || "—"}</div>
                    </div>

                    <div className="sd-top-right">
                      {isNew(j.createdAt) && <span className="badge-new">New</span>}
                      <span className="chip chip-loc">{j.location || "—"}</span>
                    </div>
                  </div>

                  <div className="sd-meta">
                    {j.ctc && <span className="chip chip-ctc">💰 {j.ctc}</span>}
                    {deadline && (
                      <span className={`chip ${deadlineSoon(j.deadline) ? "chip-deadline-soon" : "chip-deadline"}`}>
                        ⏳ Apply by: {deadline.toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {j.description && <p className="sd-desc">{j.description}</p>}

                  <div className="sd-card-actions">
                    <button
                      className={`sd-btn ${isApplied ? "sd-btn-disabled" : ""}`}
                      onClick={() => handleApply(j)}
                      disabled={isApplied}
                    >
                      {isApplied ? "Applied" : "Apply Now"}
                    </button>
                    <button
                      className={`sd-btn-outline ${isSaved ? "sd-btn-disabled" : ""}`}
                      onClick={() => handleBookmark(j.id)}
                      disabled={isSaved}
                    >
                      {isSaved ? "Saved" : "Save Job"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}