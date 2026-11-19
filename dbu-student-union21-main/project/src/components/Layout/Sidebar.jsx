/** @format */
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Calendar,
  Building2,
  Vote,
  UserCheck,
  GraduationCap,
  HelpCircle,
  Landmark,
  Wallet,
  Award,
  ChevronLeft,
  ChevronRight,
  X,
  Bell,
  LogOut,
  Shield
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { NotificationBadge } from "./NotificationBadge";
import { NotificationDropdown } from "./NotificationDropdown";

export function Sidebar({
  isExpanded = true,
  setIsExpanded = () => {},
  isMobileOpen = false,
  setIsMobileOpen = () => {}
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const totalNotifications = Object.values(notifications || {}).reduce((a, b) => a + b, 0);

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsMobileOpen(false);
  };

  // Navigation Groups Definition
  const navigationGroups = [
    {
      group: "OVERVIEW",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Latest Announcements", href: "/latest", icon: Megaphone }
      ]
    },
    {
      group: "STUDENT LIFE",
      items: [
        { name: "Clubs & Organizations", href: "/clubs", icon: Users },
        { name: "Events", href: "/events", icon: Calendar },
        { name: "Cross-Campus Hub", href: "/cross-campus", icon: Building2 },
        { name: "Elections", href: "/elections", icon: Vote }
      ]
    },
    {
      group: "ACADEMICS & SUPPORT",
      items: [
        { name: "Attendance", href: "/attendance", icon: UserCheck },
        { name: "Transcript", href: "/transcript", icon: GraduationCap },
        { name: "Services", href: "/services", icon: HelpCircle }
      ]
    },
    {
      group: "ADMINISTRATION",
      items: [
        { name: "Union & Leadership", href: "/union", icon: Landmark },
        { name: "Budget", href: "/budget", icon: Wallet },
        { name: "Grants", href: "/grants", icon: Award }
      ]
    }
  ];

  // Helper to check active route
  const isItemActive = (href) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    if (href === "/union") {
      return location.pathname === "/union" || location.pathname === "/student-union";
    }
    return location.pathname === href || (href !== "/" && location.pathname.startsWith(href));
  };

  // User details & role calculation
  const userName = user?.name || "Clubs Admin";
  const userRole = user?.isAdmin
    ? "Admin"
    : user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Student";

  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CA";

  const canAccessAdminPanel = Boolean(
    user &&
      (user.role === "admin" ||
        user.role === "system_admin" ||
        user.isAdmin === true ||
        user.role === "clubs_coordinator") &&
      user.username !== "dbu10101020" &&
      user.role !== "president"
  );

  const canAccessPresident = Boolean(
    user &&
      (["dbu10101020", "dbu10101030"].includes((user.studentId || user.username || "").toLowerCase().trim()) ||
        user.role === "president" ||
        user.role === "council_president")
  );

  return (
    <>
      {/* ── Mobile Backdrop Overlay ── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 xl:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Fixed Sidebar Container (w-64 = 256px, w-16 = 64px) ── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200/90 shadow-sm transition-all duration-300 ease-in-out ${
          isMobileOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full xl:translate-x-0"
        } ${isExpanded ? "xl:w-64" : "xl:w-16"}`}
        aria-label="Sidebar Navigation"
      >
        {/* ── Sidebar Header: Branding & Toggle (Height: 64px) ── */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-slate-200/80 bg-slate-50/50 shrink-0">
          <Link
            to="/dashboard"
            onClick={() => setIsMobileOpen(false)}
            className={`flex items-center gap-3 overflow-hidden group focus:outline-hidden ${
              !isExpanded ? "justify-center w-full" : ""
            }`}
            title="CampusNexus Portal"
          >
            <img
              src="/image.png/dbu-logo.png"
              alt="CampusNexus DBU Logo"
              className="w-10 h-10 object-contain rounded-xl border border-sky-100 bg-white p-0.5 shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
            />
            {isExpanded && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <span className="text-base font-extrabold text-sky-900 tracking-tight leading-none truncate">
                  CampusNexus
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 truncate">
                  DBU Student Union
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse/Expand Toggle Button */}
          {isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="hidden xl:inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors focus:outline-hidden"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="xl:hidden inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-hidden"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Expand Button when Collapsed (Desktop only) ── */}
        {!isExpanded && (
          <div className="hidden xl:flex justify-center py-2 border-b border-slate-100 bg-slate-50/30">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="p-1 rounded-md text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Navigation Items List ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
          {navigationGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              {/* Group Heading */}
              {isExpanded ? (
                <div className="px-3 pt-2 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider select-none">
                  {group.group}
                </div>
              ) : (
                <div className="my-2 border-t border-slate-100 mx-2" title={group.group} />
              )}

              {/* Group Navigation Links */}
              {group.items.map((item) => {
                const active = isItemActive(item.href);
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    title={!isExpanded ? item.name : undefined}
                    className={`group relative flex items-center rounded-xl text-[13px] font-medium transition-all duration-150 ${
                      isExpanded ? "gap-3 px-3 py-2.5" : "justify-center w-10 h-10 mx-auto"
                    } ${
                      active
                        ? "bg-sky-600 text-white font-semibold shadow-xs shadow-sky-600/30"
                        : "text-slate-600 hover:text-sky-700 hover:bg-sky-50/80"
                    }`}
                  >
                    <IconComponent
                      className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                        active ? "text-white" : "text-slate-500 group-hover:text-sky-600"
                      }`}
                    />
                    {isExpanded && (
                      <span className="truncate flex-1 tracking-tight">
                        {item.name}
                      </span>
                    )}

                    {/* Active Indicator dot when collapsed */}
                    {!isExpanded && active && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Sidebar Bottom Section: User Profile & Actions ── */}
        <div className="border-t border-slate-200/90 bg-slate-50/80 p-2.5 shrink-0">
          {user && (
            <div className="space-y-2">
              {/* User Profile Card */}
              <div
                className={`flex items-center gap-2.5 p-1.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs ${
                  isExpanded ? "justify-start" : "justify-center"
                }`}
                title={`${userName} (${userRole})`}
              >
                {/* User Avatar */}
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={userName}
                    className="w-8 h-8 rounded-full object-cover border border-sky-200 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {userInitials}
                  </div>
                )}

                {isExpanded && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                      {userName}
                    </p>
                    <span className="inline-block mt-0.5 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 border border-sky-200/60">
                      {userRole}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Action Buttons */}
              {isExpanded ? (
                <div className="space-y-1 pt-0.5">
                  {canAccessAdminPanel && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMobileOpen(false)}
                      className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/70 transition-colors shadow-2xs"
                    >
                      <Shield className="w-3.5 h-3.5 text-sky-600" />
                      <span>Admin Panel</span>
                    </Link>
                  )}

                  {canAccessPresident && (
                    <Link
                      to="/president"
                      onClick={() => setIsMobileOpen(false)}
                      className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/70 transition-colors shadow-2xs"
                    >
                      <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                      <span>President Page</span>
                    </Link>
                  )}

                  <div className="flex items-center justify-between gap-1 pt-1">
                    {/* Notification Alerts */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-sky-700 hover:bg-slate-100 rounded-lg transition-colors relative"
                        title="Notifications"
                      >
                        <Bell className="w-4 h-4" />
                        <span className="text-[11px] font-semibold">Alerts</span>
                        {totalNotifications > 0 && (
                          <NotificationBadge count={totalNotifications} />
                        )}
                      </button>
                      <NotificationDropdown
                        isOpen={isNotifOpen}
                        onClose={() => setIsNotifOpen(false)}
                      />
                    </div>

                    {/* Logout Button */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Logout from session"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Collapsed Icon Bar */
                <div className="flex flex-col items-center gap-1.5 pt-1">
                  {canAccessAdminPanel && (
                    <Link
                      to="/admin"
                      className="p-1.5 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg"
                      title="Admin Panel"
                    >
                      <Shield className="w-4 h-4" />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="p-1.5 text-slate-600 hover:text-sky-700 hover:bg-slate-100 rounded-lg relative"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {totalNotifications > 0 && (
                      <NotificationBadge count={totalNotifications} />
                    )}
                  </button>
                  <NotificationDropdown
                    isOpen={isNotifOpen}
                    onClose={() => setIsNotifOpen(false)}
                  />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
