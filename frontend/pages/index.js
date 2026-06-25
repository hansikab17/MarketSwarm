import Link from "next/link";

export default function Home() {
  return (
    <div className="fade-in">
      <div className="hero">
        <div className="land-badge">✨ Synthetic market research, on demand</div>
        <h1>Test any launch against a <span className="grad">swarm of synthetic customers</span></h1>
        <p>Market Swarm simulates thousands of data-grounded customers so you can predict whether a new product will succeed or fail — before spending a rupee on live experiments.</p>
        <div className="land-cta">
          <Link href="/simulator" className="btn-primary" style={{ textDecoration: "none" }}>▶ Launch the simulator</Link>
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

      <div className="land-final">
        <h2>Ready to see your launch through the swarm?</h2>
        <p>No setup, no data upload. Open the simulator and run your first scenario in seconds.</p>
        <Link href="/simulator" className="btn-primary" style={{ textDecoration: "none" }}>▶ Launch the simulator</Link>
      </div>
    </div>
  );
}
