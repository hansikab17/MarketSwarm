import { useState, useMemo, useRef, useEffect } from "react";

export default function SwarmDots({ agents, totalAgents, customerVotes }) {
  const [mode, setMode] = useState("decision");
  const [hovered, setHovered] = useState(null);
  const total = totalAgents || agents.length;
  const count = agents.length;
  const wrapRef = useRef(null);
  const [containerW, setContainerW] = useState(0);
  const CONTAINER_H = 280;

  // Measure the full available width from the wrapper div
  useEffect(() => {
    if (!wrapRef.current) return;
    const measure = () => {
      if (!wrapRef.current) return;
      const w = wrapRef.current.clientWidth;
      if (w > 0) setContainerW(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Calculate the largest dot size so ALL dots fit in W x H
  const { dotSize, gapSize, cols } = useMemo(() => {
    if (count <= 0 || containerW <= 0) return { dotSize: 8, gapSize: 3, cols: 10 };
    const W = containerW;
    const H = CONTAINER_H;

    // Try dot sizes from large to small, pick the biggest that fits
    for (let sz = 24; sz >= 2; sz--) {
      const g = sz >= 10 ? 5 : sz >= 6 ? 4 : sz >= 4 ? 3 : 2;
      const c = Math.floor((W + g) / (sz + g));
      if (c <= 0) continue;
      const rows = Math.ceil(count / c);
      const totalH = rows * (sz + g) - g;
      if (totalH <= H) {
        return { dotSize: sz, gapSize: g, cols: c };
      }
    }
    // Fallback: minimum 2px dots
    const g = 2;
    const c = Math.floor((W + g) / (2 + g));
    return { dotSize: 2, gapSize: g, cols: Math.max(1, c) };
  }, [count, containerW]);

  const dots = useMemo(() => {
    const votes = customerVotes || {};
    return agents.map((a, i) => {
      const vote = votes[a.customer_id];
      const rawAction = vote
        ? (vote === "yes" ? "buy" : vote === "never" ? "never" : "not sure")
        : a.predicted_action;
      const label = rawAction === "buy" ? "buy" : (rawAction === "hold" || rawAction === "not sure") ? "not sure" : "never";
      let color;
      if (mode === "decision") {
        color = label === "buy" ? "var(--green)" : label === "not sure" ? "var(--yellow)" : "var(--red)";
      } else {
        color = a.gender === "Female" ? "var(--accent)" : "var(--accent2)";
      }
      const name = [a.name, a.customer_id].filter(Boolean).join(" ") || `Agent ${i + 1}`;
      const tooltip = `${name}\n${a.gender || ""}${a.age ? " · Age " + a.age : ""}\nDecision: ${label}${vote ? " (human)" : ""}`;
      return { color, key: a.customer_id || i, tooltip, idx: i };
    });
  }, [agents, mode, customerVotes]);

  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div className="section-h" style={{ marginBottom: 2, fontSize: 20, textAlign: "left" }}>Swarm view</div>
          <div style={{ fontSize: 13, color: "var(--g500)" }}>{count.toLocaleString()} of {total.toLocaleString()} agents shown</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={`chip${mode === "decision" ? " active" : ""}`} onClick={() => setMode("decision")}>By decision</button>
          <button className={`chip${mode === "gender" ? " active" : ""}`} onClick={() => setMode("gender")}>By gender</button>
        </div>
      </div>

      {/* Wrapper measures full width; inner grid uses computed cols */}
      <div ref={wrapRef} style={{ width: "100%", height: CONTAINER_H, overflow: "hidden" }}>
        {containerW > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, ${dotSize}px)`,
              gap: gapSize,
              alignContent: "start",
              justifyContent: "center",
              height: "100%",
            }}
          >
            {dots.map((d) => (
              <span
                key={d.key}
                title={d.tooltip}
                onMouseEnter={() => setHovered(d.idx)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: d.color,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: "50%",
                  display: "block",
                  cursor: "pointer",
                  outline: hovered === d.idx ? "2px solid var(--g900)" : "none",
                  outlineOffset: 1,
                  transition: "outline 0.1s",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "var(--g500)" }}>
        {mode === "decision" ? (
          <>
            <span><span className="legend-dot" style={{ background: "var(--green)" }} /> Buy: {dots.filter(d => d.color === "var(--green)").length}</span>
            <span><span className="legend-dot" style={{ background: "var(--yellow)" }} /> Not sure: {dots.filter(d => d.color === "var(--yellow)").length}</span>
            <span><span className="legend-dot" style={{ background: "var(--red)" }} /> Never: {dots.filter(d => d.color === "var(--red)").length}</span>
          </>
        ) : (
          <>
            <span><span className="legend-dot" style={{ background: "var(--accent)" }} /> Female: {agents.filter(a => a.gender === "Female").length}</span>
            <span><span className="legend-dot" style={{ background: "var(--accent2)" }} /> Male: {agents.filter(a => a.gender === "Male").length}</span>
          </>
        )}
      </div>
    </div>
  );
}
