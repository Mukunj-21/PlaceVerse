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

  // ✅ Stages (Rounds)
  const [stages, setStages] = useState([{ id: Date.now(), title: "" }]);

  const addStage = () => {
    setStages([...stages, { id: Date.now(), title: "" }]);
  };

  const removeStage = (id) => {
    setStages(stages.filter(stage => stage.id !== id));
  };

  const updateStage = (id, value) => {
    setStages(stages.map(stage =>
      stage.id === id ? { ...stage, title: value } : stage
    ));
  };
  
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
    applications: 0
  });

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
      const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      setMyJobs(jobs);
      
      // Calculate stats
      const total = jobs.length;
      const open = jobs.filter(j => j.open).length;
      const closed = total - open;
      
      setStats({
        total,
        open,
        closed,
        applications: 0 // you can compute from applications collection
      });
      
    } catch (e) {
      console.error("Failed to load jobs:", e);
    } finally {
      setMyJobsLoading(false);
    }
  };

  useEffect(() => {
    loadMyJobs();
  }, []);

  // Post new job
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

        // ✅ Save stages
        stages: stages.map((s, idx) => ({
          id: `stage${idx + 1}`,
          title: s.title.trim(),
          completed: false,
          order: idx + 1,
        }))
      });

      // Reset form
      setJTitle("");
      setJCompany("");
      setJLocation("");
      setJCTC("");
      setJDeadline("");
      setJDesc("");
      setStages([{ id: Date.now(), title: "" }]);
      setShowForm(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      loadMyJobs();
      
    } catch (err) {
      console.error("Failed to post job:", err);
      setPostMsg("Failed to post job. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const toggleOpen = async (job) => {
    try {
      await updateDoc(doc(db, "jobs", job.id), { open: !job.open });
      loadMyJobs();
    } catch (error) {
      console.error("Failed to update job status:", error);
    }
  };

  const deleteJob = async (job) => {
    if (!window.confirm(`Are you sure you want to delete "${job.title}"? This action cannot be undone.`)) return;
    
    try {
      await deleteDoc(doc(db, "jobs", job.id));
      loadMyJobs();
    } catch (error) {
      console.error("Failed to delete job:", error);
    }
  };

  const filteredJobs = myJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === "all" ||
                         (filterStatus === "open" && job.open) ||
                         (filterStatus === "closed" && !job.open);
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="recruiter-page">
      <div className="recruiter-wrap">
        {showSuccess && (
          <div className="success-banner">
            <span className="success-icon">✅</span>
            Job posted successfully!
          </div>
        )}

        {/* Hero Section */}
        <div className="recruiter-hero">
          <div className="hero-content">
            <h1 className="rec-title">Job Management</h1>
            <p className="rec-subtitle">Create and manage job postings to attract top talent</p>
          </div>
          <div className="hero-actions">
            <button 
              className="hero-btn"
              onClick={() => setShowForm(true)}
            >
              <span>➕</span>
              Post New Job
            </button>
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
            style={{ minWidth: '150px' }}
          >
            <option value="all">All Jobs</option>
            <option value="open">Open Only</option>
            <option value="closed">Closed Only</option>
          </select>
        </div>

        {/* Jobs List */}
        <div className="jobs-grid">
          {filteredJobs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💼</div>
              <div className="empty-title">No jobs posted yet</div>
              <div className="empty-text">Get started by posting your first job opportunity</div>
              <button className="rec-btn" onClick={() => setShowForm(true)}>
                Post Your First Job
              </button>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="job-card-full">
                <div className="job-card-header">
                  <div>
                    <h3 className="job-title">{job.title}</h3>
                    <div className="job-company">{job.company}</div>
                  </div>
                  <div className="job-card-actions">
                    <span className={`job-status-pill ${job.open ? 'pill-open' : 'pill-closed'}`}>
                      {job.open ? '🟢 Open' : '🔒 Closed'}
                    </span>
                  </div>
                </div>

                <div className="job-meta-grid">
                  <div className="job-meta-item">📍 {job.location}</div>
                  <div className="job-meta-item">💰 {job.ctc}</div>
                  <div className="job-meta-item">⏰ Deadline: {formatDate(job.deadline)}</div>
                  <div className="job-meta-item">📅 Posted: {formatDate(job.createdAt)}</div>
                </div>

                <div className="job-actions-row">
                  <button className="rec-btn rec-btn-sm" onClick={() => navigate(`/recruiter/jobs/${job.id}`)}>👁️ View Details</button>
                  <button className={`rec-btn rec-btn-sm ${job.open ? 'rec-btn-danger' : 'rec-btn-success'}`} onClick={() => toggleOpen(job)}>
                    {job.open ? '🔒 Close' : '🟢 Open'}
                  </button>
                  <button className="rec-btn rec-btn-sm rec-btn-danger" onClick={() => deleteJob(job)}>🗑️ Delete</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal job-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Create New Job</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
              </div>

              <form onSubmit={onPostJob}>
                <div className="job-form-grid">
                  <div className="form-row">
                    <label htmlFor="title">Job Title *</label>
                    <input id="title" type="text" value={jTitle} onChange={(e) => setJTitle(e.target.value)} className="job-input" required />
                  </div>
                  <div className="form-row">
                    <label htmlFor="company">Company</label>
                    <input id="company" type="text" value={jCompany} onChange={(e) => setJCompany(e.target.value)} className="job-input" />
                  </div>
                  <div className="form-row">
                    <label htmlFor="location">Location *</label>
                    <input id="location" type="text" value={jLocation} onChange={(e) => setJLocation(e.target.value)} className="job-input" required />
                  </div>
                  <div className="form-row">
                    <label htmlFor="ctc">CTC/Salary</label>
                    <input id="ctc" type="text" value={jCTC} onChange={(e) => setJCTC(e.target.value)} className="job-input" />
                  </div>
                  <div className="form-row">
                    <label htmlFor="deadline">Application Deadline *</label>
                    <input id="deadline" type="date" value={jDeadline} onChange={(e) => setJDeadline(e.target.value)} className="job-input" required />
                  </div>

                  <div className="form-row full-width">
                    <label htmlFor="description">Job Description</label>
                    <textarea id="description" value={jDesc} onChange={(e) => setJDesc(e.target.value)} className="job-textarea" rows="4" />
                  </div>

                  {/* ✅ Stages Input */}
                  <div className="form-row full-width">
                    <label>Recruitment Rounds / Stages</label>
                    {stages.map((stage, index) => (
                      <div key={stage.id} className="stage-row">
                        <input
                          type="text"
                          value={stage.title}
                          onChange={(e) => updateStage(stage.id, e.target.value)}
                          placeholder={`Stage ${index + 1} (e.g., Online Assessment)`}
                          className="job-input"
                          required
                        />
                        {stages.length > 1 && (
                          <button type="button" className="rec-btn-sm rec-btn-danger" onClick={() => removeStage(stage.id)}>✖</button>
                        )}
                      </div>
                    ))}
                    <button type="button" className="rec-btn-sm rec-btn-outline" onClick={addStage}>➕ Add Stage</button>
                  </div>
                </div>

                {postMsg && <div style={{ color: "red", textAlign: "center" }}>{postMsg}</div>}

                <div className="form-actions">
                  <button type="button" className="rec-btn rec-btn-outline" onClick={() => setShowForm(false)} disabled={posting}>Cancel</button>
                  <button type="submit" className="rec-btn" disabled={posting}>
                    {posting ? "Posting..." : "🚀 Post Job"}
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
