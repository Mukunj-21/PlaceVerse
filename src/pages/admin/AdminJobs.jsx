// // src/pages/admin/AdminJobs.jsx
// import { useEffect, useState } from "react";
// import { 
//   collection, 
//   getDocs, 
//   updateDoc, 
//   doc, 
//   query, 
//   orderBy, 
//   where,
//   serverTimestamp 
// } from "firebase/firestore";
// import { getAuth } from "firebase/auth";
// import { Link } from "react-router-dom";
// import { db } from "../../firebase.js";
// import AppHeader from "../../components/AppHeader.jsx";
// import "/src/styles/Admin.css";

// export default function AdminJobs() {
//   const auth = getAuth();
//   const [jobs, setJobs] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [showStats, setShowStats] = useState(false);
//   const [updatingJob, setUpdatingJob] = useState(null);
//   const [showSuccess, setShowSuccess] = useState("");
  
//   // Filters and search
//   const [searchTerm, setSearchTerm] = useState("");
//   const [filterStatus, setFilterStatus] = useState("all");
//   const [sortBy, setSortBy] = useState("newest");
  
//   // Announcements data
//   const [latestNoteByJob, setLatestNoteByJob] = useState({});
//   const [pendingByJob, setPendingByJob] = useState({});
  
//   // Modal state
//   const [selectedJob, setSelectedJob] = useState(null);
//   const [jobNotes, setJobNotes] = useState([]);
//   const [notesLoading, setNotesLoading] = useState(false);

//   useEffect(() => {
//     loadJobsAndAnnouncements();
//   }, []);

//   const loadJobsAndAnnouncements = async () => {
//     setLoading(true);
//     try {
//       // Load jobs
//       const jobsQuery = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
//       const jobsSnap = await getDocs(jobsQuery);
//       const jobsData = jobsSnap.docs.map((d) => ({
//         id: d.id,
//         ...d.data()
//       }));

//       // Auto-close expired jobs
//       const now = new Date();
//       const toClose = jobsData.filter(job => {
//         const deadline = job.deadline?.toDate?.() || new Date(job.deadline);
//         return job.applicationsOpen && deadline < now;
//       });

//       if (toClose.length > 0) {
//         await Promise.all(
//           toClose.map(job =>
//             updateDoc(doc(db, "jobs", job.id), {
//               applicationsOpen: false,
//               status: "closed",
//               closedAt: serverTimestamp(),
//               updatedAt: serverTimestamp(),
//             })
//           )
//         );
//       }

//       // Update jobs data to reflect closures
//       const updatedJobs = jobsData.map(job => {
//         const deadline = job.deadline?.toDate?.() || new Date(job.deadline);
//         if (job.applicationsOpen && deadline < now) {
//           return { ...job, applicationsOpen: false, status: "closed" };
//         }
//         return job;
//       });

//       setJobs(updatedJobs);

//       // Load announcements overview
//       const notesQuery = query(collection(db, "jobNotes"), orderBy("createdAt", "desc"));
//       const notesSnap = await getDocs(notesQuery);
      
//       const latest = {};
//       const pendingCounts = {};
      
//       notesSnap.forEach((d) => {
//         const note = { id: d.id, ...d.data() };
//         const jobId = note.jobId;
        
//         if (!jobId) return;
        
//         // Track latest note per job
//         if (!latest[jobId]) {
//           latest[jobId] = note;
//         }
        
//         // Count pending (not pushed) notes
//         if (!note.pushed) {
//           pendingCounts[jobId] = (pendingCounts[jobId] || 0) + 1;
//         }
//       });

//       setLatestNoteByJob(latest);
//       setPendingByJob(pendingCounts);

//     } catch (error) {
//       console.error("Failed to load jobs and announcements:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const toggleJobStatus = async (jobId, newStatus) => {
//     const job = jobs.find(j => j.id === jobId);
//     if (!job) return;
    
//     // Check if trying to open an expired job
//     const deadline = job.deadline?.toDate?.() || new Date(job.deadline);
//     if (newStatus && deadline < new Date()) {
//       alert("Cannot open job: deadline has passed");
//       return;
//     }

//     setUpdatingJob(jobId);
//     try {
//       await updateDoc(doc(db, "jobs", jobId), {
//         applicationsOpen: newStatus,
//         status: newStatus ? "open" : "closed",
//         updatedAt: serverTimestamp(),
//       });

