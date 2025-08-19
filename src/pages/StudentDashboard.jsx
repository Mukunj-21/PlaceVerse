// StudentDashboard.jsx
import { useEffect, useState } from "react";
import { getFirestore, collection, getDocs, query, where, orderBy, doc, setDoc } from "firebase/firestore";
import { auth } from "../firebase";
import AppHeader from "../components/AppHeader.jsx";
import { Link } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import "./Student.css";

export default function StudentDashboard() {
  const [stats, setStats] = useState({ companies: 0, jobs: 0, applied: 0 });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ location: "" });
  const db = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Jobs
        const jobSnap = await getDocs(
          query(collection(db, "jobs"), where("open", "==", true), orderBy("createdAt", "desc"))
        );
        const jobsData = jobSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Stats
        const companiesSet = new Set(jobsData.map((j) => j.company));
        const companiesCount = companiesSet.size;

        let appliedCount = 0;
        if (user) {
          const appSnap = await getDocs(
            query(collection(db, "applications"), where("studentId", "==", user.uid))
          );
          appliedCount = appSnap.size;
        }

        setJobs(jobsData);
        setStats({ companies: companiesCount, jobs: jobsData.length, applied: appliedCount });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [db, user]);

  const handleApply = async (job) => {
    try {
      const appId = uuidv4();
      await setDoc(doc(db, "applications", appId), {
        jobId: job.id,
        studentId: user.uid,
        resumeUrl: "", // can pick from user profile
        statement: "Excited to apply!",
        status: "applied",
        createdAt: new Date()
      });
      alert("Application submitted ✅");
    } catch (e) {
      console.error(e);
      alert("Failed to apply ❌");
    }
  };

  const handleBookmark = async (jobId) => {
    try {
      await setDoc(doc(db, "users", user.uid, "bookmarks", jobId), { createdAt: new Date() });
      alert("Job saved to wishlist ⭐");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="stu-page">
      <AppHeader />
      <div className="stu-card">
        <h1 className="stu-title">Student Dashboard</h1>

        {loading ? (
          <div className="stu-info">Loading dashboard…</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="stat-card"><div className="stat-number">{stats.companies}</div><div className="stat-label">Active Companies</div></div>
              <div className="stat-card"><div className="stat-number">{stats.jobs}</div><div className="stat-label">Open Jobs</div></div>
              <div className="stat-card"><div className="stat-number">{stats.applied}</div><div className="stat-label">My Applications</div></div>
            </div>

            {/* Quick Links */}
            <div className="mt-8">
              <h2 className="stu-subtitle">Quick Links</h2>
              <div className="flex gap-4 mt-3">
                <Link to="/student/profile" className="stu-btn">My Profile</Link>
                <Link to="/student/applications" className="stu-btn">My Applications</Link>
                <Link to="/student/notifications" className="stu-btn">Notifications</Link>
                {/* <Link to="/student/saved" className="stu-btn">Saved Jobs</Link> */}
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mt-6">
              <input
                type="text"
                placeholder="Search jobs..."
                className="stu-input flex-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="stu-input"
                value={filter.location}
                onChange={(e) => setFilter({ ...filter, location: e.target.value })}
              >
                <option value="">All Locations</option>
                <option value="Remote">Remote</option>
                <option value="Bangalore">Bangalore</option>
              </select>
            </div>

            {/* Jobs */}
            <div className="stu-jobs mt-10">
              <h2 className="stu-jobs-title">Open Jobs</h2>
              {jobs.length === 0 ? (
                <div className="stu-info">No open jobs right now.</div>
              ) : (
                <div className="jobs-grid">
  {jobs
    .filter(
      (j) =>
        j.title.toLowerCase().includes(search.toLowerCase()) &&
        (filter.location === "" || j.location === filter.location)
    )
    .map((j) => (
      <div className="job-card-updated" key={j.id}>
        {/* Top Section */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="job-title">{j.title || "Untitled Role"}</h3>
            <p className="job-company">{j.company || "—"}</p>
          </div>
          <span className="job-location">{j.location || "Location —"}</span>
        </div>

        {/* Middle Section */}
        <div className="flex flex-wrap gap-3 mt-3">
          {j.ctc && (
            <span className="job-badge bg-green-600">
              💰 Package: {j.ctc}
            </span>
          )}
          {j.deadline && (
            <span className="job-badge bg-red-600">
              ⏳ Apply by:{" "}
              {new Date(
                j.deadline?.seconds
                  ? j.deadline.seconds * 1000
                  : j.deadline
              ).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Description */}
        {j.description && (
          <p className="job-desc mt-3">{j.description}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            className="stu-btn flex-1"
            onClick={() => handleApply(j)}
          >
            Apply Now
          </button>
          <button
            className="stu-btn-outline flex-1"
            onClick={() => handleBookmark(j.id)}
          >
            Save Job
          </button>
        </div>
      </div>
    ))}
</div>

              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}