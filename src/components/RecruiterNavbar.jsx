// src/components/RecruiterNavbar.jsx
// PURPOSE: Top navigation for recruiter pages

import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function RecruiterNavbar() {
  const navigate = useNavigate();

  const doLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <nav className="rec-navbar">
      <div className="rec-nav-left">
        <span className="rec-brand">Recruiter Portal</span>
        <NavLink to="/recruiter/profile" className="rec-link">
          Profile
        </NavLink>
        <NavLink to="/recruiter/jobs" className="rec-link">
          Jobs
        </NavLink>
        <NavLink to="/recruiter/applicants" className="rec-link">
          Applicants
        </NavLink>
      </div>
      <div className="rec-nav-right">
        <button onClick={doLogout} className="rec-logout">
          Logout
        </button>
      </div>
    </nav>
  );
}
