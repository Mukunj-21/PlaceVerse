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
import "./Admin.css";
import AppHeader from "../components/AppHeader.jsx";

export default function AdminDashboard() {
  // === React state variables ===
  const [users, setUsers] = useState([]);     // list of all users from Firestore
  const [loading, setLoading] = useState(true); // true while fetching data
  const [err, setErr] = useState("");          // store error message if any
  const [search, setSearch] = useState("");    // search bar input

  const db = getFirestore(); // get Firestore instance


  // === Fetch users when component loads ===
  useEffect(() => {
    loadUsers();
  }, []);

  // Function to fetch users from Firestore
  const loadUsers = async () => {
    setLoading(true);
    setErr("");
    try {
      // Query: get all users ordered by email
      const q = query(collection(db, "users"), orderBy("email"));
      const snap = await getDocs(q);

      // Map each Firestore doc into a JS object {id, ...data}
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Store into state
      setUsers(rows);
    } catch (e) {
      setErr("Failed to load users.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // === Filtered list based on search bar ===
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users; // if search is empty, return all
    return users.filter((u) => {
      const email = (u.email || "").toLowerCase();
      const name = (u.name || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      return email.includes(q) || name.includes(q) || role.includes(q);
    });
  }, [users, search]);

  // === Toggle Active/Inactive for a user ===
  const toggleActive = async (u) => {
    // ask for confirmation
    if (!window.confirm(`Are you sure you want to ${u.active ? "deactivate" : "activate"} ${u.email}?`)) return;

    try {
      // update Firestore field "active"
      await updateDoc(doc(db, "users", u.id), { active: !u.active });

      // update local state so UI changes instantly
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, active: !u.active } : x))
      );
    } catch (e) {
      alert("Failed to update active status.");
      console.error(e);
    }
  };

  // === Change role of a user ===
  const changeRole = async (u, newRole) => {
    if (newRole === u.role) return; // no change if same role

    if (!window.confirm(`Change role of ${u.email} from ${u.role} to ${newRole}?`)) return;

    try {
      // update Firestore field "role"
      await updateDoc(doc(db, "users", u.id), { role: newRole });

      // update local state
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x))
      );
    } catch (e) {
      alert("Failed to change role.");
      console.error(e);
    }
  };

  return (
    <div className="admin-page">
        <AppHeader />
      <div className="admin-header">
        <h1 className="admin-title">Admin — Manage Users</h1>
        <div className="admin-actions">
  <button
    className="admin-top-btn"
    onClick={() => window.location.href = "/admin/jobs"}
  >
    Access Jobs
  </button>
  <input
    className="admin-input"
    placeholder="Search by email, name, or role…"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
</div>

   </div>

      {/* Show error if fetching failed */}
      {err && <div className="admin-error">{err}</div>}

      {/* Main content: loading, empty, or table */}
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
                <th>Actions</th> {/* extra column for buttons */}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.email || "—"}</td>
                  <td>{u.name || "—"}</td>

                  {/* Role: dropdown to change */}
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

                  {/* Status: Active/Inactive badge */}
                  <td>
                    {u.active ? (
                      <span className="pill pill-on">Active</span>
                    ) : (
                      <span className="pill pill-off">Inactive</span>
                    )}
                  </td>

                  {/* Action: Activate/Deactivate button */}
                  <td>
                    <button
                      className="admin-btn"
                      onClick={() => toggleActive(u)}
                    >
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
