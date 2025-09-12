// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// Public
import Login from "./pages/login/Login.jsx";
import Reset from "./pages/login/Reset.jsx";

// Shared/Guards
import NotAuthorized from "./pages/login/NotAuthorized.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminJobs from "./pages/admin/AdminJobs.jsx";
import NewRecruiter from "./pages/admin/NewRecruiter.jsx";

// Recruiter (nested)
import RecruiterLayout from "./pages/recruiter/RecruiterLayout.jsx";
import RecruiterProfile from "./pages/recruiter/RecruiterProfile";
import RecruiterJobs from "./pages/recruiter/RecruiterJobs";
import RecruiterApplicants from "./pages/recruiter/RecruiterApplicants";
import JobDetail from "./pages/recruiter/JobDetail.jsx";
import JobApplicants from "./pages/recruiter/JobApplicants.jsx";

// Student
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import StudentProfile from "./pages/student/StudentProfile.jsx";
import StudentApplications from "./pages/student/StudentApplications.jsx";
import StudentNotifications from "./pages/student/StudentNotifications.jsx";

// Optional: Finish email-link auth (create if using email-link sign-in)
import FinishEmailLink from "./pages/login/FinishEmailLink.jsx";

export default function App() {
  return (
    <Routes>
      {/* default → go to /login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* public */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset" element={<Reset />} />
      <Route path="/finish-signin" element={<FinishEmailLink />} />

      {/* admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/jobs"
        element={
          <ProtectedRoute allow={["admin"]}>
            <AdminJobs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/new-recruiter"
        element={
          <ProtectedRoute allow={["admin"]}>
            <NewRecruiter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/jobs/:jobId/applications"
        element={
          <ProtectedRoute allow={["admin"]}>
            <JobApplicants />
          </ProtectedRoute>
        }
      />

      {/* student */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allow={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile"
        element={
          <ProtectedRoute allow={["student"]}>
            <StudentProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/applications"
        element={
          <ProtectedRoute allow={["student"]}>
            <StudentApplications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/notifications"
        element={
          <ProtectedRoute allow={["student"]}>
            <StudentNotifications />
          </ProtectedRoute>
        }
      />

      {/* recruiter (nested) */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute allow={["recruiter"]}>
            <RecruiterLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<RecruiterProfile />} />
        <Route path="jobs" element={<RecruiterJobs />} />
        <Route path="applicants" element={<RecruiterApplicants />} />
      </Route>

      {/* recruiter job detail + applicants */}
      <Route
        path="/recruiter/jobs/:jobId"
        element={
          <ProtectedRoute allow={["recruiter"]}>
            <JobDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruiter/jobs/:jobId/applicants"
        element={
          <ProtectedRoute allow={["recruiter"]}>
            <JobApplicants />
          </ProtectedRoute>
        }
      />

      {/* misc */}
      <Route path="/not-authorized" element={<NotAuthorized />} />

      {/* catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
