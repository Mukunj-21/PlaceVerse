// // StudentApplications.jsx
// import { useEffect, useState } from "react";
// import { collection, getDocs, query, where, getDoc, doc, deleteDoc } from "firebase/firestore";
// import { auth, db } from "../firebase";
// import AppHeader from "../components/AppHeader";
// import { useNavigate } from "react-router-dom";

// export default function StudentApplications() {
//   const [apps, setApps] = useState([]);
//   const [savedJobs, setSavedJobs] = useState([]);
//   const navigate = useNavigate();

//   // Fetch applications
//   useEffect(() => {
//     const fetchApps = async () => {
//       if (!auth.currentUser) return;
//       const q = query(collection(db, "applications"), where("studentId", "==", auth.currentUser.uid));
//       const snap = await getDocs(q);
//       const data = [];
//       for (const d of snap.docs) {
//         const job = await getDoc(doc(db, "jobs", d.data().jobId));
//         data.push({ id: d.id, ...d.data(), job: job.exists() ? job.data() : {} });
//       }
//       setApps(data);
//     };
//     fetchApps();
//   }, []);

//   // Fetch saved jobs
//   useEffect(() => {
//     const fetchSaved = async () => {
//       if (!auth.currentUser) return;
//       const bookmarksRef = collection(db, "users", auth.currentUser.uid, "bookmarks");
//       const snap = await getDocs(bookmarksRef);

//       const jobsData = [];
//       for (const d of snap.docs) {
//         const jobRef = doc(db, "jobs", d.id); // jobId = bookmark doc id
//         const jobSnap = await getDoc(jobRef);
//         if (jobSnap.exists()) {
//           jobsData.push({ id: jobSnap.id, ...jobSnap.data() });
//         }
//       }
//       setSavedJobs(jobsData);
//     };

//     fetchSaved();
//   }, []);

//   // Remove from saved jobs
//   const handleRemoveSaved = async (jobId) => {
//     try {
//       await deleteDoc(doc(db, "users", auth.currentUser.uid, "bookmarks", jobId));
//       setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
//       alert("Removed from saved ⭐");
//     } catch (e) {
//       console.error(e);
//       alert("Failed to remove ❌");
//     }
//   };

//   const statusColors = {
//     applied: "bg-blue-500",
//     review: "bg-yellow-500",
//     shortlisted: "bg-green-500",
//     rejected: "bg-red-500",
//     selected: "bg-purple-500",
//   };

//   return (
//     <div className="stu-page">
//       <AppHeader />
//       <div className="stu-card">
//         <div className="flex justify-between items-center mb-4">
//           <h1 className="stu-title">My Applications</h1>
//           <button className="stu-btn" onClick={() => navigate("/student")}>
//             ← Back to Dashboard
//           </button>
//         </div>

//         {/* Applications Section */}
//         <h2 className="stu-subtitle mt-4">Applied Jobs</h2>
//         {apps.length === 0 ? (
//           <div className="stu-info">You haven’t applied for any jobs yet.</div>
//         ) : (
//           <div className="apps-grid">
//             {apps.map((a) => (
//               <div className="job-card-updated" key={a.id}>
//                 <div className="flex justify-between items-center">
//                   <div>
//                     <h3 className="job-title">{a.job.title}</h3>
//                     <p className="job-company">{a.job.company}</p>
//                   </div>
//                 </div>
//                 <div
//                   className={`px-2 py-1 rounded text-white inline-block mt-2 ${statusColors[a.status]}`}
//                 >
//                   {a.status.toUpperCase()}
//                 </div>
//                 {a.offerLetterUrl && (
//                   <a
//                     href={a.offerLetterUrl}
//                     target="_blank"
//                     rel="noreferrer"
//                     className="stu-btn mt-2 inline-block"
//                   >
//                     Download Offer Letter
//                   </a>
//                 )}
//               </div>
//             ))}
//           </div>
//         )}

