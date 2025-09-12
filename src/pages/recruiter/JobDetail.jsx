// src/pages/recruiter/JobDetail.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import "../../styles/Recruiter.css";

export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  // State management
  const [job, setJob] = useState(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [applicationsCount, setApplicationsCount] = useState(0);
  
  // Modal and form state
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [pushingNote, setPushingNote] = useState(null);

  // Load job details
  useEffect(() => {
    const loadJob = async () => {
      setJobLoading(true);
      try {
        const docRef = doc(db, "jobs", jobId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setJob({ id: docSnap.id, ...docSnap.data() });
          
          // Load applications count
          const appsQuery = query(
            collection(db, "applications"),
            where("jobId", "==", jobId)
          );
          const appsSnap = await getDocs(appsQuery);
          setApplicationsCount(appsSnap.size);
        } else {
          setJob(null);
        }
      } catch (err) {
        console.error("Error loading job:", err);
      } finally {
        setJobLoading(false);
      }
    };

    if (jobId) loadJob();
  }, [jobId]);

  // Load announcements
  useEffect(() => {
    const loadNotes = async () => {
      if (!jobId) return;
      
      setNotesLoading(true);
      try {
        const notesQuery = query(
          collection(db, "jobNotes"),
          where("jobId", "==", jobId),
          orderBy("createdAt", "desc")
        );
        const notesSnap = await getDocs(notesQuery);
        const fetchedNotes = notesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setNotes(fetchedNotes);
      } catch (err) {
        console.error("Error loading announcements:", err);
        setNotes([]);
      } finally {
        setNotesLoading(false);
      }
    };

    loadNotes();
  }, [jobId]);

  // Add new announcement
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() && !newNote.trim()) return;

    setSaving(true);
    try {
      const payload = {
        jobId,
        recruiterId: auth.currentUser?.uid,
        company: job?.company || "",
        title: newTitle.trim() || "Announcement",
        message: newNote.trim(),
        pushed: false,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "jobNotes"), payload);
      
      // Optimistic update
      setNotes(prev => [
        { id: docRef.id, ...payload, createdAt: new Date() },
        ...prev
      ]);

      setNewTitle("");
      setNewNote("");
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (err) {
      console.error("Error adding announcement:", err);
      alert("Failed to add announcement ❌");
    } finally {
      setSaving(false);
    }
  };

  // Push announcement to students
  const handlePushNote = async (noteId) => {
    setPushingNote(noteId);
    try {
      await updateDoc(doc(db, "jobNotes", noteId), {
        pushed: true,
        pushedAt: serverTimestamp()
      });

      // Update local state
      setNotes(prev => prev.map(note => 
        note.id === noteId 
          ? { ...note, pushed: true, pushedAt: new Date() }
          : note
      ));

    } catch (err) {
      console.error("Error pushing announcement:", err);
      alert("Failed to push announcement ❌");
    } finally {
      setPushingNote(null);
    }
  };

  // Helper functions
  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isDeadlineSoon = (deadline) => {
    if (!deadline) return false;
    const date = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 3;
  };

  if (jobLoading) {
    return (
      <div className="recruiter-page">
        <div className="recruiter-wrap">
          <div className="loading-spinner">
            <div className="spinner"></div>
            Loading job details...
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="recruiter-page">
        <div className="recruiter-wrap">
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <div className="empty-title">Job Not Found</div>
            <div className="empty-text">The job you're looking for doesn't exist or has been removed.</div>
            <button className="rec-btn" onClick={() => navigate("/recruiter/jobs")}>
              ← Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recruiter-page">
      <div className="recruiter-wrap">
        {showSuccess && (
          <div className="success-banner">
            <span className="success-icon">✅</span>
            Announcement added successfully!
          </div>
        )}

        {/* Job Header */}
        <div className="job-detail-header">
          <div className="header-top">
            <button 
              className="rec-btn rec-btn-ghost"
              onClick={() => navigate("/recruiter/jobs")}
            >
              ← Back to Jobs
            </button>
            <div className="header-actions">
              <button 
                className="rec-btn"
                onClick={() => navigate(`/recruiter/jobs/${jobId}/applicants`)}
              >
                👥 View Applicants ({applicationsCount})
              </button>
            </div>
          </div>

          <div className="job-detail-card">
            <div className="job-detail-main">
              <div className="job-status-row">
                <span className={`job-status-pill ${job.open ? 'pill-open' : 'pill-closed'}`}>
                  {job.open ? '🟢 Open' : '🔒 Closed'}
                </span>
                {isDeadlineSoon(job.deadline) && (
                  <span className="deadline-warning">
                    ⚠️ Deadline Soon!
                  </span>
                )}
              </div>
              
              <h1 className="job-detail-title">{job.title}</h1>
              <p className="job-detail-company">{job.company}</p>

              <div className="job-meta-grid">
                <div className="job-meta-item">
                  <span className="meta-icon">📍</span>
                  <span>{job.location}</span>
                </div>
                <div className="job-meta-item">
                  <span className="meta-icon">💰</span>
                  <span>{job.ctc || "Not disclosed"}</span>
                </div>
                <div className="job-meta-item">
                  <span className="meta-icon">⏰</span>
                  <span>Deadline: {formatDate(job.deadline)}</span>
                </div>
                <div className="job-meta-item">
                  <span className="meta-icon">📅</span>
                  <span>Posted: {formatDate(job.createdAt)}</span>
                </div>
                <div className="job-meta-item">
                  <span className="meta-icon">👥</span>
                  <span>{applicationsCount} Applications</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Job Description */}
        {job.description && (
          <div className="content-section">
            <h2 className="rec-h2">Job Description</h2>
            <div className="job-description-card">
              <p className="job-description-text">{job.description}</p>
            </div>
          </div>
        )}

        {/* Announcements Section */}
        <div className="content-section">
          <div className="section-header">
            <h2 className="rec-h2">Announcements</h2>
            <button 
              className="rec-btn"
              onClick={() => setShowModal(true)}
            >
              ➕ New Announcement
            </button>
          </div>

          <div className="announcements-container">
            {notesLoading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                Loading announcements...
              </div>
            ) : notes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📢</div>
                <div className="empty-title">No Announcements Yet</div>
                <div className="empty-text">Create your first announcement to communicate with applicants.</div>
                <button className="rec-btn" onClick={() => setShowModal(true)}>
                  Create Announcement
                </button>
              </div>
            ) : (
              <div className="announcements-grid">
                {notes.map((note, index) => (
                  <div 
                    key={note.id} 
                    className="announcement-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="announcement-header">
                      <h3 className="announcement-title">{note.title}</h3>
                      <div className="announcement-status">
                        {note.pushed ? (
                          <span className="status-pushed">✅ Pushed</span>
                        ) : (
                          <button
                            className="rec-btn rec-btn-sm"
                            onClick={() => handlePushNote(note.id)}
                            disabled={pushingNote === note.id}
                          >
                            {pushingNote === note.id ? (
                              <>
                                <div className="spinner" style={{width: '12px', height: '12px', marginRight: '4px'}}></div>
                                Pushing...
                              </>
                            ) : (
                              '📤 Push to Students'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="announcement-message">{note.message}</p>
                    
                    <div className="announcement-footer">
                      <span className="announcement-date">
                        📅 {formatDate(note.createdAt)}
                      </span>
                      {note.pushed && (
                        <span className="pushed-date">
                          📤 Pushed: {formatDate(note.pushedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Announcement Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
            <div className="modal job-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">New Announcement</h2>
                <button 
                  className="modal-close" 
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAddNote}>
                <div className="job-form-grid">
                  <div className="form-row">
                    <label htmlFor="announcement-title">Announcement Title</label>
                    <input
                      id="announcement-title"
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="job-input"
                      placeholder="e.g., Interview Schedule Update"
                    />
                  </div>

                  <div className="form-row full-width">
                    <label htmlFor="announcement-message">Message *</label>
                    <textarea
                      id="announcement-message"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="job-textarea"
                      placeholder="Write your announcement message here..."
                      rows="6"
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="rec-btn rec-btn-outline"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rec-btn"
                    disabled={saving || !newNote.trim()}
                  >
                    {saving ? (
                      <>
                        <div className="spinner" style={{width: '16px', height: '16px', marginRight: '8px'}}></div>
                        Creating...
                      </>
                    ) : (
                      '📢 Create Announcement'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
