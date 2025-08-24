// src/pages/recruiter/JobApplicants.jsx
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import "../../styles/JobApplicants.css";

export default function JobApplicants() {
  const { jobId } = useParams();
  const [apps, setApps] = useState([]);

  useEffect(() => {
    const fetchApps = async () => {
      const q = query(collection(db, "applications"), where("jobId", "==", jobId));
      const snap = await getDocs(q);
      setApps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchApps();
  }, [jobId]);

  return (
    <div className="applicants-page">
      <h1>Applicants</h1>
      {apps.length === 0 && <p>No applicants yet.</p>}
      {apps.map(app => (
        <div className="applicant-detail" key={app.id}>
          <h3>{app.studentName}</h3>
          <p>Email: {app.studentEmail}</p>
          <p>Status: {app.status}</p>
          {app.resumeUrl && (
            <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer">
              View Resume
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
