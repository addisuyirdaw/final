import React from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function Layout({ children }) {
  const location = useLocation();
  const isVerifyPage = location.pathname.startsWith("/verify");
  const isStandaloneProposal =
    location.pathname === "/submit-proposal" ||
    location.pathname === "/proposal-submission";

  if (isVerifyPage) {
    return <div className="min-h-screen bg-slate-900">{children}</div>;
  }

  if (isStandaloneProposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50/40 flex flex-col justify-center">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}