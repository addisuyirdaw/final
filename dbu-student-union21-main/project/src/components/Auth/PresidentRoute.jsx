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

  // Grant access strictly to the Student Union President role
  const isPresident =
    user &&
    (user.role === "president" ||
      user.role === "council_president");

  if (!isPresident) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
