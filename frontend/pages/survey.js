import { useState } from "react";

export default function SurveyPage() {
  const [vote, setVote] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const options = [
    { key: "yes", label: "Yes, will buy", color: "var(--green)" },
    { key: "never", label: "Never this product", color: "var(--red)" },
    { key: "unsure", label: "Not sure", color: "var(--yellow)" },
  ];

  return (
    <div className="fade-in">
      <div className="survey-wrap">
        <div className="linkbar">
          <a href="/" className="linkbar-a">← Back to simulator</a>
        </div>

        {submitted ? (
          <div className="card survey-thanks">
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2>Thank you!</h2>
            <p>Your response has been recorded. The simulator will reconcile your vote with the agent swarm.</p>
            <button className="btn-primary" onClick={() => { setSubmitted(false); setVote(null); }}>Vote again</button>
          </div>
        ) : (
          <div className="card survey-card">
            <h2 className="section-h" style={{ marginBottom: 4 }}>Customer survey</h2>
            <p style={{ color: "var(--g500)", fontSize: 14, marginBottom: 24 }}>
              You&apos;re seeing this product for the first time. Based on the description and image, would you buy it?
            </p>

            <div className="prod-img-wrap" style={{ marginBottom: 24 }}>
              <div className="prod-img-ph">🎯<div style={{ fontSize: 12, color: "var(--g500)", marginTop: 6 }}>Product image placeholder</div></div>
            </div>

            <div className="survey-opts">
              {options.map(o => (
                <button key={o.key}
                  className={`survey-opt${vote === o.key ? " active" : ""}`}
                  style={vote === o.key ? { borderColor: o.color, background: o.color + "14" } : undefined}
                  onClick={() => setVote(o.key)}>
                  <span className="legend-dot" style={{ background: o.color }} />
                  {o.label}
                </button>
              ))}
            </div>

            <button className="btn-primary" style={{ marginTop: 24, width: "100%" }}
              disabled={!vote} onClick={() => setSubmitted(true)}>
              Submit vote
            </button>
            <div className="note" style={{ marginTop: 10, textAlign: "center" }}>Demo only — votes are not persisted.</div>
          </div>
        )}
      </div>
    </div>
  );
}