//         {/* Saved Jobs Section */}
//         <h2 className="stu-subtitle mt-8">Saved Jobs</h2>
//         {savedJobs.length === 0 ? (
//           <div className="stu-info">No saved jobs yet.</div>
//         ) : (
//           <div className="jobs-grid">
//             {savedJobs.map((j) => (
//               <div className="job-card-updated" key={j.id}>
//                 <div className="flex justify-between items-center">
//                   <div>
//                     <h3 className="job-title">{j.title}</h3>
//                     <p className="job-company">{j.company}</p>
//                   </div>
//                   <span className="job-location">{j.location}</span>
//                 </div>

//                 <div className="flex flex-wrap gap-3 mt-3">
//                   {j.ctc && <span className="job-badge bg-green-600">💰 {j.ctc}</span>}
//                   {j.deadline && (
//                     <span className="job-badge bg-red-600">
//                       ⏳ Apply by:{" "}
//                       {new Date(
//                         j.deadline?.seconds ? j.deadline.seconds * 1000 : j.deadline
//                       ).toLocaleDateString()}
//                     </span>
//                   )}
//                 </div>

//                 {j.description && <p className="job-desc mt-3">{j.description}</p>}

//                 <button
//                   className="stu-btn-outline mt-3"
//                   onClick={() => handleRemoveSaved(j.id)}
//                 >
//                   Remove from Saved
//                 </button>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


// src/pages/StudentApplications.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader.jsx";
import "./Student.css";

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
import { auth } from "../firebase";

// --- helpers ---
const toDate = (tsOrMs) => {
  if (!tsOrMs) return null;
  if (tsOrMs.toDate) return tsOrMs.toDate(); // Firestore Timestamp
  const ms = typeof tsOrMs === "number" ? tsOrMs : Date.parse(tsOrMs);
  return isNaN(ms) ? null : new Date(ms);
};
const niceDate = (d) => (d ? d.toLocaleString() : "—");

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

