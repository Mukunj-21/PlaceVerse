// src/pages/recruiter/JobTimeline.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/Recruiter.css";

const PALETTE = [
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#0ea5e9", // sky
  "#22c55e", // green
  "#14b8a6", // teal
  "#eab308", // yellow
  "#f97316", // orange
];

export default function JobTimeline({ jobId: propJobId }) {
  const { jobId: routeJobId } = useParams();
  const jobId = propJobId || routeJobId;
  const location = useLocation();
  const navigate = useNavigate();

  const role = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/admin")) return "admin";
    if (p.startsWith("/student")) return "student";
    return "recruiter";
  }, [location.pathname]);

  const canToggleComplete = role === "admin" || role === "recruiter";

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

  const stages = useMemo(() => {
    const arr = Array.isArray(job?.stages) ? job.stages : [];
    return arr.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [job]);

  // first non-completed stage is "current"
  const currentIndex = useMemo(() => {
    if (!stages.length) return -1;
    const i = stages.findIndex((s) => !s.completed);
    return i === -1 ? stages.length - 1 : i;
  }, [stages]);

  const goStage = (stageId, published) => {
    if (role === "student" && !published) return;
    navigate(`/${role}/jobs/${jobId}/stage/${stageId}`);
  };

  const toggleComplete = async (idx) => {
    if (!canToggleComplete || !job) return;
    try {
      const next = Array.isArray(job.stages) ? job.stages.slice() : [];
      const s = next[idx];
      next[idx] = { ...s, completed: !s?.completed, updatedAt: new Date() };
      await updateDoc(doc(db, "jobs", jobId), { stages: next });
      setJob((j) => ({ ...j, stages: next }));
    } catch (e) {
      console.error("Failed to toggle complete:", e);
      alert("Could not update stage.");
    }
  };

  if (loading) {
    return (
      <div className="timeline-card">
        <div className="loading-spinner"><div className="spinner"></div> Loading timeline…</div>
      </div>
    );
  }

  if (!job || stages.length === 0) {
    return (
      <div className="timeline-card">
        <div className="rec-info">No stages defined for this job.</div>
      </div>
    );
  }

  return (
    <div className="timeline-card">
      <div className="timeline-track">
        {stages.map((s, i) => {
          const complete = !!s.completed;
          const published = !!s.published;
          const isCurrent = i === currentIndex;
          const isLast = i === stages.length - 1;
          const color = PALETTE[i % PALETTE.length];

          return (
            <div
              key={s.id || i}
              className="timeline-node"
              style={{ ["--node-color"]: color }}
            >
              <div className="node-top">
                <div
                  className={[
                    "node-dot2",
                    complete && "is-complete",
                    published && "is-published",
                    isCurrent && "is-current",
                  ].filter(Boolean).join(" ")}
                  onClick={() => goStage(s.id, published)}
                  title={`${s.title || `Stage ${i + 1}`}${published ? "" : " (unpublished)"}`}
                />
                {!isLast && (
                  <div
                    className={[
                      "node-connector2",
                      // color full up to completed & current
                      i <= currentIndex ? "conn-progress" : "",
                      i < currentIndex && "conn-complete",
                    ].filter(Boolean).join(" ")}
                  />
                )}
              </div>

              <div className="node-info">
                <div
                  className={`node-title ${published ? "" : "muted"}`}
                  onClick={() => goStage(s.id, published)}
                >
                  {s.title || `Stage ${i + 1}`}
                </div>

                <div className="node-badges">
                  {published ? (
                    <span className="badge green">Published</span>
                  ) : (
                    <span className="badge gray">Hidden</span>
                  )}
                  {complete ? (
                    <span className="badge blue">Completed</span>
                  ) : (
                    <span className="badge slate">In progress</span>
                  )}
                </div>

                {canToggleComplete && (
                  <button
                    className={`mini-btn2 ${complete ? "outline" : "success"}`}
                    onClick={() => toggleComplete(i)}
                  >
                    {complete ? "Mark as Incomplete" : "Mark Completed"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
