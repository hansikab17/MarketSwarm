import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { getBus, busPost } from "@/lib/swarmBus";
import { submitVote } from "@/lib/api";
import RaagaPanel from "@/components/RaagaPanel";

export default function SurveyPage() {
  const router = useRouter();
  const runIdParam = router.query.runId || "";
  const custIdParam = router.query.custId || "";
  const nameParam = router.query.name || custIdParam || "Customer";
  const genderParam = router.query.gender || "Male";

  const customer = { id: custIdParam, name: nameParam, gender: genderParam };

  const [product, setProduct] = useState({ name: "", desc: "", img: null, doc: "" });
  const [currentVote, setCurrentVote] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [humanAnswers, setHumanAnswers] = useState([]);
  const [currentRunId, setCurrentRunId] = useState(runIdParam);

  // Keep runId in sync when query param changes
  useEffect(() => {
    if (runIdParam) setCurrentRunId(runIdParam);
  }, [runIdParam]);

  // BroadcastChannel: listen for product-sync, run-started, human-answer
  useEffect(() => {
    const bus = getBus();
    if (!bus) return;

    // Announce presence to get current product config
    busPost({ type: "presence-ping" });

    function handler(ev) {
      const m = ev.data || {};
      if (m.type === "product-sync" && m.product) {
        setProduct({ name: m.product.name || "", desc: m.product.desc || "", img: m.product.img || null, doc: m.product.doc || "" });
      } else if (m.type === "run-started") {
        if (m.product) setProduct({ name: m.product.name || "", desc: m.product.desc || "", img: m.product.img || null, doc: m.product.doc || "" });
        setCurrentVote(null);
        setIsSubmitted(false);
        setIsClosed(false);
      } else if (m.type === "run-id-sync" && m.runId) {
        setCurrentRunId(m.runId);
      } else if (m.type === "survey-closed") {
        setIsClosed(true);
      } else if (m.type === "human-answer" && m.id && m.respondent === custIdParam) {
        setHumanAnswers(prev => [...prev, { id: m.id, answer: m.answer }]);
      }
    }
    bus.onmessage = handler;
    return () => { bus.onmessage = null; };
  }, [custIdParam]);

  const handleVote = useCallback((choice) => {
    setCurrentVote(choice);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!currentVote) return;
    setIsSubmitted(true);
    // Broadcast to simulator tab via BroadcastChannel
    busPost({ type: "human-vote", vote: currentVote, respondent: custIdParam, name: nameParam });
    // POST vote to backend API for Lambda processing
    const effectiveRunId = runIdParam || currentRunId;
    if (effectiveRunId && custIdParam) {
      submitVote(effectiveRunId, custIdParam, currentVote, nameParam).catch(() => {});
    }
  }, [currentVote, runIdParam, currentRunId, custIdParam, nameParam]);

  const handleEscalate = useCallback((question) => {
    const id = `esc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    busPost({ type: "escalation", id, question, from: nameParam, respondent: custIdParam });
  }, [custIdParam, nameParam]);

  // If no custId param yet (SSR or direct access), show placeholder
  if (!custIdParam) {
    return (
      <div className="fade-in" style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h2 style={{ fontWeight: 700, fontSize: 20 }}>Survey link required</h2>
        <p style={{ color: "var(--g600)", marginTop: 8 }}>Open this page from the simulator&apos;s &quot;Open Customer Surveys&quot; menu to get a valid survey link with a run ID and customer ID.</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="survey-layout with-raaga">
        {/* Survey card */}
        <div className="survey-wrap">
          <div className="linkbar">
            <span style={{ fontSize: 14 }}>🌐</span>
            <span className="linkbar-url">marketswarm.app/s/{(product.name || "new-product").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20) || "new-product"}/{custIdParam}</span>
            <span className="linkbar-badge">{isClosed ? "Closed" : "Shared with you"}</span>
          </div>

          {isClosed ? (
            <div className="card survey-card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
              <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Survey closed</h2>
              <p style={{ color: "var(--g600)", fontSize: 14, maxWidth: 340, margin: "0 auto" }}>
                {isSubmitted
                  ? "Your response was recorded. The simulation session has ended."
                  : "This survey is no longer accepting responses. The simulation was completed or canceled."}
              </p>
              {isSubmitted && currentVote && (
                <div style={{ marginTop: 16 }}>
                  <span className="badge" style={{ background: (currentVote === "yes" ? "var(--green)" : currentVote === "never" ? "var(--red)" : "var(--yellow)") + "1a", color: currentVote === "yes" ? "var(--green)" : currentVote === "never" ? "var(--red)" : "var(--yellow)" }}>
                    Your answer: {currentVote === "yes" ? "Yes, will buy" : currentVote === "never" ? "Never" : "Not sure"}
                  </span>
                </div>
              )}
              <div className="note" style={{ marginTop: 20 }}>You can still chat with Raaga about the product →</div>
            </div>
          ) : (
          <>
          <div className="card survey-card">
            <div className="survey-kicker">QUICK 1-QUESTION SURVEY</div>
            <h2 className="survey-h">{product.name || "New product concept"}</h2>

            {/* Customer identity */}
            <div className="cust-chip">
              <span className="cust-avatar" style={{ background: customer.gender === "Female" ? "#ea4c89" : "var(--blue)", color: "#fff" }}>
                {customer.name.charAt(0)}
              </span>
              <div>
                <div className="cust-name">{customer.name}</div>
                <div className="cust-meta">{customer.gender} · {custIdParam}</div>
              </div>
            </div>

            {/* Product image */}
            {product.img ? (
              <img src={product.img} className="survey-img" alt="Product" />
            ) : (
              <div className="survey-img-ph">🎯<div style={{ fontSize: 13, color: "var(--g500)", marginTop: 8 }}>Product image appears here</div></div>
            )}

            <p className="survey-desc">{product.desc || "A product concept is being tested."}</p>

            {isSubmitted ? (
              <>
                <div className="survey-thanks">
                  <span style={{ fontSize: 26, color: "var(--green)" }}>✓</span>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>Thanks, {customer.name.split(" ")[0]}!</div>
                    <div style={{ fontSize: 13.5, color: "var(--g700)", marginTop: 4 }}>You chose:</div>
                    <span className="badge" style={{ marginTop: 6, background: (currentVote === "yes" ? "var(--green)" : currentVote === "never" ? "var(--red)" : "var(--yellow)") + "1a", color: currentVote === "yes" ? "var(--green)" : currentVote === "never" ? "var(--red)" : "var(--yellow)" }}>
                      {currentVote === "yes" ? "Yes, will buy" : currentVote === "never" ? "Never this product" : "Not sure"}
                    </span>
                  </div>
                </div>
                <div className="note" style={{ marginTop: 16 }}>Your response is now live-tracked on the simulator&apos;s human-response panel.</div>
                <button className="chip" style={{ marginTop: 14 }} onClick={() => { setIsSubmitted(false); setCurrentVote(null); }}>Change my response</button>
              </>
            ) : (
              <>
                <div className="survey-q">Would you buy this product?</div>
                <div className="survey-opts">
                  {[["yes", "Yes, will buy", "var(--green)", "✓"], ["never", "Never / won't buy", "var(--red)", "✕"], ["unsure", "Not sure", "var(--yellow)", "⚠"]].map(([key, label, color, ic]) => (
                    <button key={key}
                      className={`survey-opt${currentVote === key ? " sel" : ""}`}
                      style={{
                        borderColor: currentVote === key ? color : undefined,
                        background: currentVote === key ? color + "12" : undefined,
                      }}
                      onClick={() => handleVote(key)}>
                      <span className="survey-opt-ic" style={{ background: color + "1a", color }}>{ic}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: currentVote === key ? color : "var(--g900)" }}>{label}</span>
                    </button>
                  ))}
                </div>
                <div className="note" style={{ marginTop: 14 }}>Have a question first? Ask Raaga on the right before you decide.</div>
                <button className="run-btn" style={{ marginTop: 14, opacity: currentVote ? 1 : 0.5 }}
                  onClick={handleSubmit} disabled={!currentVote}>
                  ➤ Submit response
                </button>
              </>
            )}
          </div>

          <div className="survey-foot">Powered by Market Swarm · your response is anonymous</div>
          </>
          )}
        </div>

        {/* Raaga chat panel — always visible even when survey is closed */}
        <RaagaPanel
          productName={product.name}
          productDoc={product.doc}
          onEscalate={handleEscalate}
          humanAnswers={humanAnswers}
        />
      </div>
    </div>
  );
}
