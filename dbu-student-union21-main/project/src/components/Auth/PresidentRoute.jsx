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

  // Dedicated President & SuperAdmin credentials
  const allowedUsernames = ["dbu10101020", "dbu10101030"];
  const userIdentifier = user ? user.studentId || user.username || "" : "";

  const isExplicitPresident =
    user &&
    (user.role === "president" ||
      user.role === "council_president" ||
      user.role === "electoral_admin" ||
      user.role === "asmerach_committee" ||
      user.role === "system_admin" ||
      allowedUsernames.includes(userIdentifier));

  // Explicitly DENY if user is a club admin / coordinator / leader or associated with a club
  const isClubUser =
    user &&
    (user.role === "club_admin" ||
      user.role === "clubs_coordinator" ||
      user.role === "club_coordinator" ||
      user.role === "club_leader" ||
      Boolean(user.clubId) ||
      Boolean(user.club) ||
      user.username === "dbu10101040" ||
      Boolean(user.name && user.name.toLowerCase().includes("yirga")) ||
      Boolean(user.username && user.username.toLowerCase().includes("yirga")));

  if (!isExplicitPresident || isClubUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
