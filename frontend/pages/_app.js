import "@/styles/globals.css";
import Head from "next/head";
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
      <Head>
        <title>Market Swarm · Synthetic customer validation</title>
        <meta name="description" content="Validate a product against thousands of synthetic customers" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
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
          <Link href="/" className={`nav-link${path === "/" ? " active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>
            </svg>
            Home
          </Link>
          <Link href="/customer-data" className={`nav-link${path === "/customer-data" ? " active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="4" y1="20" x2="4" y2="18"/>
              <line x1="9" y1="20" x2="9" y2="15"/>
              <line x1="14" y1="20" x2="14" y2="11"/>
              <line x1="19" y1="20" x2="19" y2="6"/>
            </svg>
            Customer Signals
          </Link>
          <Link href="/simulator" className={`nav-link nav-primary${isSimulator ? " active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13 2 3 14h7l-1 8 11-12h-7z"/>
            </svg>
            Market Swarm
          </Link>
          <Link href="/internals" className={`nav-link${path === "/internals" ? " active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span className="nav-live-dot" />
            Live Vercel+AWS Metrics
          </Link>
          <button type="button" className="nav-link" onClick={() => setShowDemo(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc2626" aria-hidden="true">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/>
            </svg>
            Youtube Recording
          </button>
          <Link href="/contact" className={`nav-link${path === "/contact" ? " active" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#000" aria-hidden="true">
              <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
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
                <div style={{ fontSize: 18, fontWeight: 700 }}>Recording</div>
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
                  background: "radial-gradient(circle at 50% 35%, #ffffff 0%, #f8fafc 45%, #eef2f7 100%)",
                  border: "1px solid #e2e8f0",
                  boxShadow: "inset 0 1px 0 #fff",
                }}>
                  <div>
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
