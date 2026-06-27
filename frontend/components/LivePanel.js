import { useState, useEffect, useRef, useMemo } from "react";

function fmtClock(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss < 10 ? "0" : ""}${ss}`;
}

export default function LivePanel({ run, config, agents, liveVotes, customerVotes, onTimerEnd }) {
  const total = config?.count || 500;
  const humanPct = config?.humanPct ?? 0;
  const expectedHumans = Math.max(1, Math.round(total * humanPct / 100));
  const humanTotal = (liveVotes?.yes || 0) + (liveVotes?.unsure || 0) + (liveVotes?.never || 0);
  const WAIT_SECONDS = 600; // 10-minute window for human survey responses

  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS);
  const timerRef = useRef(null);
  const startRef = useRef(Date.now());

  // Agent data from polling
  const agentList = useMemo(() => {
    if (!agents) return [];
    return Array.isArray(agents) ? agents : agents?.items || [];
  }, [agents]);

  const isDone = run?.status === "done";
  const isFailed = run?.status === "failed";
  const agentsDone = agentList.length || run?.counts?.completed || 0;

  // Progress is response-driven: percentage of agents that have responded
  const progress = total > 0 ? Math.min(1, agentsDone / total) : 0;

  // Live buy rate from available agents
  const buyCount = agentList.filter(a => a.predicted_action === "buy").length;
  const holdCount = agentList.filter(a => a.predicted_action === "hold").length;
  const leaveCount = agentList.filter(a => a.predicted_action === "leave").length;
  const liveBuyRate = agentList.length > 0 ? Math.round((buyCount / agentList.length) * 100) : 0;

  // 10-minute countdown timer for human survey window
  useEffect(() => {
    startRef.current = Date.now();
    setSecondsLeft(WAIT_SECONDS);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const remaining = Math.max(0, WAIT_SECONDS - elapsed);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        if (onTimerEnd) onTimerEnd();
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Stop timer when backend finishes
  useEffect(() => {
    if (isDone || isFailed) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [isDone, isFailed]);

  // Compute dot size to fit container — measure full available width
  const dotWrapRef = useRef(null);
  const [dotContainerW, setDotContainerW] = useState(0);
  const LIVE_DOT_H = 180;

  useEffect(() => {
    if (!dotWrapRef.current) return;
    const el = dotWrapRef.current;
    const measure = () => {
      if (!el) return;
      const w = el.clientWidth;
      if (w > 0) setDotContainerW(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dotCount = Math.max(1, agentsDone + 1);
  const { dotSize, dotGap, dotCols } = useMemo(() => {
    if (dotCount <= 0 || dotContainerW <= 0) return { dotSize: 8, dotGap: 3, dotCols: 10 };
    const W = dotContainerW;
    const H = LIVE_DOT_H;
    for (let sz = 20; sz >= 2; sz--) {
      const g = sz >= 10 ? 5 : sz >= 6 ? 4 : sz >= 4 ? 3 : 2;
      const c = Math.floor((W + g) / (sz + g));
      if (c <= 0) continue;
      const rows = Math.ceil(dotCount / c);
      const totalH = rows * (sz + g) - g;
      if (totalH <= H) {
        return { dotSize: sz, dotGap: g, dotCols: c };
      }
    }
    const g = 2;
    const c = Math.floor((W + g) / (2 + g));
    return { dotSize: 2, dotGap: g, dotCols: Math.max(1, c) };
  }, [dotCount, dotContainerW]);

  // Dots from real agent data — appear live as responses come in
  // Override color when a human vote is received via BroadcastChannel
  const agentDots = useMemo(() => {
    const votes = customerVotes || {};
    return agentList.map((a, i) => {
      const vote = votes[a.customer_id];
      const effectiveAction = vote
        ? (vote === "yes" ? "buy" : vote === "never" ? "never" : "not sure")
        : a.predicted_action;
      const color = effectiveAction === "buy" ? "var(--green)"
        : effectiveAction === "hold" ? "var(--yellow)" : "var(--red)";
      const name = [a.name, a.customer_id].filter(Boolean).join(" ") || `Agent ${i + 1}`;
      const tooltip = `${name}\n${a.gender || ""}${a.age ? " · Age " + a.age : ""}\nDecision: ${effectiveAction}${vote ? " (human)" : ""}`;
      return { key: a.customer_id || `a-${i}`, color, tooltip };
    });
  }, [agentList, customerVotes]);

  return (
    <div className="card" style={{ padding: 24, animation: "pop .4s ease both" }}>
      {/* Header + countdown timer */}
      <div className="live-head">
        <div>
          <div className="swarm-t">
            <span style={{ color: "var(--blue)" }}>⏱</span> Collecting responses (live)
          </div>
          <div className="swarm-s">
            Agents + humans · updating every 5s · step {agentsDone} of {total}
          </div>
        </div>
        <div className="timer-pill">{fmtClock(secondsLeft)}</div>
      </div>

      {/* Progress bar — driven by real responses */}
      <div className="progbar">
        <div className="progbar-fill" style={{ width: `${(progress * 100).toFixed(1)}%`, transition: "width 0.4s ease" }} />
      </div>

      {/* Live metric tiles — agent stats only */}
      <div className="live-metrics">
        <LiveTile label="Agents responded" value={agentsDone.toLocaleString()} color="var(--blue)" />
        <LiveTile label="Running buy-rate" value={agentsDone > 0 ? `${liveBuyRate}%` : "—"} color="var(--green)" />
        <LiveTile label="Predicted buyers" value={buyCount.toLocaleString()} color="var(--g900)" />
        <LiveTile label="Progress" value={`${Math.round(progress * 100)}%`} color="var(--yellow)" />
      </div>

      {/* Growing dot canvas — agent swarm only */}
      <div className="swarm-s" style={{ marginTop: 6 }}>Agent swarm — dots appear as agents respond</div>
      <div ref={dotWrapRef} style={{ width: "100%", height: LIVE_DOT_H, overflow: "hidden", marginTop: 8 }}>
        {dotContainerW > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${dotCols}, ${dotSize}px)`,
              gap: dotGap,
              alignContent: "start",
              justifyContent: "center",
              height: "100%",
            }}
          >
            {agentDots.map((d, i) => (
              <span key={d.key} className="dot dotpop" title={d.tooltip} style={{ background: d.color, width: dotSize, height: dotSize, borderRadius: "50%", animationDelay: `${(i % 30) * 0.02}s`, cursor: "pointer" }} />
            ))}
            {!isDone && (
              <span style={{ background: "var(--g300)", width: dotSize, height: dotSize, borderRadius: "50%", animation: "slowpulse 2s ease-in-out infinite" }} />
            )}
          </div>
        )}
      </div>

      {/* Human vote tally — matching reference live-tally chips */}
      <div className="live-tally">
        <TallyChip color="var(--green)" label="Yes, will buy" count={liveVotes?.yes || 0} />
        <TallyChip color="var(--yellow)" label="Not sure" count={liveVotes?.unsure || 0} />
        <TallyChip color="var(--red)" label="Never" count={liveVotes?.never || 0} />
        <span className="tally-meta">{humanTotal} / ~{expectedHumans} human responses</span>
      </div>

      <div className="note" style={{ marginTop: 12 }}>
        Results refresh every few seconds as more agent and human responses arrive. The countdown steps down over the 10-minute window — press &quot;Finish now&quot; to stop early.
      </div>
    </div>
  );
}

function LiveTile({ label, value, color }) {
  return (
    <div className="live-tile">
      <div className="live-tile-v" style={{ color }}>{value}</div>
      <div className="live-tile-l">{label}</div>
    </div>
  );
}

function TallyChip({ color, label, count }) {
  return (
    <div className="tally-chip" style={{ borderColor: color }}>
      <span className="legend-dot" style={{ background: color }} />
      <span style={{ fontWeight: 700, color: "var(--g900)" }}>{count}</span>
      <span style={{ color: "var(--g700)" }}>{label}</span>
    </div>
  );
}
