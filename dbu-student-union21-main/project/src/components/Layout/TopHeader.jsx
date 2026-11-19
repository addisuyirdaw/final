/** @format */
import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  MapPin,
  Mail,
  CircleUserRound,
  ExternalLink,
  Bell
} from "lucide-react";
import { useNotifications } from "../../contexts/NotificationContext";
import { NotificationBadge } from "./NotificationBadge";
import { NotificationDropdown } from "./NotificationDropdown";

export function TopHeader({
  isSidebarExpanded = true,
  setIsSidebarExpanded = () => {},
  isMobileOpen = false,
  setIsMobileOpen = () => {}
}) {
  const { notifications } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const totalNotifications = Object.values(notifications || {}).reduce((a, b) => a + b, 0);

  // Close notifications dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1280) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsSidebarExpanded(!isSidebarExpanded);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 shadow-2xs transition-colors">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* ── Left Side: Hamburger Toggle + University Location ── */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={handleToggleSidebar}
            className="p-2 rounded-xl text-slate-600 hover:text-sky-700 hover:bg-slate-100 transition-colors focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
            title="Toggle Navigation Sidebar"
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Location Information Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/70 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>Debre Berhan, Amhara</span>
          </div>

          {/* Official University Contact */}
          <a
            href="mailto:pro@dbu.edu.et"
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-sky-700 transition-colors"
            title="Official University Contact"
          >
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>pro@dbu.edu.et</span>
          </a>
        </div>

        {/* ── Right Side Utilities ── */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Staff Directory */}
          <Link
            to="/executives"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-sky-700 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            title="University Staff Directory"
          >
            <CircleUserRound className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="hidden sm:inline">Staff Directory</span>
          </Link>

          {/* Main University Site External Button */}
          <a
            href="https://www.dbu.edu.et/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-3.5 py-1.5 rounded-xl border border-sky-200/80 transition-all shadow-2xs hover:shadow-xs"
            title="Visit Debre Berhan University Official Portal"
          >
            <span className="hidden xs:inline">Main University Site</span>
            <span className="xs:hidden">DBU Site</span>
            <ExternalLink className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          </a>

          {/* Notification Center */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 text-slate-600 hover:text-sky-700 rounded-xl hover:bg-slate-100 transition-colors relative focus:outline-hidden"
              title="Notifications"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {totalNotifications > 0 && <NotificationBadge count={totalNotifications} />}
            </button>
            <NotificationDropdown
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
