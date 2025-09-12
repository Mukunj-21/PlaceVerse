// src/pages/NewRecruiter.jsx
// If you keep this file at src/pages/admin/NewRecruiter.jsx,
// change imports of AppHeader/db to "../../components/AppHeader" and "../../firebase".

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js"; // ← if placed under /admin, change to "../../firebase"
import AppHeader from "../../components/AppHeader.jsx"; // ← if placed under /admin, change to "../../components/AppHeader.jsx"
import "/src/styles/Admin.css"; // optional: styles used by admin forms

export default function NewRecruiter() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [org, setOrg] = useState({
    orgName: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    yearEstablished: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    notes: "",
  });

  // Login credentials (email defaults to org email; editable)
  const [cred, setCred] = useState({
    loginEmail: "",
    password: "",
    confirm: "",
  });

  // keep login email in sync when org.email changes unless user edits it
  useMemo(() => {
    if (!cred.loginEmail) setCred((c) => ({ ...c, loginEmail: org.email }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.email]);

  const passwordScore = useMemo(() => {
    const p = cred.password || "";
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score; // 0..4
  }, [cred.password]);

  const genPassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*?";
    let out = "";
    for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
    setCred((c) => ({ ...c, password: out, confirm: out }));
  };

  const validate = () => {
    if (!org.orgName.trim()) return "Organisation name is required.";
    if (!cred.loginEmail.trim()) return "Login email is required.";
    if (!/^\S+@\S+\.\S+$/.test(cred.loginEmail)) return "Enter a valid email.";
    if (passwordScore < 3) return "Password is too weak (min 8 chars incl. number & symbol).";
    if (cred.password !== cred.confirm) return "Passwords do not match.";
    const y = Number(org.yearEstablished);
    if (org.yearEstablished && (isNaN(y) || y < 1800 || y > new Date().getFullYear()))
      return "Year of establishment looks invalid.";
    return "";
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) return setError(v);

    setSaving(true);
    try {
      // --- use SECONDARY auth so admin stays logged in ---
      const primary = getApp(); // default app from src/firebase.js
      const opts = primary.options;
      const secondary =
        getApps().find((a) => a.name === "Secondary") || initializeApp(opts, "Secondary");
      const secondaryAuth = getAuth(secondary);

      // 1) Create the new recruiter user in Auth
      const userCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        cred.loginEmail.trim(),
        cred.password
      );
      const { uid, email } = userCred.user;

      // 2) Create Recruiter profile (Firestore)
      await setDoc(doc(db, "recruiters", uid), {
        uid,
        email,
        orgName: org.orgName.trim(),
        contactName: org.contactName.trim(),
        phone: org.phone.trim(),
        website: org.website.trim(),
        yearEstablished: org.yearEstablished ? Number(org.yearEstablished) : null,
        address: org.address.trim(),
        city: org.city.trim(),
        state: org.state.trim(),
        country: org.country.trim(),
        notes: org.notes.trim(),
        role: "recruiter",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 3) Mirror in /users for a unified user list
      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          email,
          name: org.contactName || org.orgName,
          role: "recruiter",
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 4) Sign out secondary (keep admin session untouched)
      await signOut(secondaryAuth);

      alert("Recruiter account created successfully 🎉");
      navigate("/admin"); // back to Admin dashboard
    } catch (err) {
      console.error(err);
      let msg = err?.code || "Failed to create recruiter.";
      if (err?.code === "auth/email-already-in-use") msg = "Email already in use.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <AppHeader />
      <form className="admin-card recruiter-form" onSubmit={handleCreate}>
        <div className="form-header">
          <h1 className="admin-title">New Recruiter</h1>
          <div className="actions">
            <button type="button" className="job-btn-ghost" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="job-btn" disabled={saving}>
              {saving ? "Creating..." : "Create Recruiter"}
            </button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Organisation Details */}
        <section className="form-section">
          <h2 className="section-title">Organisation details</h2>
          <div className="grid-2">
            <div className="field">
              <label>Name of organisation *</label>
              <input
                className="input"
                value={org.orgName}
                onChange={(e) => setOrg({ ...org, orgName: e.target.value })}
                placeholder="e.g., Primathon Technology"
                required
              />
            </div>
            <div className="field">
              <label>Contact person</label>
              <input
                className="input"
                value={org.contactName}
                onChange={(e) => setOrg({ ...org, contactName: e.target.value })}
                placeholder="e.g., Snigdha Saha"
              />
            </div>
            <div className="field">
              <label>E-mail *</label>
              <input
                type="email"
                className="input"
                value={org.email}
                onChange={(e) => setOrg({ ...org, email: e.target.value })}
                placeholder="hr@company.com"
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                className="input"
                value={org.phone}
                onChange={(e) => setOrg({ ...org, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="field">
              <label>Website</label>
              <input
                className="input"
                value={org.website}
                onChange={(e) => setOrg({ ...org, website: e.target.value })}
                placeholder="https://company.com"
              />
            </div>
            <div className="field">
              <label>Year of establishment</label>
              <input
                className="input"
                value={org.yearEstablished}
                onChange={(e) => setOrg({ ...org, yearEstablished: e.target.value })}
                placeholder="2016"
              />
            </div>
            <div className="field">
              <label>Address</label>
              <input
                className="input"
                value={org.address}
                onChange={(e) => setOrg({ ...org, address: e.target.value })}
                placeholder="Street, Area"
              />
            </div>
            <div className="field">
              <label>City</label>
              <input
                className="input"
                value={org.city}
                onChange={(e) => setOrg({ ...org, city: e.target.value })}
                placeholder="Noida"
              />
            </div>
            <div className="field">
              <label>State</label>
              <input
                className="input"
                value={org.state}
                onChange={(e) => setOrg({ ...org, state: e.target.value })}
                placeholder="Uttar Pradesh"
              />
            </div>
            <div className="field">
              <label>Country</label>
              <input
                className="input"
                value={org.country}
                onChange={(e) => setOrg({ ...org, country: e.target.value })}
                placeholder="India"
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Notes</label>
              <textarea
                className="input"
                rows={3}
                value={org.notes}
                onChange={(e) => setOrg({ ...org, notes: e.target.value })}
                placeholder="Any special instructions…"
              />
            </div>
          </div>
        </section>

        {/* Credentials */}
        <section className="form-section">
          <h2 className="section-title">Login credentials</h2>
          <div className="grid-2">
            <div className="field">
              <label>Login email *</label>
              <input
                type="email"
                className="input"
                value={cred.loginEmail}
                onChange={(e) => setCred({ ...cred, loginEmail: e.target.value })}
                placeholder="recruiter@company.com"
                required
              />
              <div className="helper">This will be used by the recruiter to sign in.</div>
            </div>

            <div className="field">
              <label>Password *</label>
              <div className="password-row">
                <input
                  type="text"
                  className="input"
                  value={cred.password}
                  onChange={(e) => setCred({ ...cred, password: e.target.value })}
                  placeholder="Strong password"
                  required
                />
                <button type="button" className="mini-btn" onClick={genPassword}>
                  Generate
                </button>
              </div>
              <div className="strength">
                Strength:
                <span className={`dot ${passwordScore > 0 ? "on" : ""}`} />
                <span className={`dot ${passwordScore > 1 ? "on" : ""}`} />
                <span className={`dot ${passwordScore > 2 ? "on" : ""}`} />
                <span className={`dot ${passwordScore > 3 ? "on" : ""}`} />
              </div>
            </div>

            <div className="field">
              <label>Confirm password *</label>
              <input
                type="text"
                className="input"
                value={cred.confirm}
                onChange={(e) => setCred({ ...cred, confirm: e.target.value })}
                placeholder="Re-enter password"
                required
              />
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