//       setJobs(prev => prev.map(j => 
//         j.id === jobId 
//           ? { ...j, applicationsOpen: newStatus, status: newStatus ? "open" : "closed" }
//           : j
//       ));

//       setShowSuccess(`Job ${newStatus ? 'opened' : 'closed'} successfully!`);
//       setTimeout(() => setShowSuccess(""), 3000);

//     } catch (error) {
//       console.error("Failed to update job status:", error);
//       alert("Failed to update job status");
//     } finally {
//       setUpdatingJob(null);
//     }
//   };

//   const openJobModal = async (job) => {
//     setSelectedJob(job);
//     setNotesLoading(true);
    
//     try {
//       const jobNotesQuery = query(
//         collection(db, "jobNotes"),
//         where("jobId", "==", job.id),
//         orderBy("createdAt", "desc")
//       );
//       const notesSnap = await getDocs(jobNotesQuery);
//       const notes = notesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
//       setJobNotes(notes);
//     } catch (error) {
//       console.error("Failed to load job notes:", error);
//       setJobNotes([]);
//     } finally {
//       setNotesLoading(false);
//     }
//   };

//   const pushAnnouncement = async (noteId) => {
//     if (!window.confirm("Push this announcement to all students?")) return;

//     try {
//       await updateDoc(doc(db, "jobNotes", noteId), {
//         pushed: true,
//         pushedAt: serverTimestamp(),
//         pushedBy: auth.currentUser?.uid,
//       });

//       setJobNotes(prev => prev.map(note =>
//         note.id === noteId
//           ? { ...note, pushed: true, pushedAt: new Date() }
//           : note
//       ));

//       // Refresh overview
//       await loadJobsAndAnnouncements();

//     } catch (error) {
//       console.error("Failed to push announcement:", error);
//       alert("Failed to push announcement");
//     }
//   };

//   // Helper functions
//   const formatDate = (timestamp) => {
//     if (!timestamp) return "—";
//     const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
//     return date.toLocaleDateString('en-US', { 
//       month: 'short', 
//       day: 'numeric',
//       year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
//     });
//   };

//   const isDeadlinePassed = (deadline) => {
//     if (!deadline) return false;
//     const date = deadline.toDate ? deadline.toDate() : new Date(deadline);
//     return date < new Date();
//   };

//   // Filter and sort jobs
//   const filteredJobs = jobs.filter(job => {
//     const matchesSearch = 
//       (job.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (job.company || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (job.location || "").toLowerCase().includes(searchTerm.toLowerCase());
    
//     const matchesStatus = 
//       filterStatus === "all" ||
//       (filterStatus === "open" && job.applicationsOpen && !isDeadlinePassed(job.deadline)) ||
//       (filterStatus === "closed" && (!job.applicationsOpen || isDeadlinePassed(job.deadline))) ||
//       (filterStatus === "expired" && isDeadlinePassed(job.deadline));

//     return matchesSearch && matchesStatus;
//   });

//   const sortedJobs = [...filteredJobs].sort((a, b) => {
//     if (sortBy === "oldest") {
//       const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
//       const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
//       return dateA - dateB;
//     } else if (sortBy === "deadline") {
//       const dateA = a.deadline?.toDate?.() || new Date(a.deadline);
//       const dateB = b.deadline?.toDate?.() || new Date(b.deadline);
//       return dateA - dateB;
//     }
//     // Default: newest
//     const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
//     const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
//     return dateB - dateA;
//   });

//   // Calculate stats
//   const stats = {
//     total: jobs.length,
//     open: jobs.filter(j => j.applicationsOpen && !isDeadlinePassed(j.deadline)).length,
//     closed: jobs.filter(j => !j.applicationsOpen || isDeadlinePassed(j.deadline)).length,
//     expired: jobs.filter(j => isDeadlinePassed(j.deadline)).length,
//     totalAnnouncements: Object.keys(latestNoteByJob).length,
//     pendingAnnouncements: Object.values(pendingByJob).reduce((sum, count) => sum + count, 0)
//   };

//   if (loading) {
//     return (
//       <div className="admin-page">
//         <AppHeader />
//         <div className="admin-loading">
//           <div className="admin-spinner"></div>
//           <p>Loading job management...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="admin-page">
//       <AppHeader />
      
//       <div className="admin-container">
//         {showSuccess && (
//           <div className="success-notification">
//             <span className="success-icon">✅</span>
//             {showSuccess}
//           </div>
//         )}

