import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Unified chart palette — restrained so the page reads as one design
//   PRIMARY  → all single-series bars/lines/areas (neutral, no semantic meaning)
//   SECONDARY → second line series / "neutral" stacks
//   Semantic colors (POS/WARN/CAUTION/NEG) are used ONLY when the color carries
//   meaning (sentiment, payment health, contract flow, ticket severity).
//   The per-section accent shows up only on the header (border + icon + KPIs).
// ─────────────────────────────────────────────────────────────────────────────
const PRIMARY = "#3b82f6";       // blue-500
const PRIMARY_DK = "#1d4ed8";    // blue-700 (donut darkest step)
const PRIMARY_MD = "#60a5fa";    // blue-400
const PRIMARY_LT = "#93c5fd";    // blue-300
const SECONDARY = "#94a3b8";     // slate-400
const POS = "#10b981";           // emerald-500
const WARN = "#f59e0b";          // amber-500
const CAUTION = "#f97316";       // orange-500
const NEG = "#ef4444";           // red-500
const NEG_DK = "#dc2626";        // red-600

// Axis / grid / tooltip
const GRID = "#eef2f7";
const AXIS = "#cbd5e1";
const TICK = { fontSize: 11, fill: "#64748b" };
const tooltipStyle = {
  background: "rgba(255,255,255,.98)",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 12,
  padding: "8px 11px",
  boxShadow: "0 10px 24px -8px rgba(15,23,42,.18)",
};
const cursorBlue = { fill: "rgba(59,130,246,.06)" };

// Reusable inline gradient defs (each chart has its own SVG, so duplicate ids
// across charts are safe — url() resolves within the local <svg>).
const blueBarGrad = (
  <defs>
    <linearGradient id="g-blue-v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.95} />
      <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.55} />
    </linearGradient>
  </defs>
);
const blueBarGradH = (
  <defs>
    <linearGradient id="g-blue-h" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.95} />
      <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.55} />
    </linearGradient>
  </defs>
);
const blueAreaGrad = (
  <defs>
    <linearGradient id="g-blue-area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.4} />
      <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.04} />
    </linearGradient>
  </defs>
);
const redAreaGrad = (
  <defs>
    <linearGradient id="g-red-area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={NEG} stopOpacity={0.4} />
      <stop offset="100%" stopColor={NEG} stopOpacity={0.04} />
    </linearGradient>
  </defs>
);

