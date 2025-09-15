// src/pages/admin/AdminJobs.jsx
import { useEffect, useState } from "react";
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  where,
  serverTimestamp 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase.js";
import AppHeader from "../../components/AppHeader.jsx";
import "/src/styles/Admin.css";

export default function AdminJobs() {
  const auth = getAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [updatingJob, setUpdatingJob] = useState(null);
  const [showSuccess, setShowSuccess] = useState("");
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  
  // Announcements data
  const [latestNoteByJob, setLatestNoteByJob] = useState({});
  const [pendingByJob, setPendingByJob] = useState({});
  
  // Modal state
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobNotes, setJobNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    loadJobsAndAnnouncements();
  }, []);

  const loadJobsAndAnnouncements = async () => {
    setLoading(true);
    try {
      const jobsQuery = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
      const jobsSnap = await getDocs(jobsQuery);
      const jobsData = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Auto-close expired jobs
      const now = new Date();
      const toClose = jobsData.filter(job => {
        const deadline = job.deadline?.toDate?.() || new Date(job.deadline);
        return job.applicationsOpen && deadline < now;
      });

      if (toClose.length > 0) {
        await Promise.all(
          toClose.map(job =>
            updateDoc(doc(db, "jobs", job.id), {
              applicationsOpen: false,
              status: "closed",
              closedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          )
        );
      }

      const updatedJobs = jobsData.map(job => {
        const deadline = job.deadline?.toDate?.() || new Date(job.deadline);
        if (job.applicationsOpen && deadline < now) {
          return { ...job, applicationsOpen: false, status: "closed" };
        }
        return job;
      });

      setJobs(updatedJobs);

      // Announcements overview
      const notesQuery = query(collection(db, "jobNotes"), orderBy("createdAt", "desc"));
      const notesSnap = await getDocs(notesQuery);
      
      const latest = {};
      const pendingCounts = {};
      
      notesSnap.forEach((d) => {
        const note = { id: d.id, ...d.data() };
        const jobId = note.jobId;
        if (!jobId) return;
        if (!latest[jobId]) latest[jobId] = note;
        if (!note.pushed) pendingCounts[jobId] = (pendingCounts[jobId] || 0) + 1;
      });

      setLatestNoteByJob(latest);
      setPendingByJob(pendingCounts);

    } catch (error) {
      console.error("Failed to load jobs and announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleJobStatus = async (jobId, newStatus) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const deadline = job.deadline?.toDate?.() || new Date(job.deadline);
    if (newStatus && deadline < new Date()) {
      alert("Cannot open job: deadline has passed");
      return;
    }

    setUpdatingJob(jobId);
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        applicationsOpen: newStatus,
        status: newStatus ? "open" : "closed",
        updatedAt: serverTimestamp(),
      });

      setJobs(prev => prev.map(j => j.id === jobId 
        ? { ...j, applicationsOpen: newStatus, status: newStatus ? "open" : "closed" }
        : j
      ));

      setShowSuccess(`Job ${newStatus ? 'opened' : 'closed'} successfully!`);
      setTimeout(() => setShowSuccess(""), 3000);
    } catch (error) {
      console.error("Failed to update job status:", error);
      alert("Failed to update job status");
    } finally {
      setUpdatingJob(null);
    }
  };

  const openJobModal = async (job) => {
    setSelectedJob(job);
    setNotesLoading(true);
    try {
      const jobNotesQuery = query(
        collection(db, "jobNotes"),
        where("jobId", "==", job.id),
        orderBy("createdAt", "desc")
      );
      const notesSnap = await getDocs(jobNotesQuery);
      const notes = notesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobNotes(notes);
    } catch (error) {
      console.error("Failed to load job notes:", error);
      setJobNotes([]);
    } finally {
      setNotesLoading(false);
    }
  };

  const pushAnnouncement = async (noteId) => {
    if (!window.confirm("Push this announcement to all students?")) return;
    try {
      await updateDoc(doc(db, "jobNotes", noteId), {
        pushed: true,
        pushedAt: serverTimestamp(),
        pushedBy: auth.currentUser?.uid,
      });
      setJobNotes(prev => prev.map(note =>
        note.id === noteId ? { ...note, pushed: true, pushedAt: new Date() } : note
      ));
      await loadJobsAndAnnouncements();
    } catch (error) {
      console.error("Failed to push announcement:", error);
      alert("Failed to push announcement");
    }
  };

  const viewApplicants = (jobId) => {
    navigate(`/admin/jobs/${jobId}/applicants`);
  };

  // ✅ NEW: view job detail (timeline + stages)
  const viewJob = (jobId) => {
    navigate(`/admin/jobs/${jobId}`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
  };

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    const date = deadline.toDate ? deadline.toDate() : new Date(deadline);
    return date < new Date();
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      (job.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.company || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "open" && job.applicationsOpen && !isDeadlinePassed(job.deadline)) ||
      (filterStatus === "closed" && (!job.applicationsOpen || isDeadlinePassed(job.deadline))) ||
      (filterStatus === "expired" && isDeadlinePassed(job.deadline));
    return matchesSearch && matchesStatus;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === "oldest") {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return dateA - dateB;
    } else if (sortBy === "deadline") {
      const dateA = a.deadline?.toDate?.() || new Date(a.deadline);
      const dateB = b.deadline?.toDate?.() || new Date(b.deadline);
      return dateA - dateB;
    }
    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
    return dateB - dateA;
  });

  const stats = {
    total: jobs.length,
    open: jobs.filter(j => j.applicationsOpen && !isDeadlinePassed(j.deadline)).length,
    closed: jobs.filter(j => !j.applicationsOpen || isDeadlinePassed(j.deadline)).length,
    expired: jobs.filter(j => isDeadlinePassed(j.deadline)).length,
    totalAnnouncements: Object.keys(latestNoteByJob).length,
    pendingAnnouncements: Object.values(pendingByJob).reduce((sum, count) => sum + count, 0)
  };

  if (loading) {
    return (
      <div className="admin-page">
        <AppHeader />
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading job management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <AppHeader />
      <div className="admin-container">
        {/* ... header, stats etc. (unchanged) ... */}

        <div className="admin-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Job Listings</h2>
              <p className="section-subtitle">Manage job postings, status, and announcements</p>
            </div>
          </div>

          {/* Filters (unchanged) */}

          <div className="admin-table-container">
            {sortedJobs.length === 0 ? (
              <div className="admin-empty">{/* ... unchanged ... */}</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Job Details</th>
                    <th>Company</th>
                    <th>Location & CTC</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Announcements</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedJobs.map((job, index) => {
                    const isExpired = isDeadlinePassed(job.deadline);
                    const isOpen = job.applicationsOpen && !isExpired;
                    const pendingCount = pendingByJob[job.id] || 0;

                    return (
                      <tr key={job.id} className="table-row" style={{ animationDelay: `${index * 0.05}s` }}>
                        <td>
                          <div className="job-info">
                            {/* make title clickable to open AdminJobDetail */}
                            <h4 className="job-title-cell">
                              <button className="linklike" onClick={() => viewJob(job.id)}>
                                {job.title}
                              </button>
                            </h4>
                            {job.description && (
                              <p className="job-desc-cell">
                                {job.description.substring(0, 100)}
                                {job.description.length > 100 && '...'}
                              </p>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="company-info">
                            <span className="company-name">{job.company}</span>
                            {pendingCount > 0 && <span className="pending-badge">{pendingCount} pending</span>}
                          </div>
                        </td>

                        <td>
                          <div className="location-ctc">
                            <span className="location">📍 {job.location}</span>
                            <span className="ctc">💰 {job.ctc || "Not disclosed"}</span>
                          </div>
                        </td>

                        <td>
                          <div className={`deadline ${isExpired ? 'deadline-expired' : ''}`}>
                            {formatDate(job.deadline)}
                            {isExpired && <span className="expired-label">Expired</span>}
                          </div>
                        </td>

                        <td>
                          <span className={`status-pill ${isOpen ? 'status-active' : 'status-inactive'}`}>
                            {isOpen ? '🟢 Open' : '🔒 Closed'}
                          </span>
                        </td>

                        <td>
                          <button className="admin-btn admin-btn-ghost btn-sm" onClick={() => openJobModal(job)}>
                            📢 View ({latestNoteByJob[job.id] ? '1+' : '0'})
                          </button>
                        </td>

                        <td>
                          <div className="table-actions">
                            {/* NEW: View Job page */}
                            <button className="admin-btn btn-sm" onClick={() => viewJob(job.id)}>
                              👀 View
                            </button>

                            <button
                              className="admin-btn admin-btn-outline btn-sm"
                              onClick={() => viewApplicants(job.id)}
                            >
                              👥 Applicants
                            </button>

                            <button
                              onClick={() => toggleJobStatus(job.id, !job.applicationsOpen)}
                              className={`admin-btn btn-sm ${isOpen ? 'admin-btn-danger' : 'admin-btn-success'}`}
                              disabled={updatingJob === job.id || (isExpired && !job.applicationsOpen)}
                            >
                              {updatingJob === job.id ? <div className="btn-spinner"></div> : isOpen ? 'Close' : isExpired ? 'Expired' : 'Open'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* footer & modals  — unchanged */}
        </div>
      </div>
    </div>
  );
}
