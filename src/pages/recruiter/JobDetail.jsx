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

// Storage reserved for later
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import "../../styles/JobDetail.css";

export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  // const storage = getStorage();

  // ---- state ----
  const [job, setJob] = useState(null);
  const [jobLoading, setJobLoading] = useState(true);

  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  // modal state for new announcement
  const [openModal, setOpenModal] = useState(false);
  const [newTitle, setNewTitle] = useState(""); // title field
  const [newNote, setNewNote] = useState("");
  // const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // ---- load job ----
  useEffect(() => {
    (async () => {
      setJobLoading(true);
      try {
        const s = await getDoc(doc(db, "jobs", jobId));
        if (s.exists()) setJob({ id: s.id, ...s.data() });
        else setJob(null);
      } finally {
        setJobLoading(false);
      }
    })();
  }, [jobId]);

  // ---- load announcements (newest first) ----
  useEffect(() => {
    (async () => {
      setLoadingNotes(true);
      try {
        const qn = query(
          collection(db, "jobNotes"),
          where("jobId", "==", jobId),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(qn);
        setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load notes:", err);
        setNotes([]);
      } finally {
        setLoadingNotes(false);
      }
    })();
  }, [jobId]);

  // ---- add announcement ----
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newNote.trim() && !newTitle.trim()) return;

    setSaving(true);
    // let fileUrl = null;
    // let fileName = null;

    try {
      // if (file) {
      //   fileName = file.name;
      //   const fileRef = ref(storage, `jobNotes/${jobId}/${Date.now()}-${file.name}`);
      //   await uploadBytes(fileRef, file);
      //   fileUrl = await getDownloadURL(fileRef);
      // }

      const payload = {
        jobId,
        recruiterId: auth.currentUser?.uid || null,
        company: job?.company || "",
        title: newTitle.trim() || "Announcement",
        message: newNote.trim() || null,
        // fileUrl: fileUrl || null,
        // fileName: fileName || null,
        pushed: false,
        createdAt: serverTimestamp(),
      };

      const refDoc = await addDoc(collection(db, "jobNotes"), payload);

      // optimistic prepend (approx createdAt with local time)
      setNotes((prev) => [
        { id: refDoc.id, ...payload, createdAt: new Date() },
        ...prev,
      ]);

      setNewTitle("");
      setNewNote("");
      // setFile(null);
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

  if (jobLoading) {
    return (
      <div className="jd-wrap">
        <div className="jd-info">Loading job…</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="jd-wrap">
        <div className="jd-info">Job not found.</div>
        <button className="jd-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
    );
  }

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
                <span className="jd-note-title">{n.title || "Announcement"}</span>
                <div className="jd-note-right">
                  {n.pushed ? (
                    <span className="jd-chip jd-chip-sent">Sent</span>
                  ) : (
                    <span className="jd-chip jd-chip-pending">Pending</span>
                  )}
                  <span className="jd-note-time">{formatDate(n.createdAt)}</span>
                </div>
              </div>

              {n.message && <p className="jd-note-msg">{n.message}</p>}

              {/* file link reserved for later
              {n.fileUrl && (
                <a className="jd-link" href={n.fileUrl} target="_blank" rel="noopener noreferrer">
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
              <input
                className="jd-input"
                placeholder="Short title (e.g., Round 1 schedule)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <textarea
                placeholder="Write announcement…"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              {/* <input type="file" onChange={(e) => setFile(e.target.files[0] || null)} /> */}
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
