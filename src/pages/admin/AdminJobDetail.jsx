import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import AppHeader from "../../components/AppHeader.jsx";
import JobTimeline from "../recruiter/JobTimeline.jsx"; // role-aware via URL
import "/src/styles/Admin.css";

export default function AdminJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "jobs", jobId));
        setJob(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } catch (e) {
        console.error(e);
        setJob(null);
      } finally {
        setLoading(false);
      }
    };
    if (jobId) load();
  }, [jobId]);

  const fmt = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="admin-page">
        <AppHeader />
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading job…</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="admin-page">
        <AppHeader />
        <div className="admin-container">
          <div className="admin-empty">
            <div className="empty-icon">⚠️</div>
            <div className="empty-title">Job not found</div>
            <button className="admin-btn" onClick={() => navigate("/admin/jobs")}>
              ← Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stages = Array.isArray(job.stages) ? job.stages : [];

  return (
    <div className="admin-page">
      <AppHeader />
      <div className="admin-container">
        <div className="header-top" style={{ marginBottom: 12 }}>
          <button className="admin-btn admin-btn-ghost" onClick={() => navigate("/admin/jobs")}>
            ← Back to Jobs
          </button>
        </div>

        <div className="admin-hero">
          <div className="hero-content">
            <h1 className="admin-title">{job.title}</h1>
            <p className="admin-subtitle">
              {job.company} • {job.location} • Deadline: {fmt(job.deadline)}
            </p>
          </div>
          <div className="hero-actions">
            <button
              className="admin-btn admin-btn-outline"
              onClick={() => navigate(`/admin/jobs/${job.id}/applications`)}
            >
              👥 View Applicants
            </button>
          </div>
        </div>

        {/* Role-aware timeline (admin, because URL starts with /admin) */}
        <JobTimeline />

        <div className="admin-section" style={{ marginTop: 20 }}>
          <div className="section-header">
            <h2 className="section-title">Stages</h2>
            <p className="section-subtitle">Open a stage to manage participants</p>
          </div>

          {stages.length === 0 ? (
            <div className="admin-empty">
              <div className="empty-icon">🧭</div>
              <div className="empty-title">No stages defined</div>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Stage</th>
                    <th>Published</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {stages
                    .slice()
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map((s, i) => (
                      <tr
                        key={s.id || i}
                        className="table-row"
                        onClick={() => navigate(`/admin/jobs/${job.id}/stage/${s.id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{i + 1}</td>
                        <td><strong>{s.title || `Stage ${i + 1}`}</strong></td>
                        <td>{s.published ? "✅ Yes" : "—"}</td>
                        <td>{s.completed ? "✅ Yes" : "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
