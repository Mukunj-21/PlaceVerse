// PURPOSE: Recruiter can view all jobs and add new jobs via floating button modal

import { useState, useEffect } from "react";
import { auth } from "../../firebase";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, where, orderBy, getDocs, doc, updateDoc, deleteDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../../styles/Recruiter.css";   // ✅ make sure to import CSS

export default function RecruiterJobs() {
  const db = getFirestore();
  const navigate = useNavigate();

  // Modal state
  const [showForm, setShowForm] = useState(false);

  // Job form state
  const [jTitle, setJTitle] = useState("");
  const [jCompany, setJCompany] = useState("");
  const [jLocation, setJLocation] = useState("");
  const [jCTC, setJCTC] = useState("");
  const [jDeadline, setJDeadline] = useState("");
  const [jDesc, setJDesc] = useState("");
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState("");

  // Jobs list
  const [myJobs, setMyJobs] = useState([]);
  const [myJobsLoading, setMyJobsLoading] = useState(true);

  // Load jobs from Firestore
  const loadMyJobs = async () => {
    setMyJobsLoading(true);
    try {
      const q = query(
        collection(db, "jobs"),
        where("recruiterId", "==", auth.currentUser?.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setMyJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setMyJobsLoading(false);
    }
  };

  useEffect(() => { loadMyJobs(); }, []);

  // Post new job
  const onPostJob = async (e) => {
    e.preventDefault();
    setPosting(true);
    setPostMsg("");
    try {
      if (!jTitle || !jLocation || !jDeadline) {
        setPostMsg("Please fill required fields.");
        setPosting(false);
        return;
      }
      const deadlineTs = new Date(jDeadline + "T23:59:59");

      // ✅ Added adminStatus: "none"
      await addDoc(collection(db, "jobs"), {
        title: jTitle,
        company: jCompany,
        location: jLocation,
        ctc: jCTC,
        deadline: deadlineTs,
        description: jDesc,
        recruiterId: auth.currentUser?.uid || null,
        createdAt: serverTimestamp(),
        open: true,
        adminStatus: "none",
      });

      setPostMsg("Job posted!");
      setJTitle(""); setJCompany(""); setJLocation("");
      setJCTC(""); setJDeadline(""); setJDesc("");
      setShowForm(false);
      loadMyJobs();
    } catch (err) {
      setPostMsg("Failed to post job.");
    } finally {
      setPosting(false);
    }
  };

  const toggleOpen = async (job) => {
    await updateDoc(doc(db, "jobs", job.id), { open: !job.open });
    loadMyJobs();
  };

  const deleteJob = async (job) => {
    if (!window.confirm("Delete this job?")) return;
    await deleteDoc(doc(db, "jobs", job.id));
    loadMyJobs();
  };

  return (
    <div className="recruiter-page">   {/* ✅ apply themed background */}
      <div className="rec-card">
        <h1 className="rec-title">My Jobs</h1>
        {myJobsLoading && <div className="rec-info">Loading jobs…</div>}
        {!myJobsLoading && myJobs.length === 0 && <div>No jobs posted.</div>}

        {/* Job Cards List */}
        <div className="jobs-list">
          {myJobs.map(job => (
            <div
              className="job-card-full"
              key={job.id}
              onClick={() => navigate(`/recruiter/jobs/${job.id}`)}
              style={{ cursor: "pointer" }}
            >
              <div className="job-card-header">
                <div>
                  <h3 className="job-title">{job.title}</h3>
                  <p>{job.company} — {job.location}</p>
                </div>

                <div className="job-card-actions">
                  <span className={job.open ? "pill pill-on" : "pill pill-off"}>
                    {job.open ? "Open" : "Closed"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleOpen(job); }}
                    className="job-btn"
                  >
                    {job.open ? "Close" : "Reopen"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteJob(job); }}
                    className="job-btn job-btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="job-card-body">
                {job.ctc && <div>💰 {job.ctc}</div>}
                {job.deadline && (
                  <div>
                    ⏳ Deadline: {job.deadline.toDate
                      ? job.deadline.toDate().toLocaleDateString()
                      : new Date(job.deadline).toLocaleDateString()}
                  </div>
                )}
                {job.createdAt && job.createdAt.seconds && (
                  <div>📅 Posted: {new Date(job.createdAt.seconds * 1000).toLocaleDateString()}</div>
                )}
                <p>{job.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Floating button */}
        <button className="fab" onClick={() => setShowForm(true)}>
  <span className="fab-icon">+</span>
  <span className="fab-text">Add Job</span>
</button>


        {/* Modal for new job */}
{showForm && (
  <div className="modal-overlay">
    <div className="modal job-modal">
      <h2 className="rec-subtitle">Create New Job</h2>
      {postMsg && <div className="rec-info">{postMsg}</div>}

      <form onSubmit={onPostJob} className="job-form-grid">
        <div className="form-row">
          <label>Job Title *</label>
          <input className="job-input"
            value={jTitle}
            onChange={e => setJTitle(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Company</label>
          <input className="job-input"
            value={jCompany}
            onChange={e => setJCompany(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Location *</label>
          <input className="job-input"
            value={jLocation}
            onChange={e => setJLocation(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>CTC</label>
          <input className="job-input"
            value={jCTC}
            onChange={e => setJCTC(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Deadline *</label>
          <input type="date" className="job-input"
            value={jDeadline}
            onChange={e => setJDeadline(e.target.value)}
          />
        </div>

        <div className="form-row full">
          <label>Description</label>
          <textarea className="job-textarea"
            rows={4}
            value={jDesc}
            onChange={e => setJDesc(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button className="job-btn" disabled={posting}>
            {posting ? "Posting…" : "Post Job"}
          </button>
          <button type="button" className="job-btn-ghost" onClick={() => setShowForm(false)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      </div>
    </div>
  );
}
