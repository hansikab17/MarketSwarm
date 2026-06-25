export default function ReconcileCard({ results }) {
  const rec = results?.reconciliation;
  if (!rec) return null;

  const {
    human_pct, human_total, human_votes,
    agent_buy_rate, human_yes_share,
    deviation_pct, deviation_count,
    outcome,
    adjusted_score, original_score,
  } = rec;

  const meta = {
    sync: {
      color: "var(--green)", bg: "var(--green-l)", icon: "✓",
      title: "In sync — higher trust in the simulation",
      blurb: `Human responses align with the agent swarm (within 20%). The simulation result is corroborated and can be trusted with higher confidence.`
    },
    adjusted: {
      color: "var(--yellow)", bg: "var(--yellow-l)", icon: "⚠",
      title: "Partially adjusted for human input",
      blurb: `Humans deviate ${deviation_pct}% from the agents (20–80% band). The headline metrics have been nudged by half the variation toward the human signal.`
    },
    inconclusive: {
      color: "var(--red)", bg: "var(--red-l)", icon: "✕",
      title: "Inconclusive — results may not be accurate",
      blurb: `Human responses deviate ${deviation_pct}% from the agents (≥80%). Treat the simulation as inconclusive; gather more human input before deciding.`
    }
  }[outcome] || { color: "var(--g500)", bg: "var(--g50)", icon: "?", title: "Unknown", blurb: "" };

  const verdictColor = meta.color;

  return (
    <div className="card" style={{ padding: 28, borderTop: `4px solid ${verdictColor}` }}>
      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: meta.bg, border: `1px solid ${verdictColor}`,
        borderRadius: 20, padding: "6px 16px",
        fontSize: 14, fontWeight: 700, color: verdictColor, marginBottom: 12
      }}>
        {meta.icon} {meta.title}
      </div>

      {/* Blurb */}
      <div style={{ fontSize: 14, color: "var(--g600)", lineHeight: 1.6, marginBottom: 20 }}>
        {meta.blurb}
      </div>

      {/* Stats row: Agent buy-rate | Human yes-share | Deviation | Adjusted score or Human mix */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <StatCell label="Agent buy-rate" value={`${Math.round(agent_buy_rate * 100)}%`} sub="swarm prediction" color="var(--blue)" />
        <StatCell label="Human yes-share" value={`${Math.round(human_yes_share * 100)}%`} sub={`${human_total} respondents`} color="var(--g900)" />
        <StatCell label="Deviation" value={`${deviation_pct}%`} sub={`${deviation_count} mismatches`} color={verdictColor} />
        {outcome === "adjusted" ? (
          <StatCell label="Adjusted score" value={Math.round(adjusted_score)} sub={`was ${Math.round(original_score)}`} color="var(--yellow)" />
        ) : (
          <StatCell label="Human mix" value={`${human_pct}%`} sub="of the panel" color="var(--g900)" />
        )}
      </div>

      {/* Human vote breakdown bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "var(--g500)", marginBottom: 6, fontWeight: 600 }}>Human survey responses</div>
        <div className="votebar" style={{ marginBottom: 8 }}>
          {human_votes.yes > 0 && (
            <div className="votebar-seg buy" style={{ width: `${(human_votes.yes / human_total) * 100}%` }}>{human_votes.yes}</div>
          )}
          {human_votes.not_sure > 0 && (
            <div className="votebar-seg hold" style={{ width: `${(human_votes.not_sure / human_total) * 100}%` }}>{human_votes.not_sure}</div>
          )}
          {human_votes.never > 0 && (
            <div className="votebar-seg leave" style={{ width: `${(human_votes.never / human_total) * 100}%` }}>{human_votes.never}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--g500)" }}>
          <span><span className="legend-dot" style={{ background: "var(--green)" }} /> Yes, will buy · {human_votes.yes}</span>
          <span><span className="legend-dot" style={{ background: "var(--yellow)" }} /> Not sure · {human_votes.not_sure}</span>
          <span><span className="legend-dot" style={{ background: "var(--red)" }} /> Never · {human_votes.never}</span>
        </div>
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
