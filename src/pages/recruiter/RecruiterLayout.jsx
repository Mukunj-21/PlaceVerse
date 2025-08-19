// src/pages/recruiter/RecruiterLayout.jsx
import { Link, Outlet } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import "../styles/RecruiterLayout.css"; // Assuming you have some styles for the recruiter layout

export default function RecruiterLayout() {
  const doLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="recruiter-layout">
      {/* NAVBAR */}
      <header className="recruiter-navbar">
        <div className="brand">PlaceVerse – Recruiter</div>
        <nav>
          <Link to="/recruiter/profile">Profile</Link>
          <Link to="/recruiter/jobs">Jobs</Link>
          <Link to="/recruiter/applicants">Applicants</Link>
        </nav>
        <button className="logout-btn" onClick={doLogout}>Logout</button>
      </header>

      {/* PAGE CONTENT */}
      <main className="recruiter-main">
        <Outlet />
      </main>
    </div>
  );
}
