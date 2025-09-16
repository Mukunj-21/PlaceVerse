// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// Public
import Login from "./pages/login/Login.jsx";
import Reset from "./pages/login/Reset.jsx";
import FinishEmailLink from "./pages/login/FinishEmailLink.jsx";

// Shared/Guards
import NotAuthorized from "./pages/login/NotAuthorized.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminJobs from "./pages/admin/AdminJobs.jsx";
import NewRecruiter from "./pages/admin/NewRecruiter.jsx";
import AdminJobDetail from "./pages/admin/AdminJobDetail.jsx"; // ✅ NEW

// Recruiter (nested)
import RecruiterLayout from "./pages/recruiter/RecruiterLayout.jsx";
import RecruiterProfile from "./pages/recruiter/RecruiterProfile";
import RecruiterJobs from "./pages/recruiter/RecruiterJobs";
import RecruiterApplicants from "./pages/recruiter/RecruiterApplicants";
import JobDetail from "./pages/recruiter/JobDetail.jsx";
import JobApplicants from "./pages/recruiter/JobApplicants.jsx";
import StageDetail from "./pages/recruiter/StageDetail"; // role-aware (admin/recruiter/student)

// Student
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import StudentProfile from "./pages/student/StudentProfile.jsx";
import StudentApplications from "./pages/student/StudentApplications.jsx";
import StudentNotifications from "./pages/student/StudentNotifications.jsx";

export default function App() {
  return (
    <Routes>
      {/* Default → go to /login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset" element={<Reset />} />
      <Route path="/finish-signin" element={<FinishEmailLink />} />

      {/* ===================== ADMIN ===================== */}
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
      {/* Admin: Job Detail (timeline + stages) */}
      <Route
        path="/admin/jobs/:jobId"
        element={
          <ProtectedRoute allow={["admin"]}>
            <AdminJobDetail />
          </ProtectedRoute>
        }
      />
      {/* Admin: Applicants for a specific job */}
      <Route
        path="/admin/jobs/:jobId/applications"
        element={
          <ProtectedRoute allow={["admin"]}>
            <JobApplicants />
          </ProtectedRoute>
        }
      />
      {/* Admin: Stage Detail (role-aware component) */}
      <Route
        path="/admin/jobs/:jobId/stage/:stageId"
        element={
          <ProtectedRoute allow={["admin"]}>
            <StageDetail />
          </ProtectedRoute>
        }
      />

      {/* ===================== RECRUITER ===================== */}
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

      {/* Recruiter: Job Detail + Applicants */}
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
      {/* Recruiter: Stage Detail (role-aware) */}
      <Route
        path="/recruiter/jobs/:jobId/stage/:stageId"
        element={
          <ProtectedRoute allow={["recruiter"]}>
            <StageDetail />
          </ProtectedRoute>
        }
      />

      {/* ===================== STUDENT ===================== */}
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
      {/* Student: Stage Detail (read-only unless published) */}
      <Route
        path="/student/jobs/:jobId/stage/:stageId"
        element={
          <ProtectedRoute allow={["student"]}>
            <StageDetail />
          </ProtectedRoute>
        }
      />

      {/* Misc */}
      <Route path="/not-authorized" element={<NotAuthorized />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