//         {/* Header */}
//         <div className="admin-hero">
//           <div className="hero-content">
//             <h1 className="admin-title">Job Management</h1>
//             <p className="admin-subtitle">
//               Oversee job postings, manage applications, and monitor announcements
//             </p>
//           </div>
//           <div className="hero-actions">
//             <button 
//               className="admin-btn admin-btn-outline"
//               onClick={() => setShowStats(true)}
//             >
//               📊 View Statistics
//             </button>
//             <button 
//               className="admin-btn admin-btn-ghost"
//               onClick={loadJobsAndAnnouncements}
//               disabled={loading}
//             >
//               🔄 Refresh Data
//             </button>
//           </div>
//         </div>

//         {/* Statistics Cards */}
//         <div className="admin-stats-grid">
//           <div className="stat-card">
//             <div className="stat-icon">💼</div>
//             <div className="stat-content">
//               <div className="stat-number">{stats.total}</div>
//               <div className="stat-label">Total Jobs</div>
//             </div>
//           </div>

//           <div className="stat-card">
//             <div className="stat-icon">🟢</div>
//             <div className="stat-content">
//               <div className="stat-number">{stats.open}</div>
//               <div className="stat-label">Open Jobs</div>
//             </div>
//           </div>

//           <div className="stat-card">
//             <div className="stat-icon">🔒</div>
//             <div className="stat-content">
//               <div className="stat-number">{stats.closed}</div>
//               <div className="stat-label">Closed Jobs</div>
//             </div>
//           </div>

//           <div className="stat-card">
//             <div className="stat-icon">⏰</div>
//             <div className="stat-content">
//               <div className="stat-number">{stats.expired}</div>
//               <div className="stat-label">Expired Jobs</div>
//             </div>
//           </div>

//           <div className="stat-card">
//             <div className="stat-icon">📢</div>
//             <div className="stat-content">
//               <div className="stat-number">{stats.totalAnnouncements}</div>
//               <div className="stat-label">Announcements</div>
//             </div>
//           </div>

//           <div className="stat-card">
//             <div className="stat-icon">⏳</div>
//             <div className="stat-content">
//               <div className="stat-number">{stats.pendingAnnouncements}</div>
//               <div className="stat-label">Pending Push</div>
//             </div>
//           </div>
//         </div>

//         {/* Job Management Section */}
//         <div className="admin-section">
//           <div className="section-header">
//             <div>
//               <h2 className="section-title">Job Listings</h2>
//               <p className="section-subtitle">Manage job postings, status, and announcements</p>
//             </div>
//           </div>

//           {/* Filters */}
//           <div className="admin-filters">
//             <input
//               type="text"
//               placeholder="Search jobs by title, company, or location..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="admin-search"
//             />
//             <select
//               value={filterStatus}
//               onChange={(e) => setFilterStatus(e.target.value)}
//               className="admin-select"
//             >
//               <option value="all">All Status</option>
//               <option value="open">Open Jobs</option>
//               <option value="closed">Closed Jobs</option>
//               <option value="expired">Expired Jobs</option>
//             </select>
//             <select
//               value={sortBy}
//               onChange={(e) => setSortBy(e.target.value)}
//               className="admin-select"
//             >
//               <option value="newest">Newest First</option>
//               <option value="oldest">Oldest First</option>
//               <option value="deadline">By Deadline</option>
//             </select>
//           </div>

//           {/* Jobs Table */}
//           <div className="admin-table-container">
//             {sortedJobs.length === 0 ? (
//               <div className="admin-empty">
//                 <div className="empty-icon">
//                   {searchTerm || filterStatus !== "all" ? "🔍" : "💼"}
//                 </div>
//                 <div className="empty-title">
//                   {searchTerm || filterStatus !== "all" ? "No matching jobs found" : "No jobs posted yet"}
//                 </div>
//                 <div className="empty-text">
//                   {searchTerm || filterStatus !== "all"
//                     ? "Try adjusting your search or filter criteria"
//                     : "Jobs will appear here once recruiters start posting"
//                   }
//                 </div>
//               </div>
//             ) : (
//               <table className="admin-table">
//                 <thead>
//                   <tr>
//                     <th>Job Details</th>
//                     <th>Company</th>
//                     <th>Location & CTC</th>
//                     <th>Deadline</th>
//                     <th>Status</th>
//                     <th>Announcements</th>
//                     <th>Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {sortedJobs.map((job, index) => {
//                     const isExpired = isDeadlinePassed(job.deadline);
//                     const isOpen = job.applicationsOpen && !isExpired;
//                     const pendingCount = pendingByJob[job.id] || 0;
                    
