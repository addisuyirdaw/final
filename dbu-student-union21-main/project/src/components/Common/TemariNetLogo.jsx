/** @format */
import React from "react";

export function TemariNetMark({ className = "w-10 h-10", size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* ── Network Nodes & Connector Lines (Merging from right branch) ── */}
      {/* Connector lines */}
      <line x1="68" y1="42" x2="88" y2="30" stroke="#00A8B5" strokeWidth="4" strokeLinecap="round" />
      <line x1="88" y1="30" x2="108" y2="42" stroke="#FF7A00" strokeWidth="4" strokeLinecap="round" />
      <line x1="108" y1="42" x2="98" y2="68" stroke="#00A8B5" strokeWidth="4" strokeLinecap="round" />
      <line x1="98" y1="68" x2="72" y2="70" stroke="#FF7A00" strokeWidth="4" strokeLinecap="round" />
      <line x1="68" y1="42" x2="88" y2="52" stroke="#00A8B5" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="88" y1="52" x2="108" y2="42" stroke="#FF7A00" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="88" y1="52" x2="98" y2="68" stroke="#00A8B5" strokeWidth="3.5" strokeLinecap="round" />

      {/* Central Hub Node (Orange) */}
      <circle cx="88" cy="52" r="10" fill="#FF7A00" />
      <circle cx="88" cy="52" r="6" fill="#FFA500" />

      {/* Satellite Nodes */}
      <circle cx="88" cy="30" r="6" fill="#FF7A00" />
      <circle cx="108" cy="42" r="7" fill="#FFFFFF" stroke="#00A8B5" strokeWidth="2.5" />
      <circle cx="98" cy="68" r="6.5" fill="#FF7A00" />
      <circle cx="72" cy="70" r="5" fill="#00A8B5" />

      {/* ── Stylized Ethiopic 'ተ' (Turquoise / Cyan) ── */}
      {/* Left serif / top bar */}
      <path
        d="M20 38 C20 32, 24 28, 30 28 L56 28 C62 28, 66 32, 66 38 L62 44 L50 44 L50 96 C50 100, 46 104, 40 104 C34 104, 30 100, 30 96 L30 44 L24 44 Z"
        fill="#00A8B5"
      />
      {/* Central crossbar */}
      <path
        d="M14 58 C14 54, 18 52, 22 52 L62 52 C66 52, 70 54, 70 58 C70 62, 66 64, 62 64 L22 64 C18 64, 14 62, 14 58 Z"
        fill="#00A8B5"
      />
      {/* Upper serif flare */}
      <path
        d="M26 28 L22 20 C22 18, 26 16, 30 18 L34 26 Z"
        fill="#00A8B5"
      />
    </svg>
  );
}

export function TemariNetBrand({ className = "", textClassName = "text-xl sm:text-2xl md:text-3xl" }) {
  return (
    <div className={`flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <span className={`${textClassName} text-sky-950 font-black`}>Temari</span>
      <span className={`${textClassName} text-[#FF7A00] font-black`}>Net</span>
    </div>
  );
}
