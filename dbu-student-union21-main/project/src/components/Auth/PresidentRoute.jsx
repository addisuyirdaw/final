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

  // Dedicated Union President & SuperAdmin credentials
  const allowedUsernames = ["dbu10101020", "dbu10101030"];
  const userIdentifier = (user ? user.studentId || user.username || "" : "").toLowerCase().trim();

  // Dedicated Union President (dbu10101020), Super Admin (dbu10101030), or Electoral Committee
  const isDedicatedPresident = userIdentifier === "dbu10101020";
  const isDedicatedSuperAdmin = userIdentifier === "dbu10101030";
  const isElectoralCommittee = user && (user.role === "electoral_admin" || user.role === "asmerach_committee");

  // All 17 club coordinators/representatives hold the generic role 'president' in the database,
  // so any user with role 'president' whose username is NOT dbu10101020 is a Club President!
  const isClubUser =
    user &&
    (!allowedUsernames.includes(userIdentifier) && (
      (user.role === "president" || user.role === "council_president") ||
      user.role === "club_admin" ||
      user.role === "clubs_coordinator" ||
      user.role === "club_coordinator" ||
      user.role === "club_leader" ||
      user.role === "CLUB_ADMIN" ||
      user.role === "clubAdmin" ||
      user.role === "CLUB_REP" ||
      user.role === "club_rep" ||
      Boolean(user.clubId) ||
      Boolean(user.club) ||
      user.username === "dbu10101040" ||
      Boolean(user.name && user.name.toLowerCase().includes("yirga")) ||
      Boolean(user.username && user.username.toLowerCase().includes("yirga"))
    ));

  const isAuthorizedOfficial = (isDedicatedPresident || isDedicatedSuperAdmin || isElectoralCommittee) && !isClubUser;

  if (!isAuthorizedOfficial) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