//                     return (
//                       <tr 
//                         key={job.id} 
//                         className="table-row"
//                         style={{ animationDelay: `${index * 0.05}s` }}
//                       >
//                         <td>
//                           <div className="job-info">
//                             <h4 className="job-title-cell">{job.title}</h4>
//                             {job.description && (
//                               <p className="job-desc-cell">
//                                 {job.description.substring(0, 100)}
//                                 {job.description.length > 100 && '...'}
//                               </p>
//                             )}
//                           </div>
//                         </td>
                        
//                         <td>
//                           <div className="company-info">
//                             <span className="company-name">{job.company}</span>
//                             {pendingCount > 0 && (
//                               <span className="pending-badge">{pendingCount} pending</span>
//                             )}
//                           </div>
//                         </td>
                        
//                         <td>
//                           <div className="location-ctc">
//                             <span className="location">📍 {job.location}</span>
//                             <span className="ctc">💰 {job.ctc || "Not disclosed"}</span>
//                           </div>
//                         </td>
                        
//                         <td>
//                           <div className={`deadline ${isExpired ? 'deadline-expired' : ''}`}>
//                             {formatDate(job.deadline)}
//                             {isExpired && <span className="expired-label">Expired</span>}
//                           </div>
//                         </td>
                        
//                         <td>
//                           <span className={`status-pill ${isOpen ? 'status-active' : 'status-inactive'}`}>
//                             {isOpen ? '🟢 Open' : '🔒 Closed'}
//                           </span>
//                         </td>
                        
//                         <td>
//                           <button
//                             className="admin-btn admin-btn-ghost btn-sm"
//                             onClick={() => openJobModal(job)}
//                           >
//                             📢 View ({latestNoteByJob[job.id] ? '1+' : '0'})
//                           </button>
//                         </td>
                        
//                         <td>
//                           <div className="table-actions">
//                             <Link
//                               to={`/admin/jobs/${job.id}/applicants`}
//                               className="admin-btn admin-btn-outline btn-sm"
//                             >
//                               👥 Applicants
//                             </Link>
                            
//                             <button
//                               onClick={() => toggleJobStatus(job.id, !job.applicationsOpen)}
//                               className={`admin-btn btn-sm ${isOpen ? 'admin-btn-danger' : 'admin-btn-success'}`}
//                               disabled={updatingJob === job.id || (isExpired && !job.applicationsOpen)}
//                             >
//                               {updatingJob === job.id ? (
//                                 <div className="btn-spinner"></div>
//                               ) : isOpen ? (
//                                 'Close'
//                               ) : isExpired ? (
//                                 'Expired'
//                               ) : (
//                                 'Open'
//                               )}
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             )}
//           </div>

//           {sortedJobs.length > 0 && (
//             <div className="table-footer">
//               <p className="results-count">
//                 Showing {sortedJobs.length} of {jobs.length} jobs
//               </p>
//             </div>
//           )}
//         </div>

//         {/* Announcements Modal */}
//         {selectedJob && (
//           <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
//             <div className="modal admin-modal" onClick={(e) => e.stopPropagation()}>
//               <div className="modal-header">
//                 <div>
//                   <h2 className="modal-title">Job Announcements</h2>
//                   <p className="modal-subtitle">{selectedJob.title} • {selectedJob.company}</p>
//                 </div>
//                 <button 
//                   className="modal-close" 
//                   onClick={() => setSelectedJob(null)}
//                 >
//                   ×
//                 </button>
//               </div>

//               <div className="modal-body">
//                 {notesLoading ? (
//                   <div className="loading-spinner">
//                     <div className="admin-spinner"></div>
//                     Loading announcements...
//                   </div>
//                 ) : jobNotes.length === 0 ? (
//                   <div className="empty-announcements">
//                     <div className="empty-icon">📢</div>
//                     <h3>No Announcements</h3>
//                     <p>No announcements have been created for this job yet.</p>
//                   </div>
//                 ) : (
//                   <div className="announcements-list">
//                     {jobNotes.map(note => (
//                       <div key={note.id} className="announcement-item">
//                         <div className="announcement-header">
//                           <h4 className="announcement-title">{note.title}</h4>
//                           <div className="announcement-actions">
//                             {note.pushed ? (
//                               <span className="pushed-status">✅ Pushed</span>
//                             ) : (
//                               <button
//                                 className="admin-btn admin-btn-sm"
//                                 onClick={() => pushAnnouncement(note.id)}
//                               >
//                                 📤 Push to Students
//                               </button>
//                             )}
//                           </div>
//                         </div>
//                         <p className="announcement-message">{note.message}</p>
//                         <div className="announcement-footer">
//                           <span>📅 {formatDate(note.createdAt)}</span>
//                           {note.pushed && (
//                             <span>📤 Pushed: {formatDate(note.pushedAt)}</span>
//                           )}
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }



