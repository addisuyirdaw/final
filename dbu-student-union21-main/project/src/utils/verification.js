/**
 * Resolves the public verification URL for a given certificate number.
 * 
 * Rules:
 * 1. Uses VITE_APP_URL environment variable if set.
 * 2. If running on localhost or 127.0.0.1, defaults to https://dbu-ss.vercel.app
 *    so QR codes scanned from a mobile phone camera NEVER fail with ERR_CONNECTION_REFUSED.
 * 3. In non-localhost environments, uses window.location.origin.
 */
export function getPublicVerificationUrl(certNumber) {
  if (!certNumber) return "";

  let baseUrl = "";

  if (import.meta.env.VITE_APP_URL) {
    baseUrl = import.meta.env.VITE_APP_URL.replace(/\/$/, "");
  } else if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "") {
      baseUrl = "https://dbu-ss.vercel.app";
    } else {
      baseUrl = window.location.origin;
    }
  } else {
    baseUrl = "https://dbu-ss.vercel.app";
  }

  const fullUrl = `${baseUrl}/verify/${encodeURIComponent(certNumber)}`;
  console.log("==========================================");
  console.log("📱 QR CODE VERIFICATION URL ENCODED:");
  console.log(fullUrl);
  console.log("==========================================");
  return fullUrl;
}
