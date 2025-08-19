// StudentProfile.jsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from "../firebase";
import AppHeader from "../components/AppHeader.jsx";
import { useNavigate } from "react-router-dom";
import "./Student.css";

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);

  const db = getFirestore();
  const storage = getStorage();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setProfile({ uid: user.uid, ...snap.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [db]);

  const handleSave = async () => {
    try {
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        name: profile.name || "",
        phone: profile.phone || "",
        "education.college": profile.education?.college || "",
        "education.degree": profile.education?.degree || "",
        "education.cgpa": profile.education?.cgpa || "",
        "education.graduationYear": profile.education?.graduationYear || "",
        skills: profile.skills || [],
        certifications: profile.certifications || [],
        "portfolio.github": profile.portfolio?.github || "",
        "portfolio.linkedin": profile.portfolio?.linkedin || "",
        resumeUrl: profile.resumeUrl || ""
      });
      setEditing(false);
      alert("Profile updated successfully ✅");
    } catch (e) {
      console.error(e);
      alert("Failed to save profile ❌");
    }
  };

  const handleResumeUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const fileRef = ref(storage, `resumes/${profile.uid}.pdf`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    setProfile({ ...profile, resumeUrl: url });
    alert("Resume uploaded successfully ✅");
  } catch (err) {
    console.error("Resume upload failed:", err);
    alert("Failed to upload resume ❌");
  }
};


  if (loading) return <div className="stu-info">Loading profile…</div>;
  if (!profile) return <div className="stu-error">Profile not found.</div>;

  return (
    <div className="stu-page">
      <AppHeader />
      <div className="stu-card">
        <div className="flex justify-between items-center mb-4">
          <h1 className="stu-title">My Profile</h1>
          <button className="stu-btn" onClick={() => navigate("/student")}>
            ← Back to Dashboard
          </button>
        </div>

        <div className="stu-grid">
          {/* Name */}
          <label>Name</label>
          <input className="stu-input" disabled={!editing} value={profile.name || ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />

          {/* Phone */}
          <label>Phone</label>
          <input className="stu-input" disabled={!editing} value={profile.phone || ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />

          {/* Education */}
          <label>College</label>
          <input className="stu-input" disabled={!editing} value={profile.education?.college || ""} onChange={(e) => setProfile({ ...profile, education: { ...profile.education, college: e.target.value } })} />

          <label>Degree</label>
          <input className="stu-input" disabled={!editing} value={profile.education?.degree || ""} onChange={(e) => setProfile({ ...profile, education: { ...profile.education, degree: e.target.value } })} />

          <label>CGPA</label>
          <input className="stu-input" disabled={!editing} value={profile.education?.cgpa || ""} onChange={(e) => setProfile({ ...profile, education: { ...profile.education, cgpa: e.target.value } })} />

          <label>Graduation Year</label>
          <input className="stu-input" disabled={!editing} value={profile.education?.graduationYear || ""} onChange={(e) => setProfile({ ...profile, education: { ...profile.education, graduationYear: e.target.value } })} />

          {/* Skills */}
          <label>Skills (comma separated)</label>
          <input className="stu-input" disabled={!editing} value={profile.skills?.join(", ") || ""} onChange={(e) => setProfile({ ...profile, skills: e.target.value.split(",") })} />

          {/* Certifications */}
          <label>Certifications (comma separated)</label>
          <input className="stu-input" disabled={!editing} value={profile.certifications?.join(", ") || ""} onChange={(e) => setProfile({ ...profile, certifications: e.target.value.split(",") })} />

          {/* Portfolio */}
          <label>GitHub</label>
          <input className="stu-input" disabled={!editing} value={profile.portfolio?.github || ""} onChange={(e) => setProfile({ ...profile, portfolio: { ...profile.portfolio, github: e.target.value } })} />

          <label>LinkedIn</label>
          <input className="stu-input" disabled={!editing} value={profile.portfolio?.linkedin || ""} onChange={(e) => setProfile({ ...profile, portfolio: { ...profile.portfolio, linkedin: e.target.value } })} />

          {/* Resume */}
          <label>Resume</label>
          <div className="flex flex-col gap-3">
            <input type="file" accept="application/pdf" disabled={!editing} onChange={handleResumeUpload} />
            {profile.resumeUrl && (
              <>
                <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline">Download Resume</a>
                <iframe src={profile.resumeUrl} className="w-full h-64 border rounded" title="Resume Preview"></iframe>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {!editing ? (
            <button className="stu-btn" onClick={() => setEditing(true)}>Edit</button>
          ) : (
            <button className="stu-btn" onClick={handleSave}>Save</button>
          )}
        </div>
      </div>
    </div>
  );
}