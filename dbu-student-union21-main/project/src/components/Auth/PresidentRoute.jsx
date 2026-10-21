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

  // Grant access strictly to the Student Union President (dbu10101020)
  const isOtherAdmin =
    user &&
    (user.username === "dbu10101030" ||
      user.username === "dbu10101011" ||
      user.username === "dbu10101040" ||
      (user.role === "admin" && user.username !== "dbu10101020") ||
      (user.role === "system_admin" && user.username !== "dbu10101020"));

  const isPresident =
    user &&
    (user.username === "dbu10101020" ||
      user.role === "president" ||
      user.role === "council_president") &&
    !isOtherAdmin;

  if (!isPresident) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
