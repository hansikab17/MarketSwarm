import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createScenario, startRun, getRun, getResults, getAgents, reconcileRun, getVotes, uploadRaagaDocsJson, buildRaagaIndex } from "@/lib/api";
import { getBus, busPost } from "@/lib/swarmBus";
import ConfigModal from "@/components/ConfigModal";
import SwarmDots from "@/components/SwarmDots";
import VerdictGauge from "@/components/VerdictGauge";
import PropensityChart from "@/components/PropensityChart";
import CohortChart from "@/components/CohortChart";
import ReconcileCard from "@/components/ReconcileCard";
import LivePanel from "@/components/LivePanel";
import ManagerDock from "@/components/ManagerDock";
import StrategyInsight from "@/components/StrategyInsight";

const AURORABUDS_DOC = [
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
].join("\n");

const DEFAULT_RAG_DOCS = [{
  doc_id: "default_aurorabuds",
  name: "AuroraBuds \u2014 Product Documentation.txt",
  content: AURORABUDS_DOC,
  size: AURORABUDS_DOC.length,
  isDefault: true,
}];

// Mirror of backend _build_strategy_insight for the early-finish (client-built) path.
function buildStrategyInsight(strategy, items, cohorts, basePrice) {
  const n = items.length;
  if (!n) return null;

  if (strategy === "price") {
    const buy = items.filter(a => a.predicted_action === "buy").length;
    const baseRate = buy / n;
    const avgProp = items.reduce((s, a) => s + (a.propensity_to_buy || 0), 0) / n;
    const elasticity = 1.6 - Math.min(1, Math.max(0, avgProp));
    const price0 = Number(basePrice) || 0;
    const points = [-20, -10, 0, 10, 20].map(delta => {
      const price = +(price0 * (1 + delta / 100)).toFixed(2);
      const demandMult = Math.max(0.05, 1 - elasticity * (delta / 100));
      const rate = Math.max(0, Math.min(0.99, baseRate * demandMult));
      const buyers = Math.round(rate * n);
      return { delta, price, buy_rate: +rate.toFixed(4), buyers, revenue: +(price * buyers).toFixed(2), recommended: false };
    });
    const best = price0 > 0 ? points.reduce((a, b) => (b.revenue > a.revenue ? b : a)) : points[2];
    best.recommended = true;
    const sign = best.delta > 0 ? "+" : "";
    return {
      strategy: "price", title: "Optimal price for your launch",
      summary: `Projected revenue peaks at $${best.price.toFixed(2)} (${sign}${best.delta}% vs $${price0.toFixed(2)}) with ~${best.buyers} buyers.`,
      base_price: +price0.toFixed(2), recommended_price: best.price, price_points: points,
    };
  }

  if (strategy === "segment") {
    const dims = [["by_gender", "Gender"], ["by_income_tier", "Income"]];
    const minN = Math.max(3, n * 0.02);
    const ranked = [];
    dims.forEach(([dim, label]) => (cohorts[dim] || []).forEach(seg => {
      if (!seg.name || seg.name === "Unknown" || seg.n < minN) return;
      ranked.push({ dimension: label, name: seg.name, propensity: seg.propensity || 0, buy_pct: Math.round(seg.buy_pct || 0), n: seg.n });
    }));
    ranked.sort((a, b) => b.propensity - a.propensity);
    const best = ranked[0] || null;
    return {
      strategy: "segment", title: "Best segment for your launch",
      summary: best
        ? `Best segment: ${best.dimension} · ${best.name} (propensity ${best.propensity.toFixed(2)}, n=${best.n}).`
        : "Not enough data to rank segments — try a larger sample.",
      best_segment: best, ranked_segments: ranked.slice(0, 6),
    };
  }

  // customers
  const ranked = [...items].sort((a, b) => (b.propensity_to_buy || 0) - (a.propensity_to_buy || 0));
  const top = ranked.slice(0, 10).map(d => ({
    customer_id: d.customer_id || "", name: d.name || d.customer_id || "",
    propensity: +(d.propensity_to_buy || 0).toFixed(4), expected_spend: +(d.expected_spend_usd || 0).toFixed(2),
    top_category: d.top_category || "",
  }));
  const high = items.filter(a => (a.propensity_to_buy || 0) >= 0.6).length;
  return {
    strategy: "customers", title: "Top customers for your launch",
    summary: `${high} of ${n} simulated customers are high-intent (propensity ≥ 0.60). Prioritise launch outreach to the ranked list below.`,
    high_intent_count: high, top_customers: top,
  };
}

