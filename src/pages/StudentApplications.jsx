
// // src/pages/StudentApplications.jsx
// import { useEffect, useMemo, useState, useCallback } from "react";
// import { Link } from "react-router-dom";
// import AppHeader from "../components/AppHeader.jsx";
// import "./Student.css";

// import {
//   collection,
//   query,
//   where,
//   getDocs,
//   doc,
//   getDoc,
//   onSnapshot,
//   orderBy,
//   limit,
// } from "firebase/firestore";
// import { auth, db } from "../firebase";

// // ---------- helpers ----------
// const toDate = (tsOrMs) => {
//   if (!tsOrMs) return null;
//   if (tsOrMs.toDate) return tsOrMs.toDate();
//   const ms = typeof tsOrMs === "number" ? tsOrMs : Date.parse(tsOrMs);
//   return isNaN(ms) ? null : new Date(ms);
// };
// const niceDate = (d) => (d ? d.toLocaleString() : "—");
// const niceDateTime = (v) => (v ? toDate(v)?.toLocaleString() : "—");

// const statusClass = (s) => {
//   const key = (s || "").toLowerCase().replaceAll(" ", "");
//   const map = {
//     applied: "st-blue",
//     submitted: "st-blue",
//     underreview: "st-indigo",
//     shortlisted: "st-amber",
//     round1: "st-amber",
//     round2: "st-amber",
//     selected: "st-green",
//     accepted: "st-green",
//     rejected: "st-red",
//   };
//   return map[key] || "st-grey";
// };

// export default function StudentApplications() {
//   const [loading, setLoading] = useState(true);
//   const [apps, setApps] = useState([]);
//   const [saved, setSaved] = useState([]);
//   const [error, setError] = useState("");

//   const [selectedApp, setSelectedApp] = useState(null);
//   const [notes, setNotes] = useState([]);
//   const [notesLoading, setNotesLoading] = useState(false);

//   const [latestNoteByJob, setLatestNoteByJob] = useState({});

//   // Load applications
//   useEffect(() => {
//     const loadApps = async () => {
//       setLoading(true);
//       setError("");
//       try {
//         const uid = auth.currentUser?.uid;
//         if (!uid) {
//           setApps([]);
//           setLoading(false);
//           return;
//         }

//         const qApps = query(collection(db, "applications"), where("studentId", "==", uid));
//         const snap = await getDocs(qApps);
//         const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

//         const withJobs = await Promise.all(
//           rows.map(async (a) => {
//             try {
//               const jsnap = await getDoc(doc(db, "jobs", a.jobId));
//               return {
//                 ...a,
//                 job: jsnap.exists() ? { id: jsnap.id, ...jsnap.data() } : null,
//               };
//             } catch {
//               return { ...a, job: null };
//             }
//           })
//         );

//         withJobs.sort((a, b) => {
//           const ta = toDate(a.createdAt)?.getTime() || 0;
//           const tb = toDate(b.createdAt)?.getTime() || 0;
//           return tb - ta;
//         });

//         setApps(withJobs);
//       } catch (e) {
//         console.error("Applications load error:", e);
//         setError("Failed to load applications.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadApps();
//   }, []);

//   // Load saved jobs
//   useEffect(() => {
//     const loadSaved = async () => {
//       try {
//         const uid = auth.currentUser?.uid;
//         if (!uid) return;

//         const bookmarksRef = collection(db, "users", uid, "bookmarks");
//         const snap = await getDocs(bookmarksRef);

//         const jobs = [];
//         for (const d of snap.docs) {
//           const jobRef = doc(db, "jobs", d.id);
//           const jobSnap = await getDoc(jobRef);
//           if (jobSnap.exists()) jobs.push({ id: jobSnap.id, ...jobSnap.data() });
//         }
//         setSaved(jobs);
//       } catch (e) {
//         console.warn("Saved jobs load warning:", e);
//         setSaved([]);
//       }
//     };

//     loadSaved();
//   }, []);

//   const appliedApps = useMemo(() => apps.filter((a) => a.job), [apps]);

//   // Latest announcement preview per job
//   useEffect(() => {
//     const loadLatestForJobs = async () => {
//       const jobIds = Array.from(
//         new Set(
//           (appliedApps || []).map((a) => a.job?.id || a.jobId).filter(Boolean)
//         )
//       );
//       if (jobIds.length === 0) {
//         setLatestNoteByJob({});
//         return;
//       }

//       const result = {};
//       for (const jid of jobIds) {
//         try {
//           const q1 = query(
//             collection(db, "jobNotes"),
//             where("jobId", "==", jid),
//             where("pushed", "==", true),
//             orderBy("pushedAt", "desc"),
//             limit(1)
//           );
//           const s1 = await getDocs(q1);
//           if (!s1.empty) {
//             result[jid] = { id: s1.docs[0].id, ...s1.docs[0].data() };
//             continue;
//           }
//         } catch (_) {}
//       }
//       setLatestNoteByJob(result);
//     };

//     loadLatestForJobs();
//   }, [appliedApps]);

//   const openApp = useCallback((app) => {
//     setSelectedApp(app);
//     setNotes([]);
//     setNotesLoading(true);

//     const qNotes = query(
//       collection(db, "jobNotes"),
//       where("jobId", "==", app.jobId),
//       where("pushed", "==", true)
//     );

//     const unsub = onSnapshot(
//       qNotes,
//       (snap) => {
//         const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//         items.sort((a, b) => {
//           const ta = toDate(a.pushedAt)?.getTime() || toDate(a.createdAt)?.getTime() || 0;
//           const tb = toDate(b.pushedAt)?.getTime() || toDate(b.createdAt)?.getTime() || 0;
//           return tb - ta;
//         });
//         setNotes(items);
//         setNotesLoading(false);
//       },
//       (err) => {
//         console.error("Announcements load error:", err);
//         setNotes([]);
//         setNotesLoading(false);
//       }
//     );

