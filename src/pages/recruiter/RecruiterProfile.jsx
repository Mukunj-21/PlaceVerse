// src/pages/recruiter/RecruiterProfile.jsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { auth } from "../../firebase";
import "../../styles/Recruiter.css";

export default function RecruiterProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editForm, setEditForm] = useState({});
  const db = getFirestore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
          const data = { 
            uid: user.uid, 
            email: user.email, 
            ...snap.data() 
          };
          setProfile(data);
          setEditForm(data);
        } else {
          setError("Profile not found. Contact admin.");
        }
      } catch (e) {
        console.error("Profile fetch error:", e);
        setError("Could not load profile.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [db]);

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile?.uid) return;
    
    setSaving(true);
    try {
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        name: editForm.name || "",
        company: editForm.company || "",
        designation: editForm.designation || "",
        phone: editForm.phone || "",
        website: editForm.website || "",
      });

      setProfile({ ...profile, ...editForm });
      setEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (e) {
      console.error("Save error:", e);
      setError("Failed to save profile. Please try again.");
      setTimeout(() => setError(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm(profile);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="recruiter-profile-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          Loading profile...
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="recruiter-profile-page">
        <div className="rec-card">
          <div style={{ color: '#ef4444', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
            <h3>Error Loading Profile</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const ProfileRow = ({ label, value, field, type = "text", editable = true }) => (
    <div className="rec-row">
      <div className="rec-label">{label}</div>
      {editing && editable ? (
        <input
          type={type}
          value={editForm[field] || ""}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="job-input"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      ) : (
        <div className="rec-value">{value || "—"}</div>
      )}
    </div>
  );

  return (
    <div className="recruiter-profile-page">
      <div className="rec-card">
        {showSuccess && (
          <div className="success-banner">
            <span className="success-icon">✅</span>
            Profile updated successfully!
          </div>
        )}

        {error && (
          <div style={{ 
            background: 'rgba(220,38,38,0.1)', 
            border: '1px solid rgba(220,38,38,0.3)',
            color: '#ef4444',
            padding: '12px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : "R"}
          </div>
          <h1 className="rec-title">Recruiter Profile</h1>
          <p className="rec-subtitle">Manage your professional information</p>
          
          <div style={{ marginTop: '24px' }}>
            {editing ? (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  className="rec-btn rec-btn-outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  className="rec-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="spinner" style={{width: '16px', height: '16px', marginRight: '8px'}}></div>
                      Saving...
                    </>
                  ) : (
                    '💾 Save Changes'
                  )}
                </button>
              </div>
            ) : (
              <button 
                className="rec-btn"
                onClick={() => setEditing(true)}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Profile Details */}
        <div className="rec-grid">
          <ProfileRow 
            label="Full Name" 
            value={profile?.name} 
            field="name" 
          />
          
          <ProfileRow 
            label="Email" 
            value={profile?.email} 
            field="email" 
            type="email"
            editable={false}
          />
          
          <ProfileRow 
            label="Company" 
            value={profile?.company} 
            field="company" 
          />
          
          <ProfileRow 
            label="Designation" 
            value={profile?.designation} 
            field="designation" 
          />
          
          <ProfileRow 
            label="Phone" 
            value={profile?.phone} 
            field="phone" 
            type="tel"
          />
          
          <ProfileRow 
            label="Website" 
            value={profile?.website} 
            field="website" 
            type="url"
          />
          
          <div className="rec-row">
            <div className="rec-label">Status</div>
            <div className="rec-value">
              <span className={`job-status-pill ${profile?.status === 'Active' ? 'pill-open' : 'pill-closed'}`}>
                {profile?.status === 'Active' ? '🟢 Active' : '🔒 Inactive'}
              </span>
            </div>
          </div>
          
          <div className="rec-row">
            <div className="rec-label">Role</div>
            <div className="rec-value">
              <span className="job-status-pill pill-pending">
                👤 Recruiter
              </span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div style={{ 
          marginTop: '32px', 
          padding: '20px', 
          background: 'rgba(20,184,166,0.05)', 
          borderRadius: '12px',
          border: '1px solid rgba(20,184,166,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--rec-text-primary)' }}>
            📋 Profile Completion
          </h3>
          <p style={{ margin: '0', color: 'var(--rec-text-muted)' }}>
            Complete your profile to attract the best candidates and build trust with potential hires.
          </p>
        </div>
      </div>
    </div>
  );
}
