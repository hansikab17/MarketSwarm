import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function PropensityChart({ agents }) {
  const data = useMemo(() => {
    const bins = Array.from({ length: 20 }, (_, i) => ({ range: `${i*5}-${i*5+5}`, buy: 0, hold: 0, leave: 0 }));
    agents.forEach(a => {
      const p = Math.max(0, Math.min(99, Math.round((a.propensity_to_buy ?? 0.5) * 100)));
      const idx = Math.min(19, Math.floor(p / 5));
      const action = a.predicted_action || "hold";
      if (action === "buy") bins[idx].buy++;
      else if (action === "leave") bins[idx].leave++;
      else bins[idx].hold++;
    });
    return bins;
  }, [agents]);

  return (
    <div className="card" style={{ padding: 28 }}>
      <div className="section-h" style={{ marginBottom: 4, fontSize: 22 }}>Propensity distribution</div>
      <div style={{ fontSize: 13, color: "var(--g500)", marginBottom: 16 }}>Agent count by propensity bucket and decision</div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--g200)" />
          <XAxis dataKey="range" tick={{ fontSize: 11, fill: "var(--g500)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--g500)" }} />
          <Tooltip contentStyle={{ background: "var(--bg)", border: "1px solid var(--g200)", borderRadius: 8, fontSize: 12 }} />
          <Area type="monotone" dataKey="buy" name="Buy" stackId="1" stroke="var(--green)" fill="var(--green-l)" />
          <Area type="monotone" dataKey="hold" name="Not sure" stackId="1" stroke="var(--yellow)" fill="var(--yellow-l)" />
          <Area type="monotone" dataKey="leave" name="Never" stackId="1" stroke="var(--red)" fill="var(--red-l)" />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "var(--g500)" }}>
        <span><span className="legend-dot" style={{ background: "var(--green)" }} /> Buy</span>
        <span><span className="legend-dot" style={{ background: "var(--yellow)" }} /> Not sure</span>
        <span><span className="legend-dot" style={{ background: "var(--red)" }} /> Never</span>
      </div>
    </div>
  );
}
