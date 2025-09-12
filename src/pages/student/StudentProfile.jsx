// src/pages/student/StudentProfile.jsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from "../../firebase.js";
import AppHeader from "../../components/AppHeader.jsx";
import { Link } from "react-router-dom";
import "/src/styles/Student.css";

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const db = getFirestore();
  const storage = getStorage();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            uid: user.uid,
            email: user.email,
            name: data.name || "",
            phone: data.phone || "",
            college: data.education?.college || "",
            degree: data.education?.degree || "",
            cgpa: data.education?.cgpa || "",
            graduationYear: data.education?.graduationYear || "",
            skills: Array.isArray(data.skills) ? data.skills.join(", ") : "",
            certifications: Array.isArray(data.certifications) ? data.certifications.join(", ") : "",
            github: data.portfolio?.github || "",
            linkedin: data.portfolio?.linkedin || "",
            resumeUrl: data.resumeUrl || ""
          });
        } else {
          // Create default profile
          setProfile({
            uid: user.uid,
            email: user.email,
            name: "",
            phone: "",
            college: "",
            degree: "",
            cgpa: "",
            graduationYear: "",
            skills: "",
            certifications: "",
            github: "",
            linkedin: "",
            resumeUrl: ""
          });
        }
      } catch (e) {
        console.error("Profile fetch error:", e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [db]);

  const handleInputChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile?.uid) return;
    
    setSaving(true);
    try {
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        name: profile.name || "",
        phone: profile.phone || "",
        "education.college": profile.college || "",
        "education.degree": profile.degree || "",
        "education.cgpa": profile.cgpa || "",
        "education.graduationYear": profile.graduationYear || "",
        skills: profile.skills ? profile.skills.split(",").map(s => s.trim()).filter(s => s) : [],
        certifications: profile.certifications ? profile.certifications.split(",").map(s => s.trim()).filter(s => s) : [],
        "portfolio.github": profile.github || "",
        "portfolio.linkedin": profile.linkedin || "",
        resumeUrl: profile.resumeUrl || ""
      });
      
      setEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (e) {
      console.error("Save error:", e);
      alert("Failed to save profile ❌");
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("File size should be less than 5MB");
      return;
    }
    
    if (!file.type.includes('pdf') && !file.type.includes('doc')) {
      alert("Please upload PDF or DOC files only");
      return;
    }
    
    setUploading(true);
    try {
      const fileRef = ref(storage, `resumes/${profile.uid}_${Date.now()}.pdf`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      
      setProfile(prev => ({ ...prev, resumeUrl: url }));
      
      // Auto-save resume URL
      if (profile.uid) {
        const userRef = doc(db, "users", profile.uid);
        await updateDoc(userRef, { resumeUrl: url });
      }
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (err) {
      console.error("Resume upload failed:", err);
      alert("Failed to upload resume ❌");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="student-page">
        <AppHeader />
        <div className="student-wrap">
          <div className="sd-loading">
            <div className="sd-spinner"></div>
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="student-page">
        <AppHeader />
        <div className="student-wrap">
          <div className="stu-error">
            Please sign in to view your profile.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page">
      <AppHeader />
      <div className="student-wrap">
        {showSuccess && (
          <div className="success-banner">
            ✅ Profile updated successfully!
          </div>
        )}
        
        <div className="header-row">
          <Link to="/student/dashboard" className="stu-back">
            ← Back to Dashboard
          </Link>
          <div className="profile-actions">
            {editing ? (
              <>
                <button 
                  className="sd-btn-outline"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  className="sd-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="sd-spinner" style={{width: '16px', height: '16px', marginRight: '8px'}}></div>
                      Saving...
                    </>
                  ) : (
                    '💾 Save Changes'
                  )}
                </button>
              </>
            ) : (
              <button 
                className="sd-btn"
                onClick={() => setEditing(true)}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="stu-card profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              <div className="avatar-circle">
                {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="profile-info">
                <h1 className="stu-title">{profile.name || "Complete Your Profile"}</h1>
                <p className="profile-email">{profile.email}</p>
              </div>
            </div>
          </div>

          <div className="profile-sections">
            {/* Personal Information */}
            <div className="profile-section">
              <h2 className="section-title">Personal Information</h2>
              <div className="stu-grid">
                <div className="form-field">
                  <label className="field-label">Full Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="stu-input"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="field-value">{profile.name || "—"}</div>
                  )}
                </div>

                <div className="form-field">
                  <label className="field-label">Phone Number</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="stu-input"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="field-value">{profile.phone || "—"}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Education */}
            <div className="profile-section">
              <h2 className="section-title">Education</h2>
              <div className="stu-grid">
                <div className="form-field">
                  <label className="field-label">College/University</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.college}
                      onChange={(e) => handleInputChange('college', e.target.value)}
                      className="stu-input"
                      placeholder="Enter your college name"
                    />
                  ) : (
                    <div className="field-value">{profile.college || "—"}</div>
                  )}
                </div>

                <div className="form-field">
                  <label className="field-label">Degree</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.degree}
                      onChange={(e) => handleInputChange('degree', e.target.value)}
                      className="stu-input"
                      placeholder="e.g., Bachelor of Engineering"
                    />
                  ) : (
                    <div className="field-value">{profile.degree || "—"}</div>
                  )}
                </div>

                <div className="form-field">
                  <label className="field-label">CGPA/Percentage</label>
                  {editing ? (
                    <input
                      type="text"
                      value={profile.cgpa}
                      onChange={(e) => handleInputChange('cgpa', e.target.value)}
                      className="stu-input"
                      placeholder="e.g., 8.5 or 85%"
                    />
                  ) : (
                    <div className="field-value">{profile.cgpa || "—"}</div>
                  )}
                </div>

                <div className="form-field">
                  <label className="field-label">Graduation Year</label>
                  {editing ? (
                    <input
                      type="number"
                      value={profile.graduationYear}
                      onChange={(e) => handleInputChange('graduationYear', e.target.value)}
                      className="stu-input"
                      placeholder="e.g., 2025"
                      min="2020"
                      max="2030"
                    />
                  ) : (
                    <div className="field-value">{profile.graduationYear || "—"}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Skills & Portfolio */}
            <div className="profile-section">
              <h2 className="section-title">Skills & Portfolio</h2>
              <div className="stu-grid">
                <div className="form-field full-width">
                  <label className="field-label">Skills (comma separated)</label>
                  {editing ? (
                    <textarea
                      value={profile.skills}
                      onChange={(e) => handleInputChange('skills', e.target.value)}
                      className="stu-textarea"
                      placeholder="e.g., JavaScript, React, Python, SQL"
                      rows="3"
                    />
                  ) : (
                    <div className="field-value skills-list">
                      {profile.skills ? 
                        profile.skills.split(',').map((skill, i) => (
                          <span key={i} className="skill-tag">{skill.trim()}</span>
                        ))
                        : "—"
                      }
                    </div>
                  )}
                </div>

                <div className="form-field full-width">
                  <label className="field-label">Certifications (comma separated)</label>
                  {editing ? (
                    <textarea
                      value={profile.certifications}
                      onChange={(e) => handleInputChange('certifications', e.target.value)}
                      className="stu-textarea"
                      placeholder="e.g., AWS Certified, Google Analytics, Coursera ML"
                      rows="2"
                    />
                  ) : (
                    <div className="field-value">
                      {profile.certifications || "—"}
                    </div>
                  )}
                </div>

                <div className="form-field">
                  <label className="field-label">GitHub Profile</label>
                  {editing ? (
                    <input
                      type="url"
                      value={profile.github}
                      onChange={(e) => handleInputChange('github', e.target.value)}
                      className="stu-input"
                      placeholder="https://github.com/username"
                    />
                  ) : (
                    <div className="field-value">
                      {profile.github ? (
                        <a href={profile.github} target="_blank" rel="noopener noreferrer" className="profile-link">
                          🔗 {profile.github}
                        </a>
                      ) : "—"}
                    </div>
                  )}
                </div>

                <div className="form-field">
                  <label className="field-label">LinkedIn Profile</label>
                  {editing ? (
                    <input
                      type="url"
                      value={profile.linkedin}
                      onChange={(e) => handleInputChange('linkedin', e.target.value)}
                      className="stu-input"
                      placeholder="https://linkedin.com/in/username"
                    />
                  ) : (
                    <div className="field-value">
                      {profile.linkedin ? (
                        <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="profile-link">
                          🔗 {profile.linkedin}
                        </a>
                      ) : "—"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Resume */}
            <div className="profile-section">
              <h2 className="section-title">Resume</h2>
              <div className="resume-section">
                {profile.resumeUrl ? (
                  <div className="resume-uploaded">
                    <div className="resume-info">
                      <span className="resume-icon">📄</span>
                      <div>
                        <div className="resume-filename">Resume uploaded</div>
                        <div className="resume-meta">PDF • Ready for applications</div>
                      </div>
                    </div>
                    <div className="resume-actions">
                      <a 
                        href={profile.resumeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="sd-btn-outline"
                      >
                        👁️ View
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="resume-empty">
                    <span className="resume-empty-icon">📄</span>
                    <p>No resume uploaded yet</p>
                  </div>
                )}
                
                <div className="resume-upload">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeUpload}
                    disabled={uploading}
                    id="resume-upload"
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="resume-upload" 
                    className={`sd-btn ${uploading ? 'sd-btn-disabled' : ''}`}
                  >
                    {uploading ? (
                      <>
                        <div className="sd-spinner" style={{width: '16px', height: '16px', marginRight: '8px'}}></div>
                        Uploading...
                      </>
                    ) : (
                      '📤 Upload Resume'
                    )}
                  </label>
                  <p className="upload-hint">PDF, DOC files up to 5MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
