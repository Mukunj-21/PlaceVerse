// src/pages/AdminDashboard.jsx
// PURPOSE: Admin can see all users, activate/deactivate them, and change their role.

import { useEffect, useMemo, useState } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import "/src/styles/Admin.css";
import AppHeader from "../../components/AppHeader.jsx";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");

  const db = getFirestore();

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUsers() {
    setLoading(true);
    setErr("");
    try {
      const q = query(collection(db, "users"), orderBy("email"));
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(rows);
    } catch (e) {
      setErr("Failed to load users.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const email = (u.email || "").toLowerCase();
      const name = (u.name || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      return email.includes(q) || name.includes(q) || role.includes(q);
    });
  }, [users, search]);

  async function toggleActive(u) {
    if (
      !window.confirm(
        `Are you sure you want to ${u.active ? "deactivate" : "activate"} ${u.email}?`
      )
    )
      return;

    try {
      await updateDoc(doc(db, "users", u.id), { active: !u.active });
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, active: !u.active } : x))
      );
    } catch (e) {
      alert("Failed to update active status.");
      console.error(e);
    }
  }

  async function changeRole(u, newRole) {
    if (newRole === u.role) return;
    if (!window.confirm(`Change role of ${u.email} from ${u.role} to ${newRole}?`))
      return;

    try {
      await updateDoc(doc(db, "users", u.id), { role: newRole });
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x))
      );
    } catch (e) {
      alert("Failed to change role.");
      console.error(e);
    }
  }

  const total = users.length;
  const admins = users.filter((u) => u.role === "admin").length;
  const students = users.filter((u) => u.role === "student").length;
  const recruiters = users.filter((u) => u.role === "recruiter").length;
  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="admin-page">
      <AppHeader />

      <div className="admin-header">
        <h1 className="admin-title">Admin — Manage Users</h1>

        <div className="admin-actions">
          <Link to="/admin/jobs" className="admin-top-btn">
            Access Jobs
          </Link>
          <Link to="/admin/new-recruiter" className="admin-top-btn primary">
            New Recruiter
          </Link>
          <button className="admin-top-btn" onClick={loadUsers} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <input
            className="admin-input"
            placeholder="Search by email, name, or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="stats-grid">
        <div className="stats-card blue">
          <div className="stats-value">{total}</div>
          <div className="stats-label">Total Users</div>
        </div>
        <div className="stats-card green">
          <div className="stats-value">{activeCount}</div>
          <div className="stats-label">Active</div>
        </div>
        <div className="stats-card indigo">
          <div className="stats-value">{admins}</div>
          <div className="stats-label">Admins</div>
        </div>
        <div className="stats-card amber">
          <div className="stats-value">{students}</div>
          <div className="stats-label">Students</div>
        </div>
        <div className="stats-card purple">
          <div className="stats-value">{recruiters}</div>
          <div className="stats-label">Recruiters</div>
        </div>
      </div>

      {err && <div className="admin-error">{err}</div>}

      {loading ? (
        <div className="admin-empty">Loading users…</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">No users found.</div>
      ) : (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.email || "—"}</td>
                  <td>{u.name || "—"}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      className="admin-select"
                    >
                      <option value="admin">Admin</option>
                      <option value="student">Student</option>
                      <option value="recruiter">Recruiter</option>
                    </select>
                  </td>
                  <td>
                    {u.active ? (
                      <span className="pill pill-on">Active</span>
                    ) : (
                      <span className="pill pill-off">Inactive</span>
                    )}
                  </td>
                  <td>
                    <button className="admin-btn" onClick={() => toggleActive(u)}>
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
