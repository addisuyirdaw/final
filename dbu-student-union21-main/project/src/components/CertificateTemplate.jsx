import React, { useEffect, useState } from "react";
import { Printer, X, Award } from "lucide-react";

/**
 * CertificateTemplate component
 * A reusable, premium React component for rendering university club certificates.
 * Supports dynamic injection of recipient name, club, role, dates, signatures, and seals.
 * Fully optimized for screen viewing and A4 Landscape printing.
 */
export function CertificateTemplate({ data = {}, onDispose }) {
  const [leftSigError, setLeftSigError] = useState(false);
  const [rightSigError, setRightSigError] = useState(false);
  const [sealError, setSealError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Load official Google Fonts dynamically to guarantee authentic typography
  useEffect(() => {
    const fontLink = document.createElement("link");
    fontLink.href = "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Great+Vibes&family=Montserrat:wght@400;600;700&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);
    return () => {
      if (document.head.contains(fontLink)) {
        document.head.removeChild(fontLink);
      }
    };
  }, []);

  // Merge default values mapping to the requested schema
  const certData = {
    certificate_id: data.certificate_id || "DBU-982347b7a8a161bbb3fe4432-xxxxxx",
    recipient_name_en: data.recipient_name_en || "Tsion Abayneh",
    recipient_name_am: data.recipient_name_am || "ጽዮን አባይነህ",
    club_name_en: data.club_name_en || "Charity Club",
    club_name_am: data.club_name_am || "የበጎ አድራጎት ክለብ",
    student_role_en: data.student_role_en || "Club Representative",
    student_role_am: data.student_role_am || "የክለብ ተወካይ",
    start_date_gc: data.start_date_gc || "27/04/2026",
    end_date_gc: data.end_date_gc || "27/06/2026",
    start_date_ec: data.start_date_ec || "19/08/2018",
    end_date_ec: data.end_date_ec || "20/10/2018",
    university_logo_url: data.university_logo_url || "https://api.dbu.edu/assets/logo.png",
    roles: {
      left_slot: {
        title_en: data.roles?.left_slot?.title_en || "Student Union President",
        title_am: data.roles?.left_slot?.title_am || "የተማሪዎች ሕብረት ፕሬዝዳንት",
        current_name_en: data.roles?.left_slot?.current_name_en || "Kirkos Ashebir",
        current_name_am: data.roles?.left_slot?.current_name_am || "ኪርኮስ አሸብር",
        signature_url: data.roles?.left_slot?.signature_url || "https://api.dbu.edu/assets/signatures/union_pres.png"
      },
      right_slot: {
        title_en: data.roles?.right_slot?.title_en || "Student Service Dean",
        title_am: data.roles?.right_slot?.title_am || "የተማሪዎች አገልግሎት ዲን",
        current_name_en: data.roles?.right_slot?.current_name_en || "Gizew Fetene",
        current_name_am: data.roles?.right_slot?.current_name_am || "ጊዜው ፈጠነ",
        signature_url: data.roles?.right_slot?.signature_url || "https://api.dbu.edu/assets/signatures/student_dean.png"
      },
      official_seal_url: data.roles?.official_seal_url || "https://api.yourdomain.com/storage/assets/official_purple_stamp.png"
    }
  };

  const today = new Date();
  const dateString = `${today.getDate()}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()} G.C`;

  // Helper functions to clean honorific prefixes like "Ato" or "አቶ"
  const cleanNameEn = (name) => {
    if (!name) return "";
    return name.replace(/^(Ato|Ato\.)\s+/i, "");
  };

  const cleanNameAm = (name) => {
    if (!name) return "";
    return name.replace(/^አቶ\s+/i, "");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print-certificate-container min-h-screen bg-slate-900 text-gray-100 flex flex-col items-center justify-center p-4 sm:p-8 print:p-0 print:bg-white print:text-black">
      
      {/* Dynamic Print CSS block inserted into the page to control print margins, hide UI, and force background colors */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card-shadow {
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          @page {
            size: A4 landscape;
            margin: 0.8cm;
          }
        }
      `}} />

      {/* Action Bar (hidden during print) */}
      <div className="no-print w-full max-w-[1080px] mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2 rounded-lg text-amber-500">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100">Certificate Digital Preview</h3>
            <p className="text-xs text-slate-400"> Bilingually formatted &bull; Reusable DBU Template</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] transition-all text-slate-950 font-bold rounded-lg shadow-lg hover:shadow-amber-500/15 text-sm"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
          {onDispose && (
            <button
              onClick={onDispose}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 active:scale-[0.98] transition-all text-slate-200 font-medium rounded-lg text-sm"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          )}
        </div>
      </div>

      {/* Certificate Outer Shell */}
      <div className="print-card-shadow w-full max-w-[1080px] aspect-[1.414/1] bg-slate-950 p-[14px] rounded-xl border border-slate-800 shadow-2xl relative overflow-hidden transition-all duration-300 print:rounded-none print:border-none print:shadow-none print:p-0">
        
        {/* Certificate Border Pattern - Double Golden & Navy Blue Trim */}
        <div 
          className="w-full h-full p-2"
          style={{
            background: "repeating-linear-gradient(45deg, #c9952a 0px, #c9952a 6px, #1a3a6b 6px, #1a3a6b 12px, #c9952a 12px, #c9952a 18px, #fffef9 18px, #fffef9 24px)"
          }}
        >
          {/* Certificate Inner White/Parchment Board */}
          <div className="w-full h-full bg-[#fffef9] border-[3px] border-[#c9952a] relative p-6 sm:p-10 flex flex-col justify-between overflow-hidden">
            
            {/* Corner Decorative Ornaments (SVG Diamonds) */}
            <div className="absolute top-0 left-0 w-12 h-12">
              <svg viewBox="0 0 44 44" className="w-full h-full">
                <polygon points="0,0 22,0 0,22" fill="#1a3a6b" />
                <polygon points="4,4 26,4 4,26" fill="#c9952a" opacity="0.65" />
              </svg>
            </div>
            <div className="absolute top-0 right-0 w-12 h-12 scale-x-[-1]">
              <svg viewBox="0 0 44 44" className="w-full h-full">
                <polygon points="0,0 22,0 0,22" fill="#1a3a6b" />
                <polygon points="4,4 26,4 4,26" fill="#c9952a" opacity="0.65" />
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 w-12 h-12 scale-y-[-1]">
              <svg viewBox="0 0 44 44" className="w-full h-full">
                <polygon points="0,0 22,0 0,22" fill="#1a3a6b" />
                <polygon points="4,4 26,4 4,26" fill="#c9952a" opacity="0.65" />
              </svg>
            </div>
            <div className="absolute bottom-0 right-0 w-12 h-12 scale-x-[-1] scale-y-[-1]">
              <svg viewBox="0 0 44 44" className="w-full h-full">
                <polygon points="0,0 22,0 0,22" fill="#1a3a6b" />
                <polygon points="4,4 26,4 4,26" fill="#c9952a" opacity="0.65" />
              </svg>
            </div>

            {/* Header: Official Logos framing the bilingual Titles */}
            <div className="flex items-center justify-between gap-4">
              {/* Left Logo Slot - Exact widescreen logo image */}
              <div className="w-[160px] h-[110px] flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  src="/images/image_2a2700.png"
                  alt="DBU Logo Left"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Center Bilingual University Header */}
              <div className="text-center flex-1 px-4">
                <h1 className="text-[#1a3a6b] font-bold text-xl sm:text-2xl tracking-wide" style={{ fontFamily: "'Nyala', 'Abyssinica SIL', sans-serif" }}>
                  ደብረ ብርሃን ዩኒቨርሲቲ
                </h1>
                <h2 className="text-[#1a3a6b] font-extrabold text-xl sm:text-2xl tracking-widest mt-0.5 underline decoration-[#c9952a] underline-offset-4" style={{ fontFamily: "'Cinzel', serif" }}>
                  DEBRE BERHAN UNIVERSITY
                </h2>
              </div>

              {/* Right Logo Slot - Exact widescreen logo image */}
              <div className="w-[160px] h-[110px] flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  src="/images/image_2a2700.png"
                  alt="DBU Logo Right"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Top Multi-Colored Rule */}
            <div className="w-full h-[4px] bg-gradient-to-r from-[#1a3a6b] via-[#c9952a] to-[#1a3a6b] mt-3 mb-2" />

            {/* TWO-COLUMN BILINGUAL BODY with strict padding protection for absolute footer placement */}
            <div className="flex flex-row gap-0 flex-1 mt-2 pb-[140px] overflow-hidden">
              
              {/* Left Column (Amharic Body) */}
              <div className="flex-1 pr-6 border-r-[1.5px] border-[#c9952a] flex flex-col justify-start text-justify">
                <h3 className="text-[#1a3a6b] font-bold text-lg mb-2 font-nyala text-left" style={{ fontFamily: "'Nyala', 'Abyssinica SIL', sans-serif" }}>
                  የምስክር ወረቀት
                </h3>
                <div className="text-xs text-gray-500 font-nyala text-left mb-1" style={{ fontFamily: "'Nyala', 'Abyssinica SIL', sans-serif" }}>ለ</div>
                <div className="text-[#1a3a6b] font-bold text-lg border-b border-gray-400 pb-0.5 mb-3 inline-block max-w-max pr-6 font-nyala text-left" style={{ fontFamily: "'Nyala', 'Abyssinica SIL', sans-serif" }}>
                  {certData.recipient_name_am}
                </div>
                <p className="text-[#111111] text-[13px] leading-[1.75] font-nyala" style={{ fontFamily: "'Nyala', 'Abyssinica SIL', sans-serif" }}>
                  በደብረብርሃን ዩኒቨርሲቲ ከተማሪዎች ሕብረት ስር ከ <span className="font-semibold underline decoration-[#c9952a]">{certData.start_date_ec}</span> እስከ <span className="font-semibold underline decoration-[#c9952a]">{certData.end_date_ec}</span> በ <span className="font-semibold underline decoration-[#c9952a]">{certData.club_name_am}</span> ውስጥ <span className="font-semibold underline decoration-[#c9952a]">{certData.student_role_am}</span> በመሆን ኃላፊነትዎን በአግባቡ በመወጣት በዩኒቨርሲቲው ውስጥ የመማር ማስተማር ሂደቱ ሰላማዊ እንዲሆን ላደረጉት ከፍተኛ አስተዋፅኦ ይህ የምስክር ወረቀት ከታላቅ ምስጋና ጋር ተበርክቶላቸዋል።
                </p>
              </div>

              {/* Right Column (English Body) */}
              <div className="flex-1 pl-6 flex flex-col justify-start text-justify">
                <h3 className="text-[#1a3a6b] font-extrabold text-lg mb-2 tracking-wide font-cinzel text-left" style={{ fontFamily: "'Cinzel', serif" }}>
                  CERTIFICATE
                </h3>
                <div className="text-xs text-gray-500 font-garamond text-left mb-1" style={{ fontFamily: "'EB Garamond', serif" }}>This certificate awarded to</div>
                <div className="text-[#1a3a6b] font-semibold italic text-lg border-b border-gray-400 pb-0.5 mb-3 inline-block max-w-max pr-6 font-garamond text-left" style={{ fontFamily: "'EB Garamond', serif" }}>
                  {certData.recipient_name_en}
                </div>
                <p className="text-[#111111] text-[13px] leading-[1.65] font-garamond" style={{ fontFamily: "'EB Garamond', serif" }}>
                  This certificate awarded to recognize your contribution from <span className="font-semibold underline decoration-[#c9952a]">{certData.start_date_gc}</span> to <span className="font-semibold underline decoration-[#c9952a]">{certData.end_date_gc}</span> in student union as <span className="font-semibold underline decoration-[#c9952a]">{certData.student_role_en}</span> in <span className="font-semibold underline decoration-[#c9952a]">{certData.club_name_en}</span> in Debre Birhan University. We would like to Great appreciation your active participation and commitment in shouldering the responsibility and carrying out other duties enabled the university to run the teaching learning process peacefully.
                </p>
              </div>
            </div>

            {/* DEDICATED ABSOLUTE FOOTER CONTAINER (Placed inside the protected buffer space) */}
            <div className="absolute bottom-[40px] left-10 right-10 h-[115px] z-10 flex flex-row items-end justify-between">
              
              {/* Left Column (Student Union President Signature Slot) */}
              <div className="w-[32%] relative h-full flex flex-col justify-end">
                {/* Signature Ink: Absolutely anchored at the bottom-12 position inside this column */}
                <div className="absolute bottom-12 left-0 right-0 h-14 flex items-center justify-center pointer-events-none select-none z-20">
                  {!leftSigError && certData.roles?.left_slot?.signature_url ? (
                    <img
                      src={certData.roles.left_slot.signature_url}
                      alt="SU President Signature"
                      className="h-14 max-w-full object-contain mix-blend-multiply opacity-95"
                      onError={() => setLeftSigError(true)}
                    />
                  ) : (
                    <span
                      className="text-[26px] leading-none text-[#1a2d5a] opacity-80"
                      style={{ fontFamily: "'Great Vibes', cursive" }}
                    >
                      {cleanNameEn(certData.roles.left_slot.current_name_en)}
                    </span>
                  )}
                </div>
                {/* Baseline divider and text labels */}
                <div className="w-full border-t border-dotted border-gray-400 pt-1 text-center bg-[#fffef9]/90">
                  <span className="block font-bold text-xs text-slate-800" style={{ fontFamily: "'Nyala', 'Abyssinica SIL', sans-serif" }}>
                    {cleanNameAm(certData.roles.left_slot.current_name_am)}
                  </span>
                  <span className="block font-semibold text-[10px] text-gray-500 leading-tight" style={{ fontFamily: "'Nyala', 'Abyssinica SIL', sans-serif" }}>
                    {certData.roles.left_slot.title_am}
                  </span>
                  <span className="block text-[10px] text-gray-500 leading-tight" style={{ fontFamily: "'EB Garamond', serif" }}>
                    {certData.roles.left_slot.title_en}
                  </span>
                </div>
              </div>

              {/* Empty Space for spacing - Stamp overlays here */}
              <div className="flex-1" />

              {/* Right Column (Student Service Dean Signature Slot) */}
              <div className="w-[32%] relative h-full flex flex-col justify-end">
                {/* Signature Ink: Absolutely anchored bottom-12 inside this column */}
                <div className="absolute bottom-12 left-0 right-0 h-14 flex items-center justify-center pointer-events-none select-none z-20">
                  {!rightSigError && certData.roles?.right_slot?.signature_url ? (
                    <img
                      src={certData.roles.right_slot.signature_url}
                      alt="Student Service Dean Signature"
                      className="h-14 max-w-full object-contain mix-blend-multiply opacity-95"
                      onError={() => setRightSigError(true)}
                    />
                  ) : (
                    <span
                      className="text-[26px] leading-none text-[#1a2d5a] opacity-80"
                      style={{ fontFamily: "'Great Vibes', cursive" }}
                    >
                      {cleanNameEn(certData.roles.right_slot.current_name_en)}
                    </span>
                  )}
                </div>
                {/* Baseline divider and text labels */}
                <div className="w-full border-t border-dotted border-gray-400 pt-1 text-center bg-[#fffef9]/90">
                  <span className="block font-bold text-xs text-slate-800" style={{ fontFamily: "'Nyala', 'Abyssinica SIL', sans-serif" }}>
                    {cleanNameAm(certData.roles.right_slot.current_name_am)}
                  </span>
                  <span className="block font-semibold text-[10px] text-gray-500 leading-tight" style={{ fontFamily: "'Nyala', 'Abyssinica SIL', sans-serif" }}>
                    {certData.roles.right_slot.title_am}
                  </span>
                  <span className="block text-[10px] text-gray-500 leading-tight" style={{ fontFamily: "'EB Garamond', serif" }}>
                    {certData.roles.right_slot.title_en}
                  </span>
                </div>
              </div>

              {/* Central Seal: Absolutely positioned overlapping the left corner of the Dean's zone */}
              <div className="absolute right-[26%] bottom-[42px] w-[88px] h-[88px] pointer-events-none select-none z-30">
                {!sealError && certData.roles?.official_seal_url ? (
                  <img
                    src={certData.roles.official_seal_url}
                    alt="Official University Stamp"
                    className="w-full h-full object-contain mix-blend-multiply opacity-80 rotate-[12deg]"
                    onError={() => setSealError(true)}
                  />
                ) : (
                  <div className="w-[82px] h-[82px] rounded-full border-2 border-dashed border-[#1a3a6b]/70 relative flex items-center justify-center rotate-[10deg] opacity-80 bg-[#fffef9]/40 backdrop-blur-[0.5px]">
                    <div className="absolute inset-1 rounded-full border border-solid border-[#1a3a6b]/50" />
                    <div className="text-center font-bold text-[7px] text-[#1a3a6b]">
                      <div className="tracking-[0.12em] font-sans">OFFICIAL</div>
                      <div className="text-[11px] font-serif text-[#c9952a]">✦ DBU ✦</div>
                      <div className="text-[5.5px] tracking-[0.05em] uppercase font-sans">SEAL STAMP</div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Metadata & Verification Line */}
            <div className="text-center text-[7.5px] font-sans tracking-[0.1em] font-semibold text-gray-400 mt-5 border-t border-gray-200/50 pt-2 flex items-center justify-between px-2 uppercase">
              <span>VERIFICATION ID: {certData.certificate_id}</span>
              <span>ISSUED: {dateString}</span>
              <span>DEBRE BERHAN UNIVERSITY &bull; DEPT. OF STUDENT AFFAIRS</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default CertificateTemplate;
