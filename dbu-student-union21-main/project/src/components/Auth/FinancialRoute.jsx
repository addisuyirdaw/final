import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export const FINANCIAL_ROLES = [
  "admin",
  "system_admin",
  "clubs_coordinator",
  "president",
];

export function FinancialRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAuthorized =
    user.isAdmin === true ||
    FINANCIAL_ROLES.includes(user.role);

  if (!isAuthorized) {
    toast.error("Access restricted: Authorized administrative role required for Budget & Grants");
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default FinancialRoute;
