// src/pages/AdminJobs.jsx
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Link } from "react-router-dom";
import { db } from "../../firebase.js";
import AppHeader from "../../components/AppHeader.jsx";
import "/src/styles/Admin.css";

// Recharts
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
} from "recharts";

// -------- utils (Timestamp or ISO -> Date) --------
const toDate = (val) => (val?.toDate ? val.toDate() : val ? new Date(val) : null);
const endOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const isPastDeadline = (job) => {
  const d = toDate(job.deadline);
  if (!d) return false;
  return new Date() > endOfDay(d);
};

export default function AdminJobs() {
  const auth = getAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // stats modal
  const [showStats, setShowStats] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);

  // announcements overview
  const [latestNoteByJob, setLatestNoteByJob] = useState({}); // jobId -> latest note
  const [pendingByJob, setPendingByJob] = useState({}); // jobId -> count of !pushed

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerJob, setDrawerJob] = useState(null);
  const [drawerNotes, setDrawerNotes] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // ---------- Announcements overview ----------
  const fetchAnnouncementsOverview = async () => {
    try {
      const qNotes = query(collection(db, "jobNotes"), orderBy("createdAt", "desc"));
      const snap = await getDocs(qNotes);

      const latest = {};
      const pendingCounts = {};
      snap.forEach((d) => {
        const n = { id: d.id, ...d.data() };
        const jid = n.jobId;
        if (!jid) return;

        // first encountered (desc) = latest
        if (!(jid in latest)) latest[jid] = n;

        if (!n.pushed) pendingCounts[jid] = (pendingCounts[jid] || 0) + 1;
      });

      setLatestNoteByJob(latest);
      setPendingByJob(pendingCounts);
    } catch (e) {
      console.error("Failed to fetch announcements overview", e);
    }
  };

  // ---------- Fetch Jobs (and auto-close expired) ----------
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const qJobs = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
        const snap = await getDocs(qJobs);
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // auto-close any jobs that are open but past deadline
        const toClose = rows.filter((j) => j.applicationsOpen === true && isPastDeadline(j));
        if (toClose.length) {
          await Promise.all(
            toClose.map((j) =>
              updateDoc(doc(db, "jobs", j.id), {
                applicationsOpen: false,
                status: "closed",
                closedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
            )
          );
        }

        // reflect in UI (even before the write roundtrips)
        const normalized = rows.map((j) =>
          isPastDeadline(j) ? { ...j, applicationsOpen: false, status: "closed" } : j
        );
        setJobs(normalized);

        // after jobs, fetch announcements overview
        await fetchAnnouncementsOverview();
      } catch (e) {
        console.error("Failed to load jobs", e);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // ---------- Toggle applicationsOpen (guard deadline) ----------
  const setApplicationsOpen = async (jobId, open) => {
    const job = jobs.find((x) => x.id === jobId);
    if (!job) return;

    if (open && isPastDeadline(job)) {
      alert("Deadline has passed. You cannot open this job.");
      return;
    }

    // optimistic update
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, applicationsOpen: open, status: open ? "open" : "closed" }
          : j
      )
    );

    try {
      await updateDoc(doc(db, "jobs", jobId), {
        applicationsOpen: open,
        status: open ? "open" : "closed",
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to update job status", e);
      alert("Error updating job status ❌");
    }
  };

  // ---------- Drawer ----------
  const openDrawerForJob = async (job) => {
    setDrawerJob(job);
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const qByJob = query(
        collection(db, "jobNotes"),
        where("jobId", "==", job.id),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(qByJob);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDrawerNotes(list);
    } catch (e) {
      console.error("Failed to load announcements", e);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerJob(null);
    setDrawerNotes([]);
  };

  const pushAnnouncement = async (note) => {
    if (!drawerJob) return;
    if (!window.confirm("Push this announcement to students?")) return;

    try {
      await updateDoc(doc(db, "jobNotes", note.id), {
        pushed: true,
        pushedAt: serverTimestamp(),
        pushedBy: auth.currentUser?.uid || null,
      });

      // update drawer list
      setDrawerNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, pushed: true, pushedAt: new Date() } : n))
      );

      // refresh overview badges & latest
      await fetchAnnouncementsOverview();
    } catch (e) {
      console.error("Failed to push announcement", e);
      alert("Failed to push announcement");
    }
  };

  // ---------- Stats ----------
  const statusCounts = {
    open: jobs.filter((j) => j.applicationsOpen === true && !isPastDeadline(j)).length,
    closed: jobs.filter((j) => !(j.applicationsOpen === true && !isPastDeadline(j))).length,
  };
  const chartData = [
    { name: "Open", value: statusCounts.open },
    { name: "Closed", value: statusCounts.closed },
  ];
  const COLORS = ["#16a34a", "#dc2626"];

  const pendingText = (jobId) => {
    const c = pendingByJob[jobId] || 0;
    return c > 0 ? `${c} pending` : "All sent";
  };

  return (
    <div className="admin-page">
      <AppHeader />

      <div className="admin-card" style={{ padding: 20 }}>
        <div className="admin-jobs-header">
          <h1 className="admin-title">Admin — Manage Jobs</h1>
          <button className="stats-btn" onClick={() => setShowStats(true)}>
            Stats
          </button>
        </div>

        {/* ===== Company Cards (Announcements Overview) ===== */}
        <div className="company-cards">
          {jobs
            .filter((j) => latestNoteByJob[j.id]) // only jobs with at least one note
            .map((j) => {
              const latest = latestNoteByJob[j.id];
              const pending = pendingByJob[j.id] || 0;
              const pendingClass = pending > 0 ? "badge-pending" : "badge-ok";
              return (
                <div
                  key={`card-${j.id}`}
                  className="company-card"
                  onClick={() => openDrawerForJob(j)}
                  title="View announcements"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" ? openDrawerForJob(j) : null)}
                >
                  <div className="card-row">
                    <div>
                      <div className="card-company">{j.company || "—"}</div>
                      <div className="card-job">{j.title || "Untitled Role"}</div>
                    </div>
                    <div className={`badge ${pendingClass}`}>{pendingText(j.id)}</div>
                  </div>

                  {latest && (
                    <div className="card-note">
                      <div className="card-note-title">{latest.title || "Announcement"}</div>
                      <div className="card-note-body">
                        {(latest.message || latest.text || "").slice(0, 100) || "—"}
                        {(latest.message || latest.text || "").length > 100 ? "…" : ""}
                      </div>
                      <div className="card-note-meta">
                        {latest.pushed ? (
                          <span className="sent-chip">Sent</span>
                        ) : (
                          <span className="pending-chip">Pending</span>
                        )}
                        <span className="time-chip">
                          {latest.createdAt?.toDate
                            ? latest.createdAt.toDate().toLocaleString()
                            : latest.createdAt
                            ? new Date(latest.createdAt).toLocaleString()
                            : ""}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* ===== Jobs Table ===== */}
        {loading ? (
          <div className="admin-info">Loading jobs…</div>
        ) : jobs.length === 0 ? (
          <div className="admin-info">No jobs posted yet.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Company</th>
                <th>Location</th>
                <th>CTC</th>
                <th>Deadline</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {jobs.map((j) => {
                const isOpen = j.applicationsOpen === true && !isPastDeadline(j);
                const pending = pendingByJob[j.id] || 0;
                return (
                  <tr key={j.id}>
                    <td>{j.title}</td>

                    <td>
                      <div className="company-cell">
                        <span>{j.company}</span>
                        {pending > 0 ? (
                          <span
                            className="mini-badge mini-badge-pending"
                            title="Unpushed announcements"
                          >
                            {pending}
                          </span>
                        ) : (
                          <span className="mini-badge mini-badge-ok" title="No pending">
                            0
                          </span>
                        )}
                      </div>
                    </td>

                    <td>{j.location}</td>
                    <td>{j.ctc}</td>

                    <td>
                      {j.deadline?.toDate
                        ? j.deadline.toDate().toLocaleDateString()
                        : j.deadline
                        ? new Date(j.deadline).toLocaleDateString()
                        : "-"}
                    </td>

                    <td>{j.description}</td>

                    <td style={{ fontWeight: 600, color: isOpen ? "#16a34a" : "#dc2626" }}>
                      {isOpen ? "Open" : "Closed"}
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button
                          className={`status-btn ${isOpen ? "green" : "grey"}`}
                          onClick={() => setApplicationsOpen(j.id, true)}
                          disabled={isOpen || isPastDeadline(j)} // cannot open past deadline
                          title="Mark applications as OPEN"
                        >
                          Open
                        </button>
                        <button
                          className={`status-btn ${!isOpen ? "red" : "grey"}`}
                          onClick={() => setApplicationsOpen(j.id, false)}
                          disabled={!isOpen}
                          title="Mark applications as CLOSED"
                        >
                          Close
                        </button>
                        <button
                          className="status-btn grey"
                          onClick={() => openDrawerForJob(j)}
                          title="View announcements"
                        >
                          View Announcements
                        </button>
                        <Link
                          className="status-btn grey"
                          to={`/admin/jobs/${j.id}/applications`}
                          title="View applications for this job"
                        >
                          View Applications
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== Stats Modal ===== */}
      {showStats && (
        <div className="modal-overlay">
          <div className="modal stats-modal">
            <h2 className="admin-title">Job Status Statistics</h2>

            <div
              style={{
                fontSize: "14px",
                color: "#f1f5f9",
                marginBottom: "10px",
                textAlign: "right",
              }}
            >
              Open: {statusCounts.open} | Closed: {statusCounts.closed}
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={5}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                  activeIndex={activeIndex}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  activeShape={(props) => (
                    <g>
                      <text
                        x={props.cx}
                        y={props.cy}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize="14"
                        fontWeight="600"
                      >
                        {props.name} ({props.value})
                      </text>
                      <Sector {...props} outerRadius={props.outerRadius + 10} />
                    </g>
                  )}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="#1e293b"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} jobs`, `${name}`]}
                  contentStyle={{
                    background: "#1e293b",
                    borderRadius: "8px",
                    border: "1px solid #2E9CCA",
                    color: "#fff",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ color: "#f1f5f9", fontWeight: 500 }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="form-actions">
              <button className="job-btn-ghost" onClick={() => setShowStats(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Announcements Drawer ===== */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={closeDrawer}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <div className="drawer-title">{drawerJob?.company}</div>
                <div className="drawer-subtitle">{drawerJob?.title}</div>
              </div>
              <button className="drawer-close-btn" onClick={closeDrawer}>
                ✕
              </button>
            </div>

            {drawerLoading ? (
              <div className="drawer-info">Loading announcements…</div>
            ) : drawerNotes.length === 0 ? (
              <div className="drawer-info">No announcements yet.</div>
            ) : (
              <div className="drawer-list">
                {drawerNotes.map((n) => (
                  <div key={n.id} className="drawer-note">
                    <div className="drawer-note-header">
                      <span className="drawer-note-title">
                        {n.title || "Announcement"}
                      </span>
                      <span className="drawer-note-time">
                        {n.createdAt?.toDate
                          ? n.createdAt.toDate().toLocaleString()
                          : n.createdAt
                          ? new Date(n.createdAt).toLocaleString()
                          : ""}
                      </span>
                    </div>
                    <div className="drawer-note-body">
                      {n.message || n.text || "—"}
                    </div>
                    <div className="drawer-note-footer">
                      {n.pushed ? (
                        <span className="sent-chip">Sent</span>
                      ) : (
                        <button
                          className="push-btn"
                          onClick={() => pushAnnouncement(n)}
                        >
                          Push
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