// src/pages/admin/AdminJobs.jsx
import { useEffect, useState } from "react";
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  where,
  serverTimestamp 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase.js";
import AppHeader from "../../components/AppHeader.jsx";
import "/src/styles/Admin.css";

export default function AdminJobs() {
  const auth = getAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [updatingJob, setUpdatingJob] = useState(null);
  const [showSuccess, setShowSuccess] = useState("");
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  
  // Announcements data
  const [latestNoteByJob, setLatestNoteByJob] = useState({});
  const [pendingByJob, setPendingByJob] = useState({});
  
  // Modal state
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobNotes, setJobNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    loadJobsAndAnnouncements();
  }, []);

  const loadJobsAndAnnouncements = async () => {
    setLoading(true);
    try {
      // Load jobs
      const jobsQuery = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
      const jobsSnap = await getDocs(jobsQuery);
      const jobsData = jobsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      // Auto-close expired jobs
      const now = new Date();
      const toClose = jobsData.filter(job => {
        const deadline = job.deadline?.toDate?.() || new Date(job.deadline);
        return job.applicationsOpen && deadline < now;
      });

      if (toClose.length > 0) {
        await Promise.all(
          toClose.map(job =>
            updateDoc(doc(db, "jobs", job.id), {
              applicationsOpen: false,
              status: "closed",
              closedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          )
        );
      }

      // Update jobs data to reflect closures
      const updatedJobs = jobsData.map(job => {
        const deadline = job.deadline?.toDate?.() || new Date(job.deadline);
        if (job.applicationsOpen && deadline < now) {
          return { ...job, applicationsOpen: false, status: "closed" };
        }
        return job;
      });

      setJobs(updatedJobs);

      // Load announcements overview
      const notesQuery = query(collection(db, "jobNotes"), orderBy("createdAt", "desc"));
      const notesSnap = await getDocs(notesQuery);
      
      const latest = {};
      const pendingCounts = {};
      
      notesSnap.forEach((d) => {
        const note = { id: d.id, ...d.data() };
        const jobId = note.jobId;
        
        if (!jobId) return;
        
        // Track latest note per job
        if (!latest[jobId]) {
          latest[jobId] = note;
        }
        
        // Count pending (not pushed) notes
        if (!note.pushed) {
          pendingCounts[jobId] = (pendingCounts[jobId] || 0) + 1;
        }
      });

      setLatestNoteByJob(latest);
      setPendingByJob(pendingCounts);

    } catch (error) {
      console.error("Failed to load jobs and announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleJobStatus = async (jobId, newStatus) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    // Check if trying to open an expired job
    const deadline = job.deadline?.toDate?.() || new Date(job.deadline);
    if (newStatus && deadline < new Date()) {
      alert("Cannot open job: deadline has passed");
      return;
    }

    setUpdatingJob(jobId);
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        applicationsOpen: newStatus,
        status: newStatus ? "open" : "closed",
        updatedAt: serverTimestamp(),
      });

      setJobs(prev => prev.map(j => 
        j.id === jobId 
          ? { ...j, applicationsOpen: newStatus, status: newStatus ? "open" : "closed" }
          : j
      ));

      setShowSuccess(`Job ${newStatus ? 'opened' : 'closed'} successfully!`);
      setTimeout(() => setShowSuccess(""), 3000);

    } catch (error) {
      console.error("Failed to update job status:", error);
      alert("Failed to update job status");
    } finally {
      setUpdatingJob(null);
    }
  };

  const openJobModal = async (job) => {
    setSelectedJob(job);
    setNotesLoading(true);
    
    try {
      const jobNotesQuery = query(
        collection(db, "jobNotes"),
        where("jobId", "==", job.id),
        orderBy("createdAt", "desc")
      );
      const notesSnap = await getDocs(jobNotesQuery);
      const notes = notesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setJobNotes(notes);
    } catch (error) {
      console.error("Failed to load job notes:", error);
      setJobNotes([]);
    } finally {
      setNotesLoading(false);
    }
  };

  const pushAnnouncement = async (noteId) => {
    if (!window.confirm("Push this announcement to all students?")) return;

    try {
      await updateDoc(doc(db, "jobNotes", noteId), {
        pushed: true,
        pushedAt: serverTimestamp(),
        pushedBy: auth.currentUser?.uid,
      });

      setJobNotes(prev => prev.map(note =>
        note.id === noteId
          ? { ...note, pushed: true, pushedAt: new Date() }
          : note
      ));

      // Refresh overview
      await loadJobsAndAnnouncements();

    } catch (error) {
      console.error("Failed to push announcement:", error);
      alert("Failed to push announcement");
    }
  };

  // Navigate to applicants page safely
  const viewApplicants = (jobId) => {
    navigate(`/admin/jobs/${jobId}/applicants`);
  };

  // Helper functions
  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    const date = deadline.toDate ? deadline.toDate() : new Date(deadline);
    return date < new Date();
  };

  // Filter and sort jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      (job.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.company || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "open" && job.applicationsOpen && !isDeadlinePassed(job.deadline)) ||
      (filterStatus === "closed" && (!job.applicationsOpen || isDeadlinePassed(job.deadline))) ||
      (filterStatus === "expired" && isDeadlinePassed(job.deadline));

    return matchesSearch && matchesStatus;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (sortBy === "oldest") {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return dateA - dateB;
    } else if (sortBy === "deadline") {
      const dateA = a.deadline?.toDate?.() || new Date(a.deadline);
      const dateB = b.deadline?.toDate?.() || new Date(b.deadline);
      return dateA - dateB;
    }
    // Default: newest
    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
    return dateB - dateA;
  });

  // Calculate stats
  const stats = {
    total: jobs.length,
    open: jobs.filter(j => j.applicationsOpen && !isDeadlinePassed(j.deadline)).length,
    closed: jobs.filter(j => !j.applicationsOpen || isDeadlinePassed(j.deadline)).length,
    expired: jobs.filter(j => isDeadlinePassed(j.deadline)).length,
    totalAnnouncements: Object.keys(latestNoteByJob).length,
    pendingAnnouncements: Object.values(pendingByJob).reduce((sum, count) => sum + count, 0)
  };

  if (loading) {
    return (
      <div className="admin-page">
        <AppHeader />
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading job management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <AppHeader />
      
      <div className="admin-container">
        {showSuccess && (
          <div className="success-notification">
            <span className="success-icon">✅</span>
            {showSuccess}
          </div>
        )}

        {/* Header */}
        <div className="admin-hero">
          <div className="hero-content">
            <h1 className="admin-title">Job Management</h1>
            <p className="admin-subtitle">
              Oversee job postings, manage applications, and monitor announcements
            </p>
          </div>
          <div className="hero-actions">
            <button 
              className="admin-btn admin-btn-outline"
              onClick={() => setShowStats(true)}
            >
              📊 View Statistics
            </button>
            <button 
              className="admin-btn admin-btn-ghost"
              onClick={loadJobsAndAnnouncements}
              disabled={loading}
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="admin-stats-grid">
          <div className="stat-card">
            <div className="stat-icon">💼</div>
            <div className="stat-content">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Jobs</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🟢</div>
            <div className="stat-content">
              <div className="stat-number">{stats.open}</div>
              <div className="stat-label">Open Jobs</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔒</div>
            <div className="stat-content">
              <div className="stat-number">{stats.closed}</div>
              <div className="stat-label">Closed Jobs</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏰</div>
            <div className="stat-content">
              <div className="stat-number">{stats.expired}</div>
              <div className="stat-label">Expired Jobs</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📢</div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalAnnouncements}</div>
              <div className="stat-label">Announcements</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-number">{stats.pendingAnnouncements}</div>
              <div className="stat-label">Pending Push</div>
            </div>
          </div>
        </div>

        {/* Job Management Section */}
        <div className="admin-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Job Listings</h2>
              <p className="section-subtitle">Manage job postings, status, and announcements</p>
            </div>
          </div>

          {/* Filters */}
          <div className="admin-filters">
            <input
              type="text"
              placeholder="Search jobs by title, company, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="admin-select"
            >
              <option value="all">All Status</option>
              <option value="open">Open Jobs</option>
              <option value="closed">Closed Jobs</option>
              <option value="expired">Expired Jobs</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="admin-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="deadline">By Deadline</option>
            </select>
          </div>

          {/* Jobs Table */}
          <div className="admin-table-container">
            {sortedJobs.length === 0 ? (
              <div className="admin-empty">
                <div className="empty-icon">
                  {searchTerm || filterStatus !== "all" ? "🔍" : "💼"}
                </div>
                <div className="empty-title">
                  {searchTerm || filterStatus !== "all" ? "No matching jobs found" : "No jobs posted yet"}
                </div>
                <div className="empty-text">
                  {searchTerm || filterStatus !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Jobs will appear here once recruiters start posting"
                  }
                </div>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Job Details</th>
                    <th>Company</th>
                    <th>Location & CTC</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Announcements</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedJobs.map((job, index) => {
                    const isExpired = isDeadlinePassed(job.deadline);
                    const isOpen = job.applicationsOpen && !isExpired;
                    const pendingCount = pendingByJob[job.id] || 0;
                    
                    return (
                      <tr 
                        key={job.id} 
                        className="table-row"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <td>
                          <div className="job-info">
                            <h4 className="job-title-cell">{job.title}</h4>
                            {job.description && (
                              <p className="job-desc-cell">
                                {job.description.substring(0, 100)}
                                {job.description.length > 100 && '...'}
                              </p>
                            )}
                          </div>
                        </td>
                        
                        <td>
                          <div className="company-info">
                            <span className="company-name">{job.company}</span>
                            {pendingCount > 0 && (
                              <span className="pending-badge">{pendingCount} pending</span>
                            )}
                          </div>
                        </td>
                        
                        <td>
                          <div className="location-ctc">
                            <span className="location">📍 {job.location}</span>
                            <span className="ctc">💰 {job.ctc || "Not disclosed"}</span>
                          </div>
                        </td>
                        
                        <td>
                          <div className={`deadline ${isExpired ? 'deadline-expired' : ''}`}>
                            {formatDate(job.deadline)}
                            {isExpired && <span className="expired-label">Expired</span>}
                          </div>
                        </td>
                        
                        <td>
                          <span className={`status-pill ${isOpen ? 'status-active' : 'status-inactive'}`}>
                            {isOpen ? '🟢 Open' : '🔒 Closed'}
                          </span>
                        </td>
                        
                        <td>
                          <button
                            className="admin-btn admin-btn-ghost btn-sm"
                            onClick={() => openJobModal(job)}
                          >
                            📢 View ({latestNoteByJob[job.id] ? '1+' : '0'})
                          </button>
                        </td>
                        
                        <td>
                          <div className="table-actions">
                            <button
                              className="admin-btn admin-btn-outline btn-sm"
                              onClick={() => viewApplicants(job.id)}
                            >
                              👥 Applicants
                            </button>
                            
                            <button
                              onClick={() => toggleJobStatus(job.id, !job.applicationsOpen)}
                              className={`admin-btn btn-sm ${isOpen ? 'admin-btn-danger' : 'admin-btn-success'}`}
                              disabled={updatingJob === job.id || (isExpired && !job.applicationsOpen)}
                            >
                              {updatingJob === job.id ? (
                                <div className="btn-spinner"></div>
                              ) : isOpen ? (
                                'Close'
                              ) : isExpired ? (
                                'Expired'
                              ) : (
                                'Open'
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {sortedJobs.length > 0 && (
            <div className="table-footer">
              <p className="results-count">
                Showing {sortedJobs.length} of {jobs.length} jobs
              </p>
            </div>
          )}
        </div>

        {/* ===== FIXED: Statistics Modal ===== */}
        {showStats && (
          <div className="modal-overlay" onClick={() => setShowStats(false)}>
            <div className="modal admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">Job Statistics Overview</h2>
                  <p className="modal-subtitle">Comprehensive platform metrics</p>
                </div>
                <button 
                  className="modal-close" 
                  onClick={() => setShowStats(false)}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="stats-overview">
                  <div className="stats-summary-grid">
                    <div className="stat-summary-item">
                      <div className="stat-summary-number">{stats.total}</div>
                      <div className="stat-summary-label">Total Jobs Posted</div>
                      <div className="stat-summary-trend">
                        {stats.open > stats.closed ? '📈 Growing' : '📊 Stable'}
                      </div>
                    </div>
                    
                    <div className="stat-summary-item">
                      <div className="stat-summary-number">{Math.round((stats.open / Math.max(stats.total, 1)) * 100)}%</div>
                      <div className="stat-summary-label">Active Job Rate</div>
                      <div className="stat-summary-trend">
                        {stats.open > stats.closed ? '🟢 Healthy' : '🟡 Monitor'}
                      </div>
                    </div>
                    
                    <div className="stat-summary-item">
                      <div className="stat-summary-number">{stats.totalAnnouncements}</div>
                      <div className="stat-summary-label">Total Announcements</div>
                      <div className="stat-summary-trend">
                        📢 Communication Active
                      </div>
                    </div>
                    
                    <div className="stat-summary-item">
                      <div className="stat-summary-number">{stats.pendingAnnouncements}</div>
                      <div className="stat-summary-label">Pending Notifications</div>
                      <div className="stat-summary-trend">
                        {stats.pendingAnnouncements > 0 ? '⚠️ Action Needed' : '✅ All Current'}
                      </div>
                    </div>
                  </div>

                  <div className="stats-breakdown">
                    <h3>Job Status Breakdown</h3>
                    <div className="breakdown-bars">
                      <div className="breakdown-item">
                        <div className="breakdown-label">Open Jobs ({stats.open})</div>
                        <div className="breakdown-bar">
                          <div 
                            className="breakdown-fill breakdown-fill-open"
                            style={{ width: `${(stats.open / Math.max(stats.total, 1)) * 100}%` }}
                          ></div>
                        </div>
                        <div className="breakdown-percent">{Math.round((stats.open / Math.max(stats.total, 1)) * 100)}%</div>
                      </div>
                      
                      <div className="breakdown-item">
                        <div className="breakdown-label">Closed Jobs ({stats.closed})</div>
                        <div className="breakdown-bar">
                          <div 
                            className="breakdown-fill breakdown-fill-closed"
                            style={{ width: `${(stats.closed / Math.max(stats.total, 1)) * 100}%` }}
                          ></div>
                        </div>
                        <div className="breakdown-percent">{Math.round((stats.closed / Math.max(stats.total, 1)) * 100)}%</div>
                      </div>
                      
                      <div className="breakdown-item">
                        <div className="breakdown-label">Expired Jobs ({stats.expired})</div>
                        <div className="breakdown-bar">
                          <div 
                            className="breakdown-fill breakdown-fill-expired"
                            style={{ width: `${(stats.expired / Math.max(stats.total, 1)) * 100}%` }}
                          ></div>
                        </div>
                        <div className="breakdown-percent">{Math.round((stats.expired / Math.max(stats.total, 1)) * 100)}%</div>
                      </div>
                    </div>
                  </div>

                  <div className="stats-insights">
                    <h3>Key Insights</h3>
                    <ul className="insights-list">
                      <li>📊 Platform has {stats.total} total job postings</li>
                      <li>🟢 {stats.open} jobs are currently accepting applications</li>
                      <li>⏰ {stats.expired} jobs have passed their deadline</li>
                      <li>📢 {stats.totalAnnouncements} announcements have been created</li>
                      {stats.pendingAnnouncements > 0 && (
                        <li>⚠️ {stats.pendingAnnouncements} announcements are pending push to students</li>
                      )}
                      <li>💡 {stats.open > 0 ? 'Active recruitment ongoing' : 'Consider encouraging more job postings'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Announcements Modal */}
        {selectedJob && (
          <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
            <div className="modal admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">Job Announcements</h2>
                  <p className="modal-subtitle">{selectedJob.title} • {selectedJob.company}</p>
                </div>
                <button 
                  className="modal-close" 
                  onClick={() => setSelectedJob(null)}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                {notesLoading ? (
                  <div className="loading-spinner">
                    <div className="admin-spinner"></div>
                    Loading announcements...
                  </div>
                ) : jobNotes.length === 0 ? (
                  <div className="empty-announcements">
                    <div className="empty-icon">📢</div>
                    <h3>No Announcements</h3>
                    <p>No announcements have been created for this job yet.</p>
                  </div>
                ) : (
                  <div className="announcements-list">
                    {jobNotes.map(note => (
                      <div key={note.id} className="announcement-item">
                        <div className="announcement-header">
                          <h4 className="announcement-title">{note.title}</h4>
                          <div className="announcement-actions">
                            {note.pushed ? (
                              <span className="pushed-status">✅ Pushed</span>
                            ) : (
                              <button
                                className="admin-btn admin-btn-sm"
                                onClick={() => pushAnnouncement(note.id)}
                              >
                                📤 Push to Students
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="announcement-message">{note.message}</p>
                        <div className="announcement-footer">
                          <span>📅 {formatDate(note.createdAt)}</span>
                          {note.pushed && (
                            <span>📤 Pushed: {formatDate(note.pushedAt)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}