export default function StudentApplications() {
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);         // [{id, ...application, job}]
  const [saved, setSaved] = useState([]);       // saved jobs from user bookmarks
  const [error, setError] = useState("");

  const [selectedApp, setSelectedApp] = useState(null);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Load applications (without orderBy to avoid index), sort in JS
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
              return { ...a, job: jsnap.exists() ? { id: jsnap.id, ...jsnap.data() } : null };
            } catch {
              return { ...a, job: null };
            }
          })
        );

        // sort newest first by createdAt (client-side)
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

  // Load saved jobs from users/{uid}/bookmarks (matches your working data)
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
          if (jobSnap.exists()) jobs.push({ id: jobSnap.id, ...jobSnap.data() });
        }
        setSaved(jobs);
      } catch (e) {
        console.warn("Saved jobs load warning:", e);
        setSaved([]);
      }
    };
    loadSaved();
  }, [db]);

  // Modal open: subscribe to jobNotes in real-time, sort client-side newest→oldest
  const openApp = useCallback(
    (app) => {
      setSelectedApp(app);
      setNotes([]);
      setNotesLoading(true);

      const q = query(collection(db, "jobNotes"), where("jobId", "==", app.jobId));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          items.sort((a, b) => {
            const da = toDate(a.createdAt)?.getTime() || 0;
            const dbb = toDate(b.createdAt)?.getTime() || 0;
            return dbb - da;
          });
          setNotes(items);
          setNotesLoading(false);
        },
        (err) => {
          console.error("Announcements load error:", err);
          setNotes([]);
          setNotesLoading(false);
        }
      );

      const onEsc = (e) => e.key === "Escape" && setSelectedApp(null);
      document.addEventListener("keydown", onEsc);

      return () => {
        document.removeEventListener("keydown", onEsc);
        unsub && unsub();
      };
    },
    [db]
  );

  const closeModal = () => setSelectedApp(null);

  const appliedApps = useMemo(() => apps.filter((a) => a.job), [apps]);

  return (
    <div className="student-page">
      <AppHeader />

      <div className="student-wrap">
        <div className="header-row">
          <h1 className="stu-title">My Applications</h1>
          <Link to="/student" className="stu-back">← Back to Dashboard</Link>
        </div>

        {error && <div className="stu-error">{error}</div>}

        {/* Applied Jobs */}
        <h2 className="stu-h2">Applied Jobs</h2>
        {loading ? (
          <div className="stu-info">Loading…</div>
        ) : appliedApps.length === 0 ? (
          <div className="stu-info">You haven’t applied to any jobs yet.</div>
        ) : (
          <div className="stu-grid">
            {appliedApps.map((a) => {
              const j = a.job || {};
              const deadline = toDate(j.deadline);
              return (
                <div key={a.id} className="app-card" onClick={() => openApp(a)} role="button">
                  <div className="app-card-head">
                    <div>
                      <div className="app-title">{j.title || "Job"}</div>
                      <div className="app-sub">{j.company || "—"}</div>
                    </div>
                    <span className={`status-chip ${statusClass(a.status)}`}>
                      {(a.status || "Applied").toUpperCase()}
                    </span>
                  </div>

                  <div className="app-lines">
                    {j.location && <div>📍 {j.location}</div>}
                    {j.ctc && <div>💰 {j.ctc}</div>}
                    {deadline && <div>⏳ {deadline.toLocaleDateString()}</div>}
                  </div>

                  {a.createdAt && (
                    <div className="app-foot">Applied on {niceDate(toDate(a.createdAt))}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Saved Jobs */}
        <h2 className="stu-h2 mt-24">Saved Jobs</h2>
        {saved.length === 0 ? (
          <div className="stu-dim">No saved jobs yet.</div>
        ) : (
          <div className="stu-grid">
            {saved.map((j) => {
              const deadline = toDate(j.deadline);
              return (
                <div key={j.id} className="app-card app-card--ghost">
                  <div className="app-card-head">
                    <div>
                      <div className="app-title">{j.title || "Job"}</div>
                      <div className="app-sub">{j.company || "—"}</div>
                    </div>
                    <span className="status-chip st-grey">SAVED</span>
                  </div>
                  <div className="app-lines">
                    {j.location && <div>📍 {j.location}</div>}
                    {j.ctc && <div>💰 {j.ctc}</div>}
                    {deadline && <div>⏳ {deadline.toLocaleDateString()}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedApp && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal app-modal" onClick={(e) => e.stopPropagation()}>
            <div className="appm-head">
              <div>
                <h2 className="appm-title">{selectedApp.job?.title || "Job"}</h2>
                <div className="appm-sub">{selectedApp.job?.company || "—"}</div>
              </div>
              <span className={`status-chip ${statusClass(selectedApp.status)}`}>
                {(selectedApp.status || "Applied").toUpperCase()}
              </span>
            </div>

            <div className="facts">
              {selectedApp.job?.location && <div className="fact">📍 {selectedApp.job.location}</div>}
              {selectedApp.job?.ctc && <div className="fact">💰 {selectedApp.job.ctc}</div>}
              {selectedApp.job?.deadline && (
                <div className="fact">
                  ⏳ {toDate(selectedApp.job.deadline)?.toLocaleDateString() || "—"}
                </div>
              )}
            </div>

            {selectedApp.job?.description && (
              <div className="desc">{selectedApp.job.description}</div>
            )}

            <h3 className="stu-h3">Announcements</h3>
            {notesLoading ? (
              <div className="stu-info">Loading announcements…</div>
            ) : notes.length === 0 ? (
              <div className="stu-dim">No announcements yet.</div>
            ) : (
              <div className="timeline">
                {notes.map((n) => (
                  <div className="timeline-item" key={n.id}>
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      {n.message && <div className="timeline-text">{n.message}</div>}
                      <div className="timeline-date">{niceDate(toDate(n.createdAt))}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="form-actions mt-16">
              <button className="stu-btn-outline" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
