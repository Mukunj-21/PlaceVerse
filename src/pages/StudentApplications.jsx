// StudentApplications.jsx
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, getDoc, doc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import AppHeader from "../components/AppHeader";
import { useNavigate } from "react-router-dom";

export default function StudentApplications() {
  const [apps, setApps] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const navigate = useNavigate();

  // Fetch applications
  useEffect(() => {
    const fetchApps = async () => {
      if (!auth.currentUser) return;
      const q = query(collection(db, "applications"), where("studentId", "==", auth.currentUser.uid));
      const snap = await getDocs(q);
      const data = [];
      for (const d of snap.docs) {
        const job = await getDoc(doc(db, "jobs", d.data().jobId));
        data.push({ id: d.id, ...d.data(), job: job.exists() ? job.data() : {} });
      }
      setApps(data);
    };
    fetchApps();
  }, []);

  // Fetch saved jobs
  useEffect(() => {
    const fetchSaved = async () => {
      if (!auth.currentUser) return;
      const bookmarksRef = collection(db, "users", auth.currentUser.uid, "bookmarks");
      const snap = await getDocs(bookmarksRef);

      const jobsData = [];
      for (const d of snap.docs) {
        const jobRef = doc(db, "jobs", d.id); // jobId = bookmark doc id
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {
          jobsData.push({ id: jobSnap.id, ...jobSnap.data() });
        }
      }
      setSavedJobs(jobsData);
    };

    fetchSaved();
  }, []);

  // Remove from saved jobs
  const handleRemoveSaved = async (jobId) => {
    try {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "bookmarks", jobId));
      setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
      alert("Removed from saved ⭐");
    } catch (e) {
      console.error(e);
      alert("Failed to remove ❌");
    }
  };

  const statusColors = {
    applied: "bg-blue-500",
    review: "bg-yellow-500",
    shortlisted: "bg-green-500",
    rejected: "bg-red-500",
    selected: "bg-purple-500",
  };

  return (
    <div className="stu-page">
      <AppHeader />
      <div className="stu-card">
        <div className="flex justify-between items-center mb-4">
          <h1 className="stu-title">My Applications</h1>
          <button className="stu-btn" onClick={() => navigate("/student")}>
            ← Back to Dashboard
          </button>
        </div>

        {/* Applications Section */}
        <h2 className="stu-subtitle mt-4">Applied Jobs</h2>
        {apps.length === 0 ? (
          <div className="stu-info">You haven’t applied for any jobs yet.</div>
        ) : (
          <div className="apps-grid">
            {apps.map((a) => (
              <div className="job-card-updated" key={a.id}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="job-title">{a.job.title}</h3>
                    <p className="job-company">{a.job.company}</p>
                  </div>
                </div>
                <div
                  className={`px-2 py-1 rounded text-white inline-block mt-2 ${statusColors[a.status]}`}
                >
                  {a.status.toUpperCase()}
                </div>
                {a.offerLetterUrl && (
                  <a
                    href={a.offerLetterUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="stu-btn mt-2 inline-block"
                  >
                    Download Offer Letter
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Saved Jobs Section */}
        <h2 className="stu-subtitle mt-8">Saved Jobs</h2>
        {savedJobs.length === 0 ? (
          <div className="stu-info">No saved jobs yet.</div>
        ) : (
          <div className="jobs-grid">
            {savedJobs.map((j) => (
              <div className="job-card-updated" key={j.id}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="job-title">{j.title}</h3>
                    <p className="job-company">{j.company}</p>
                  </div>
                  <span className="job-location">{j.location}</span>
                </div>

                <div className="flex flex-wrap gap-3 mt-3">
                  {j.ctc && <span className="job-badge bg-green-600">💰 {j.ctc}</span>}
                  {j.deadline && (
                    <span className="job-badge bg-red-600">
                      ⏳ Apply by:{" "}
                      {new Date(
                        j.deadline?.seconds ? j.deadline.seconds * 1000 : j.deadline
                      ).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {j.description && <p className="job-desc mt-3">{j.description}</p>}

                <button
                  className="stu-btn-outline mt-3"
                  onClick={() => handleRemoveSaved(j.id)}
                >
                  Remove from Saved
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