//     const onEsc = (e) => e.key === "Escape" && setSelectedApp(null);
//     document.addEventListener("keydown", onEsc);

//     return () => {
//       document.removeEventListener("keydown", onEsc);
//       unsub && unsub();
//     };
//   }, []);

//   const closeModal = () => setSelectedApp(null);

//   return (
//     <div className="student-page">
//       <AppHeader />

//       <div className="student-wrap">
//         <div className="header-row">
//           <h1 className="stu-title">My Applications</h1>
//           <Link to="/student" className="stu-back">← Back to Dashboard</Link>
//         </div>

//         {error && <div className="stu-error">{error}</div>}

//         {/* Applied Jobs */}
//         <h2 className="stu-h2">Applied Jobs</h2>
//         {loading ? (
//           <div className="stu-info">Loading…</div>
//         ) : appliedApps.length === 0 ? (
//           <div className="stu-info">You haven’t applied to any jobs yet.</div>
//         ) : (
//           <div className="stu-grid">
//             {appliedApps.map((a) => {
//               const j = a.job || {};
//               const deadline = toDate(j.deadline);
//               const latest = latestNoteByJob[j.id || a.jobId];
//               const pushedWhen = latest?.pushedAt || latest?.createdAt;

//               return (
//                 <div key={a.id} className="app-card" onClick={() => openApp(a)} role="button">
//                   <div className="app-card-head">
//                     <div>
//                       <div className="app-title">{j.title || "Job"}</div>
//                       <div className="app-sub">{j.company || "—"}</div>
//                     </div>
//                     <span className={`status-chip ${statusClass(a.status)}`}>
//                       {(a.status || "Applied").toUpperCase()}
//                     </span>
//                   </div>

//                   <div className="app-lines">
//                     {j.location && <div>📍 {j.location}</div>}
//                     {j.ctc && <div>💰 {j.ctc}</div>}
//                     {deadline && <div>⏳ {deadline.toLocaleDateString()}</div>}
//                   </div>

//                   {latest && (
//                     <div className="stu-notification" style={{ marginTop: 10 }}>
//                       <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
//                         <span className="status-chip st-blue">Announcement</span>
//                         <div className="stu-notification-time">
//                           {niceDateTime(pushedWhen)}
//                         </div>
//                       </div>
//                       <div style={{ fontWeight: 800 }}>
//                         {latest.title || "Announcement"}
//                       </div>
//                       <div style={{ marginTop: 4 }}>
//                         {latest.message || latest.text || "—"}
//                       </div>
//                     </div>
//                   )}

//                   {a.createdAt && (
//                     <div className="app-foot">
//                       Applied on {niceDate(toDate(a.createdAt))}
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         )}

//         {/* Saved Jobs */}
//         <h2 className="stu-h2 mt-24">Saved Jobs</h2>
//         {saved.length === 0 ? (
//           <div className="stu-dim">No saved jobs yet.</div>
//         ) : (
//           <div className="stu-grid">
//             {saved.map((j) => {
//               const deadline = toDate(j.deadline);
//               return (
//                 <div key={j.id} className="app-card app-card--ghost">
//                   <div className="app-card-head">
//                     <div>
//                       <div className="app-title">{j.title || "Job"}</div>
//                       <div className="app-sub">{j.company || "—"}</div>
//                     </div>
//                     <span className="status-chip st-grey">SAVED</span>
//                   </div>
//                   <div className="app-lines">
//                     {j.location && <div>📍 {j.location}</div>}
//                     {j.ctc && <div>💰 {j.ctc}</div>}
//                     {deadline && <div>⏳ {deadline.toLocaleDateString()}</div>}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//       {/* Modal */}
//       {selectedApp && (
//         <div className="modal-overlay" onClick={closeModal}>
//           <div className="modal app-modal" onClick={(e) => e.stopPropagation()}>
//             <div className="appm-head">
//               <div>
//                 <h2 className="appm-title">{selectedApp.job?.title || "Job"}</h2>
//                 <div className="appm-sub">{selectedApp.job?.company || "—"}</div>
//               </div>
//               <span className={`status-chip ${statusClass(selectedApp.status)}`}>
//                 {(selectedApp.status || "Applied").toUpperCase()}
//               </span>
//             </div>

//             <div className="facts">
//               {selectedApp.job?.location && <div className="fact">📍 {selectedApp.job.location}</div>}
//               {selectedApp.job?.ctc && <div className="fact">💰 {selectedApp.job.ctc}</div>}
//               {selectedApp.job?.deadline && (
//                 <div className="fact">
//                   ⏳ {toDate(selectedApp.job.deadline)?.toLocaleDateString() || "—"}
//                 </div>
//               )}
//             </div>

//             {selectedApp.job?.description && (
//               <div className="desc">{selectedApp.job.description}</div>
//             )}

//             <h3 className="stu-h3">Announcements</h3>
//             {notesLoading ? (
//               <div className="stu-info">Loading announcements…</div>
//             ) : notes.length === 0 ? (
//               <div className="stu-dim">No announcements yet.</div>
//             ) : (
//               <div className="timeline">
//                 {notes.map((n) => (
//                   <div className="timeline-item" key={n.id}>
//                     <div className="timeline-dot" />
//                     <div className="timeline-content">
//                       {n.message && <div className="timeline-text">{n.message}</div>}
//                       <div className="timeline-date">
//                         {niceDateTime(n.pushedAt || n.createdAt)}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}

//             <div className="form-actions mt-16">
//               <button className="stu-btn-outline" onClick={closeModal}>Close</button>
//             </div>
//           </div>
//         </div>
//       )}
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