export default function SimulatorPage() {
  // Config state (all filters from the HTML template) — pre-filled with AuroraBuds default
  const [config, setConfig] = useState({
    productName: "AuroraBuds \u2014 Smart Sleep Earbuds",
    productDesc: "Wireless sleep earbuds that actively mask ambient noise with adaptive soundscapes and gently track your sleep stages through the night. Featherlight silicone tips stay comfortable for side-sleepers, battery lasts a full 9-hour night, and a smart alarm wakes you in your lightest sleep phase. Built for frequent travellers, light sleepers and anyone chasing better rest.",
    productImg: null,
    productDoc: AURORABUDS_DOC,
    humanPct: 20,
    count: 5000, genderSplit: 50, ageMin: 25, ageMax: 44,
    loops: 1, confidenceSample: 500,
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
  const [ragDocs, setRagDocs] = useState(DEFAULT_RAG_DOCS);
  const [ragBuilt, setRagBuilt] = useState(false);
  const [scenarioId, setScenarioId] = useState(null);
  const [strategy, setStrategy] = useState("customers");
  const [strategyPicked, setStrategyPicked] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(true);

  const STRATEGY_OPTIONS = [
    {
      id: "customers",
      icon: "\uD83C\uDFAF",
      title: "TARGET top 10k customers for my product launch",
      desc: "Rank the most likely buyers so you can focus your launch outreach on the highest-propensity audience first.",
      btn: "TARGET top 10k customers",
    },
    {
      id: "price",
      icon: "\uD83D\uDCB2",
      title: "Find the right PRICE for my product launch",
      desc: "Sweep price points around your list price to find the one that maximises projected revenue and buyer count.",
      btn: "Find the right PRICE",
    },
    {
      id: "segment",
      icon: "\uD83E\uDDE9",
      title: "Find the right SEGMENT for my product launch",
      desc: "Compare audience segments (gender, income, age) and surface which one your product resonates with most.",
      btn: "Find the right SEGMENT",
    },
  ];
  const activeStrategy = STRATEGY_OPTIONS.find(o => o.id === strategy) || STRATEGY_OPTIONS[0];

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
        busPost({ type: "product-sync", product: { name: config.productName, desc: config.productDesc, img: config.productImg, doc: config.productDoc || "" }, scenarioId: scenarioId });
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
  }, [config.productName, config.productDesc, config.productImg, config.productDoc, scenarioId]);

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
      scenarioId: scenarioId,
      customers: run.human_customers,
      votes: customerVotes,
    });
  }, [run?.run_id, run?.human_customers, customerVotes, scenarioId]);

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
        // Session ended naturally → close all open survey pages (pending + submitted)
        busPost({ type: "survey-closed" });
      } else if (data.status === "failed") {
        clearInterval(pollRef.current);
        setError(data.error || "Simulation failed");
        setLoading(false);
        busPost({ type: "survey-closed" });
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
    busPost({ type: "run-started", product: { name: config.productName, desc: config.productDesc, img: config.productImg, doc: config.productDoc || "" }, scenarioId: scenarioId });
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
        strategy: strategy,
        loops: config.loops ?? 1,
        confidence_sample: config.confidenceSample ?? 0,
      });
      const runData = await startRun(scenario.scenario_id, config.count, config.humanPct, scenarioId || "");
      // Only adopt the run's scenario for Raaga if no RAG-indexed scenario exists.
      // If the user built a product knowledge base ("Update Product"), that scenario
      // holds the RAG index — keep using it so survey tabs can answer questions.
      setScenarioId((prev) => prev || scenario.scenario_id);
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
      <div className="sim-wrap" style={{ width: "min(100vw - 48px, 1360px)", maxWidth: "none", marginLeft: "50%", transform: "translateX(-50%)" }}>
        {error && (
          <div style={{ background: "var(--red-l)", border: "1px solid #f5c6cb", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "var(--red)" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 24, alignItems: "stretch", justifyContent: "center", flexWrap: "nowrap" }}>
          <div style={{ width: results ? "100%" : 905, maxWidth: "100%", minWidth: 0 }}>
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
                      finalResults.strategy_insight = buildStrategyInsight(strategy, items, cohorts, config.price);
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <span>🏛️</span>
                  <span>Configure Product</span>
                  <span aria-hidden style={{ width: 1, height: 18, background: "rgba(15,23,42,.12)" }} />
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 11px",
                      borderRadius: 8,
                      background: "#e8f0ff",
                      border: "1.5px solid #c4d8f7",
                      color: "#1558b0",
                      fontSize: 12.5,
                      fontWeight: 700,
                      letterSpacing: ".1px",
                    }}
                  >
                    {activeStrategy.btn}
                  </span>
                </span>
              </button>
              <button className={`act-btn run${configured ? "" : " disabled"}`} onClick={handleRun}>
                ▶ Run Market Swarm Simulation
              </button>
            </div>
          )}
          <div
            className="action-summary"
            style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}
          >
            <div style={{ justifySelf: "start" }}>
              {!loading && (
                <button
                  type="button"
                  onClick={() => setShowStrategyModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "#eef4ff",
                    border: "1px solid #cfe0fb",
                    color: "var(--blue)",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 12.5,
                    lineHeight: 1,
                    transition: "all .15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#dfeaff"; e.currentTarget.style.borderColor = "#a8c8f5"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#eef4ff"; e.currentTarget.style.borderColor = "#cfe0fb"; }}
                >
                  ⇄ Change strategy
                </button>
              )}
            </div>
            <div style={{ justifySelf: "center", textAlign: "center" }}>
              {configured ? (
                <>
                  <span style={{ fontWeight: 700, color: "var(--g900)" }}>“{config.productName || "Unnamed product"}”</span>
                  <span style={{ color: "var(--g300)", margin: "0 8px" }}>·</span>
                  <span>{config.count.toLocaleString()} panel</span>
                  <span style={{ color: "var(--g300)", margin: "0 8px" }}>·</span>
                  <span>{config.humanPct}% human / {100 - config.humanPct}% agent</span>
                </>
              ) : (
                "Configure a product first, then run the blended human + agent simulation."
              )}
            </div>
            <div />
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
            {run?.human_customers?.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f2f7ff", border: "1px solid #d7e3f7", borderRadius: 10, fontSize: 13.5, color: "#1558b0", fontWeight: 600 }}>
                <span style={{ fontSize: 15 }}>👥</span>
                {Object.keys(customerVotes).length} of {run.human_customers.length} human survey responses collected · survey closed
              </div>
            )}
            {results.reconciliation && <ReconcileCard results={results} />}
            <VerdictGauge results={results} onReset={handleReset} />
            {results.strategy_insight && <StrategyInsight insight={results.strategy_insight} />}
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
          <div
            className="card empty"
            style={{
              marginTop: 22,
              padding: "40px 32px",
              minHeight: 380,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div
              className="empty-ic"
              style={{ width: 72, height: 72, fontSize: 32, marginBottom: 18 }}
            >🎛️</div>
            <div className="empty-t" style={{ fontSize: 22 }}>
              {configured ? "Ready to run" : "Configure a product to begin"}
            </div>
            <div
              className="empty-s"
              style={{ fontSize: 15, marginTop: 10, maxWidth: 560, lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{
                __html: configured
                  ? 'Press <b>Run Market Swarm Simulation</b>. Agents compute instantly; human responses are collected live over a 10-minute window, with results refreshing every 5 seconds.'
                  : 'Press <b>Configure a product</b> to set the product, the human/agent mix and the audience. Then run the blended simulation.'
              }}
            />
          </div>
        )}
          </div>
          {!results && (
          <div className="card" style={{ flex: "0 0 380px", width: 380, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 18px", background: "#f2f7ff", color: "#1558b0", borderBottom: "1px solid #d7e3f7", fontWeight: 700, fontSize: 15 }}>
              <span style={{ fontSize: 17 }}>🌐</span>
              Show Customer Survey
            </div>
            {run?.human_customers?.length > 0 && results ? (
              /* Session ended → survey closed summary */
              <div style={{ flex: 1, minHeight: 320, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
                <div>
                  <div className="empty-ic" style={{ margin: "0 auto 14px", fontSize: 26 }}>🔒</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Survey closed</div>
                  <div style={{ fontSize: 13, color: "var(--g500)", marginTop: 6, lineHeight: 1.5, maxWidth: 260 }}>
                    The simulation has ended — the survey is no longer accepting responses.
                  </div>
                  <div style={{ marginTop: 18, display: "inline-flex", flexDirection: "column", gap: 4, padding: "14px 26px", background: "#f2f7ff", border: "1px solid #d7e3f7", borderRadius: 12 }}>
                    <span style={{ fontSize: 30, fontWeight: 800, color: "#1558b0", lineHeight: 1 }}>
                      {Object.keys(customerVotes).length}
                      <span style={{ fontSize: 17, color: "var(--g500)", fontWeight: 600 }}> / {run.human_customers.length}</span>
                    </span>
                    <span style={{ fontSize: 12, color: "var(--g500)" }}>responses collected</span>
                  </div>
                </div>
              </div>
            ) : run?.human_customers?.length > 0 ? (
              <>
                <div className="survey-links-list" style={{ flex: 1, maxHeight: "none" }}>
                  {run.human_customers.map((h, i) => {
                    const voted = customerVotes[h.customer_id];
                    const url = `/survey?runId=${run.run_id}&custId=${h.customer_id}&name=${encodeURIComponent(h.name || h.customer_id)}&gender=${encodeURIComponent(h.gender || "")}`;
                    return (
                      <div key={h.customer_id} className="survey-link-row">
                        <span className="survey-link-num">{i + 1}</span>
                        <span className="survey-link-avatar" style={{ background: h.gender === "Female" ? "#ea4c89" : "var(--blue)" }}>
                          {(h.name || h.customer_id).charAt(0)}
                        </span>
                        <div className="survey-link-info">
                          <div className="survey-link-name">{h.name || h.customer_id}</div>
                          <div className="survey-link-id">{h.customer_id}</div>
                        </div>
                        {voted ? (
                          <span className="survey-link-status done">✓ {voted}</span>
                        ) : (
                          <span className="survey-link-status pending">pending</span>
                        )}
                        <a href={url} target="_blank" rel="noopener noreferrer" className="survey-link-open" title="Open survey">↗</a>
                      </div>
                    );
                  })}
                </div>
                <button className="survey-links-openall" onClick={() => {
                  run.human_customers.forEach(h => {
                    const url = `/survey?runId=${run.run_id}&custId=${h.customer_id}&name=${encodeURIComponent(h.name || h.customer_id)}&gender=${encodeURIComponent(h.gender || "")}`;
                    window.open(url, "_blank");
                  });
                }}>
                  Nudge all {run.human_customers.length}
                </button>
              </>
            ) : (
              <div style={{ flex: 1, minHeight: 320, display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
                <div>
                  <div className="empty-ic" style={{ margin: "0 auto 12px" }}>🌐</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>No active survey</div>
                  <div style={{ fontSize: 13, color: "var(--g500)", marginTop: 6 }}>Start a simulation to generate survey links for real users.</div>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {showConfig && (
        <ConfigModal
          config={config}
          onChange={setConfig}
          onSave={() => { setConfigured(true); setShowConfig(false); }}
          onCancel={() => setShowConfig(false)}
          ragDocs={ragDocs}
          onRagDocsChange={setRagDocs}
          ragBuilt={ragBuilt}
          onRagBuiltChange={setRagBuilt}
          scenarioId={scenarioId}
          onScenarioIdChange={setScenarioId}
        />
      )}

      {showStrategyModal && (
        <div
          className="overlay"
          onClick={() => { if (strategyPicked) setShowStrategyModal(false); }}
          style={{ paddingTop: 50 }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 720, width: "100%", padding: 0, borderRadius: 18, overflow: "hidden", background: "#fff", boxShadow: "0 24px 60px -12px rgba(15,23,42,.35)", marginTop: 0 }}
          >
            <div style={{ padding: "26px 32px 18px", borderBottom: "1px solid var(--g100)", background: "linear-gradient(135deg, #f2f7ff 0%, #ffffff 100%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 800, fontSize: 20, color: "var(--g900)" }}>
                <span style={{ fontSize: 26 }}>🎯</span>
                What’s your marketing strategy today?
              </div>
              <div style={{ fontSize: 13.5, color: "var(--g500)", marginTop: 8, lineHeight: 1.55, maxWidth: 560 }}>
                Pick a goal for your product launch — it shapes how MarketSwarm analyses the simulation results. You can change this any time.
              </div>
            </div>
            <div style={{ padding: "22px 24px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
              {STRATEGY_OPTIONS.map(opt => {
                const active = strategy === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setStrategy(opt.id);
                      setStrategyPicked(true);
                      setShowStrategyModal(false);
                    }}
                    style={{
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 18,
                      padding: "18px 22px",
                      borderRadius: 14,
                      border: active ? "2px solid var(--blue)" : "1.5px solid var(--g100)",
                      background: active ? "#f2f7ff" : "#fff",
                      cursor: "pointer",
                      transition: "all .15s ease",
                      boxShadow: active ? "0 10px 24px -10px rgba(21,88,176,.35)" : "0 1px 2px rgba(0,0,0,.03)",
                    }}
                    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.background = "#f7faff"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = "var(--g100)"; e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "none"; } }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: active ? "var(--blue)" : "#eef4ff",
                        color: active ? "#fff" : "var(--blue)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 24,
                        transition: "all .15s ease",
                      }}
                    >
                      {opt.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--g900)", marginBottom: 5 }}>{opt.title}</div>
                      <div style={{ fontSize: 13, color: "var(--g500)", lineHeight: 1.55 }}>{opt.desc}</div>
                    </div>
                    <span style={{ fontSize: 20, color: active ? "var(--blue)" : "var(--g300)", flexShrink: 0, fontWeight: 600 }}>→</span>
                  </button>
                );
              })}
            </div>
            {strategyPicked ? (
              <div style={{ padding: "14px 24px 22px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="act-btn ghost"
                  onClick={() => setShowStrategyModal(false)}
                  style={{ padding: "8px 18px", fontSize: 13 }}
                >
                  Close
                </button>
              </div>
            ) : (
              <div style={{ padding: "14px 24px 22px", textAlign: "center", fontSize: 12.5, color: "var(--g500)" }}>
                Pick a strategy to continue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manager dock — FAB always visible for answering escalated questions */}
      <ManagerDock threads={mgrThreads} onAnswer={(threadId, answer) => {
        setMgrThreads(prev => prev.map(t => t.id === threadId ? { ...t, answered: true, answer } : t));
      }} />
    </div>
  );
}
