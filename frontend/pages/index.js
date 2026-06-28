import Link from "next/link";

export default function Home() {
  return (
    <div className="fade-in">
      <div className="hero">
        <div className="land-badge">✨ Synthetic market research, on demand</div>
        <h1>Test any launch against a <span className="grad">swarm of synthetic customers</span></h1>
        <p>Market Swarm simulates thousands of data-grounded customers so you can predict whether a new product will succeed or fail — before spending a rupee on live experiments.</p>
        <div className="land-cta">
          <Link href="/simulator" className="btn-primary" style={{ textDecoration: "none" }}>▶ Start MarketSwarm</Link>
          <Link href="/contact" className="btn-ghost" style={{ textDecoration: "none" }}>✉ Contact us</Link>
        </div>
      </div>

      <div className="land-stats" style={{ marginBottom: 32 }}>
        {[["1000s","synthetic customers / run"],["360°","customer data signals"],["<1s","to a success verdict"],["API","powered by Amazon Bedrock"]].map(([v,l]) => (
          <div key={l} className="land-stat"><div className="land-stat-v">{v}</div><div className="land-stat-l">{l}</div></div>
        ))}
      </div>

      <div className="section-title">What it does</div>
      <h2 className="section-h">Everything you need to pressure-test a launch</h2>
      <div className="feat-grid">
        {[
          ["👥","Build any cohort","Dial in the number of customers, gender split, age range and behavioural traits — from early adopters to the risk-averse."],
          ["🎯","Model your product","Set price, product–market fit, marketing push, innovation and brand strength to match the launch you're planning."],
          ["📊","Get a success verdict","A single success score and a clear succeed / borderline / fail call, backed by predicted conversion and revenue."],
          ["🟢","See the whole population","A live swarm of dots shows every simulated customer, coloured by who buys, who hesitates and who walks away."],
          ["📈","Charts that explain why","Propensity distribution and conversion by cohort break the verdict down into patterns you can act on."],
          ["🗄️","Grounded in real signals","Transactions, reviews, returns, billing, support and more feed each synthetic customer's behaviour."],
        ].map(([ic,t,d],i) => (
          <div key={i} className="card feat">
            <div className="feat-ic">{ic}</div>
            <div className="feat-t">{t}</div>
            <div className="feat-d">{d}</div>
          </div>
        ))}
      </div>

      <div className="section-title">How it works</div>
      <h2 className="section-h">From parameters to prediction in four steps</h2>
      <div className="steps" style={{ marginBottom: 48 }}>
        {[
          ["Configure","Set your cohort, budget, product and sales context using the filters."],
          ["Confirm","Review your chosen parameters in a quick confirmation step before running."],
          ["Simulate","The swarm generates thousands of synthetic customers and scores each one's intent."],
          ["Decide","Read the verdict, explore the swarm and charts, then refine and run again."],
        ].map(([t,d],i) => (
          <div key={i} className="card step">
            <div className="step-n">{i+1}</div>
            <div className="step-t">{t}</div>
            <div className="step-d">{d}</div>
          </div>
        ))}
      </div>

      <div className="section-title">Customer data we use</div>
      <h2 className="section-h">8 signals feeding every synthetic customer</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          ["🛒","Transactions","Frequency, recency, value and basket mix — the backbone of spend behaviour.","#6366f1"],
          ["⭐","Reviews & ratings","Star ratings, sentiment and product affinity from what customers say.","#f59e0b"],
          ["💬","Feedback & surveys","NPS, CSAT and free-text themes that reveal motivations and friction.","#10b981"],
          ["↩️","Returns","Return reasons and rates — a strong negative signal for fit.","#ef4444"],
          ["📄","Contracts","Tenure, terms, renewals and upgrades that show commitment.","#8b5cf6"],
          ["🧾","Billing","Plan, payment health and dunning, a proxy for budget and reliability.","#0ea5e9"],
          ["🎧","Support tickets","Volume, severity and resolution effort — early churn indicators.","#ec4899"],
          ["💰","Budget & income","Estimated disposable budget used to test price sensitivity.","#14b8a6"],
        ].map(([ic, t, d, color], i) => (
          <div
            key={i}
            className="card"
            style={{
              padding: "18px 16px",
              position: "relative",
              borderTop: `3px solid ${color}`,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `${color}1a`,
                color: color,
                display: "grid",
                placeItems: "center",
                fontSize: 18,
                marginBottom: 10,
              }}
            >{ic}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: "var(--g900)" }}>{t}</div>
            <div style={{ fontSize: 12.5, color: "var(--g500)", lineHeight: 1.5 }}>{d}</div>
          </div>
        ))}
      </div>

      {/* Funnel arrow into the hub */}
      <div style={{ display: "grid", placeItems: "center", margin: "8px 0" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div style={{ width: 2, height: 28, background: "linear-gradient(to bottom, #cfe0fb, var(--blue))" }} />
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "10px solid var(--blue)",
            }}
          />
        </div>
      </div>

      {/* Central hub */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)",
          color: "#fff",
          borderRadius: 18,
          padding: "28px 32px",
          boxShadow: "0 20px 48px -16px rgba(37,99,235,.45)",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 24,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: "rgba(255,255,255,.15)",
            border: "2px solid rgba(255,255,255,.4)",
            display: "grid",
            placeItems: "center",
            fontSize: 38,
            flexShrink: 0,
          }}
        >🧬</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: .85, marginBottom: 6 }}>360° Customer Profile</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, lineHeight: 1.2 }}>Aggregated into a per-customer synthetic profile</div>
          <div style={{ fontSize: 14, opacity: .9, lineHeight: 1.6, maxWidth: 720 }}>
            All 8 signals are fused into a single behavioural fingerprint per customer — propensities, price sensitivity, channel affinity, churn risk and lifetime value — ready for the swarm to pressure-test your launch.
          </div>
        </div>
      </div>

      {/* Arrow to output */}
      <div style={{ display: "grid", placeItems: "center", margin: "8px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: 2, height: 28, background: "linear-gradient(to bottom, var(--blue), #cfe0fb)" }} />
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "10px solid #cfe0fb",
            }}
          />
        </div>
      </div>

      {/* Output row — 3 tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 48,
        }}
      >
        {[
          ["🎯","Targets the right buyers","Rank top customers by predicted intent."],
          ["💲","Calibrates the right price","Sweep price points for max revenue."],
          ["🧩","Surfaces the best segment","See which audience your launch resonates with."],
        ].map(([ic, t, d], i) => (
          <div
            key={i}
            className="card"
            style={{ padding: "18px 18px", textAlign: "left", display: "flex", gap: 14, alignItems: "flex-start" }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#eef4ff",
                color: "var(--blue)",
                display: "grid",
                placeItems: "center",
                fontSize: 20,
                flexShrink: 0,
              }}
            >{ic}</div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4, color: "var(--g900)" }}>{t}</div>
              <div style={{ fontSize: 12.5, color: "var(--g500)", lineHeight: 1.5 }}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="land-final">
        <h2>Ready to see your launch through the swarm?</h2>
        <p>No setup, no data upload. Open the simulator and run your first scenario in seconds.</p>
        <Link href="/simulator" className="btn-primary" style={{ textDecoration: "none" }}>▶ Start MarketSwarm</Link>
      </div>
    </div>
  );
}
