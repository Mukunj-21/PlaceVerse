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
import { utils, writeFile } from "xlsx"; // ✅ Correct import for Vite + React
import "../../styles/JobApplicants.css";

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

  // ✅ New filters
  const [minCGPA, setMinCGPA] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [resumeFilter, setResumeFilter] = useState(false);

  // ✅ Shortlisted state
  const [shortlisted, setShortlisted] = useState([]);

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

        // Sort newest first
        apps.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB - dateA;
        });

        setApplications(apps);

        // Stats
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

  // Update status
  const updateStatus = async (appId, newStatus) => {
    setUpdatingStatus(prev => new Set(prev).add(appId));

    try {
      await updateDoc(doc(db, "applications", appId), {
        status: newStatus,
        updatedAt: new Date()
      });

      setApplications(apps =>
        apps.map(app =>
          app.id === appId ? { ...app, status: newStatus } : app
        )
      );
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

  // ✅ Random Shortlisting
  const randomShortlist = (count = 5) => {
    if (filteredApplications.length === 0) return;
    const shuffled = [...filteredApplications].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    setShortlisted(selected);
    alert(`✅ Randomly shortlisted ${selected.length} applicants.`);
  };

  // ✅ Download Excel
  const downloadShortlistedExcel = () => {
    if (shortlisted.length === 0) {
      alert("⚠️ No shortlisted applicants to download.");
      return;
    }

    const wsData = shortlisted.map(app => ({
      Name: app.studentName || "N/A",
      Email: app.studentEmail || "N/A",
      CGPA: app.cgpa || "N/A",
      GraduationYear: app.gradYear || "N/A",
      Status: app.status || "Applied",
      Resume: app.resumeUrl || "N/A"
    }));

    const worksheet = utils.json_to_sheet(wsData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Shortlisted");
    writeFile(workbook, `shortlisted_applicants_${jobId}.xlsx`);
  };

  // Helpers
  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getStatusClass = (status) => {
    const map = {
      applied: "st-blue",
      underreview: "st-indigo",
      shortlisted: "st-amber",
      selected: "st-green",
      rejected: "st-red"
    };
    return map[status] || "st-grey";
  };

  const getStatusIcon = (status) => {
    const map = {
      applied: "📤",
      underreview: "👀",
      shortlisted: "⭐",
      selected: "🎉",
      rejected: "❌"
    };
    return map[status] || "📋";
  };

  // ✅ Filtering + Sorting
  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      (app.studentEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.studentName || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || app.status === filterStatus;
    const matchesCGPA = !minCGPA || (app.cgpa && app.cgpa >= parseFloat(minCGPA));
    const matchesGradYear = !gradYear || (app.gradYear && app.gradYear.toString() === gradYear);
    const matchesResume = !resumeFilter || true; // placeholder

    return matchesSearch && matchesStatus && matchesCGPA && matchesGradYear && matchesResume;
  });

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
    return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
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
          <button
            className="rec-btn rec-btn-ghost"
            onClick={() => navigate(`/recruiter/jobs/${jobId}`)}
          >
            ← Back to Job Details
          </button>
          <h1 className="rec-title">Job Applicants</h1>
          {job && <p className="rec-subtitle">{job.title} • {job.company}</p>}
        </div>

        {/* Stats */}
        <div className="recruiter-stats">
          <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-number">{stats.total}</div><div className="stat-label">Total</div></div>
          <div className="stat-card"><div className="stat-icon">⭐</div><div className="stat-number">{stats.shortlisted}</div><div className="stat-label">Shortlisted</div></div>
          <div className="stat-card"><div className="stat-icon">🎉</div><div className="stat-number">{stats.selected}</div><div className="stat-label">Selected</div></div>
          <div className="stat-card"><div className="stat-icon">❌</div><div className="stat-number">{stats.rejected}</div><div className="stat-label">Rejected</div></div>
        </div>

        {/* Filters + Actions Toolbar */}
<div className="filters-toolbar">
  <input
    type="text"
    placeholder="Search name/email..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="filter-input"
  />

  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
    <option value="all">All Status</option>
    <option value="applied">Applied</option>
    <option value="underreview">Under Review</option>
    <option value="shortlisted">Shortlisted</option>
    <option value="selected">Selected</option>
    <option value="rejected">Rejected</option>
  </select>

  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
    <option value="newest">Newest First</option>
    <option value="oldest">Oldest First</option>
  </select>

  <input
    type="number"
    placeholder="Min CGPA"
    value={minCGPA}
    onChange={(e) => setMinCGPA(e.target.value)}
    className="filter-input small"
  />
  <input
    type="number"
    placeholder="Grad Year"
    value={gradYear}
    onChange={(e) => setGradYear(e.target.value)}
    className="filter-input small"
  />

  <label className="filter-checkbox">
    <input
      type="checkbox"
      checked={resumeFilter}
      onChange={(e) => setResumeFilter(e.target.checked)}
    />
    Resume Shortlisting
  </label>

  <button className="btn-outline" onClick={() => randomShortlist(5)}>🎲 Random Shortlist (5)</button>
  <button className="btn-primary" onClick={downloadShortlistedExcel} disabled={shortlisted.length === 0}>📥 Download Excel</button>
</div>

{/* Applicants Table */}
<table className="applicants-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>CGPA</th>
      <th>Grad Year</th>
      <th>Applied On</th>
      <th>Status</th>
      <th>Resume</th>
    </tr>
  </thead>
  <tbody>
    {sortedApplications.length === 0 ? (
      <tr>
        <td colSpan="7" className="empty-row">No matching applications</td>
      </tr>
    ) : (
      sortedApplications.map(app => (
        <tr key={app.id}>
          <td>{app.studentName || "N/A"}</td>
          <td>{app.studentEmail || "N/A"}</td>
          <td>{app.cgpa || "N/A"}</td>
          <td>{app.gradYear || "N/A"}</td>
          <td>{formatDate(app.createdAt)}</td>
          <td>
            <select
              value={app.status || "applied"}
              onChange={(e) => updateStatus(app.id, e.target.value)}
              disabled={updatingStatus.has(app.id)}
              className="status-select"
            >
              <option value="applied">Applied</option>
              <option value="underreview">Under Review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="selected">Selected</option>
              <option value="rejected">Rejected</option>
            </select>
          </td>
          <td>
            {app.resumeUrl ? (
              <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer">
                📄 View
              </a>
            ) : "—"}
          </td>
        </tr>
      ))
    )}
  </tbody>
</table>

      </div>
    </div>
  );
}
