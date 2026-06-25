import { useState, useEffect, useRef, useMemo } from "react";

function fmtClock(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss < 10 ? "0" : ""}${ss}`;
}

export default function LivePanel({ run, config, agents }) {
  const total = config?.count || 500;
  const humanPct = config?.humanPct ?? 0;
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
      if (remaining <= 0) clearInterval(timerRef.current);
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
    const measure = () => {
      const w = dotWrapRef.current.clientWidth;
      if (w > 0) setDotContainerW(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(dotWrapRef.current);
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
  const agentDots = useMemo(() => {
    return agentList.map((a, i) => {
      const color = a.predicted_action === "buy" ? "var(--green)"
        : a.predicted_action === "hold" ? "var(--yellow)" : "var(--red)";
      return { key: a.customer_id || `a-${i}`, color };
    });
  }, [agentList]);

  return (
    <div className="card" style={{ padding: 24, animation: "pop .4s ease both" }}>
      {/* Header + countdown timer */}
      <div className="live-head">
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--blue)" }}>⏱</span> Collecting responses (live)
          </div>
          <div style={{ fontSize: 12.5, color: "var(--g500)", marginTop: 3 }}>
            {humanPct > 0
              ? (agentsDone >= total
                ? `Agent responses complete · waiting for human survey responses (${fmtClock(secondsLeft)} remaining)`
                : `${agentsDone.toLocaleString()} of ${total.toLocaleString()} agents responded · human survey window open`)
              : (agentsDone > 0
                ? `${agentsDone.toLocaleString()} of ${total.toLocaleString()} agents responded`
                : "Waiting for first agent response from Lambda...")}
          </div>
        </div>
        <div className="timer-pill">{fmtClock(secondsLeft)}</div>
      </div>

      {/* Progress bar — driven by real responses */}
      <div className="progbar">
        <div className="progbar-fill" style={{ width: `${(progress * 100).toFixed(1)}%`, transition: "width 0.4s ease" }} />
      </div>

      {/* Live metric tiles */}
      <div className="live-metrics">
        <LiveTile label="Responses in" value={`${agentsDone.toLocaleString()} / ${total.toLocaleString()}`} color="var(--blue)" />
        <LiveTile label="Running buy-rate" value={agentsDone > 0 ? `${liveBuyRate}%` : "—"} color="var(--green)" />
        <LiveTile label="Predicted buyers" value={buyCount.toLocaleString()} color="var(--g900)" />
        <LiveTile label="Progress" value={`${Math.round(progress * 100)}%`} color="var(--yellow)" />
      </div>

      {/* Growing dot canvas — dots appear live as agents respond */}
      <div style={{ fontSize: 12, color: "var(--g500)", marginTop: 14 }}>
        {agentsDone > 0
          ? "Live swarm — each dot is a real agent response"
          : "Waiting for agent responses to populate swarm..."}
      </div>
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
              <span key={d.key} className="dot dotpop" style={{ background: d.color, width: dotSize, height: dotSize, borderRadius: "50%", animationDelay: `${(i % 30) * 0.02}s` }} />
            ))}
            {!isDone && (
              <span style={{ background: "var(--g300)", width: dotSize, height: dotSize, borderRadius: "50%", animation: "slowpulse 2s ease-in-out infinite" }} />
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
        <LegendItem color="var(--green)" label="Buy" count={buyCount} />
        <LegendItem color="var(--yellow)" label="Hold" count={holdCount} />
        <LegendItem color="var(--red)" label="Leave" count={leaveCount} />
        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--g500)" }}>
          {fmtClock(secondsLeft)} remaining
        </div>
      </div>

      <div className="note" style={{ marginTop: 12 }}>
        {humanPct > 0
          ? "Agent predictions appear live. The 10-minute window allows human survey responses to arrive. When the timer ends or you press \"Finish now\", agent + human responses are blended for the final prediction."
          : "Agent predictions appear live. Press \"Finish now\" to see the final verdict, or wait for all agents to respond."}
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

function LegendItem({ color, label, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--g700)" }}>
      <span className="legend-dot" style={{ background: color }} />
      <span>{count}</span> <span>{label}</span>
    </div>
  );
}
