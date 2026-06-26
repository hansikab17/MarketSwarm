import "@/styles/globals.css";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

const DATA_PARAMS = [
  ["🛒", "Transactions & purchases", "Frequency, recency, value, channel and basket mix — the backbone of spend behaviour."],
  ["⭐", "Reviews & ratings", "Star ratings, sentiment and product affinity drawn from what customers say."],
  ["💬", "Feedback & surveys", "NPS, CSAT and free-text themes that reveal motivations and friction."],
  ["↩️", "Returns", "Return reasons and rates — a strong negative signal for fit and satisfaction."],
  ["📄", "Contracts", "Tenure, terms, renewals and upgrades that show commitment and lifetime value."],
  ["🧾", "Billing", "Plan, payment health and dunning history, a proxy for budget and reliability."],
  ["🎧", "Support tickets", "Volume, severity and resolution effort — early indicators of churn risk."],
  ["💰", "Budget & income band", "Estimated disposable budget used to test price sensitivity per segment."],
];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const path = router.pathname;
  const [showInfo, setShowInfo] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyData, setSurveyData] = useState({ runId: null, customers: [], votes: {} });
  const isSimulator = path === "/simulator";

  // Listen for survey data broadcasts from simulator
  useEffect(() => {
    let bc;
    try { bc = new BroadcastChannel("market-swarm-bus"); } catch (_) { return; }
    function handler(ev) {
      const m = ev.data || {};
      if (m.type === "survey-links-update") {
        setSurveyData({ runId: m.runId, customers: m.customers || [], votes: m.votes || {} });
      }
    }
    bc.onmessage = handler;
    return () => { bc.close(); };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setShowInfo(false); setSurveyOpen(false); } };
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
          <Link href="/simulator" className={`nav-link${isSimulator ? " active" : ""}`}>Simulator</Link>
          <Link href="/contact" className={`nav-link${path === "/contact" ? " active" : ""}`}>Contact us</Link>
          {isSimulator && (
            <>
              <span className="nav-sep" />
              <div style={{ position: "relative" }}>
                <button className="pill-btn" onClick={() => setSurveyOpen(p => !p)} style={{ gap: 8 }}>
                  <span>🌐</span>
                  Open Customer Surveys
                  {surveyData.customers.length > 0 && (
                    <span className="survey-links-badge">
                      {Object.keys(surveyData.votes).length}/{surveyData.customers.length}
                    </span>
                  )}
                  <span style={{ transform: surveyOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: 12 }}>▾</span>
                </button>
                {surveyOpen && surveyData.customers.length > 0 && (
                  <div className="survey-links-panel" style={{ top: "calc(100% + 8px)", right: 0 }}>
                    <div className="survey-links-head">
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Survey links for this run</span>
                      <span className="note">Share these with real users</span>
                    </div>
                    <div className="survey-links-list">
                      {surveyData.customers.map((h, i) => {
                        const voted = surveyData.votes[h.customer_id];
                        const url = `/survey?runId=${surveyData.runId}&custId=${h.customer_id}&name=${encodeURIComponent(h.name || h.customer_id)}&gender=${encodeURIComponent(h.gender || "")}`;
                        return (
                          <div key={h.customer_id} className="survey-link-row">
                            <span className="survey-link-num">{i + 1}</span>
                            <span className="survey-link-avatar" style={{ background: h.gender === "Female" ? "#ea4c89" : "var(--blue)" }}>
                              {(h.name || h.customer_id).charAt(0)}
                            </span>
                            <div className="survey-link-info">
                              <div className="survey-link-name">{h.name || h.customer_id}</div>
                              <div className="survey-link-id">{h.customer_id}</div>
                            </div>
                            {voted ? (
                              <span className="survey-link-status done">✓ {voted}</span>
                            ) : (
                              <span className="survey-link-status pending">pending</span>
                            )}
                            <a href={url} target="_blank" rel="noopener noreferrer" className="survey-link-open" title="Open survey">↗</a>
                          </div>
                        );
                      })}
                    </div>
                    <button className="survey-links-openall" onClick={() => {
                      surveyData.customers.forEach(h => {
                        const url = `/survey?runId=${surveyData.runId}&custId=${h.customer_id}&name=${encodeURIComponent(h.name || h.customer_id)}&gender=${encodeURIComponent(h.gender || "")}`;
                        window.open(url, "_blank");
                      });
                    }}>
                      Open all {surveyData.customers.length} surveys in new tabs
                    </button>
                  </div>
                )}
                {surveyOpen && surveyData.customers.length === 0 && (
                  <div className="survey-links-panel" style={{ top: "calc(100% + 8px)", right: 0, padding: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "var(--g500)" }}>No active run. Start a simulation first to generate survey links.</div>
                  </div>
                )}
              </div>
              <button className="pill-btn" onClick={() => setShowInfo(true)}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Customer data we use
              </button>
            </>
          )}
        </nav>
      </header>
      <main className="main">
        <Component {...pageProps} />
      </main>

      {showInfo && (
        <div className="overlay" onClick={() => setShowInfo(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-ic">🗄️</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Customer data parameters we use</div>
                <div style={{ fontSize: 13, color: "var(--g500)" }}>The 360° signals that ground every synthetic customer</div>
              </div>
              <button className="modal-x" onClick={() => setShowInfo(false)}>✕</button>
            </div>
            <div style={{ padding: "8px 26px 0" }}>
              {DATA_PARAMS.map(([ic, title, desc]) => (
                <div key={title} className="param">
                  <div className="param-ic">{ic}</div>
                  <div>
                    <div className="param-t">{title}</div>
                    <div className="param-d">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-foot">
              <span style={{ fontSize: 13 }}>›</span>
              <div style={{ fontSize: "12.5px", color: "var(--g700)", lineHeight: 1.5 }}>
                These signals are aggregated into per-customer profiles. The simulator turns them into a synthetic cohort so you can pressure-test a launch without spending on live market experiments. Predictions are directional, not a guarantee.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
