// src/pages/admin/AdminJobs.jsx
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import AppHeader from "../components/AppHeader.jsx";
import "./Admin.css";

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

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const [busy, setBusy] = useState({}); // { [jobId]: boolean }

  // Fetch all jobs
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Failed to load jobs", e);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Toggle applications open/close
  const setApplicationsOpen = async (jobId, open) => {
    // Optimistic UI update
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, applicationsOpen: open, status: open ? "open" : "closed" }
          : j
      )
    );
    setBusy((b) => ({ ...b, [jobId]: true }));
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        applicationsOpen: open,
        status: open ? "open" : "closed",
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to update job status", e);
      alert("Error updating job status ❌");
    } finally {
      setBusy((b) => ({ ...b, [jobId]: false }));
    }
  };

  // Prepare chart data (only Open/Closed now)
  const statusCounts = {
    open: jobs.filter((j) => j.applicationsOpen === true).length,
    closed: jobs.filter((j) => j.applicationsOpen === false).length,
  };

  const chartData = [
    { name: "Open", value: statusCounts.open },
    { name: "Closed", value: statusCounts.closed },
  ];

  const COLORS = ["#16a34a", "#dc2626"]; // green, red

  return (
    <div className="admin-page">
      <AppHeader />
      <div className="admin-card" style={{ padding: "20px" }}>
        <div className="admin-jobs-header">
          <h1 className="admin-title">Admin — Manage Jobs</h1>
          <button className="stats-btn" onClick={() => setShowStats(true)}>
            Stats
          </button>
        </div>

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
                const isOpen = j.applicationsOpen === true;
                const isBusy = !!busy[j.id];

                return (
                  <tr key={j.id}>
                    <td>{j.title}</td>
                    <td>{j.company}</td>
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
                          disabled={isBusy || isOpen}
                          title="Mark applications as OPEN"
                        >
                          Open
                        </button>
                        <button
                          className={`status-btn ${!isOpen ? "red" : "grey"}`}
                          onClick={() => setApplicationsOpen(j.id, false)}
                          disabled={isBusy || !isOpen}
                          title="Mark applications as CLOSED"
                        >
                          Close
                        </button>
                        {/*
                          Removed "Save for Later" button as requested.
                        */}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Stats Modal */}
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
    </div>
  );
}
