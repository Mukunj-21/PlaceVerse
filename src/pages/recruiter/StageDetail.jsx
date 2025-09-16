// src/pages/recruiter/StageDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../../firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
} from "firebase/firestore";
import "../../styles/Recruiter.css";

const emailKey = (email) =>
  String(email || "").toLowerCase().trim().replaceAll(".", "(dot)").replaceAll("/", "(slash)");

const normalizeStatus = (s) => {
  const v = String(s || "").toLowerCase().trim();
  if (["qualified", "pass", "yes", "next", "promote"].includes(v)) return "qualified";
  if (["rejected", "fail", "no", "drop"].includes(v)) return "rejected";
  return "pending";
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "qualified", label: "Qualified (→ next round)" },
  { value: "rejected", label: "Rejected" },
];

const stageStudentsColl = (jobId, stageId) =>
  collection(db, "jobs", jobId, "stageParticipants", stageId, "students");

export default function StageDetail() {
  const { jobId, stageId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // role from path
  const role = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/admin")) return "admin";
    if (p.startsWith("/student")) return "student";
    return "recruiter";
  }, [location.pathname]);

  const canManage = role === "admin" || role === "recruiter";
  const canPublish = role === "admin";         // only admin
  const canUploadExcel = role === "recruiter"; // only recruiter
  const basePath = `/${role}/jobs/${jobId}`;

  // meta
  const [job, setJob] = useState(null);
  const [stage, setStage] = useState(null);
  const [stageIndex, setStageIndex] = useState(-1);
  const [nextStageId, setNextStageId] = useState(null);
  const [published, setPublished] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // participants
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [seedMsg, setSeedMsg] = useState("");

  // ui
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);

  // manual add
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // student status (for role==='student')
  const [myStageStatus, setMyStageStatus] = useState(null);
  const [myStatusLoading, setMyStatusLoading] = useState(false);

  // load job & stage
  useEffect(() => {
    const load = async () => {
      setLoadingMeta(true);
      try {
        const snap = await getDoc(doc(db, "jobs", jobId));
        if (!snap.exists()) {
          setJob(null); setStage(null); setStageIndex(-1); setNextStageId(null); setPublished(false);
          return;
        }
        const data = snap.data();
        const stages = Array.isArray(data.stages) ? data.stages : [];
        const idx = stages.findIndex((s) => (s.id || "") === stageId);
        const st = idx >= 0 ? stages[idx] : null;
        setJob({ id: snap.id, ...data });
        setStage(st);
        setStageIndex(idx);
        setNextStageId(idx >= 0 && idx < stages.length - 1 ? stages[idx + 1].id : null);
        setPublished(!!st?.published);
      } catch (e) {
        console.error("Failed to load job/stage:", e);
        setJob(null); setStage(null); setStageIndex(-1); setNextStageId(null); setPublished(false);
      } finally {
        setLoadingMeta(false);
      }
    };
    if (jobId && stageId) load();
  }, [jobId, stageId]);

  // load participants
  const loadParticipants = async () => {
    setLoadingRows(true);
    try {
      const snap = await getDocs(query(stageStudentsColl(jobId, stageId), orderBy("addedAt", "desc")));
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Failed to load participants:", e);
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    if (jobId && stageId) loadParticipants();
  }, [jobId, stageId]);

  // student-only: load my status quickly
  useEffect(() => {
    const run = async () => {
      if (role !== "student") return;
      if (!auth.currentUser?.email) return;
      setMyStatusLoading(true);
      try {
        const id = emailKey(auth.currentUser.email);
        const snap = await getDoc(doc(db, "jobs", jobId, "stageParticipants", stageId, "students", id));
        if (snap.exists()) setMyStageStatus(snap.data().status || "pending");
        else setMyStageStatus(null);
      } finally {
        setMyStatusLoading(false);
      }
    };
    run();
  }, [role, jobId, stageId]);

  // initial seed (first stage from applicants.shortlisted; else from prev stage qualified)
  useEffect(() => {
    const trySeed = async () => {
      if (!canManage || stageIndex < 0) return;

      const existing = await getDocs(stageStudentsColl(jobId, stageId));
      if (!existing.empty) return;

      let seeded = 0;
      if (stageIndex === 0) {
        const appsSnap = await getDocs(
          query(
            collection(db, "applications"),
            where("jobId", "==", jobId),
            where("status", "==", "shortlisted")
          )
        );
        const b = writeBatch(db);
        appsSnap.forEach((d) => {
          const email = (d.data().studentEmail || "").toLowerCase().trim();
          if (!email) return;
          const name = d.data().studentName || "";
          b.set(doc(stageStudentsColl(jobId, stageId), emailKey(email)), {
            email, name, status: "pending", addedAt: serverTimestamp(), source: "applicants",
          }, { merge: true });
          seeded++;
        });
        if (seeded) await b.commit();
      } else {
        const prevId = job?.stages?.[stageIndex - 1]?.id;
        if (!prevId) return;
        const prevSnap = await getDocs(
          query(stageStudentsColl(jobId, prevId), where("status", "==", "qualified"))
        );
        const b = writeBatch(db);
        prevSnap.forEach((d) => {
          const { email = "", name = "" } = d.data();
          if (!email) return;
          b.set(doc(stageStudentsColl(jobId, stageId), d.id), {
            email, name, status: "pending", addedAt: serverTimestamp(), source: "prevStage",
          }, { merge: true });
          seeded++;
        });
        if (seeded) await b.commit();
      }

      if (seeded > 0) {
        setSeedMsg(`Synced ${seeded} participant${seeded > 1 ? "s" : ""} ${stageIndex === 0 ? "from Applicants" : "from previous stage"}.`);
        await loadParticipants();
      }
    };
    trySeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, stageId, stageIndex, canManage, job]);

  // derived
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const mSearch =
        !term ||
        (r.name || "").toLowerCase().includes(term) ||
        (r.email || "").toLowerCase().includes(term);
      const mStatus = statusFilter === "all" ? true : (r.status || "pending") === statusFilter;
      return mSearch && mStatus;
    });
  }, [rows, search, statusFilter]);

  const counts = useMemo(() => {
    const total = rows.length;
    const qualified = rows.filter((r) => r.status === "qualified").length;
    const rejected = rows.filter((r) => r.status === "rejected").length;
    const pending = total - qualified - rejected;
    return { total, pending, qualified, rejected };
  }, [rows]);

  // publish toggle (admin only)
  const togglePublish = async () => {
    if (!canPublish || stageIndex < 0 || !job) return;
    try {
      const stages = Array.isArray(job.stages) ? job.stages.slice() : [];
      const s = stages[stageIndex] || {};
      stages[stageIndex] = { ...s, published: !published, updatedAt: new Date() };
      await updateDoc(doc(db, "jobs", jobId), { stages });
      setJob({ ...job, stages });
      setPublished(!published);
    } catch (e) {
      console.error("Publish failed:", e);
      alert("Could not update publish state.");
    }
  };

  // propagation to next stage
  const propagateToNext = async (row, newStatus) => {
    if (!nextStageId) return;
    const nextRef = doc(stageStudentsColl(jobId, nextStageId), row.id);
    if (newStatus === "qualified") {
      await setDoc(nextRef, {
        email: row.email, name: row.name || "", status: "pending",
        addedAt: serverTimestamp(), source: stageId,
      }, { merge: true });
    } else {
      await deleteDoc(nextRef).catch(() => {});
    }
  };

  const changeStatus = async (row, newStatusRaw) => {
    if (!canManage) return;
    const newStatus = normalizeStatus(newStatusRaw);
    try {
      await updateDoc(doc(stageStudentsColl(jobId, stageId), row.id), {
        status: newStatus, updatedAt: serverTimestamp(),
      });
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status: newStatus } : r)));
      await propagateToNext({ ...row }, newStatus);
    } catch (e) {
      console.error("Failed to update status:", e);
      alert("Could not update status.");
    }
  };

  const removeRow = async (row) => {
    if (!canManage) return;
    if (!confirm(`Remove ${row.email} from this stage?`)) return;
    try {
      await deleteDoc(doc(stageStudentsColl(jobId, stageId), row.id));
      setRows((list) => list.filter((r) => r.id !== row.id));
      await deleteDoc(doc(stageStudentsColl(jobId, nextStageId || "_"), row.id)).catch(() => {});
    } catch (e) {
      console.error("Remove failed:", e);
      alert("Could not remove.");
    }
  };

  // manual add (admin & recruiter)
  const addManual = async () => {
    const email = (newEmail || "").toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Enter a valid email."); return;
    }
    setAdding(true);
    try {
      await setDoc(doc(stageStudentsColl(jobId, stageId), emailKey(email)), {
        name: newName.trim(), email, status: "pending",
        addedAt: serverTimestamp(), source: "manual",
      }, { merge: true });
      setNewEmail(""); setNewName("");
      await loadParticipants();
    } catch (e) {
      console.error("Add failed:", e);
      alert("Could not add.");
    } finally {
      setAdding(false);
    }
  };

  // excel upload (recruiter only)
  const onUploadExcel = async (e) => {
    if (!canUploadExcel) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const updates = [];
      for (const row of json) {
        const email = String(row.email || row.Email || row["Email Address"] || "").toLowerCase().trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
        const name = String(row.name || row.Name || "").trim();
        const status = normalizeStatus(row.status || row.Status || "qualified"); // default qualified
        updates.push({ email, name, status });
      }

      for (let i = 0; i < updates.length; i += 400) {
        const slice = updates.slice(i, i + 400);
        const b = writeBatch(db);
        for (const u of slice) {
          const id = emailKey(u.email);
          b.set(doc(stageStudentsColl(jobId, stageId), id), {
            email: u.email, name: u.name || "", status: u.status,
            addedAt: serverTimestamp(), source: "upload",
          }, { merge: true });
          if (nextStageId && u.status === "qualified") {
            b.set(doc(stageStudentsColl(jobId, nextStageId), id), {
              email: u.email, name: u.name || "", status: "pending",
              addedAt: serverTimestamp(), source: stageId,
            }, { merge: true });
          }
        }
        await b.commit();
      }

      await loadParticipants();
      alert(`Imported ${updates.length} row(s).`);
      e.target.value = "";
    } catch (err) {
      console.error("Excel parse failed:", err);
      alert("Upload failed. Make sure columns are: email, name, status.");
    } finally {
      setUploading(false);
    }
  };

  // loading / hidden for students when not published
  if (loadingMeta) {
    return (
      <div className="recruiter-page"><div className="recruiter-wrap">
        <div className="loading-spinner"><div className="spinner"></div> Loading…</div>
      </div></div>
    );
  }

  if (!job || !stage) {
    return (
      <div className="recruiter-page"><div className="recruiter-wrap">
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">Stage not found</div>
          <button className="rec-btn" onClick={() => navigate(basePath)}>← Back to Job</button>
        </div>
      </div></div>
    );
  }

  if (role === "student" && !published) {
    return (
      <div className="recruiter-page"><div className="recruiter-wrap">
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">Stage not available</div>
          <div className="empty-text">This stage has not been published yet.</div>
          <button className="rec-btn" onClick={() => navigate("/student/applications")}>← Back</button>
        </div>
      </div></div>
    );
  }

  const title = stage.title || "Stage";

  return (
    <div className="recruiter-page">
      <div className="recruiter-wrap">
        <div className="header-top" style={{ marginBottom: 12 }}>
          <button className="rec-btn rec-btn-ghost" onClick={() => navigate(basePath)}>← Back to Job</button>
        </div>

        <div className="stage-detail-card">
          <div className="stage-detail-header">
            <h1 className="rec-title">{title}</h1>
            <div className="stage-detail-chips">
              <span className="stage-chip">Total: {counts.total}</span>
              <span className="stage-chip chip-done">Qualified: {counts.qualified}</span>
              <span className="stage-chip chip-pending">Pending: {counts.pending}</span>
              <span className="stage-chip" style={{ background: "#3f1b1b", borderColor: "#7f1d1d", color: "#fecaca" }}>
                Rejected: {counts.rejected}
              </span>
              <span className={`pub-chip ${published ? "pub-on" : "pub-off"}`} title="Visibility for students">
                {published ? "Published" : "Hidden"}
              </span>
              {canPublish && (
                <button className={`rec-btn-sm ${published ? "rec-btn-outline" : "rec-btn-success"}`} onClick={togglePublish}>
                  {published ? "Unpublish" : "Publish"}
                </button>
              )}
            </div>
          </div>

          {seedMsg && (
            <div className="success-banner" style={{ marginBottom: 12 }}>
              <span className="success-icon">✅</span>
              {seedMsg}
            </div>
          )}

          {/* Student's own status view */}
          {role === "student" && (
            <div className="applicant-detail" style={{ marginBottom: 12 }}>
              {myStatusLoading ? (
                <div>Loading your status…</div>
              ) : myStageStatus ? (
                <div>
                  <strong>Your status in this stage:</strong>{" "}
                  <span className={`stage-chip ${myStageStatus === "qualified" ? "chip-done" : myStageStatus === "pending" ? "chip-pending" : ""}`}>
                    {myStageStatus}
                  </span>
                </div>
              ) : (
                <div>You are not part of this stage.</div>
              )}
            </div>
          )}

          {/* Controls (recruiter/admin only) */}
          {role !== "student" && (
            <>
              <div className="table-toolbar">
                <input
                  className="job-input"
                  placeholder="Search name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="job-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ minWidth: 160 }}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="qualified">Qualified</option>
                  <option value="rejected">Rejected</option>
                </select>

                {canUploadExcel && (
                  <label className={`rec-btn ${uploading ? "disabled" : ""}`} style={{ marginLeft: "auto", cursor: "pointer" }}>
                    📤 Upload Excel
                    <input type="file" accept=".xlsx,.xls" onChange={onUploadExcel} style={{ display: "none" }} />
                  </label>
                )}
              </div>

              {/* Manual add */}
              {canManage && (
                <div className="shortlist-row" style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    className="job-input"
                    placeholder="Name (optional)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <input
                    type="email"
                    className="job-input"
                    placeholder="student@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <button className="rec-btn-sm" onClick={addManual} disabled={adding || !newEmail}>
                    {adding ? "Adding…" : "Add"}
                  </button>
                </div>
              )}

              {/* Table */}
              <div className="table-wrap">
                <table className="rec-table">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th style={{ width: 220 }}>Status</th>
                      {canManage && <th style={{ width: 80 }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRows ? (
                      <tr>
                        <td colSpan={canManage ? 5 : 4}><div className="rec-info">Loading participants…</div></td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={canManage ? 5 : 4}><div className="rec-info">No matching participants.</div></td>
                      </tr>
                    ) : (
                      filtered.map((r, idx) => (
                        <tr key={r.id}>
                          <td>{idx + 1}</td>
                          <td>{r.name || "—"}</td>
                          <td>{r.email}</td>
                          <td>
                            {canManage ? (
                              <select
                                className="job-select"
                                value={r.status || "pending"}
                                onChange={(e) => changeStatus(r, e.target.value)}
                              >
                                {STATUS_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            ) : (
                              <span className={`stage-chip ${r.status === "qualified" ? "chip-done" : r.status === "pending" ? "chip-pending" : ""}`}>
                                {r.status || "pending"}
                              </span>
                            )}
                          </td>
                          {canManage && (
                            <td>
                              <button className="rec-btn-sm rec-btn-danger" onClick={() => removeRow(r)}>Remove</button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="form-actions">
            <button className="rec-btn rec-btn-outline" onClick={() => navigate(basePath)}>Back to Job</button>
          </div>
        </div>
      </div>
    </div>
  );
}