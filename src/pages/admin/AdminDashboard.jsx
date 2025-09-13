// src/pages/admin/AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  updateDoc, 
  doc,
  where 
} from "firebase/firestore";
import "/src/styles/Admin.css";
import AppHeader from "../../components/AppHeader.jsx";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showSuccess, setShowSuccess] = useState("");
  const [updatingUser, setUpdatingUser] = useState(null);
  
  const db = getFirestore();

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError("");
    
    try {
      // Load users
      const usersQuery = query(collection(db, "users"), orderBy("email"));
      const usersSnap = await getDocs(usersQuery);
      const usersData = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      // Load jobs
      const jobsQuery = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
      const jobsSnap = await getDocs(jobsQuery);
      const jobsData = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      // Load applications
      const appsQuery = query(collection(db, "applications"));
      const appsSnap = await getDocs(appsQuery);
      const appsData = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      setUsers(usersData);
      setJobs(jobsData);
      setApplications(appsData);
      
    } catch (e) {
      setError("Failed to load dashboard data.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Filter users based on search and role
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    let filtered = users;
    
    if (query) {
      filtered = filtered.filter((u) => {
        const email = (u.email || "").toLowerCase();
        const name = (u.name || "").toLowerCase();
        const role = (u.role || "").toLowerCase();
        return email.includes(query) || name.includes(query) || role.includes(query);
      });
    }
    
    if (filterRole !== "all") {
      filtered = filtered.filter(u => u.role === filterRole);
    }
    
    return filtered;
  }, [users, search, filterRole]);

  // Toggle user active status
  async function toggleActive(user) {
    const action = user.active ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} ${user.email}?`)) return;

    setUpdatingUser(user.id);
    try {
      await updateDoc(doc(db, "users", user.id), { 
        active: !user.active,
        updatedAt: new Date()
      });
      
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u))
      );
      
      setShowSuccess(`User ${action}d successfully!`);
      setTimeout(() => setShowSuccess(""), 3000);
      
    } catch (e) {
      alert("Failed to update user status.");
      console.error(e);
    } finally {
      setUpdatingUser(null);
    }
  }

  // Change user role
  async function changeRole(user, newRole) {
    if (newRole === user.role) return;
    if (!window.confirm(`Change role of ${user.email} from ${user.role} to ${newRole}?`)) return;

    setUpdatingUser(user.id);
    try {
      await updateDoc(doc(db, "users", user.id), { 
        role: newRole,
        updatedAt: new Date()
      });
      
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      
      setShowSuccess(`User role updated successfully!`);
      setTimeout(() => setShowSuccess(""), 3000);
      
    } catch (e) {
      alert("Failed to change user role.");
      console.error(e);
    } finally {
      setUpdatingUser(null);
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.active).length;
    const admins = users.filter((u) => u.role === "admin").length;
    const students = users.filter((u) => u.role === "student").length;
    const recruiters = users.filter((u) => u.role === "recruiter").length;
    
    const totalJobs = jobs.length;
    const openJobs = jobs.filter(j => j.open || j.applicationsOpen).length;
    const totalApplications = applications.length;
    const recentApplications = applications.filter(app => {
      const createdAt = app.createdAt?.toDate?.() || new Date(app.createdAt);
      const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated <= 7;
    }).length;
    
    return {
      users: { total, active, admins, students, recruiters },
      jobs: { total: totalJobs, open: openJobs },
      applications: { total: totalApplications, recent: recentApplications }
    };
  }, [users, jobs, applications]);

  if (loading && users.length === 0) {
    return (
      <div className="admin-page">
        <AppHeader />
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading dashboard...</p>
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

        {/* Dashboard Header */}
        <div className="admin-hero">
          <div className="hero-content">
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">
              Manage users, oversee job postings, and monitor platform activity
            </p>
          </div>
          <div className="hero-actions">
            <Link to="/admin/jobs" className="admin-btn admin-btn-primary">
              <span>💼</span> Manage Jobs
            </Link>
            <Link to="/admin/new-recruiter" className="admin-btn admin-btn-outline">
              <span>➕</span> New Recruiter
            </Link>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="admin-stats-grid">
          <div className="stat-card stat-card-users">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{stats.users.total}</div>
              <div className="stat-label">Total Users</div>
              <div className="stat-breakdown">
                {stats.users.active} Active • {stats.users.total - stats.users.active} Inactive
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-admins">
            <div className="stat-icon">🏛️</div>
            <div className="stat-content">
              <div className="stat-number">{stats.users.admins}</div>
              <div className="stat-label">Administrators</div>
              <div className="stat-breakdown">System Management</div>
            </div>
          </div>

          <div className="stat-card stat-card-students">
            <div className="stat-icon">🎓</div>
            <div className="stat-content">
              <div className="stat-number">{stats.users.students}</div>
              <div className="stat-label">Students</div>
              <div className="stat-breakdown">Job Seekers</div>
            </div>
          </div>

          <div className="stat-card stat-card-recruiters">
            <div className="stat-icon">💼</div>
            <div className="stat-content">
              <div className="stat-number">{stats.users.recruiters}</div>
              <div className="stat-label">Recruiters</div>
              <div className="stat-breakdown">Talent Acquisition</div>
            </div>
          </div>

          <div className="stat-card stat-card-jobs">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-number">{stats.jobs.total}</div>
              <div className="stat-label">Job Postings</div>
              <div className="stat-breakdown">
                {stats.jobs.open} Open • {stats.jobs.total - stats.jobs.open} Closed
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-applications">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-number">{stats.applications.total}</div>
              <div className="stat-label">Applications</div>
              <div className="stat-breakdown">
                {stats.applications.recent} This Week
              </div>
            </div>
          </div>
        </div>

        {/* User Management Section */}
        <div className="admin-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">User Management</h2>
              <p className="section-subtitle">Manage user accounts, roles, and permissions</p>
            </div>
            <div className="section-actions">
              <button 
                className="admin-btn admin-btn-ghost"
                onClick={loadDashboardData}
                disabled={loading}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="admin-filters">
            <input
              type="text"
              placeholder="Search by email, name, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-search"
            />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="admin-select"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrators</option>
              <option value="student">Students</option>
              <option value="recruiter">Recruiters</option>
            </select>
          </div>

          {error && (
            <div className="admin-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Users Table */}
          <div className="admin-table-container">
            {filteredUsers.length === 0 ? (
              <div className="admin-empty">
                <div className="empty-icon">
                  {search || filterRole !== "all" ? "🔍" : "👥"}
                </div>
                <div className="empty-title">
                  {search || filterRole !== "all" ? "No matching users found" : "No users yet"}
                </div>
                <div className="empty-text">
                  {search || filterRole !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Users will appear here once they register"
                  }
                </div>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr 
                      key={user.id} 
                      className="table-row"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td>
                        <div className="user-email">
                          <div className="user-avatar">
                            {(user.name || user.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="user-name">
                          {user.name || "—"}
                        </span>
                      </td>
                      <td>
                        <select
                          value={user.role || "student"}
                          onChange={(e) => changeRole(user, e.target.value)}
                          className="role-select"
                          disabled={updatingUser === user.id}
                        >
                          <option value="admin">Administrator</option>
                          <option value="student">Student</option>
                          <option value="recruiter">Recruiter</option>
                        </select>
                      </td>
                      <td>
                        <span className={`status-pill ${user.active ? 'status-active' : 'status-inactive'}`}>
                          {user.active ? "🟢 Active" : "⭕ Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => toggleActive(user)}
                            className={`action-btn ${user.active ? 'btn-danger' : 'btn-success'}`}
                            disabled={updatingUser === user.id}
                          >
                            {updatingUser === user.id ? (
                              <div className="btn-spinner"></div>
                            ) : user.active ? (
                              "Deactivate"
                            ) : (
                              "Activate"
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {filteredUsers.length > 0 && (
            <div className="table-footer">
              <p className="results-count">
                Showing {filteredUsers.length} of {users.length} users
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
