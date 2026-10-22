import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function PresidentRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Grant access strictly to President and System Admin (and Electoral Committee)
  const isBlocked =
    user &&
    (user.username === "yirga" ||
      user.username === "dbu10101040" ||
      user.role === "clubs_coordinator" ||
      user.role === "student");

  const isAuthorizedOfficial =
    user &&
    !isBlocked &&
    (user.username === "dbu10101020" ||
      user.username === "dbu10101030" ||
      user.role === "president" ||
      user.role === "system_admin" ||
      user.role === "council_president" ||
      user.role === "asmerach_committee");

  if (!isAuthorizedOfficial) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
