import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { Layout } from "./components/Layout/Layout";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { AdminRoute } from "./components/Auth/AdminRoute";
import { LoginForm } from "./components/Auth/LoginForm";
import { ForgotPassword } from "./components/Auth/ForgotPassword";
import { ResetPassword } from "./components/Auth/ResetPassword";
import { Home } from "./components/Pages/Home";
import { Clubs } from "./components/Pages/Clubs";
import { Elections } from "./components/Pages/Elections";
import { Services } from "./components/Pages/Services";
import { Latest } from "./components/Pages/Latest";
import { Complaints } from "./components/Pages/Complaints";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { AdminDashboard } from "./components/Admin/AdminDashboard";
import { About } from "./components/Pages/About";
import { Contact } from "./components/Pages/Contact";
import { ReportsInbox } from "./components/Pages/ReportsInbox";
import { CommunicationLog } from "./components/Pages/CommunicationLog";
import { CollaborationHub } from "./pages/CollaborationHub";
import RestrictedAccess from "./components/Pages/RestrictedAccess";
import ChatAssistant from "./components/ChatAssistant";
import { CarouselAdmin } from "./components/Pages/CarouselAdmin";
import { LeadershipManager } from "./components/Admin/LeadershipManager";
import { LeadershipProfile } from "./components/Pages/LeadershipProfile";
import { Executives } from "./components/Pages/Executives";
import { Union } from "./components/Pages/Union";
import { ServicesDirectory } from "./components/Pages/ServicesDirectory";
import { Dormitory } from "./components/Pages/Dormitory";
import { LeadershipDepartment } from "./components/Pages/LeadershipDepartment";
import { Profile } from "./components/Pages/Profile";
import { UserManagement } from "./components/Admin/UserManagement";
import "./index.css";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/contact"
            element={user?.isRestricted ? <Navigate to="/restricted" replace /> : (user ? <Navigate to="/dashboard" replace /> : <Contact />)}
          />

          {/* Auth Route */}
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginForm />
              )
            }
          />
          <Route
            path="/forgot-password"
            element={
              user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />
            }
          />
          <Route
            path="/reset-password/:resetToken"
            element={
              user ? <Navigate to="/dashboard" replace /> : <ResetPassword />
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/clubs" element={<Clubs />} />
          <Route path="/clubs/:id" element={<Clubs />} />

          <Route
            path="/elections"
            element={
              <ProtectedRoute>
                <Elections />
              </ProtectedRoute>
            }
          />

          <Route path="/services" element={<Services />} />

          <Route path="/latest" element={<Latest />} />

          <Route path="/complaints" element={<Complaints />} />

          <Route
            path="/reports-inbox"
            element={
              <ProtectedRoute>
                <ReportsInbox />
              </ProtectedRoute>
            }
          />

          <Route
            path="/collaboration"
            element={
              <ProtectedRoute>
                <CollaborationHub />
              </ProtectedRoute>
            }
          />

          <Route
            path="/communication-log"
            element={
              <ProtectedRoute>
                <CommunicationLog />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/carousel"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <CarouselAdmin />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/team"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <LeadershipManager />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/executives" element={<Executives />} />
          <Route path="/student-union" element={<Union />} />
          <Route path="/student-services" element={<ServicesDirectory />} />
          <Route path="/dormitory-management" element={<Dormitory />} />
          <Route path="/leadership/:departmentId" element={<LeadershipDepartment />} />
          <Route path="/profile/:id" element={<LeadershipProfile />} />
          <Route path="/restricted" element={user?.isRestricted ? <RestrictedAccess /> : <Navigate to="/" replace />} />
          <Route path="/blocked" element={<RestrictedAccess />} />

          {/* Fallback Route */}
          <Route
            path="*"
            element={
              user ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />
            }
          />
        </Routes>
      </Layout>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
        }}
      />
      <ChatAssistant />
    </Router>
  );
}

export function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;