import { Outlet } from "react-router-dom";
import RecruiterNav from "../../components/RecruiterNavbar";

// This layout wraps all recruiter pages
export default function RecruiterLayout() {
  return (
    <div className="rec-layout">
      {/* Navbar at the top */}
      <RecruiterNav />

      {/* Nested recruiter page renders here */}
      <main className="rec-content">
        <Outlet />
      </main>
    </div>
  );
}
