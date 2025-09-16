// src/pages/recruiter/RecruiterJobs.jsx
import { useState, useEffect } from "react";
import { auth } from "../../firebase";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../../styles/Recruiter.css";

export default function RecruiterJobs() {
  const db = getFirestore();
  const navigate = useNavigate();

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    closed: 0,
    applications: 0,
  });

  // ---- Load jobs (owned by this recruiter) ----
  const loadMyJobs = async () => {
    setMyJobsLoading(true);
    try {
      const q = query(
        collection(db, "jobs"),
        where("recruiterId", "==", auth.currentUser?.uid || "__none__"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const jobs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setMyJobs(jobs);

      // calculate stats from jobs
      const total = jobs.length;
      const open = jobs.filter((j) => j.open).length;
      const closed = total - open;

      setStats((s) => ({
        ...s,
        total,
        open,
        closed,
      }));
    } catch (e) {
      console.error("Failed to load jobs:", e);
    } finally {
      setMyJobsLoading(false);
    }
  };

  // ---- Load applications count for this recruiter ----
  const loadApplicationsCount = async () => {
    try {
      if (!auth.currentUser?.uid) return;
      const q = query(
        collection(db, "applications"),
        where("recruiterId", "==", auth.currentUser.uid)
      );
      const snap = await getDocs(q);
      setStats((s) => ({ ...s, applications: snap.size || 0 }));
    } catch (e) {
      console.error("Failed to count applications:", e);
      setStats((s) => ({ ...s, applications: 0 }));
    }
  };

  useEffect(() => {
    loadMyJobs();
  }, []);

  useEffect(() => {
    loadApplicationsCount();
  }, [auth.currentUser?.uid]);

  // ---- Post new job ----
  const onPostJob = async (e) => {
    e.preventDefault();
    setPosting(true);
    setPostMsg("");

    try {
      if (!jTitle.trim() || !jLocation.trim() || !jDeadline) {
        setPostMsg("Please fill all required fields.");
        setPosting(false);
        return;
      }

      const deadlineTs = new Date(jDeadline + "T23:59:59");

      await addDoc(collection(db, "jobs"), {
        title: jTitle.trim(),
        company: jCompany.trim() || "Not specified",
        location: jLocation.trim(),
        ctc: jCTC.trim() || "Not disclosed",
        deadline: deadlineTs,
        description: jDesc.trim() || "",
        recruiterId: auth.currentUser?.uid || null,
        createdAt: serverTimestamp(),
        open: true,
        adminStatus: "none",
      });

      // Reset form
      setJTitle("");
      setJCompany("");
      setJLocation("");
      setJCTC("");
      setJDeadline("");
      setJDesc("");
      setShowForm(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      await loadMyJobs();
      await loadApplicationsCount();
    } catch (err) {
      console.error("Failed to post job:", err);
      setPostMsg("Failed to post job. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  // ---- Toggle, delete ----
  const toggleOpen = async (job) => {
    try {
      await updateDoc(doc(db, "jobs", job.id), { open: !job.open });
      await loadMyJobs();
    } catch (error) {
      console.error("Failed to update job status:", error);
    }
  };

  const deleteJob = async (job) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${job.title}"? This action cannot be undone.`
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "jobs", job.id));
      await loadMyJobs();
      await loadApplicationsCount();
    } catch (error) {
      console.error("Failed to delete job:", error);
    }
  };

  const filteredJobs = myJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.company || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "open" && job.open) ||
      (filterStatus === "closed" && !job.open);

    return matchesSearch && matchesFilter;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  const isDeadlineSoon = (deadline) => {
    if (!deadline) return false;
    const date = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 3;
  };

  const renderSkeletonJobs = () => (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skel skel-title"></div>
          <div className="skel skel-line" style={{ width: "60%" }}></div>
          <div className="skel skel-line"></div>
          <div className="skel skel-line" style={{ width: "80%" }}></div>
          <div className="skel skel-actions"></div>
        </div>
      ))}
    </>
  );

  return (
    <div className="recruiter-page">
      <div className="recruiter-wrap">
        {showSuccess && (
          <div className="success-banner">
            <span className="success-icon">✅</span>
            Job posted successfully!
          </div>
        )}

        {/* ===== Hero Banner (like screenshot) ===== */}
        <div className="rec-hero-banner">
          <div className="rec-hero-text">
            <h1 className="rec-hero-title">Job Management</h1>
            <p className="rec-hero-sub">Create and manage job postings to attract top talent</p>
          </div>
          <button className="rec-hero-cta" onClick={() => setShowForm(true)}>
            <span className="cta-icon">＋</span> Post New Job
          </button>
        </div>

        {/* ===== Stats Cards (compact, professional) ===== */}
        <div className="rec-stats-grid-pro">
          <div className="rec-stat-card-pro">
            <div className="rec-stat-icon">💼</div>
            <div className="rec-stat-main">
              <div className="rec-stat-number">{stats.total}</div>
              <div className="rec-stat-label">Total Jobs</div>
            </div>
          </div>

          <div className="rec-stat-card-pro">
            <div className="rec-stat-icon">🟢</div>
            <div className="rec-stat-main">
              <div className="rec-stat-number">{stats.open}</div>
              <div className="rec-stat-label">Open Positions</div>
            </div>
          </div>

          <div className="rec-stat-card-pro">
            <div className="rec-stat-icon">🔒</div>
            <div className="rec-stat-main">
              <div className="rec-stat-number">{stats.closed}</div>
              <div className="rec-stat-label">Closed Positions</div>
            </div>
          </div>

          <div className="rec-stat-card-pro">
            <div className="rec-stat-icon">📈</div>
            <div className="rec-stat-main">
              <div className="rec-stat-number">{stats.applications}</div>
              <div className="rec-stat-label">Applications</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search jobs by title, company, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="job-select"
            style={{ minWidth: "150px" }}
          >
            <option value="all">All Jobs</option>
            <option value="open">Open Only</option>
            <option value="closed">Closed Only</option>
          </select>
        </div>

        {/* Jobs List */}
        <div className="jobs-grid">
          {myJobsLoading ? (
            renderSkeletonJobs()
          ) : filteredJobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {searchTerm || filterStatus !== "all" ? "🔍" : "💼"}
              </div>
              <div className="empty-title">
                {searchTerm || filterStatus !== "all"
                  ? "No matching jobs found"
                  : "No jobs posted yet"}
              </div>
              <div className="empty-text">
                {searchTerm || filterStatus !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by posting your first job opportunity"}
              </div>
              {!searchTerm && filterStatus === "all" && (
                <button className="rec-btn" onClick={() => setShowForm(true)}>
                  Post Your First Job
                </button>
              )}
            </div>
          ) : (
            filteredJobs.map((job, index) => (
              <div
                key={job.id}
                className="job-card-full"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="job-card-header">
                  <div>
                    <h3 className="job-title">{job.title}</h3>
                    <div className="job-company">{job.company}</div>
                  </div>
                  <div className="job-card-actions">
                    <span
                      className={`job-status-pill ${
                        job.open ? "pill-open" : "pill-closed"
                      }`}
                    >
                      {job.open ? "🟢 Open" : "🔒 Closed"}
                    </span>
                  </div>
                </div>

                <div className="job-meta-grid">
                  <div className="job-meta-item">
                    <span className="meta-icon">📍</span>
                    {job.location}
                  </div>
                  <div className="job-meta-item">
                    <span className="meta-icon">💰</span>
                    {job.ctc}
                  </div>
                  <div className="job-meta-item">
                    <span className="meta-icon">⏰</span>
                    Deadline: {formatDate(job.deadline)}
                    {isDeadlineSoon(job.deadline) && (
                      <span style={{ color: "#f59e0b" }}> (Soon!)</span>
                    )}
                  </div>
                  <div className="job-meta-item">
                    <span className="meta-icon">📅</span>
                    Posted: {formatDate(job.createdAt)}
                  </div>
                </div>

                {job.description && (
                  <div className="job-description">{job.description}</div>
                )}

                <div className="job-actions-row">
                  <button
                    className="rec-btn rec-btn-sm"
                    onClick={() => navigate(`/recruiter/jobs/${job.id}`)}
                  >
                    👁️ View Details
                  </button>
                  <button
                    className="rec-btn rec-btn-sm"
                    onClick={() =>
                      navigate(`/recruiter/jobs/${job.id}/applicants`)
                    }
                  >
                    👥 View Applicants
                  </button>
                  <button
                    className={`rec-btn rec-btn-sm ${
                      job.open ? "rec-btn-danger" : "rec-btn-success"
                    }`}
                    onClick={() => toggleOpen(job)}
                  >
                    {job.open ? "🔒 Close" : "🟢 Open"}
                  </button>
                  <button
                    className="rec-btn rec-btn-sm rec-btn-danger"
                    onClick={() => deleteJob(job)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Floating Action Button */}
        <button className="fab" onClick={() => setShowForm(true)}>
          <span className="fab-icon">+</span>
          <span className="fab-text">Add New Job</span>
        </button>

        {/* Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div
              className="modal job-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="modal-title">Create New Job</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowForm(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={onPostJob}>
                <div className="job-form-grid">
                  <div className="form-row">
                    <label htmlFor="title">Job Title *</label>
                    <input
                      id="title"
                      type="text"
                      value={jTitle}
                      onChange={(e) => setJTitle(e.target.value)}
                      className="job-input"
                      placeholder="e.g. Senior Software Engineer"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <label htmlFor="company">Company</label>
                    <input
                      id="company"
                      type="text"
                      value={jCompany}
                      onChange={(e) => setJCompany(e.target.value)}
                      className="job-input"
                      placeholder="e.g. Tech Corp"
                    />
                  </div>

                  <div className="form-row">
                    <label htmlFor="location">Location *</label>
                    <input
                      id="location"
                      type="text"
                      value={jLocation}
                      onChange={(e) => setJLocation(e.target.value)}
                      className="job-input"
                      placeholder="e.g. San Francisco, CA"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <label htmlFor="ctc">CTC/Salary</label>
                    <input
                      id="ctc"
                      type="text"
                      value={jCTC}
                      onChange={(e) => setJCTC(e.target.value)}
                      className="job-input"
                      placeholder="e.g. $80,000 - $120,000"
                    />
                  </div>

                  <div className="form-row">
                    <label htmlFor="deadline">Application Deadline *</label>
                    <input
                      id="deadline"
                      type="date"
                      value={jDeadline}
                      onChange={(e) => setJDeadline(e.target.value)}
                      className="job-input"
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>

                  <div className="form-row full-width">
                    <label htmlFor="description">Job Description</label>
                    <textarea
                      id="description"
                      value={jDesc}
                      onChange={(e) => setJDesc(e.target.value)}
                      className="job-textarea"
                      placeholder="Describe the role, requirements, and what you're looking for in candidates..."
                      rows="6"
                    />
                  </div>
                </div>

                {postMsg && (
                  <div
                    style={{
                      color: "#ef4444",
                      marginTop: "16px",
                      textAlign: "center",
                    }}
                  >
                    {postMsg}
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="rec-btn rec-btn-outline"
                    onClick={() => setShowForm(false)}
                    disabled={posting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="rec-btn" disabled={posting}>
                    {posting ? (
                      <>
                        <div
                          className="spinner"
                          style={{
                            width: "16px",
                            height: "16px",
                            marginRight: "8px",
                          }}
                        ></div>
                        Posting...
                      </>
                    ) : (
                      "🚀 Post Job"
                    )}
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
