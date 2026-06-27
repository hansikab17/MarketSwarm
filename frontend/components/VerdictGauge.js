export default function VerdictGauge({ results, onReset }) {
  const h = results?.headline || {};
  const score = h.success_score ?? 0;
  const verdict = h.verdict || "unknown";
  const n = h.n_agents ?? 0;
  const buy = h.buy ?? 0;
  const hold = h.hold ?? 0;
  const leave = h.leave ?? 0;
  const avgPropensity = h.avg_propensity_to_buy ?? 0;
  const revenue = h.expected_revenue_delta_usd ?? 0;

  const pct = Math.min(100, Math.max(0, score));
  const verdictLabel = verdict.charAt(0).toUpperCase() + verdict.slice(1);
  const verdictColor = verdict === "succeed" ? "var(--green)" : verdict === "borderline" ? "var(--yellow)" : "var(--red)";
  const verdictIcon = verdict === "succeed" ? "✓" : verdict === "borderline" ? "⚠" : "✕";
  const conversionRate = n > 0 ? ((buy / n) * 100).toFixed(1) : "0";
  const avgPrice = n > 0 && buy > 0 ? Math.round(revenue / buy) : 0;

  const description = score >= 50
    ? "Strong purchase intent detected. The product scenario is commercially viable at current parameters."
    : score >= 30
      ? "Demand is real but fragile. Tune price, targeting or positioning before launch."
      : "Most of the panel rejects the offer. Revisit pricing, positioning or audience.";

  // Donut arc (circular, not semi-circle)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (pct / 100) * circumference;

  return (
    <div className="card" style={{ padding: 32, borderLeft: `4px solid ${verdictColor}` }}>
      {/* Top row: verdict badge + reset */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: verdict === "succeed" ? "var(--green-l)" : verdict === "borderline" ? "var(--yellow-l)" : "var(--red-l)",
          border: `1px solid ${verdictColor}`,
          borderRadius: 20, padding: "6px 16px",
          fontSize: 14, fontWeight: 700, color: verdictColor,
        }}>
          {verdictIcon} {verdictLabel}
        </div>
        {onReset && (
          <button onClick={onReset} style={{ fontSize: 12, padding: "4px 12px", border: "1px solid var(--g300)", borderRadius: 6, background: "var(--g50)", color: "var(--g600)", cursor: "pointer", fontWeight: 500 }}>↺ Reset</button>
        )}
      </div>

      {/* Description */}
      <div style={{ fontSize: 14.5, color: "var(--g700)", lineHeight: 1.6, marginBottom: 24 }}>
        {description}
      </div>

      {/* Main content: donut + stats */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 40, flexWrap: "wrap" }}>
        {/* Donut gauge */}
        <div style={{ width: 140, height: 140, position: "relative", flexShrink: 0 }}>
          <svg viewBox="0 0 128 128" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
            <circle cx="64" cy="64" r={radius} fill="none" stroke="var(--g100)" strokeWidth="12" />
            <circle cx="64" cy="64" r={radius} fill="none" stroke={verdictColor} strokeWidth="12"
              strokeLinecap="round" strokeDasharray={`${strokeDash} ${circumference}`} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: verdictColor, lineHeight: 1 }}>{Math.round(score)}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--g500)", letterSpacing: "0.05em", marginTop: 4 }}>SUCCESS SCORE</div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px 24px" }}>
            <StatBlock label="Predicted buyers" value={buy.toLocaleString()} sub={`of ${n.toLocaleString()} simulated`} color="var(--g900)" />
            <StatBlock label="Conversion rate" value={`${conversionRate}%`} color={verdictColor} />
            <StatBlock label="Avg. propensity" value={`${Math.round(avgPropensity * 100)}%`} color="var(--g900)" />
          </div>
          <div style={{ marginTop: 20 }}>
            <StatBlock label="Modelled revenue" value={`$${revenue.toLocaleString()}`} sub={buy > 0 ? `at $${avgPrice} each` : ""} color="var(--blue)" />
          </div>
        </div>
      </div>

      {results?.harness && <HarnessBand harness={results.harness} />}
    </div>
  );
}

function StatBlock({ label, value, sub, color }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--g500)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || "var(--g900)", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--g400)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function HarnessBand({ harness }) {
  const lo = Math.round((harness.buy_rate_ci95?.[0] ?? 0) * 100);
  const hi = Math.round((harness.buy_rate_ci95?.[1] ?? 0) * 100);
  const mid = Math.round((harness.buy_rate ?? 0) * 100);
  return (
    <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--g50, #f8f9fb)", border: "1px solid var(--border)", borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15 }}>🔁</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Harness confidence</span>
        <span style={{ fontSize: 12, color: "var(--g500)" }}>{harness.loops}× loops on {(harness.sample_size ?? 0).toLocaleString()} sampled customers</span>
      </div>
      <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--g500)", marginBottom: 4 }}>Buy-rate (95% CI)</div>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>{mid}% <span style={{ fontSize: 14, fontWeight: 600, color: "var(--g500)" }}>±{harness.margin_pct}%</span></div>
          <div style={{ fontSize: 11.5, color: "var(--g400)", marginTop: 2 }}>ranges {lo}%–{hi}%</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--g500)", marginBottom: 4 }}>Fence-sitters</div>
          <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, color: "var(--yellow, #b06000)" }}>{(harness.fence_sitters ?? 0).toLocaleString()}</div>
          <div style={{ fontSize: 11.5, color: "var(--g400)", marginTop: 2 }}>{harness.fence_sitter_pct}% flip between loops</div>
        </div>
      </div>
    </div>
  );
}
