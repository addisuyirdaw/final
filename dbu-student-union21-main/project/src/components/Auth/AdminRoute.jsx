import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function AdminRoute({ children }) {
  const { user } = useAuth();

  const isAdministrator =
    user &&
    (user.isAdmin === true ||
      ["admin", "system_admin", "president", "academic_affairs", "clubs_coordinator"].includes(user.role));

  if (!isAdministrator) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}