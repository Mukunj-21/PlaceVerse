// src/pages/recruiter/JobDetail.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase"; 
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// ❌ Commenting out storage for now
// import {
//   getStorage,
//   ref,
//   uploadBytes,
//   getDownloadURL,
// } from "firebase/storage";

import "../../styles/JobDetail.css";

export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  // const storage = getStorage(); // ❌ commented

  // ---- state ----
  const [job, setJob] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  // modal state for new announcement
  const [openModal, setOpenModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  // const [file, setFile] = useState(null); // ❌ commented
  const [saving, setSaving] = useState(false);

  // ---- load job ----
  useEffect(() => {
    const load = async () => {
      const s = await getDoc(doc(db, "jobs", jobId));
      if (s.exists()) setJob({ id: s.id, ...s.data() });
    };
    load();
  }, [jobId]);

  // ---- load announcements (newest first) ----
  useEffect(() => {
    const loadNotes = async () => {
      setLoadingNotes(true);
      try {
        const q = query(
          collection(db, "jobNotes"),
          where("jobId", "==", jobId),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load notes:", err);
        setNotes([]);
      } finally {
        setLoadingNotes(false);
      }
    };
    loadNotes();
  }, [jobId]);

  // ---- add announcement ----
  const handleAdd = async (e) => {
    e.preventDefault();
    // if (!newNote.trim() && !file) return; // ❌ old
    if (!newNote.trim()) return; // ✅ only check for text

    setSaving(true);
    // let fileUrl = null;
    // let fileName = null;

    try {
      // ❌ Commented file upload
      // if (file) {
      //   fileName = file.name;
      //   const fileRef = ref(storage, `jobNotes/${jobId}/${Date.now()}-${file.name}`);
      //   await uploadBytes(fileRef, file);
      //   fileUrl = await getDownloadURL(fileRef);
      // }

      const refDoc = await addDoc(collection(db, "jobNotes"), {
        jobId,
        recruiterId: auth.currentUser?.uid || null,
        message: newNote || null,
        // fileUrl: fileUrl || null, // ❌ commented
        // fileName: fileName || null, // ❌ commented
        createdAt: serverTimestamp(),
      });

      // optimistic insert at top
      setNotes((prev) => [
        {
          id: refDoc.id,
          jobId,
          recruiterId: auth.currentUser?.uid || null,
          message: newNote || null,
          // fileUrl: fileUrl || null,
          // fileName: fileName || null,
          createdAt: new Date(),
        },
        ...prev,
      ]);

      setNewNote("");
      // setFile(null); // ❌ commented
      setOpenModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add announcement ❌");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "—";
    return ts.toDate ? ts.toDate().toLocaleString() : new Date(ts).toLocaleString();
  };

  return (
    <div className="jd-wrap">
      {/* HEADER ROW */}
      <div className="jd-header">
        <div className="jd-summary">
          <h1 className="jd-title">{job?.title || "Job"}</h1>
          <div className="jd-meta">
            {job?.company && <span>{job.company}</span>}
            {job?.location && <span>• {job.location}</span>}
            {job?.ctc && <span>• 💰 {job.ctc}</span>}
            {job?.deadline && (
              <span>
                • ⏳{" "}
                {job.deadline.toDate
                  ? job.deadline.toDate().toLocaleDateString()
                  : new Date(job.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
          {job?.description && <p className="jd-desc">{job.description}</p>}
        </div>

        <div className="jd-actions">
          <button
            className="jd-btn jd-primary"
            onClick={() => navigate(`/recruiter/jobs/${jobId}/applicants`)}
          >
            View Applicants
          </button>
        </div>
      </div>

      {/* ANNOUNCEMENTS LIST */}
      <div className="jd-section">
        <h2 className="jd-h2">Announcements</h2>

        {loadingNotes && <div className="jd-info">Loading…</div>}
        {!loadingNotes && notes.length === 0 && (
          <div className="jd-info">No announcements yet.</div>
        )}

        <div className="jd-notes">
          {notes.map((n) => (
            <div className="jd-note" key={n.id}>
              <div className="jd-note-top">
                <span className="jd-note-time">{formatDate(n.createdAt)}</span>
              </div>
              {n.message && <p className="jd-note-msg">{n.message}</p>}
              {/* ❌ Hide file link until storage enabled */}
              {/* {n.fileUrl && (
                <a
                  className="jd-link"
                  href={n.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📂 {n.fileName || "Attachment"}
                </a>
              )} */}
            </div>
          ))}
        </div>
      </div>

      {/* FLOATING ADD BUTTON */}
      <button className="jd-fab" onClick={() => setOpenModal(true)}>
        + Announcement
      </button>

      {/* MODAL */}
      {openModal && (
        <div className="jd-modal-overlay" onClick={() => setOpenModal(false)}>
          <div className="jd-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="jd-h3">New Announcement</h3>
            <form onSubmit={handleAdd} className="jd-form">
              <textarea
                placeholder="Write announcement…"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              {/* ❌ Hide file input until storage enabled */}
              {/* <input
                type="file"
                onChange={(e) => setFile(e.target.files[0] || null)}
              /> */}
              <div className="jd-modal-actions">
                <button
                  type="button"
                  className="jd-btn"
                  onClick={() => setOpenModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="jd-btn jd-primary" disabled={saving}>
                  {saving ? "Saving…" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