// ─────────────────────────────────────────────────────────────────────────────
// Dummy data — 10,000 customers across the past 6 months
// ─────────────────────────────────────────────────────────────────────────────
const txMonthly = [
  { m: "Jan", orders: 6200, gmv: 248000 },
  { m: "Feb", orders: 5900, gmv: 232000 },
  { m: "Mar", orders: 7400, gmv: 305000 },
  { m: "Apr", orders: 8100, gmv: 342000 },
  { m: "May", orders: 8900, gmv: 386000 },
  { m: "Jun", orders: 9600, gmv: 421000 },
];
const txChannels = [
  { name: "Web", value: 48 },
  { name: "Mobile app", value: 34 },
  { name: "Marketplace", value: 13 },
  { name: "In-store", value: 5 },
];
const ratingDist = [
  { stars: "5★", count: 4180 },
  { stars: "4★", count: 3120 },
  { stars: "3★", count: 1480 },
  { stars: "2★", count: 720 },
  { stars: "1★", count: 500 },
];
const sentimentTrend = [
  { m: "Jan", positive: 62, neutral: 26, negative: 12 },
  { m: "Feb", positive: 64, neutral: 24, negative: 12 },
  { m: "Mar", positive: 67, neutral: 23, negative: 10 },
  { m: "Apr", positive: 69, neutral: 22, negative: 9 },
  { m: "May", positive: 71, neutral: 21, negative: 8 },
  { m: "Jun", positive: 73, neutral: 19, negative: 8 },
];
const npsTrend = [
  { m: "Jan", nps: 28, csat: 76 },
  { m: "Feb", nps: 31, csat: 78 },
  { m: "Mar", nps: 34, csat: 79 },
  { m: "Apr", nps: 37, csat: 81 },
  { m: "May", nps: 41, csat: 83 },
  { m: "Jun", nps: 44, csat: 85 },
];
const themes = [
  { theme: "Value for money", count: 2140 },
  { theme: "Ease of use", count: 1870 },
  { theme: "Customer service", count: 1290 },
  { theme: "Quality", count: 960 },
  { theme: "Shipping speed", count: 740 },
  { theme: "Onboarding", count: 510 },
];
const returnRate = [
  { m: "Jan", rate: 6.8 }, { m: "Feb", rate: 6.4 }, { m: "Mar", rate: 5.9 },
  { m: "Apr", rate: 5.5 }, { m: "May", rate: 5.1 }, { m: "Jun", rate: 4.7 },
];
const returnReasons = [
  { reason: "Doesn't fit", v: 38 }, { reason: "Quality", v: 24 },
  { reason: "Changed mind", v: 18 }, { reason: "Defective", v: 12 },
  { reason: "Wrong item", v: 8 },
];
const tenureDist = [
  { bucket: "<1 yr", n: 1820 }, { bucket: "1–2 yrs", n: 2640 },
  { bucket: "2–3 yrs", n: 2310 }, { bucket: "3–5 yrs", n: 1880 },
  { bucket: "5+ yrs", n: 1350 },
];
const contractFlow = [
  { m: "Jan", renewals: 720, upgrades: 180, downgrades: 60 },
  { m: "Feb", renewals: 690, upgrades: 210, downgrades: 70 },
  { m: "Mar", renewals: 780, upgrades: 260, downgrades: 55 },
  { m: "Apr", renewals: 820, upgrades: 290, downgrades: 65 },
  { m: "May", renewals: 870, upgrades: 320, downgrades: 50 },
  { m: "Jun", renewals: 910, upgrades: 360, downgrades: 45 },
];
const paymentHealth = [
  { name: "On-time", value: 78 }, { name: "Late <30d", value: 14 },
  { name: "Late 30–60d", value: 5 }, { name: "Failed", value: 3 },
];
const planMix = [
  { plan: "Free", n: 3200 }, { plan: "Basic", n: 3600 },
  { plan: "Pro", n: 2400 }, { plan: "Enterprise", n: 800 },
];
const ticketsMonthly = [
  { m: "Jan", p1: 12, p2: 88, p3: 240, p4: 510 },
  { m: "Feb", p1: 10, p2: 76, p3: 220, p4: 470 },
  { m: "Mar", p1: 8, p2: 70, p3: 205, p4: 430 },
  { m: "Apr", p1: 7, p2: 62, p3: 195, p4: 410 },
  { m: "May", p1: 6, p2: 54, p3: 180, p4: 380 },
  { m: "Jun", p1: 5, p2: 48, p3: 165, p4: 355 },
];
const resolutionTime = [
  { m: "Jan", hours: 18.4 }, { m: "Feb", hours: 16.9 }, { m: "Mar", hours: 15.2 },
  { m: "Apr", hours: 13.6 }, { m: "May", hours: 12.4 }, { m: "Jun", hours: 11.1 },
];
const incomeBands = [
  { band: "<$25k", n: 1340 }, { band: "$25–50k", n: 2580 },
  { band: "$50–75k", n: 2410 }, { band: "$75–100k", n: 1820 },
  { band: "$100–150k", n: 1180 }, { band: "$150k+", n: 670 },
];
const budgetUtilization = [
  { m: "Jan", median: 38 }, { m: "Feb", median: 41 }, { m: "Mar", median: 44 },
  { m: "Apr", median: 46 }, { m: "May", median: 49 }, { m: "Jun", median: 52 },
];

