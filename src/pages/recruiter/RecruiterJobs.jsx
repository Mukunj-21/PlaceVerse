// src/pages/RecruiterJobs.jsx
// PURPOSE: Let recruiter post new jobs and manage jobs they posted.

import { useState, useEffect } from "react";
import { auth } from "../../firebase";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, where, orderBy, getDocs, doc, updateDoc, deleteDoc
} from "firebase/firestore";

export default function RecruiterJobs() {
  const db = getFirestore();

  // Job form state
  const [jTitle, setJTitle] = useState("");
  const [jCompany, setJCompany] = useState("");
  const [jLocation, setJLocation] = useState("");
  const [jCTC, setJCTC] = useState("");
  const [jDeadline, setJDeadline] = useState("");
  const [jDesc, setJDesc] = useState("");
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState("");

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
      });
      setPostMsg("Job posted!");
      setJTitle(""); setJCompany(""); setJLocation("");
      setJCTC(""); setJDeadline(""); setJDesc("");
      loadMyJobs();
    } catch (err) {
      setPostMsg("Failed to post job.");
    } finally {
      setPosting(false);
    }
  };

  // My jobs state
  const [myJobs, setMyJobs] = useState([]);
  const [myJobsLoading, setMyJobsLoading] = useState(true);

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
    <div className="rec-card">
      <h1 className="rec-title">Post a Job</h1>

      {postMsg && <div className="rec-info">{postMsg}</div>}

      <form onSubmit={onPostJob} className="job-form">
        <input className="job-input" placeholder="Job Title *"
          value={jTitle} onChange={e => setJTitle(e.target.value)} />
        <input className="job-input" placeholder="Company"
          value={jCompany} onChange={e => setJCompany(e.target.value)} />
        <input className="job-input" placeholder="Location *"
          value={jLocation} onChange={e => setJLocation(e.target.value)} />
        <input className="job-input" placeholder="CTC"
          value={jCTC} onChange={e => setJCTC(e.target.value)} />
        <label className="job-label">
          Deadline *
          <input type="date" className="job-input"
            value={jDeadline} onChange={e => setJDeadline(e.target.value)} />
        </label>
        <textarea className="job-textarea" rows={3}
          placeholder="Description" value={jDesc}
          onChange={e => setJDesc(e.target.value)} />
        <button className="job-btn" disabled={posting}>
          {posting ? "Posting…" : "Post Job"}
        </button>
      </form>

      <h2 className="rec-subtitle">My Jobs</h2>
      {myJobsLoading && <div className="rec-info">Loading jobs…</div>}
      {!myJobsLoading && myJobs.length === 0 && <div>No jobs posted.</div>}

      <div className="myjobs-grid">
        {myJobs.map(job => (
          <div className="myjob-card" key={job.id}>
            <div className="myjob-top">
              <div>{job.title}</div>
              <span>{job.open ? "Open" : "Closed"}</span>
            </div>
            <div>{job.company} — {job.location}</div>
            <div>{job.ctc}</div>
            <div>{job.description}</div>
            <div className="myjob-actions">
              <button onClick={() => toggleOpen(job)} className="job-btn">
                {job.open ? "Close" : "Reopen"}
              </button>
              <button onClick={() => deleteJob(job)} className="job-btn job-btn-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
