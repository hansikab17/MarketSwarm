export default function ReconcileCard({ results }) {
  const rec = results?.reconciliation;
  if (!rec) return null;

  const {
    human_pct, human_total, human_votes,
    agent_total, agent_votes,
    deviation_pct, deviation_count, sample_confidence,
    outcome,
    adjusted_score, original_score, adjusted_buy_rate,
  } = rec;

  // Compute rates from votes (resilient fallback if fields missing)
  const agent_buy_rate = rec.agent_buy_rate ?? ((agent_votes?.buy || 0) / (agent_total || 1));
  const human_yes_share = rec.human_yes_share ?? ((human_votes?.yes || 0) / (human_total || 1));

  const meta = {
    sync: {
      color: "var(--green)", bg: "var(--green-l)", border: "#b6e0c2", icon: "✓",
      title: "In sync — high trust",
      blurb: `Human responses align with agent predictions (deviation ≤10%). The simulation result is validated by real human feedback.`
    },
    adjusted: {
      color: "var(--yellow)", bg: "var(--yellow-l)", border: "#f5dfa3", icon: "⚠",
      title: "Adjusted — moderate deviation",
      blurb: `Humans deviate ${deviation_pct}% from agents. Score adjusted from ${Math.round(original_score)} → ${Math.round(adjusted_score)} using blended signal (${Math.round((sample_confidence || 0) * 100)}% confidence from ${human_total} respondents).`
    },
    inconclusive: {
      color: "var(--red)", bg: "var(--red-l)", border: "#f5c6cb", icon: "✕",
      title: "Inconclusive — large deviation",
      blurb: `Humans deviate ${deviation_pct}% from agents (≥40%). More human input needed to reach a confident conclusion.`
    }
  }[outcome] || { color: "var(--g500)", bg: "var(--g50)", border: "var(--g300)", icon: "?", title: "Unknown", blurb: "" };

  // Agent breakdown percentages
  const aN = agent_total || 1;
  const aBuyPct = Math.round(((agent_votes?.buy || 0) / aN) * 100);
  const aHoldPct = Math.round(((agent_votes?.hold || 0) / aN) * 100);
  const aLeavePct = Math.round(((agent_votes?.leave || 0) / aN) * 100);

  // Human breakdown percentages
  const hN = human_total || 1;
  const hYesPct = Math.round(((human_votes?.yes || 0) / hN) * 100);
  const hUnsurePct = Math.round(((human_votes?.not_sure || 0) / hN) * 100);
  const hNeverPct = Math.round(((human_votes?.never || 0) / hN) * 100);

  return (
    <div className="card" style={{ padding: 28, border: `1.5px solid ${meta.border}` }}>
      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: meta.bg, border: `1px solid ${meta.color}`,
        borderRadius: 20, padding: "6px 16px",
        fontSize: 14, fontWeight: 700, color: meta.color, marginBottom: 14
      }}>
        {meta.icon} {meta.title}
      </div>

      {/* Blurb */}
      <div style={{ fontSize: 13.5, color: "var(--g600)", lineHeight: 1.6, marginBottom: 22 }}>
        {meta.blurb}
      </div>

      {/* Human responses bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--g700)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          Human Responses <span style={{ fontWeight: 400, color: "var(--g500)" }}>({human_total || 0})</span>
        </div>
        {(() => {
          const yes = human_votes?.yes || 0;
          const notSure = human_votes?.not_sure || 0;
          const never = human_votes?.never || 0;
          const answered = yes + notSure + never;
          const expectedTotal = human_pct > 0 ? Math.round((agent_total + answered) * human_pct / 100) : answered;
          const notAnswered = Math.max(0, expectedTotal - answered);
          const total = answered + notAnswered || 1;
          const yesPct = (yes / total) * 100;
          const notSurePct = (notSure / total) * 100;
          const neverPct = (never / total) * 100;
          const naPct = (notAnswered / total) * 100;
          return (
            <>
              <div className="votebar" style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
                {yes > 0 && <div className="votebar-seg buy" style={{ width: `${yesPct}%` }}>{yes}</div>}
                {notSure > 0 && <div className="votebar-seg hold" style={{ width: `${notSurePct}%` }}>{notSure}</div>}
                {never > 0 && <div className="votebar-seg leave" style={{ width: `${neverPct}%` }}>{never}</div>}
                {notAnswered > 0 && <div className="votebar-seg" style={{ width: `${naPct}%`, background: "var(--g300)", color: "var(--g600)" }}>{notAnswered}</div>}
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, color: "var(--g500)" }}>
                <span><span className="legend-dot" style={{ background: "var(--green)" }} /> Yes</span>
                <span><span className="legend-dot" style={{ background: "var(--yellow)" }} /> Not sure</span>
                <span><span className="legend-dot" style={{ background: "var(--red)" }} /> Never</span>
                <span><span className="legend-dot" style={{ background: "var(--g300)" }} /> Not answered</span>
              </div>
            </>
          );
        })()}
      </div>

      {/* Deviation & Adjustment metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: "16px 0", borderTop: "1px solid var(--g200)" }}>
        <StatCell label="Agent buy-rate" value={`${Math.round(agent_buy_rate * 100)}%`} sub={`${agent_total} agents`} color="var(--blue)" />
        <StatCell label="Human yes-share" value={`${Math.round(human_yes_share * 100)}%`} sub={`${human_total} respondents`} color="var(--blue)" />
        <StatCell label="Deviation" value={`${deviation_pct}%`} sub={`${Math.round((sample_confidence || 0) * 100)}% confidence`} color={meta.color} />
        <StatCell label="Adjustment" value={outcome === "sync" ? "None" : outcome === "adjusted" ? `${Math.abs(Math.round(adjusted_score - original_score))} pts` : "N/A"} sub={outcome === "adjusted" ? `score ${Math.round(original_score)} → ${Math.round(adjusted_score)}` : outcome === "sync" ? "aligned" : "too divergent"} color={meta.color} />
      </div>
    </div>
  );
}

function StatCell({ label, value, sub, color }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--g500)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || "var(--g900)", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--g400)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
