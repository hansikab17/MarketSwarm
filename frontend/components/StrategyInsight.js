const META = {
  customers: { icon: "🎯", accent: "#1a73e8" },
  price: { icon: "💲", accent: "#1e8e3e" },
  segment: { icon: "🧩", accent: "#9334e6" },
};

function PropBar({ value, accent }) {
  const pct = Math.max(0, Math.min(100, Math.round((value || 0) * 100)));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--g100)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: accent, borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--g500)", width: 34, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

export default function StrategyInsight({ insight }) {
  if (!insight) return null;
  const meta = META[insight.strategy] || META.customers;
  const accent = meta.accent;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", fontSize: 20, background: `${accent}1a` }}>{meta.icon}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{insight.title}</div>
          <div style={{ fontSize: 13, color: "var(--g500)", marginTop: 2 }}>{insight.summary}</div>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {insight.strategy === "customers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(insight.top_customers || []).map((c, i) => (
              <div key={c.customer_id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 10, background: i % 2 ? "transparent" : "var(--g50, #f8f9fb)" }}>
                <span style={{ width: 22, fontSize: 13, fontWeight: 700, color: "var(--g500)" }}>{i + 1}</span>
                <span style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, color: "#fff", background: accent }}>
                  {(c.name || "?").charAt(0)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--g500)" }}>{c.top_category || c.customer_id}</div>
                </div>
                <PropBar value={c.propensity} accent={accent} />
                <span style={{ fontSize: 13, fontWeight: 700, width: 80, textAlign: "right" }}>${(c.expected_spend || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {insight.strategy === "price" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, color: "var(--g500)", fontWeight: 600 }}>Recommended price</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1.1 }}>${(insight.recommended_price || 0).toFixed(2)}</span>
              </div>
              <span style={{ fontSize: 12.5, color: "var(--g500)", alignSelf: "flex-end", marginBottom: 4 }}>vs. current ${(insight.base_price || 0).toFixed(2)}</span>
            </div>

            {/* Bars */}
            <div style={{ display: "flex", gap: 14, alignItems: "flex-end", height: 150 }}>
              {(insight.price_points || []).map((p, i) => {
                const max = Math.max(...(insight.price_points || []).map(x => x.revenue || 0)) || 1;
                const h = Math.max(8, Math.round((p.revenue / max) * 110));
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: p.recommended ? accent : "var(--g600, #5f6368)", marginBottom: 6 }}>${Math.round(p.revenue).toLocaleString()}</span>
                    <div title={`${p.buyers} buyers`} style={{ width: "100%", maxWidth: 64, height: h, borderRadius: "8px 8px 0 0", background: p.recommended ? accent : "var(--g200, #dfe3ea)", boxShadow: p.recommended ? `0 2px 8px ${accent}55` : "none", transition: "height .2s" }} />
                  </div>
                );
              })}
            </div>

            {/* Axis labels — separate row so they always align */}
            <div style={{ display: "flex", gap: 14, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border, #e6e9ee)" }}>
              {(insight.price_points || []).map((p, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 13.5, fontWeight: p.recommended ? 800 : 600, color: p.recommended ? accent : "var(--g900, #202124)" }}>${p.price.toFixed(0)}</div>
                  <div style={{ fontSize: 11, color: "var(--g500)", marginTop: 1 }}>{p.delta > 0 ? `+${p.delta}%` : `${p.delta}%`}{p.recommended ? " · best" : ""}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11.5, color: "var(--g500)", marginTop: 12, textAlign: "center" }}>Projected launch revenue by price point (bar height = revenue)</div>
          </div>
        )}

        {insight.strategy === "segment" && (
          <div>
            {insight.best_segment && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 12, background: `${accent}12`, border: `1px solid ${accent}33`, marginBottom: 16 }}>
                <div style={{ fontSize: 22 }}>🏆</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--g500)", fontWeight: 600 }}>{insight.best_segment.dimension}</div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{insight.best_segment.name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: accent }}>{Math.round((insight.best_segment.propensity || 0) * 100)}%</div>
                  <div style={{ fontSize: 11.5, color: "var(--g500)" }}>propensity · n={insight.best_segment.n}</div>
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(insight.ranked_segments || []).map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 10, background: i % 2 ? "transparent" : "var(--g50, #f8f9fb)" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--g500)", width: 64 }}>{s.dimension}</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>{s.name}</span>
                  <span style={{ fontSize: 12, color: "var(--g500)", width: 48, textAlign: "right" }}>n={s.n}</span>
                  <PropBar value={s.propensity} accent={accent} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
