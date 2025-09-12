// src/pages/student/StudentDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { getFirestore, collection, query, where, onSnapshot, setDoc, doc, addDoc } from "firebase/firestore";
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

  // Loading states for individual actions
  const [applyingIds, setApplyingIds] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());

  // ---- AUTH ----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // ---- REAL-TIME: OPEN JOBS ----
  useEffect(() => {
    let stopped = false;
    const q = query(collection(db, "jobs"), where("open", "==", true));
    
    const off = onSnapshot(q, (snap) => {
      if (stopped) return;
      
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const toDate = (t) => (t?.toDate ? t.toDate() : new Date(t));
      
      // Sort newest first
      rows.sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
      
      const companies = new Set(rows.map((r) => r.company).filter(Boolean));
      setJobs(rows);
      setStats((s) => ({ ...s, jobs: rows.length, companies: companies.size }));
      setLoading(false);
    }, (err) => {
      console.error("Jobs snapshot error:", err);
      setLoading(false);
    });

    return () => {
      stopped = true;
      off();
    };
  }, [db]);

  // ---- REAL-TIME: MY APPLICATIONS + SAVED ----
  useEffect(() => {
    if (!authReady) return;
    
    if (!uid) {
      setAppliedIds(new Set());
      setSavedIds(new Set());
      setStats((s) => ({ ...s, applied: 0 }));
      return;
    }

    // Subscribe to my applications
    const appsQ = query(collection(db, "applications"), where("studentId", "==", uid));
    const offApps = onSnapshot(appsQ, (snap) => {
      const set = new Set();
      snap.forEach((d) => set.add(d.data().jobId));
      setAppliedIds(set);
      setStats((s) => ({ ...s, applied: snap.size }));
    }, (err) => console.error("Applications snapshot error:", err));

    // Subscribe to my bookmarks
    const offSaved = onSnapshot(collection(db, "users", uid, "bookmarks"), (snap) => {
      const set = new Set();
      snap.forEach((d) => set.add(d.id));
      setSavedIds(set);
    }, (err) => console.error("Bookmarks snapshot error:", err));

    return () => {
      offApps();
      offSaved();
    };
  }, [db, uid, authReady]);

  // ---- Helper functions ----
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

  const formatDate = (date) => {
    const d = toDate(date);
    return d ? d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    }) : '—';
  };

  // ---- Filter and sort ----
  const filtered = useMemo(() => {
    let list = jobs.filter(
      (j) =>
        (j.title || "").toLowerCase().includes(search.toLowerCase()) &&
        (filter.location === "" || j.location === filter.location)
    );

    if (sortBy === "deadline") {
      list = [...list].sort(
        (a, b) =>
          (toDate(a.deadline)?.getTime() || Infinity) -
          (toDate(b.deadline)?.getTime() || Infinity)
      );
    } else if (sortBy === "ctc") {
      const toNum = (x) => {
        if (!x) return 0;
        const m = String(x).match(/[\d.]+/g);
        return m ? parseFloat(m.join("")) : 0;
      };
      list = [...list].sort((a, b) => toNum(b.ctc) - toNum(a.ctc));
    } else {
      list = [...list];
    }

    return list;
  }, [jobs, search, filter, sortBy]);

  // Get unique locations for filter dropdown
  const locations = useMemo(() => {
    const locs = new Set(jobs.map(j => j.location).filter(Boolean));
    return Array.from(locs).sort();
  }, [jobs]);

  // ---- Actions with optimistic updates ----
  const handleApply = async (job) => {
    if (!uid) return alert("Please sign in.");
    if (appliedIds.has(job.id) || applyingIds.has(job.id)) return;

    // Optimistic update
    setApplyingIds(prev => new Set(prev).add(job.id));
    setAppliedIds(prev => new Set(prev).add(job.id));
    setStats(s => ({ ...s, applied: s.applied + 1 }));

    try {
      await addDoc(collection(db, "applications"), {
        jobId: job.id,
        studentId: uid,
        resumeUrl: "",
        statement: "Excited to apply!",
        status: "applied",
        createdAt: new Date(),
      });
      
      // Success feedback
      const button = document.querySelector(`[data-job-id="${job.id}"] .sd-btn`);
      if (button) {
        button.classList.add('success-animation');
        setTimeout(() => button.classList.remove('success-animation'), 600);
      }
      
    } catch (e) {
      console.error(e);
      // Revert optimistic update
      setAppliedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
      setStats(s => ({ ...s, applied: Math.max(0, s.applied - 1) }));
      alert("Failed to apply ❌");
    } finally {
      setApplyingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const handleBookmark = async (jobId) => {
    if (!uid) return alert("Please sign in.");
    if (savedIds.has(jobId) || savingIds.has(jobId)) return;

    // Optimistic update
    setSavingIds(prev => new Set(prev).add(jobId));
    setSavedIds(prev => new Set(prev).add(jobId));

    try {
      await setDoc(doc(db, "users", uid, "bookmarks", jobId), {
        createdAt: new Date()
      });
      
      // Success feedback
      const button = document.querySelector(`[data-job-id="${jobId}"] .sd-btn-outline`);
      if (button) {
        button.classList.add('success-animation');
        setTimeout(() => button.classList.remove('success-animation'), 600);
      }
      
    } catch (e) {
      console.error(e);
      // Revert optimistic update
      setSavedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
      alert("Could not save job ❌");
    } finally {
      setSavingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  // ---- Render skeleton cards ----
  const renderSkeletonCards = () => (
    <>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="sd-skel-card">
          <div className="skel skel-title"></div>
          <div className="skel skel-line" style={{width: '60%'}}></div>
          <div className="skel skel-line"></div>
          <div className="skel skel-line" style={{width: '80%'}}></div>
          <div className="skel skel-btns"></div>
        </div>
      ))}
    </>
  );

  return (
    <div className="student-page">
      <AppHeader />
      <div className="student-wrap">
        {/* Enhanced Hero Section */}
        <div className="sd-hero">
          <div>
            <h1 className="sd-title">Student Dashboard</h1>
            <p className="sd-kicker">Find opportunities, track progress, and stay in the loop.</p>
          </div>
          <div className="sd-linkbar">
            <Link to="/student/profile" className="sd-link">
              👤 My Profile
            </Link>
            <Link to="/student/applications" className="sd-link">
              📋 My Applications
            </Link>
            <Link to="/student/notifications" className="sd-link">
              🔔 Notifications
            </Link>
          </div>
        </div>

        {/* Enhanced Stats */}
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
            <div className="sd-stat-icon">📝</div>
            <div className="sd-stat-num">{stats.applied}</div>
            <div className="sd-stat-label">My Applications</div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="sd-filters">
          <input
            type="text"
            placeholder="Search role or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sd-input"
          />
          <select
            value={filter.location}
            onChange={(e) => setFilter({ ...filter, location: e.target.value })}
            className="sd-input"
          >
            <option value="">All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sd-input"
          >
            <option value="newest">Sort: Newest</option>
            <option value="deadline">Sort: Deadline</option>
            <option value="ctc">Sort: CTC</option>
          </select>
        </div>

        <h2 className="stu-h2">Open Jobs</h2>

        {/* Jobs Grid */}
        <div className="sd-grid">
          {loading ? (
            renderSkeletonCards()
          ) : filtered.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-empty-emoji">🔍</div>
              <h3>No jobs found</h3>
              <p>Try adjusting your filters or check back later for new opportunities.</p>
            </div>
          ) : (
            filtered.map((job, index) => (
              <div 
                key={job.id} 
                className="sd-card" 
                data-job-id={job.id}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="sd-card-top">
                  <div>
                    <h3 className="sd-title-sm">{job.title}</h3>
                    <p className="sd-sub">{job.company}</p>
                  </div>
                  <div className="sd-top-right">
                    {isNew(job.createdAt) && <span className="badge-new">NEW</span>}
                  </div>
                </div>

                <div className="sd-meta">
                  {job.ctc && (
                    <span className="chip chip-ctc">
                      💰 {job.ctc}
                    </span>
                  )}
                  {job.location && (
                    <span className="chip chip-loc">
                      📍 {job.location}
                    </span>
                  )}
                  {job.deadline && (
                    <span className={`chip ${deadlineSoon(job.deadline) ? 'chip-deadline-soon' : 'chip-deadline'}`}>
                      ⏰ Apply by: {formatDate(job.deadline)}
                    </span>
                  )}
                </div>

                {job.description && (
                  <p className="sd-desc">{job.description}</p>
                )}

                <div className="sd-card-actions">
                  <button
                    className={`sd-btn ${appliedIds.has(job.id) || applyingIds.has(job.id) ? 'sd-btn-disabled' : ''}`}
                    onClick={() => handleApply(job)}
                    disabled={appliedIds.has(job.id) || applyingIds.has(job.id)}
                  >
                    {applyingIds.has(job.id) ? (
                      <>
                        <div className="sd-spinner" style={{width: '16px', height: '16px', marginRight: '8px'}}></div>
                        Applying...
                      </>
                    ) : appliedIds.has(job.id) ? (
                      '✅ Applied'
                    ) : (
                      '📤 Apply Now'
                    )}
                  </button>
                  <button
                    className={`sd-btn-outline ${savedIds.has(job.id) || savingIds.has(job.id) ? 'sd-btn-disabled' : ''}`}
                    onClick={() => handleBookmark(job.id)}
                    disabled={savedIds.has(job.id) || savingIds.has(job.id)}
                  >
                    {savingIds.has(job.id) ? (
                      <>
                        <div className="sd-spinner" style={{width: '16px', height: '16px', marginRight: '8px'}}></div>
                        Saving...
                      </>
                    ) : savedIds.has(job.id) ? (
                      '❤️ Saved'
                    ) : (
                      '🔖 Save Job'
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
