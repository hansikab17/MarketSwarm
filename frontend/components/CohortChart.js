import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function CohortChart({ title, subtitle, data }) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  // Normalize data to [{name, propensity, churn_pct, n}]
  const chartData = data.map(d => ({
    name: d.name || d.label || d.group || "?",
    "Propensity %": Math.round((d.propensity ?? 0) * 100 * 10) / 10,
    "Churn %": Math.round((d.churn_pct ?? 0) * 10) / 10,
    n: d.n || 0,
  }));

  return (
    <div className="card" style={{ padding: 28 }}>
      <div className="section-h" style={{ marginBottom: 2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: "var(--g500)", marginBottom: 16 }}>{subtitle}</div>}

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--g200)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--g500)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--g500)" }} unit="%" />
          <Tooltip contentStyle={{ background: "var(--bg)", border: "1px solid var(--g200)", borderRadius: 8, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Propensity %" fill="#4f8cff" radius={[4,4,0,0]} />
          <Bar dataKey="Churn %" fill="#ff6b6b" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
