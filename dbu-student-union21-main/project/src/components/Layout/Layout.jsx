/** @format */
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { Header } from "./Header";
import { Footer } from "./Footer";

/**
 * PublicLayout
 * Used exclusively for unauthenticated guests and public auth flows.
 * Strictly NO sidebar, NO top utility bar, and NO dashboard padding offsets.
 */
function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full">
      <Header />
      <main className="flex-1 w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}

/**
 * AuthenticatedLayout
 * Rendered exclusively after successful authentication.
 * Features collapsible left vertical sidebar, minimal top utility header,
 * and responsive dashboard content offsets.
 */
function AuthenticatedLayout({ children }) {
  const location = useLocation();

  // Sidebar expanded state on desktop (persisted in localStorage)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem("campusnexus_sidebar_expanded");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Mobile drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sync expanded state with localStorage
  useEffect(() => {
    try {
      localStorage.setItem("campusnexus_sidebar_expanded", JSON.stringify(isSidebarExpanded));
    } catch {
      // ignore
    }
  }, [isSidebarExpanded]);

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* ── Fixed Collapsible Sidebar (Left) ── */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* ── Main Content Area (Adjusted for Sidebar Width on Desktop) ── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-in-out ${
          isSidebarExpanded ? "xl:pl-64" : "xl:pl-16"
        }`}
      >
        {/* ── Clean Minimal Utility Top Header ── */}
        <TopHeader
          isSidebarExpanded={isSidebarExpanded}
          setIsSidebarExpanded={setIsSidebarExpanded}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* ── Page Content ── */}
        <main className="flex-1 w-full min-w-0">
          {children}
        </main>

        {/* ── University Portal Footer ── */}
        <Footer />
      </div>
    </div>
  );
}

/**
 * Centralized Layout Orchestrator
 * Selects the appropriate layout based on authentication state and special routes.
 */
export function Layout({ children }) {
  const location = useLocation();
  const { user } = useAuth();

  const isVerifyPage = location.pathname.startsWith("/verify");
  const isStandaloneProposal =
    location.pathname === "/submit-proposal" ||
    location.pathname === "/proposal-submission";

  // Dedicated layout for verification certificates
  if (isVerifyPage) {
    return <div className="min-h-screen bg-slate-900">{children}</div>;
  }

  // Dedicated standalone layout for proposal wizard
  if (isStandaloneProposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50/40 flex flex-col justify-center">
        {children}
      </div>
    );
  }

  // ── Authentication Check ──
  // If user is authenticated -> AuthenticatedLayout (Sidebar + TopHeader)
  // If user is NOT authenticated -> PublicLayout (Original public interface, NO sidebar)
  if (user) {
    return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
  }

  return <PublicLayout>{children}</PublicLayout>;
}
