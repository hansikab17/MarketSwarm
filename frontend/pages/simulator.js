import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createScenario, startRun, getRun, getResults, getAgents, reconcileRun, getVotes } from "@/lib/api";
import { getBus, busPost } from "@/lib/swarmBus";
import ConfigModal from "@/components/ConfigModal";
import SwarmDots from "@/components/SwarmDots";
import VerdictGauge from "@/components/VerdictGauge";
import PropensityChart from "@/components/PropensityChart";
import CohortChart from "@/components/CohortChart";
import ReconcileCard from "@/components/ReconcileCard";
import LivePanel from "@/components/LivePanel";
import ManagerDock from "@/components/ManagerDock";

export default function SimulatorPage() {
  // Config state (all filters from the HTML template) — pre-filled with AuroraBuds default
  const [config, setConfig] = useState({
    productName: "AuroraBuds \u2014 Smart Sleep Earbuds",
    productDesc: "Wireless sleep earbuds that actively mask ambient noise with adaptive soundscapes and gently track your sleep stages through the night. Featherlight silicone tips stay comfortable for side-sleepers, battery lasts a full 9-hour night, and a smart alarm wakes you in your lightest sleep phase. Built for frequent travellers, light sleepers and anyone chasing better rest.",
    productImg: null,
    productDoc: [
      "AuroraBuds \u2014 Smart Sleep Earbuds \u00b7 Product Documentation",
      "",
      "OVERVIEW",
      "AuroraBuds are wireless in-ear earbuds designed specifically for sleep, not music-first listening. They combine adaptive noise masking with gentle sleep-stage tracking to help light sleepers and travellers fall asleep faster and wake up more refreshed.",
      "",
      "KEY FEATURES",
      "- Adaptive soundscapes: 20 built-in masking tracks (rain, brown noise, ocean, fan) that auto-adjust volume to cover sudden ambient noises like snoring or traffic.",
      "- Sleep-stage tracking: on-board sensors estimate light, deep and REM stages and sync to the AuroraSleep app each morning.",
      "- Smart alarm: wakes you during your lightest sleep phase within a 30-minute window so you feel less groggy.",
      "- Comfort fit: featherlight 3.2g body with 4 silicone tip sizes, designed to stay put for side-sleepers.",
      "- Battery: 9 hours continuous on a single charge; the charging case adds 3 full nights. USB-C, 10-min quick charge gives 2 hours.",
      "",
      "PRICE & AVAILABILITY",
      "AuroraBuds retail at $89. Launch colours are Midnight and Mist. A 30-night risk-free trial is included, with free returns.",
      "",
      "COMFORT & SAFETY",
      "The earbuds use low-volume masking capped at a sleep-safe level. They are sweat-resistant (IPX4) but not for swimming. Materials are hypoallergenic medical-grade silicone.",
      "",
      "WARRANTY & SUPPORT",
      "Every pair includes a 1-year limited warranty covering manufacturing defects. Support is available via the app chat and email within 24 hours.",
      "",
      "WHO IT\u2019S FOR",
      "Best for light sleepers, people with snoring partners, shift workers, and frequent travellers who struggle to sleep in noisy or unfamiliar places."
    ].join("\n"),
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
  const [configured, setConfigured] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Run state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [run, setRun] = useState(null);
  const [results, setResults] = useState(null);
  const [agents, setAgents] = useState(null);
  const [liveAgents, setLiveAgents] = useState(null);
  const [humanVotes, setHumanVotes] = useState(null);
  const [liveVotes, setLiveVotes] = useState({ yes: 0, never: 0, unsure: 0 });
  const [customerVotes, setCustomerVotes] = useState({}); // { cust_01: "yes", cust_02: "never", ... }
  const [mgrThreads, setMgrThreads] = useState([]);
  const votePollRef = useRef(null);
  const pollRef = useRef(null);

  // BroadcastChannel: listen for survey tab messages
  useEffect(() => {
    const bus = getBus();
    if (!bus) return;
    function handler(ev) {
      const m = ev.data || {};
      if (m.type === "presence-ping") {
        // Survey tab announced itself — send current product config
        busPost({ type: "product-sync", product: { name: config.productName, desc: config.productDesc, img: config.productImg, doc: config.productDoc || "" } });
      } else if (m.type === "human-vote") {
        // Live vote from a survey respondent
        const voteKey = m.vote === "yes" ? "yes" : m.vote === "never" ? "never" : "unsure";
        setLiveVotes(prev => ({ ...prev, [voteKey]: prev[voteKey] + 1 }));
        // Track per-customer vote for reconciliation
        if (m.respondent) {
          setCustomerVotes(prev => ({ ...prev, [m.respondent]: m.vote }));
        }
      } else if (m.type === "escalation") {
        // A survey respondent wants to ask a human (PM)
        setMgrThreads(prev => [...prev, { id: m.id, question: m.question, from: m.from, respondent: m.respondent, answered: false, answer: "" }]);
      }
    }
    bus.onmessage = handler;
    return () => { bus.onmessage = null; };
  }, [config.productName, config.productDesc, config.productImg, config.productDoc]);

  // Poll backend for vote tally (real-time from DynamoDB)
  useEffect(() => {
    if (!run?.run_id || (!loading && run?.status === "done")) {
      if (votePollRef.current) { clearInterval(votePollRef.current); votePollRef.current = null; }
      return;
    }
    const pollVotes = async () => {
      try {
        const data = await getVotes(run.run_id);
        if (data?.tally) {
          setLiveVotes({
            yes: data.tally.yes || 0,
            never: data.tally.never || 0,
            unsure: data.tally.not_sure || 0,
          });
        }
        if (data?.votes) {
          const map = {};
          data.votes.forEach(v => { map[v.customer_id] = v.vote; });
          setCustomerVotes(map);
        }
      } catch (_) {}
    };
    votePollRef.current = setInterval(pollVotes, 3000);
    pollVotes();
    return () => { if (votePollRef.current) clearInterval(votePollRef.current); };
  }, [run?.run_id, loading]);

  // Broadcast survey links data to _app.js header popup
  useEffect(() => {
    if (!run?.run_id || !run?.human_customers?.length) return;
    busPost({
      type: "survey-links-update",
      runId: run.run_id,
      customers: run.human_customers,
      votes: customerVotes,
    });
  }, [run?.run_id, run?.human_customers, customerVotes]);

  const pollStatus = useCallback(async (runId) => {
    try {
      const data = await getRun(runId);
      setRun(data);

      // Fetch partial agents while running or waiting for humans
      if (data.status === "running" || data.status === "waiting_for_humans" || data.status === "done") {
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
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (votePollRef.current) clearInterval(votePollRef.current);
    };
  }, []);

  const handleRun = async () => {
    if (!configured) { setShowConfig(true); return; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (votePollRef.current) { clearInterval(votePollRef.current); votePollRef.current = null; }
    setLoading(true);
    setError(null);
    setRun(null);
    setResults(null);
    setAgents(null);
    setLiveAgents(null);
    setHumanVotes(null);
    setLiveVotes({ yes: 0, never: 0, unsure: 0 });
    setCustomerVotes({});
    setMgrThreads([]);
    // Broadcast run-started to survey tabs (resets their votes)
    busPost({ type: "run-started", product: { name: config.productName, desc: config.productDesc, img: config.productImg, doc: config.productDoc || "" } });
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
      // Broadcast runId to survey tabs so they can POST votes to the correct run
      busPost({ type: "run-id-sync", runId: runData.run_id });
      pollRef.current = setInterval(() => pollStatus(runData.run_id), 1500);
      pollStatus(runData.run_id);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRun(null); setResults(null); setAgents(null); setLiveAgents(null); setHumanVotes(null); setError(null);
    setCustomerVotes({}); setLiveVotes({ yes: 0, never: 0, unsure: 0 });
    if (votePollRef.current) { clearInterval(votePollRef.current); votePollRef.current = null; }
    // Notify open survey pages that the survey is closed
    busPost({ type: "survey-closed" });
    // Clear survey links in header
    busPost({ type: "survey-links-update", runId: null, customers: [], votes: {} });
  };

  // Broadcast survey-closed when simulator page is refreshed or closed
  useEffect(() => {
    const onUnload = () => { busPost({ type: "survey-closed" }); };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const agentList = useMemo(() => {
    const raw = Array.isArray(agents) ? agents : agents?.items || [];
    if (!raw.length || !Object.keys(customerVotes).length) return raw;
    // Override predicted_action for agents whose human vote arrived
    return raw.map(a => {
      const vote = customerVotes[a.customer_id];
      if (!vote) return a;
      const action = vote === "yes" ? "buy" : vote === "never" ? "leave" : "hold";
      return { ...a, predicted_action: action };
    });
  }, [agents, customerVotes]);

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
                if (votePollRef.current) { clearInterval(votePollRef.current); votePollRef.current = null; }
                // Close survey pages for this run
                busPost({ type: "survey-closed" });
                try {
                  if (run?.run_id) {
                    let finalResults = null;
                    let agentData = null;

                    // If we have real human votes, reconcile first (forces backend to compute results)
                    if (Object.keys(customerVotes).length > 0) {
                      try {
                        const reconciled = await reconcileRun(run.run_id, customerVotes);
                        if (reconciled?.results) finalResults = reconciled.results;
                      } catch (reconcileErr) {
                        console.warn("Reconcile failed:", reconcileErr);
                      }
                    }

                    // Try to get results from backend
                    if (!finalResults) {
                      try {
                        finalResults = await getResults(run.run_id);
                      } catch (_) {}
                    }

                    // Get agent data
                    try {
                      agentData = await getAgents(run.run_id);
                    } catch (_) {}

                    // Fall back to partial agent data if backend results aren't ready
                    if (!agentData && liveAgents) {
                      agentData = liveAgents;
                    }

                    // If still no results but we have agent data, build results client-side
                    if (!finalResults && agentData) {
                      const items = Array.isArray(agentData) ? agentData : agentData?.items || [];
                      const buyCount = items.filter(a => a.predicted_action === "buy").length;
                      const holdCount = items.filter(a => a.predicted_action === "hold").length;
                      const leaveCount = items.filter(a => a.predicted_action === "leave").length;
                      const total = items.length || 1;
                      const buyRateFrac = buyCount / total;
                      const leaveRateFrac = leaveCount / total;
                      const avgPropensity = items.length > 0 ? items.reduce((s, a) => s + (a.propensity_to_buy || 0), 0) / items.length : 0;
                      const totalRevenue = items.reduce((s, a) => s + (a.expected_spend_usd || 0), 0);
                      const successScore = Math.max(0, Math.min(100, Math.round((buyRateFrac * 70 + avgPropensity * 100 * 0.3) - leaveRateFrac * 15)));
                      const verdict = successScore >= 50 ? "succeed" : successScore >= 30 ? "borderline" : "fail";
                      const humanYes = liveVotes?.yes || 0;
                      const humanNever = liveVotes?.never || 0;
                      const humanUnsure = liveVotes?.unsure || 0;
                      const humanTotal = humanYes + humanNever + humanUnsure;
                      const humanYesShare = humanTotal > 0 ? (humanYes + humanUnsure * 0.5) / humanTotal : buyRateFrac;
                      const absDiff = Math.abs(humanYesShare - buyRateFrac);
                      const sampleConf = Math.min(1.0, humanTotal / 5.0);
                      const devPct = Math.round(absDiff * sampleConf * 100);
                      const outcome = devPct <= 10 ? "sync" : devPct >= 40 ? "inconclusive" : "adjusted";
                      const blendWeight = outcome === "adjusted" ? sampleConf * 0.5 : 0;
                      const adjustedScore = outcome === "adjusted"
                        ? Math.round(successScore + (humanYesShare * 100 - successScore) * blendWeight)
                        : successScore;

                      // Build all 4 cohorts from agent data
                      const cohorts = {};
                      const ageGroups = {};
                      const genderGroups = {};
                      const incomeGroups = {};
                      const getAgeBucket = (age) => {
                        const v = parseInt(age) || 0;
                        if (v < 25) return "18-24";
                        if (v < 35) return "25-34";
                        if (v < 45) return "35-44";
                        if (v < 55) return "45-54";
                        if (v < 65) return "55-64";
                        return "65+";
                      };
                      const getIncomeTier = (income) => {
                        const v = parseFloat(income) || 0;
                        if (v < 35000) return "Low";
                        if (v < 60000) return "Lower-Mid";
                        if (v < 90000) return "Mid";
                        if (v < 140000) return "Upper-Mid";
                        return "High";
                      };
                      items.forEach(a => {
                        const ag = getAgeBucket(a.age);
                        const g = a.gender || "Unknown";
                        const inc = getIncomeTier(a.annual_income_usd);

                        [[ ageGroups, ag ], [ genderGroups, g ], [ incomeGroups, inc ]].forEach(([grp, key]) => {
                          if (!grp[key]) grp[key] = { propSum: 0, churnSum: 0, n: 0 };
                          grp[key].n++;
                          grp[key].propSum += (a.propensity_to_buy || 0);
                          grp[key].churnSum += (a.churn_probability || 0);
                        });
                      });
                      const buildCohort = (groups) => Object.entries(groups)
                        .filter(([name]) => name !== "Unknown")
                        .map(([name, v]) => ({
                          name, n: v.n,
                          propensity: v.n ? v.propSum / v.n : 0,
                          churn_pct: v.n ? (v.churnSum / v.n) * 100 : 0,
                        }));
                      cohorts.by_age = buildCohort(ageGroups);
                      cohorts.by_gender = buildCohort(genderGroups);
                      cohorts.by_income_tier = buildCohort(incomeGroups);

                      finalResults = {
                        headline: {
                          success_score: successScore,
                          verdict,
                          buy: buyCount,
                          hold: holdCount,
                          leave: leaveCount,
                          n_agents: total,
                          avg_propensity_to_buy: avgPropensity,
                          avg_churn_probability: 0,
                          expected_revenue_delta_usd: totalRevenue,
                        },
                        cohorts,
                        reconciliation: humanTotal > 0 || config.humanPct > 0 ? {
                          outcome,
                          deviation_pct: devPct,
                          deviation_count: 0,
                          adjusted_score: adjustedScore,
                          original_score: successScore,
                          agent_buy_rate: buyRateFrac,
                          human_yes_share: humanYesShare,
                          human_votes: { yes: humanYes, not_sure: humanUnsure, never: humanNever },
                          human_total: humanTotal,
                          agent_votes: { buy: buyCount, hold: holdCount, leave: leaveCount },
                          agent_total: total,
                          sample_confidence: sampleConf,
                        } : undefined,
                      };
                    }

                    if (finalResults) {
                      setResults(finalResults);
                      setAgents(agentData);
                      setLiveAgents(null);
                      setLoading(false);
                    } else {
                      setError("Results not ready yet — the simulation is still processing. Try again in a few seconds.");
                    }
                    return;
                  }
                } catch (e) {
                  setError(e.message || "Failed to fetch results");
                }
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
                🏛️ Configure Product
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
              <>
                <LivePanel run={run} config={config} agents={liveAgents} liveVotes={liveVotes} customerVotes={customerVotes} onTimerEnd={() => busPost({ type: "survey-closed" })} />
              </>
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
            {agentList.length > 0 && <SwarmDots agents={agentList} totalAgents={results.headline?.n_agents} customerVotes={customerVotes} />}
            {agentList.length > 0 && <PropensityChart agents={agentList} />}
            <div className="chart-grid">
              {results.cohorts?.by_age && <CohortChart title="By Age" data={results.cohorts.by_age} subtitle="Propensity and churn by age group" />}
              {results.cohorts?.by_gender && <CohortChart title="By Gender" data={results.cohorts.by_gender} subtitle="Propensity and churn by gender" />}
              {results.cohorts?.by_income_tier && <CohortChart title="By Income Tier" data={results.cohorts.by_income_tier} subtitle="Propensity and churn by income tier" />}
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

      {/* Manager dock — FAB always visible for answering escalated questions */}
      <ManagerDock threads={mgrThreads} onAnswer={(threadId, answer) => {
        setMgrThreads(prev => prev.map(t => t.id === threadId ? { ...t, answered: true, answer } : t));
      }} />
    </div>
  );
}
