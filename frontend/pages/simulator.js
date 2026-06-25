import { useState, useCallback, useEffect, useRef } from "react";
import { createScenario, startRun, getRun, getResults, getAgents } from "@/lib/api";
import ConfigModal from "@/components/ConfigModal";
import SwarmDots from "@/components/SwarmDots";
import VerdictGauge from "@/components/VerdictGauge";
import PropensityChart from "@/components/PropensityChart";
import CohortChart from "@/components/CohortChart";
import ReconcileCard from "@/components/ReconcileCard";
import LivePanel from "@/components/LivePanel";

export default function SimulatorPage() {
  // Config state (all filters from the HTML template)
  const [config, setConfig] = useState({
    productName: "", productDesc: "", productImg: null,
    humanPct: 20,
    count: 5000, genderSplit: 50, ageMin: 25, ageMax: 44,
    chars: { earlyAdopter: true, priceSensitive: true, brandLoyal: false, riskAverse: false },
    budget: 120, price: 89,
    fit: 62, marketing: 60, innovation: 55, brandFit: 58,
    history: "mixed",
    // Backend-supported fields
    priceChange: 0, category: "all", segments: [], gender: "all",
    incomeGroups: [], offerType: "none", offerValue: 0, channel: "all",
  });
  const [configured, setConfigured] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Run state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [run, setRun] = useState(null);
  const [results, setResults] = useState(null);
  const [agents, setAgents] = useState(null);
  const [liveAgents, setLiveAgents] = useState(null);
  const [humanVotes, setHumanVotes] = useState(null);
  const pollRef = useRef(null);

  const pollStatus = useCallback(async (runId) => {
    try {
      const data = await getRun(runId);
      setRun(data);

      // Fetch partial agents while running for live dots
      if (data.status === "running" || data.status === "done") {
        try {
          const partialAgents = await getAgents(runId);
          setLiveAgents(partialAgents);
        } catch (_) { /* ignore partial fetch errors */ }
      }

      if (data.status === "done") {
        clearInterval(pollRef.current);
        const [res, agentData] = await Promise.all([getResults(runId), getAgents(runId)]);
        setResults(res);
        setAgents(agentData);
        setLiveAgents(null);
        setLoading(false);
      } else if (data.status === "failed") {
        clearInterval(pollRef.current);
        setError(data.error || "Simulation failed");
        setLoading(false);
      }
    } catch (e) {
      clearInterval(pollRef.current);
      setError(e.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleRun = async () => {
    if (!configured) { setShowConfig(true); return; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setLoading(true);
    setError(null);
    setRun(null);
    setResults(null);
    setAgents(null);
    setLiveAgents(null);
    setHumanVotes(null);
    try {
      const scenario = await createScenario({
        name: config.productName || "Unnamed product",
        product_name: config.productName || "Unnamed product",
        product_description: config.productDesc || "",
        product_price: config.price,
        price_change_pct: config.priceChange || 0,
        product_market_fit: config.fit,
        marketing_push: config.marketing,
        innovation: config.innovation,
        brand_strength: config.brandFit,
        history_signal: config.history,
        target_category: config.category || "all",
        target_gender: config.gender || "all",
        offer: { type: config.offerType || "none", value_pct: config.offerValue || 0 },
        channel: config.channel || "all",
      });
      const runData = await startRun(scenario.scenario_id, config.count, config.humanPct);
      setRun(runData);
      pollRef.current = setInterval(() => pollStatus(runData.run_id), 1500);
      pollStatus(runData.run_id);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRun(null); setResults(null); setAgents(null); setLiveAgents(null); setHumanVotes(null); setError(null);
  };

  const agentList = Array.isArray(agents) ? agents : agents?.items || [];

  return (
    <div className="fade-in">
      <div className="sim-wrap">
        {error && (
          <div style={{ background: "var(--red-l)", border: "1px solid #f5c6cb", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "var(--red)" }}>
            ⚠ {error}
          </div>
        )}

        {/* Action bar */}
        <div className="card" style={{ padding: 16 }}>
          {loading ? (
            <div className="action-bar">
              <button className="act-btn finish" onClick={async () => {
                clearInterval(pollRef.current);
                try {
                  if (run?.run_id) {
                    const [res, agentData] = await Promise.all([getResults(run.run_id), getAgents(run.run_id)]);
                    setResults(res);
                    setAgents(agentData);
                    setLiveAgents(null);
                  }
                } catch (_) {}
                setLoading(false);
              }}>
                ✓ Finish now &amp; see results
              </button>
              <button className="act-btn ghost" onClick={() => { clearInterval(pollRef.current); handleReset(); setLoading(false); }}>
                ✕ Cancel run
              </button>
            </div>
          ) : (
            <div className="action-bar">
              <button className="act-btn config" onClick={() => setShowConfig(true)}>
                🎛️ {configured ? "Reconfigure product" : "Configure a product"}
              </button>
              <button className={`act-btn run${configured ? "" : " disabled"}`} onClick={handleRun}>
                ▶ Run Market Swarm Simulation
              </button>
            </div>
          )}
          <div className="action-summary">
            {configured
              ? `"${config.productName || "Unnamed product"}" · ${config.count.toLocaleString()} panel · ${config.humanPct}% human / ${100 - config.humanPct}% agent`
              : "Configure a product first, then run the blended human + agent simulation."}
          </div>
        </div>

        {/* Live panel while running */}
        {loading && (
          <div style={{ marginTop: 22 }}>
            {run ? (
              <LivePanel run={run} config={config} agents={liveAgents} />
            ) : (
              <div className="card" style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 14, color: "var(--g500)" }}>Starting simulation...</div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {!loading && results && (
          <div className="stack" style={{ marginTop: 22 }}>
            {results.reconciliation && <ReconcileCard results={results} />}
            <VerdictGauge results={results} onReset={handleReset} />
            {agentList.length > 0 && <SwarmDots agents={agentList} totalAgents={results.headline?.n_agents} />}
            {agentList.length > 0 && <PropensityChart agents={agentList} />}
            <div className="chart-grid">
              {results.cohorts?.by_gender && <CohortChart title="By Gender" data={results.cohorts.by_gender} subtitle="Propensity and churn by gender" />}
              {results.cohorts?.by_income_tier && <CohortChart title="By Income Tier" data={results.cohorts.by_income_tier} subtitle="Propensity and churn by income tier" />}
              {results.cohorts?.by_category && <CohortChart title="By Category" data={results.cohorts.by_category} subtitle="Propensity and churn by top category" />}
              {results.cohorts?.by_channel && <CohortChart title="By Channel" data={results.cohorts.by_channel} subtitle="Propensity and churn by preferred channel" />}
            </div>
            <div className="disclaimer">⚠ Simulated prediction — not a guarantee. Validate with the backtest harness before acting on these numbers.</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !results && (
          <div className="card empty" style={{ marginTop: 22 }}>
            <div className="empty-ic">🎛️</div>
            <div className="empty-t">{configured ? "Ready to run" : "Configure a product to begin"}</div>
            <div className="empty-s" dangerouslySetInnerHTML={{
              __html: configured
                ? 'Press <b>Run Market Swarm Simulation</b>. Agents compute instantly; human responses are collected live over a 10-minute window, with results refreshing every 5 seconds.'
                : 'Press <b>Configure a product</b> to set the product, the human/agent mix and the audience. Then run the blended simulation.'
            }} />
          </div>
        )}
      </div>

      {showConfig && (
        <ConfigModal
          config={config}
          onChange={setConfig}
          onSave={() => { setConfigured(true); setShowConfig(false); }}
          onCancel={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}
