// src/pages/recruiter/JobApplicants.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc
} from "firebase/firestore";
import "../../styles/Recruiter.css";

export default function JobApplicants() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  // State management
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(new Set());
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    applied: 0,
    shortlisted: 0,
    selected: 0,
    rejected: 0
  });

  // Load job and applications
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load job details
        const jobDoc = await getDoc(doc(db, "jobs", jobId));
        if (jobDoc.exists()) {
          setJob({ id: jobDoc.id, ...jobDoc.data() });
        }

        // Load applications
        const appsQuery = query(
          collection(db, "applications"),
          where("jobId", "==", jobId)
        );
        const appsSnap = await getDocs(appsQuery);
        const apps = appsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort by creation date (newest first)
        apps.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB - dateA;
        });

        setApplications(apps);

        // Calculate stats
        const total = apps.length;
        const applied = apps.filter(app => app.status === "applied").length;
        const shortlisted = apps.filter(app => app.status === "shortlisted").length;
        const selected = apps.filter(app => app.status === "selected").length;
        const rejected = apps.filter(app => app.status === "rejected").length;

        setStats({ total, applied, shortlisted, selected, rejected });

      } catch (error) {
        console.error("Error loading applications:", error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) loadData();
  }, [jobId]);

  // Update application status
  const updateStatus = async (appId, newStatus) => {
    setUpdatingStatus(prev => new Set(prev).add(appId));
    
    try {
      await updateDoc(doc(db, "applications", appId), { 
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      setApplications(apps => apps.map(app => 
        app.id === appId ? { ...app, status: newStatus } : app
      ));

      // Recalculate stats
      const updatedApps = applications.map(app => 
        app.id === appId ? { ...app, status: newStatus } : app
      );
      
      const total = updatedApps.length;
      const applied = updatedApps.filter(app => app.status === "applied").length;
      const shortlisted = updatedApps.filter(app => app.status === "shortlisted").length;
      const selected = updatedApps.filter(app => app.status === "selected").length;
      const rejected = updatedApps.filter(app => app.status === "rejected").length;

      setStats({ total, applied, shortlisted, selected, rejected });

    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status ❌");
    } finally {
      setUpdatingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(appId);
        return newSet;
      });
    }
  };

  // Helper functions
  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const getStatusClass = (status) => {
    const statusMap = {
      applied: "st-blue",
      underreview: "st-indigo", 
      shortlisted: "st-amber",
      selected: "st-green",
      rejected: "st-red"
    };
    return statusMap[status] || "st-grey";
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      applied: "📤",
      underreview: "👀",
      shortlisted: "⭐",
      selected: "🎉",
      rejected: "❌"
    };
    return iconMap[status] || "📋";
  };

  // Filter and sort applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      (app.studentEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.studentName || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || app.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Sort applications
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    if (sortBy === "oldest") {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return dateA - dateB;
    }
    // Default: newest first
    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
    return dateB - dateA;
  });

  if (loading) {
    return (
      <div className="recruiter-page">
        <div className="recruiter-wrap">
          <div className="loading-spinner">
            <div className="spinner"></div>
            Loading applicants...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recruiter-page">
      <div className="recruiter-wrap">
        {/* Header */}
        <div className="applicants-header">
          <div className="header-top">
            <button 
              className="rec-btn rec-btn-ghost"
              onClick={() => navigate(`/recruiter/jobs/${jobId}`)}
            >
              ← Back to Job Details
            </button>
          </div>

          <div className="applicants-hero">
            <div>
              <h1 className="rec-title">Job Applicants</h1>
              {job && (
                <p className="rec-subtitle">
                  {job.title} • {job.company}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="recruiter-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Applications</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📤</div>
            <div className="stat-number">{stats.applied}</div>
            <div className="stat-label">Applied</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-number">{stats.shortlisted}</div>
            <div className="stat-label">Shortlisted</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎉</div>
            <div className="stat-number">{stats.selected}</div>
            <div className="stat-label">Selected</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-number">{stats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="job-select"
          >
            <option value="all">All Status</option>
            <option value="applied">Applied</option>
            <option value="underreview">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="job-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {/* Applications List */}
        <div className="applicants-container">
          {sortedApplications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {searchTerm || filterStatus !== "all" ? "🔍" : "👥"}
              </div>
              <div className="empty-title">
                {searchTerm || filterStatus !== "all" 
                  ? "No matching applications found"
                  : "No applications yet"
                }
              </div>
              <div className="empty-text">
                {searchTerm || filterStatus !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Applications will appear here once students apply to this job"
                }
              </div>
            </div>
          ) : (
            <div className="applicants-grid">
              {sortedApplications.map((app, index) => (
                <div 
                  key={app.id} 
                  className="applicant-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="applicant-header">
                    <div className="applicant-info">
                      <div className="applicant-avatar">
                        {(app.studentName || app.studentEmail || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="applicant-name">
                          {app.studentName || "Name not provided"}
                        </h3>
                        <p className="applicant-email">{app.studentEmail}</p>
                      </div>
                    </div>
                    <span className={`status-chip ${getStatusClass(app.status)}`}>
                      {getStatusIcon(app.status)} {app.status || "Applied"}
                    </span>
                  </div>

                  <div className="applicant-meta">
                    <div className="meta-chip">
                      📅 Applied: {formatDate(app.createdAt)}
                    </div>
                    {app.statement && (
                      <div className="applicant-statement">
                        <strong>Statement:</strong> {app.statement}
                      </div>
                    )}
                  </div>

                  <div className="applicant-actions">
                    <select
                      value={app.status || "applied"}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      className="status-select"
                      disabled={updatingStatus.has(app.id)}
                    >
                      <option value="applied">Applied</option>
                      <option value="underreview">Under Review</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="selected">Selected</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    
                    {app.resumeUrl && (
                      <a
                        href={app.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rec-btn rec-btn-sm rec-btn-outline"
                      >
                        📄 View Resume
                      </a>
                    )}
                  </div>

                  {updatingStatus.has(app.id) && (
                    <div className="updating-overlay">
                      <div className="spinner" style={{width: '20px', height: '20px'}}></div>
                      Updating...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {sortedApplications.length > 0 && (
          <div className="applicants-footer">
            <p className="applications-count">
              Showing {sortedApplications.length} of {stats.total} applications
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
