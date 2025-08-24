import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Reset from "./pages/Reset.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import NotAuthorized from "./pages/NotAuthorized.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// NEW imports for recruiter
import RecruiterLayout from "./pages/recruiter/RecruiterLayout.jsx";
import RecruiterProfile from "./pages/recruiter/RecruiterProfile";
import RecruiterJobs from "./pages/recruiter/RecruiterJobs";
import RecruiterApplicants from "./pages/recruiter/RecruiterApplicants";

// Student imports
import StudentDashboard from "./pages/StudentDashboard.jsx";
import StudentProfile from "./pages/StudentProfile.jsx";
import StudentApplications from "./pages/StudentApplications.jsx";
import StudentNotifications from "./pages/StudentNotifications.jsx";

// Job details + applicants
import JobDetail from "./pages/recruiter/JobDetail.jsx";
import JobApplicants from "./pages/recruiter/JobApplicants.jsx";

// adminjobs import
import AdminJobs from "./pages/AdminJobs.jsx";

export default function App() {
  return (
    <Routes>
      {/* default → go to /login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* public pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset" element={<Reset />} />

      {/* protected routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* student routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allow={["student"]}>
            <StudentDashboard />
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

      {/* recruiter parent route with nested pages */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute allow={["recruiter"]}>
            <RecruiterLayout />
          </ProtectedRoute>
        }
      >
        <Route path="profile" element={<RecruiterProfile />} />
        <Route path="jobs" element={<RecruiterJobs />} />
        <Route path="applicants" element={<RecruiterApplicants />} />
        <Route index element={<Navigate to="profile" replace />} />
      </Route>

      {/* job detail + applicants */}
      <Route path="/recruiter/jobs/:jobId" element={<JobDetail />} />
      <Route path="/recruiter/jobs/:jobId/applicants" element={<JobApplicants />} />

      {/* not authorized page */}
      <Route path="/not-authorized" element={<NotAuthorized />} />

      {/* catch-all → send to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