// Section nav metadata — drives both the chip strip and the section anchors.
const SECTIONS = [
  { id: "transactions", icon: "🛒", label: "Transactions", color: "#6366f1" },
  { id: "reviews",      icon: "⭐", label: "Reviews",      color: "#f59e0b" },
  { id: "feedback",     icon: "💬", label: "Feedback",     color: "#10b981" },
  { id: "returns",      icon: "↩️", label: "Returns",      color: "#ef4444" },
  { id: "contracts",    icon: "📄", label: "Contracts",    color: "#8b5cf6" },
  { id: "billing",      icon: "🧾", label: "Billing",      color: "#0ea5e9" },
  { id: "support",      icon: "🎧", label: "Support",      color: "#ec4899" },
  { id: "budget",       icon: "💰", label: "Budget",       color: "#14b8a6" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────────────────────
function Kpi({ label, value, unit, color = "#1558b0" }) {
  return (
    <div style={{ flex: 1, minWidth: 120, padding: "10px 14px", borderRadius: 12, background: `${color}10`, border: `1px solid ${color}22` }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".3px", textTransform: "uppercase", color, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--g900)", lineHeight: 1 }}>
        {value}{unit ? <span style={{ fontSize: 13, color: "var(--g500)", marginLeft: 4, fontWeight: 600 }}>{unit}</span> : null}
      </div>
    </div>
  );
}

function Section({ id, icon, title, desc, color, kpis, children }) {
  return (
    <div id={id} className="card" style={{ padding: 22, borderTop: `3px solid ${color}`, scrollMarginTop: 90 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}1a`, color, display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 25, fontWeight: 800, color: "var(--g900)", marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 16, color: "var(--g500)", lineHeight: 1.5 }}>{desc}</div>
        </div>
      </div>
      {kpis && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {kpis.map((k, i) => <Kpi key={i} {...k} color={k.color || color} />)}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 12px" }}>
        <div style={{ width: 4, height: 16, borderRadius: 2, background: color }} />
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: ".6px", textTransform: "uppercase", color: "var(--g700)" }}>
          Data Stats
        </div>
        <div style={{ flex: 1, height: 1, background: "#eef0f3" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: "#fafbfc", border: "1px solid #eef0f3", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--g700)", marginBottom: 8 }}>{title}</div>
      <div style={{ height: 210 }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerData() {
  const totals = useMemo(() => ({
    orders: txMonthly.reduce((s, x) => s + x.orders, 0),
    gmv: txMonthly.reduce((s, x) => s + x.gmv, 0),
  }), []);

  return (
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      {/* Hero */}
      <div className="hero" style={{ paddingTop: 40, paddingBottom: 22 }}>
        <div className="land-badge">🗄️ The 360° signals behind every synthetic customer</div>
        <h1 style={{ maxWidth: 980, fontSize: 38, lineHeight: 1.15, marginBottom: 14 }}>
          Customer data we use <span className="grad">to ground the swarm</span>
        </h1>
        <p style={{ maxWidth: 720, fontSize: 15.5, lineHeight: 1.6, marginBottom: 22 }}>
          Eight behavioural signals from a <b>10,000-customer panel</b> across the <b>past 6 months</b>, aggregated into a 360° profile for every synthetic customer.
        </p>
      </div>

      {/* Section nav — jump to any of the 8 signal groups; stretches across full container width */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
          gap: 10,
          margin: "18px 0 26px",
          padding: "4px 0",
        }}
      >
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(s.id);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                if (typeof window !== "undefined" && window.history?.replaceState) {
                  window.history.replaceState(null, "", `#${s.id}`);
                }
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              padding: "22px 10px",
              minHeight: 72,
              background: "#fff",
              border: `1px solid ${s.color}33`,
              borderTop: `3px solid ${s.color}`,
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 700,
              color: "var(--g800)",
              textDecoration: "none",
              textAlign: "center",
              minWidth: 0,
              whiteSpace: "nowrap",
              transition: "background .15s, color .15s, transform .15s, box-shadow .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${s.color}10`;
              e.currentTarget.style.color = s.color;
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = `0 6px 14px -8px ${s.color}66`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = "var(--g800)";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{s.icon}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
          </a>
        ))}
      </div>

      <div className="land-stats" style={{ marginTop: 50, marginBottom: 40
       }}>
        <div className="land-stat"><div className="land-stat-v">10,000</div><div className="land-stat-l">customers in panel</div></div>
        <div className="land-stat"><div className="land-stat-v">6 mo</div><div className="land-stat-l">rolling history</div></div>
        <div className="land-stat"><div className="land-stat-v">8</div><div className="land-stat-l">behavioural signals</div></div>
        <div className="land-stat"><div className="land-stat-v">360°</div><div className="land-stat-l">profile fidelity</div></div>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        {/* 1. Transactions */}
        <Section
          id="transactions"
          icon="🛒"
          title="Transactions & purchases"
          desc="Frequency, recency, value, channel and basket mix — the backbone of spend behaviour."
          color="#6366f1"
          kpis={[
            { label: "Total orders", value: totals.orders.toLocaleString() },
            { label: "GMV (6 mo)", value: `$${(totals.gmv / 1000).toFixed(0)}k` },
            { label: "Avg order value", value: `$${(totals.gmv / totals.orders).toFixed(2)}` },
            { label: "Repeat rate", value: "62", unit: "%" },
          ]}
        >
          <ChartCard title="Monthly orders">
            <ResponsiveContainer>
              <BarChart data={txMonthly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                {blueBarGrad}
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="m" tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorBlue} />
                <Bar dataKey="orders" fill="url(#g-blue-v)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Channel mix (% of orders)">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={txChannels} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3} stroke="#fff" strokeWidth={2}>
                  {[PRIMARY_DK, PRIMARY, PRIMARY_MD, PRIMARY_LT].map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Section>

        {/* 2. Reviews */}
        <Section
          id="reviews"
          icon="⭐"
          title="Reviews & ratings"
          desc="Star ratings, sentiment and product affinity drawn from what customers say."
          color="#f59e0b"
          kpis={[
            { label: "Avg rating", value: "4.2", unit: "/ 5" },
            { label: "Reviews collected", value: "10,000" },
            { label: "Positive sentiment", value: "73", unit: "%" },
            { label: "Top-2 box (4+5★)", value: "73", unit: "%" },
          ]}
        >
          <ChartCard title="Star rating distribution">
            <ResponsiveContainer>
              <BarChart data={ratingDist} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} layout="vertical">
                {blueBarGradH}
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="stars" tick={TICK} stroke={AXIS} width={36} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorBlue} />
                <Bar dataKey="count" fill="url(#g-blue-h)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Sentiment over time">
            <ResponsiveContainer>
              <AreaChart data={sentimentTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} stackOffset="expand">
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="m" tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="positive" name="Positive" stackId="1" stroke={POS} fill={`${POS}55`} />
                <Area type="monotone" dataKey="neutral"  name="Neutral"  stackId="1" stroke={SECONDARY} fill={`${SECONDARY}66`} />
                <Area type="monotone" dataKey="negative" name="Negative" stackId="1" stroke={NEG} fill={`${NEG}55`} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Section>

        {/* 3. Feedback */}
        <Section
          id="feedback"
          icon="💬"
          title="Feedback & surveys"
          desc="NPS, CSAT and free-text themes that reveal motivations and friction."
          color="#10b981"
          kpis={[
            { label: "NPS (Jun)", value: "44" },
            { label: "CSAT (Jun)", value: "85", unit: "%" },
            { label: "Survey responses", value: "7,512" },
            { label: "Themes extracted", value: "180+" },
          ]}
        >
          <ChartCard title="NPS & CSAT trend">
            <ResponsiveContainer>
              <LineChart data={npsTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="m" tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="nps"  name="NPS"    stroke={PRIMARY} strokeWidth={2.5} dot={{ r: 4, strokeWidth: 0, fill: PRIMARY }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="csat" name="CSAT %" stroke={SECONDARY} strokeWidth={2.5} strokeDasharray="4 3" dot={{ r: 4, strokeWidth: 0, fill: SECONDARY }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Top themes (mentions)">
            <ResponsiveContainer>
              <BarChart data={themes} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} layout="vertical">
                {blueBarGradH}
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="theme" tick={{ ...TICK, fontSize: 10.5 }} stroke={AXIS} width={102} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorBlue} />
                <Bar dataKey="count" fill="url(#g-blue-h)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Section>

        {/* 4. Returns */}
        <Section
          id="returns"
          icon="↩️"
          title="Returns"
          desc="Return reasons and rates — a strong negative signal for fit and satisfaction."
          color="#ef4444"
          kpis={[
            { label: "Avg return rate", value: "5.7", unit: "%" },
            { label: "Trend (vs Jan)", value: "−2.1 pp" },
            { label: "Returns processed", value: "3,420" },
            { label: "Top reason", value: "Fit" },
          ]}
        >
          <ChartCard title="Return rate by month">
            <ResponsiveContainer>
              <AreaChart data={returnRate} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                {redAreaGrad}
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="m" tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Area type="monotone" dataKey="rate" stroke={NEG} strokeWidth={2.5} fill="url(#g-red-area)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Return reasons (%)">
            <ResponsiveContainer>
              <BarChart data={returnReasons} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                {blueBarGrad}
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="reason" tick={{ ...TICK, fontSize: 10.5 }} stroke={AXIS} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorBlue} formatter={(v) => `${v}%`} />
                <Bar dataKey="v" fill="url(#g-blue-v)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Section>

        {/* 5. Contracts */}
        <Section
          id="contracts"
          icon="📄"
          title="Contracts"
          desc="Tenure, terms, renewals and upgrades that show commitment and lifetime value."
          color="#8b5cf6"
          kpis={[
            { label: "Avg tenure", value: "2.6", unit: "yrs" },
            { label: "Renewal rate", value: "88", unit: "%" },
            { label: "Upgrades (6 mo)", value: "1,620" },
            { label: "Downgrades (6 mo)", value: "345" },
          ]}
        >
          <ChartCard title="Tenure distribution">
            <ResponsiveContainer>
              <BarChart data={tenureDist} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                {blueBarGrad}
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="bucket" tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorBlue} />
                <Bar dataKey="n" fill="url(#g-blue-v)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Renewals · upgrades · downgrades">
            <ResponsiveContainer>
              <BarChart data={contractFlow} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="m" tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="renewals"   name="Renewals"   stackId="a" fill={PRIMARY} />
                <Bar dataKey="upgrades"   name="Upgrades"   stackId="a" fill={POS} />
                <Bar dataKey="downgrades" name="Downgrades" stackId="a" fill={NEG} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Section>

        {/* 6. Billing */}
        <Section
          id="billing"
          icon="🧾"
          title="Billing"
          desc="Plan, payment health and dunning history, a proxy for budget and reliability."
          color="#0ea5e9"
          kpis={[
            { label: "On-time payments", value: "78", unit: "%" },
            { label: "Avg revenue / cust.", value: "$48", unit: "/mo" },
            { label: "Failed payments", value: "3", unit: "%" },
            { label: "Active plans", value: "10,000" },
          ]}
        >
          <ChartCard title="Payment health">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={paymentHealth} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3} stroke="#fff" strokeWidth={2}>
                  {[POS, WARN, CAUTION, NEG].map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Plan mix (customers)">
            <ResponsiveContainer>
              <BarChart data={planMix} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                {blueBarGrad}
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="plan" tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorBlue} />
                <Bar dataKey="n" fill="url(#g-blue-v)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Section>

        {/* 7. Support tickets */}
        <Section
          id="support"
          icon="🎧"
          title="Support tickets"
          desc="Volume, severity and resolution effort — early indicators of churn risk."
          color="#ec4899"
          kpis={[
            { label: "Tickets (6 mo)", value: "4,580" },
            { label: "Avg resolution", value: "14.6", unit: "h" },
            { label: "P1 incidents", value: "48" },
            { label: "Self-served", value: "32", unit: "%" },
          ]}
        >
          <ChartCard title="Ticket volume by severity">
            <ResponsiveContainer>
              <BarChart data={ticketsMonthly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="m" tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="p1" name="P1 — critical" stackId="a" fill={NEG_DK} />
                <Bar dataKey="p2" name="P2 — high"     stackId="a" fill={CAUTION} />
                <Bar dataKey="p3" name="P3 — medium"   stackId="a" fill={WARN} />
                <Bar dataKey="p4" name="P4 — low"      stackId="a" fill={SECONDARY} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Avg resolution time (hours)">
            <ResponsiveContainer>
              <AreaChart data={resolutionTime} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                {blueAreaGrad}
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="m" tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v} h`} />
                <Area type="monotone" dataKey="hours" stroke={PRIMARY} strokeWidth={2.5} fill="url(#g-blue-area)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Section>

        {/* 8. Budget & income */}
        <Section
          id="budget"
          icon="💰"
          title="Budget & income band"
          desc="Estimated disposable budget used to test price sensitivity per segment."
          color="#14b8a6"
          kpis={[
            { label: "Median income", value: "$62k", unit: "/yr" },
            { label: "Median budget", value: "$140", unit: "/mo" },
            { label: "Budget utilization", value: "52", unit: "%" },
            { label: "High income (>$100k)", value: "18.5", unit: "%" },
          ]}
        >
          <ChartCard title="Income band distribution">
            <ResponsiveContainer>
              <BarChart data={incomeBands} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                {blueBarGrad}
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="band" tick={{ ...TICK, fontSize: 10.5 }} stroke={AXIS} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorBlue} />
                <Bar dataKey="n" fill="url(#g-blue-v)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Median budget utilization (%)">
            <ResponsiveContainer>
              <AreaChart data={budgetUtilization} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                {blueAreaGrad}
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="m" tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} stroke={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Area type="monotone" dataKey="median" stroke={PRIMARY} strokeWidth={2.5} fill="url(#g-blue-area)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Section>
      </div>
    </div>
  );
}
