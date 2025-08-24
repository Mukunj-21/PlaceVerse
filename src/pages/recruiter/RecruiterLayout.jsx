import { Link, Outlet, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import "../../styles/RecruiterLayout.css"; // correct import

export default function RecruiterLayout() {
  const location = useLocation();

  const doLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="rec-layout">
      {/* NAVBAR */}
      <header className="rec-nav">
        <div className="rec-brand">PlaceVerse – Recruiter</div>

        <nav className="rec-links">
          <Link
            to="/recruiter/profile"
            className={`rec-link ${
              location.pathname.includes("profile") ? "active" : ""
            }`}
          >
            Profile
          </Link>
          <Link
            to="/recruiter/jobs"
            className={`rec-link ${
              location.pathname.includes("jobs") ? "active" : ""
            }`}
          >
            Jobs
          </Link>
          <Link
            to="/recruiter/applicants"
            className={`rec-link ${
              location.pathname.includes("applicants") ? "active" : ""
            }`}
          >
            Applicants
          </Link>
        </nav>

        <button className="rec-logout" onClick={doLogout}>
          Logout
        </button>
      </header>

      {/* PAGE CONTENT */}
      <main className="rec-page">
        <Outlet />
      </main>
    </div>
  );
}
