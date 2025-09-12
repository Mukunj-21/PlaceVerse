// src/pages/admin/NewRecruiter.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../firebase.js";
import AppHeader from "../../components/AppHeader.jsx";
import "/src/styles/Admin.css";

export default function NewRecruiter() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  
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

  const [cred, setCred] = useState({
    loginEmail: "",
    password: "",
    confirm: "",
  });

  // Auto-sync login email with org email unless manually edited
  useMemo(() => {
    if (!cred.loginEmail && org.email) {
      setCred((c) => ({ ...c, loginEmail: org.email }));
    }
  }, [org.email, cred.loginEmail]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const p = cred.password || "";
    let score = 0;
    let checks = {
      length: p.length >= 8,
      upper: /[A-Z]/.test(p),
      number: /[0-9]/.test(p),
      special: /[^A-Za-z0-9]/.test(p)
    };
    
    score = Object.values(checks).filter(Boolean).length;
    
    return {
      score,
      checks,
      label: score < 2 ? 'Weak' : score < 3 ? 'Fair' : score < 4 ? 'Good' : 'Strong',
      color: score < 2 ? '#dc2626' : score < 3 ? '#d97706' : score < 4 ? '#059669' : '#16a34a'
    };
  }, [cred.password]);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*?";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    setCred((c) => ({ ...c, password, confirm: password }));
  };

  const validate = () => {
    if (!org.orgName.trim()) return "Organization name is required.";
    if (!cred.loginEmail.trim()) return "Login email is required.";
    if (!/^\S+@\S+\.\S+$/.test(cred.loginEmail)) return "Enter a valid email address.";
    if (passwordStrength.score < 3) return "Password must be stronger (include uppercase, number, and special character).";
    if (cred.password !== cred.confirm) return "Passwords do not match.";
    
    const year = Number(org.yearEstablished);
    if (org.yearEstablished && (isNaN(year) || year < 1800 || year > new Date().getFullYear())) {
      return "Please enter a valid year of establishment.";
    }
    
    return "";
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    
    try {
      // Use secondary auth to avoid affecting admin session
      const primary = getApp();
      const secondary = getApps().find((a) => a.name === "Secondary") || 
                      initializeApp(primary.options, "Secondary");
      const secondaryAuth = getAuth(secondary);

      // Create user account
      const userCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        cred.loginEmail.trim(),
        cred.password
      );
      
      const { uid, email } = userCred.user;

      // Create recruiter profile
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

      // Mirror in users collection
      await setDoc(doc(db, "users", uid), {
        uid,
        email,
        name: org.contactName || org.orgName,
        role: "recruiter",
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Sign out secondary auth
      await signOut(secondaryAuth);

      setShowSuccess(true);
      setTimeout(() => {
        navigate("/admin");
      }, 2000);

    } catch (err) {
      console.error(err);
      let errorMessage = "Failed to create recruiter account.";
      
      if (err?.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already registered.";
      } else if (err?.code === "auth/weak-password") {
        errorMessage = "Password is too weak.";
      } else if (err?.code === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const updateOrgField = (field, value) => {
    setOrg(prev => ({ ...prev, [field]: value }));
  };

  const updateCredField = (field, value) => {
    setCred(prev => ({ ...prev, [field]: value }));
  };

  if (showSuccess) {
    return (
      <div className="admin-page">
        <AppHeader />
        <div className="admin-container">
          <div className="success-screen">
            <div className="success-icon-large">✅</div>
            <h1 className="success-title">Recruiter Created Successfully!</h1>
            <p className="success-message">
              The recruiter account has been created and is ready to use. 
              Redirecting to admin dashboard...
            </p>
            <div className="success-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <AppHeader />
      
      <div className="admin-container">
        {/* Header */}
        <div className="recruiter-form-header">
          <button 
            className="admin-btn admin-btn-ghost"
            onClick={() => navigate("/admin")}
            disabled={saving}
          >
            ← Back to Dashboard
          </button>
          
          <div className="form-title-section">
            <h1 className="admin-title">Create New Recruiter</h1>
            <p className="admin-subtitle">
              Set up a new recruiter account with company details and login credentials
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="recruiter-form-card">
          {error && (
            <div className="admin-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="recruiter-form">
            {/* Organization Details Section */}
            <div className="form-section">
              <div className="section-header">
                <h2 className="section-title">Organization Details</h2>
                <div className="section-divider"></div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="orgName" className="field-label">
                    Organization Name <span className="required">*</span>
                  </label>
                  <input
                    id="orgName"
                    type="text"
                    value={org.orgName}
                    onChange={(e) => updateOrgField('orgName', e.target.value)}
                    className="admin-input"
                    placeholder="e.g., TechCorp Solutions"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="contactName" className="field-label">
                    Contact Person
                  </label>
                  <input
                    id="contactName"
                    type="text"
                    value={org.contactName}
                    onChange={(e) => updateOrgField('contactName', e.target.value)}
                    className="admin-input"
                    placeholder="e.g., John Smith"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="orgEmail" className="field-label">
                    Company Email <span className="required">*</span>
                  </label>
                  <input
                    id="orgEmail"
                    type="email"
                    value={org.email}
                    onChange={(e) => updateOrgField('email', e.target.value)}
                    className="admin-input"
                    placeholder="contact@company.com"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="phone" className="field-label">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={org.phone}
                    onChange={(e) => updateOrgField('phone', e.target.value)}
                    className="admin-input"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="website" className="field-label">
                    Website
                  </label>
                  <input
                    id="website"
                    type="url"
                    value={org.website}
                    onChange={(e) => updateOrgField('website', e.target.value)}
                    className="admin-input"
                    placeholder="https://company.com"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="yearEstablished" className="field-label">
                    Year Established
                  </label>
                  <input
                    id="yearEstablished"
                    type="number"
                    value={org.yearEstablished}
                    onChange={(e) => updateOrgField('yearEstablished', e.target.value)}
                    className="admin-input"
                    placeholder="2020"
                    min="1800"
                    max={new Date().getFullYear()}
                  />
                </div>

                <div className="form-field full-width">
                  <label htmlFor="address" className="field-label">
                    Address
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={org.address}
                    onChange={(e) => updateOrgField('address', e.target.value)}
                    className="admin-input"
                    placeholder="Street address"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="city" className="field-label">
                    City
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={org.city}
                    onChange={(e) => updateOrgField('city', e.target.value)}
                    className="admin-input"
                    placeholder="New York"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="state" className="field-label">
                    State/Province
                  </label>
                  <input
                    id="state"
                    type="text"
                    value={org.state}
                    onChange={(e) => updateOrgField('state', e.target.value)}
                    className="admin-input"
                    placeholder="New York"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="country" className="field-label">
                    Country
                  </label>
                  <select
                    id="country"
                    value={org.country}
                    onChange={(e) => updateOrgField('country', e.target.value)}
                    className="admin-select"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-field full-width">
                  <label htmlFor="notes" className="field-label">
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    value={org.notes}
                    onChange={(e) => updateOrgField('notes', e.target.value)}
                    className="admin-textarea"
                    placeholder="Any special instructions or notes..."
                    rows="3"
                  />
                </div>
              </div>
            </div>

            {/* Login Credentials Section */}
            <div className="form-section">
              <div className="section-header">
                <h2 className="section-title">Login Credentials</h2>
                <div className="section-divider"></div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="loginEmail" className="field-label">
                    Login Email <span className="required">*</span>
                  </label>
                  <input
                    id="loginEmail"
                    type="email"
                    value={cred.loginEmail}
                    onChange={(e) => updateCredField('loginEmail', e.target.value)}
                    className="admin-input"
                    placeholder="recruiter@company.com"
                    required
                  />
                  <div className="field-help">
                    This email will be used to sign in to the recruiter portal
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="password" className="field-label">
                    Password <span className="required">*</span>
                  </label>
                  <div className="password-input-group">
                    <input
                      id="password"
                      type="text"
                      value={cred.password}
                      onChange={(e) => updateCredField('password', e.target.value)}
                      className="admin-input"
                      placeholder="Enter strong password"
                      required
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="admin-btn admin-btn-ghost password-generate-btn"
                    >
                      Generate
                    </button>
                  </div>
                  
                  {cred.password && (
                    <div className="password-strength">
                      <div className="strength-bar">
                        <div 
                          className="strength-fill"
                          style={{ 
                            width: `${(passwordStrength.score / 4) * 100}%`,
                            backgroundColor: passwordStrength.color
                          }}
                        ></div>
                      </div>
                      <div className="strength-info">
                        <span 
                          className="strength-label"
                          style={{ color: passwordStrength.color }}
                        >
                          {passwordStrength.label}
                        </span>
                        <div className="strength-checks">
                          <span className={passwordStrength.checks.length ? 'check-pass' : 'check-fail'}>
                            8+ chars
                          </span>
                          <span className={passwordStrength.checks.upper ? 'check-pass' : 'check-fail'}>
                            Uppercase
                          </span>
                          <span className={passwordStrength.checks.number ? 'check-pass' : 'check-fail'}>
                            Number
                          </span>
                          <span className={passwordStrength.checks.special ? 'check-pass' : 'check-fail'}>
                            Special
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="confirmPassword" className="field-label">
                    Confirm Password <span className="required">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    type="text"
                    value={cred.confirm}
                    onChange={(e) => updateCredField('confirm', e.target.value)}
                    className="admin-input"
                    placeholder="Re-enter password"
                    required
                  />
                  {cred.confirm && cred.password !== cred.confirm && (
                    <div className="field-error">Passwords do not match</div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => navigate("/admin")}
                disabled={saving}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={saving || !org.orgName || !cred.loginEmail || passwordStrength.score < 3}
              >
                {saving ? (
                  <>
                    <div className="btn-spinner"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    Create Recruiter
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
