import "@/styles/globals.css";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { recordHit } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// YouTube video ID for the demo recording — loaded from env.
//   • Local dev:  set NEXT_PUBLIC_DEMO_VIDEO_ID in frontend/.env.local
//   • Vercel:     add NEXT_PUBLIC_DEMO_VIDEO_ID under Project → Settings → Env Vars
// For https://www.youtube.com/watch?v=abc123XYZ  →  value is  abc123XYZ
// If unset, the modal shows a friendly "coming soon" placeholder.
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_VIDEO_ID = process.env.NEXT_PUBLIC_DEMO_VIDEO_ID || "";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const path = router.pathname;
  const isSimulator = path === "/simulator";
  const [showDemo, setShowDemo] = useState(false);
  const videoId = DEMO_VIDEO_ID;

  // Page-view beacon: fire once on first load and on every client-side route change.
  useEffect(() => {
    recordHit(router.asPath);
    const onChange = (url) => recordHit(url);
    router.events.on("routeChangeComplete", onChange);
    return () => router.events.off("routeChangeComplete", onChange);
  }, [router.events]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes the demo modal
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setShowDemo(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="header">
        <Link href="/" style={{ textDecoration: "none", display: "contents" }}>
          <div className="logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div className="h-title">Market Swarm</div>
            <div className="h-sub">Validate a product against thousands of synthetic customers</div>
          </div>
        </Link>
        <nav className="nav">
          <Link href="/" className={`nav-link${path === "/" ? " active" : ""}`}>Home</Link>
          <Link href="/customer-data" className={`nav-link${path === "/customer-data" ? " active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Customer data we use
          </Link>
          <Link href="/simulator" className={`nav-link nav-primary${isSimulator ? " active" : ""}`}>MarketSwarm</Link>
          <Link href="/internals" className={`nav-link nav-live${path === "/internals" ? " active" : ""}`}>
            <span className="nav-live-dot" /> Live Vercel+AWS Metrics
          </Link>
          <button type="button" className="nav-link nav-demo" onClick={() => setShowDemo(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/>
            </svg>
            Live demo
          </button>
          <Link href="/contact" className={`nav-link${path === "/contact" ? " active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92Z"/>
            </svg>
            Contact us
          </Link>
        </nav>
      </header>
      <main className="main">
        <Component {...pageProps} />
      </main>

      {showDemo && (
        <div className="overlay" onClick={() => setShowDemo(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "94vw", maxWidth: 1320, maxHeight: "96vh", display: "flex", flexDirection: "column" }}>
            <div className="modal-head">
              <div className="modal-ic" style={{ background: "#fdecec", color: "#dc2626" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Live demo</div>
                <div style={{ fontSize: 13, color: "var(--g500)" }}>Walkthrough of the MarketSwarm application</div>
              </div>
              <button className="modal-x" onClick={() => setShowDemo(false)} aria-label="Close">✕</button>
            </div>

            {/* Video frame — scales width+height proportionally, never overflows viewport */}
            <div style={{ padding: "18px 26px 24px", display: "flex", justifyContent: "center", flex: 1, minHeight: 0 }}>
              {videoId ? (
                <div style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  maxHeight: "calc(96vh - 130px)",
                  maxWidth: "calc((96vh - 130px) * 16 / 9)",
                  background: "#000",
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "0 14px 40px -14px rgba(15,23,42,.45)",
                }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                    title="MarketSwarm demo"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={{ display: "block", width: "100%", height: "100%", border: 0 }}
                  />
                </div>
              ) : (
                <div style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  maxHeight: "calc(96vh - 130px)",
                  maxWidth: "calc((96vh - 130px) * 16 / 9)",
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  padding: 24,
                  borderRadius: 14,
                  background: "radial-gradient(circle at 50% 35%, #fff5f5 0%, #fef2f2 45%, #fde2e2 100%)",
                  border: "1px solid #fbcaca",
                  boxShadow: "inset 0 1px 0 #fff",
                }}>
                  <div>
                    <div style={{
                      width: 84, height: 84, borderRadius: "50%",
                      background: "#dc2626", color: "#fff",
                      display: "grid", placeItems: "center",
                      margin: "0 auto 18px",
                      boxShadow: "0 14px 30px -10px rgba(220,38,38,.55)",
                    }}>
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 4 }}><path d="M8 5v14l11-7L8 5Z"/></svg>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--g900)", marginBottom: 8 }}>Demo video coming soon</div>
                    <div style={{ fontSize: 13, color: "var(--g700)", maxWidth: 440, lineHeight: 1.55, margin: "0 auto" }}>
                      The walkthrough will appear here once it&apos;s published.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
