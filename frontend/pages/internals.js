import { useEffect, useState, useCallback, Fragment } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { getAwsMetrics, getHits } from "@/lib/api";

const ARCH = [
  { key: "vercel", label: "Vercel", color: "#000000" },
  { key: "api_gateway", label: "API Gateway", color: "#6366f1" },
  { key: "lambda_api", label: "Lambda · API", color: "#f59e0b" },
  { key: "sqs", label: "SQS", color: "#14b8a6" },
  { key: "lambda_worker", label: "Lambda · Worker", color: "#ec4899" },
  { key: "bedrock", label: "Bedrock Nova", color: "#8b5cf6" },
  { key: "dynamodb", label: "DynamoDB", color: "#0ea5e9" },
];

// Simplified AWS service glyphs (inherit color via currentColor).
function SvcIcon({ name, size = 22 }) {
  const key = name === "api_gateway" ? "api"
    : (name === "lambda_api" || name === "lambda_worker") ? "lambda"
    : name;
  const common = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round",
  };
  switch (key) {
    case "api": // API Gateway — routing brackets
      return (
        <svg {...common}><rect x="3" y="3" width="18" height="18" rx="3.5" />
          <path d="M8 9l-2.2 3 2.2 3M16 9l2.2 3-2.2 3M13.2 8l-2.4 8" /></svg>
      );
    case "lambda": // Lambda — λ
      return (
        <svg {...common} strokeWidth={2}><path d="M7 5h3l7.2 14.5" /><path d="M12.7 11L7 19.5" /></svg>
      );
    case "sqs": // SQS — message + queue arrow
      return (
        <svg {...common}><rect x="3" y="5" width="13" height="9" rx="1.6" />
          <path d="M3 7.5l6.5 4L16 7.5" /><path d="M8 18.5h11M16.5 16l2.5 2.5-2.5 2.5" /></svg>
      );
    case "bedrock": // Bedrock / Nova — neural hub
      return (
        <svg {...common}><circle cx="12" cy="12" r="3" />
          <path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21M5.8 5.8l2.3 2.3M15.9 15.9l2.3 2.3M18.2 5.8l-2.3 2.3M8.1 15.9l-2.3 2.3" /></svg>
      );
    case "dynamodb": // DynamoDB — stacked tables
      return (
        <svg {...common}><ellipse cx="12" cy="6" rx="7" ry="2.6" /><path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" /><path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" /></svg>
      );
    case "tokens": // generic tokens
      return (
        <svg {...common}><path d="M5 7h14M5 12h14M5 17h9" /></svg>
      );
    case "vercel": // Vercel — brand triangle
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 20h20L12 2z" /></svg>
      );
    default:
      return null;
  }
}

function fmt(value, unit) {
  if (typeof value !== "number") return value;
  let v = value;
  let s;
  if (Math.abs(v) >= 1_000_000) s = (v / 1_000_000).toFixed(1) + "M";
  else if (Math.abs(v) >= 1_000) s = (v / 1_000).toFixed(1) + "k";
  else s = String(v);
  if (unit === "$") return `$${value.toLocaleString()}`;
  return unit ? `${s} ${unit}` : s;
}

function statValue(services, key, label) {
  const svc = services.find((s) => s.key === key);
  const st = svc?.stats?.find((s) => s.label === label);
  return typeof st?.value === "number" ? st.value : 0;
}

export default function InternalsPage() {
  const [data, setData] = useState(null);
  const [hits, setHits] = useState(null);
  const [hits7d, setHits7d] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [res, h, h7] = await Promise.all([getAwsMetrics(10080), getHits(60).catch(() => null), getHits(10080).catch(() => null)]);
      setData(res);
      setHits(h);
      setHits7d(h7);
    } catch (e) {
      setError(e.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll hits every 5s so the live counter visibly climbs during a load test.
  useEffect(() => {
    const id = setInterval(() => {
      getHits(60).then(setHits).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Refresh the 7-day window often too so a fresh visit shows up quickly.
  useEffect(() => {
    const id = setInterval(() => {
      getHits(10080).then(setHits7d).catch(() => {});
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const services = data?.services || [];
  const live = data?.source === "cloudwatch";
  const updated = data?.generated_at ? new Date(data.generated_at).toLocaleTimeString() : "";

  const summary = [
    { label: "API requests", value: statValue(services, "api_gateway", "Total requests"), icon: "api_gateway", color: "#6366f1" },
    { label: "Lambda invocations", value: statValue(services, "lambda_api", "Invocations") + statValue(services, "lambda_worker", "Invocations"), icon: "lambda_api", color: "#f59e0b" },
    { label: "Nova calls", value: statValue(services, "bedrock", "Invocations"), icon: "bedrock", color: "#8b5cf6" },
    { label: "Tokens processed", value: statValue(services, "bedrock", "Input tokens") + statValue(services, "bedrock", "Output tokens"), icon: "tokens", color: "#3b82f6" },
  ];

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <div>
          <div className="section-title" style={{ textAlign: "left", margin: "0 0 6px" }}>Behind the scenes</div>
          <h2 className="section-h" style={{ textAlign: "left", margin: "0 0 6px", fontSize: 26 }}>How MarketSwarm runs on <span className="grad">Vercel + AWS</span></h2>
          <p style={{ color: "var(--g500)", fontSize: 14, maxWidth: 680 }}>
            Every visit lands on Vercel’s edge, then flows through a serverless AWS pipeline.
            These charts show real-time page hits plus how API Gateway, Lambda, SQS and Amazon
            Bedrock Nova handle the load.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
              padding: "5px 12px", borderRadius: 20,
              background: live ? "var(--green-l)" : "var(--yellow-l)",
              color: live ? "var(--green)" : "var(--yellow, #b06000)",
              border: `1px solid ${live ? "var(--green)" : "var(--yellow, #b06000)"}`,
            }}>
              <span className="live-pulse" style={{
                width: 8, height: 8, borderRadius: "50%",
                background: live ? "var(--green)" : "var(--yellow, #b06000)",
              }} />
              {live ? "Live · CloudWatch" : "Sample · from past runs"}
            </span>
            <button onClick={load} className="chip">↻ Refresh</button>
          </div>
          {updated && <div style={{ fontSize: 11, color: "var(--g400)" }}>Updated {updated}</div>}
        </div>
      </div>

      {/* Summary KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 16, marginBottom: 18 }}>
        {summary.map((k) => (
          <div key={k.label} className="card svc-card" style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11, display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0, color: k.color,
              background: `${k.color}14`, border: `1px solid ${k.color}33`,
            }}><SvcIcon name={k.icon} size={22} /></div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--g900)", lineHeight: 1.05 }}>{fmt(k.value)}</div>
              <div style={{ fontSize: 11.5, color: "var(--g500)", marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Architecture flow */}
      <div className="card" style={{ padding: "24px 20px", marginBottom: 24 }}>
        <div className="arch-flow">
          {ARCH.map((node, i) => (
            <Fragment key={node.label}>
              <div className="arch-node">
                <div className="arch-ic" style={{ borderColor: node.color, color: node.color, background: `${node.color}0d` }}><SvcIcon name={node.key} size={24} /></div>
                <div className="arch-label">{node.label}</div>
              </div>
              {i < ARCH.length - 1 && (
                <div className="arch-link"><span className="arch-dot" style={{ animationDelay: `${i * 0.4}s` }} /></div>
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Vercel frontend hits (page views) */}
      <VercelHitsCard hits={hits} hits7d={hits7d} />

      {error && (
        <div className="card" style={{ padding: 20, marginBottom: 24, borderLeft: "4px solid var(--red)", color: "var(--g700)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--g500)" }}>Loading AWS metrics…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
          {services.map((svc) => (
            <ServiceCard key={svc.key} svc={svc} />
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes livePulse {
          0% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(30,142,62,.5); }
          70% { opacity: .6; transform: scale(.85); box-shadow: 0 0 0 6px rgba(30,142,62,0); }
          100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(30,142,62,0); }
        }
        .live-pulse { animation: livePulse 1.7s infinite; }
        .svc-card { transition: transform .15s ease, box-shadow .15s ease; }
        .svc-card:hover { transform: translateY(-3px); box-shadow: 0 8px 22px rgba(60,64,67,.13); }
        .arch-flow { display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap; }
        .arch-node { display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 92px; }
        .arch-ic { width: 48px; height: 48px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-size: 22px; border: 1.5px solid; box-shadow: 0 1px 5px rgba(60,64,67,.08); }
        .arch-label { font-size: 11.5px; font-weight: 600; color: var(--g600); text-align: center; }
        .arch-link { position: relative; width: 46px; height: 2px; border-radius: 2px; margin-bottom: 24px; background: linear-gradient(90deg, var(--g200), var(--g300)); }
        .arch-dot { position: absolute; top: 50%; left: 0; width: 7px; height: 7px; border-radius: 50%; background: var(--green); transform: translate(-50%, -50%); box-shadow: 0 0 7px rgba(30,142,62,.7); animation: archFlow 2.2s linear infinite; }
        @keyframes archFlow { 0% { left: 0; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
      `}</style>
    </div>
  );
}

function ServiceCard({ svc }) {
  const fields = svc.fields || [];
  const primary = fields[0]?.color || "var(--blue)";

  return (
    <div className="card svc-card" style={{ padding: 22, borderTop: `3px solid ${primary}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center",
          justifyContent: "center", color: primary, background: "var(--g50)", border: "1px solid var(--g200)",
        }}><SvcIcon name={svc.key} size={19} /></div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--g900)" }}>{svc.name}</div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--g500)", marginBottom: 14, lineHeight: 1.5 }}>{svc.blurb}</div>

      {/* KPI chips */}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14 }}>
        {(svc.stats || []).map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--g900)", lineHeight: 1.1 }}>{fmt(s.value, s.unit)}</div>
            <div style={{ fontSize: 11, color: "var(--g500)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={150}>
        {svc.chart === "bar" ? (
          <BarChart data={svc.series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--g200)" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--g400)" }} interval={Math.ceil(svc.series.length / 6)} />
            <YAxis tick={{ fontSize: 10, fill: "var(--g400)" }} width={36} />
            <Tooltip contentStyle={{ background: "var(--bg)", border: "1px solid var(--g200)", borderRadius: 8, fontSize: 12 }} />
            {fields.map((f) => (
              <Bar key={f.key} dataKey={f.key} name={f.label} fill={f.color} radius={[3, 3, 0, 0]} animationDuration={900} />
            ))}
          </BarChart>
        ) : (
          <AreaChart data={svc.series} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              {fields.map((f) => (
                <linearGradient key={f.key} id={`grad-${svc.key}-${f.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={f.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={f.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--g200)" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--g400)" }} interval={Math.ceil(svc.series.length / 6)} />
            <YAxis tick={{ fontSize: 10, fill: "var(--g400)" }} width={36} />
            <Tooltip contentStyle={{ background: "var(--bg)", border: "1px solid var(--g200)", borderRadius: 8, fontSize: 12 }} />
            {fields.map((f) => (
              <Area
                key={f.key}
                type="monotone"
                dataKey={f.key}
                name={f.label}
                stackId={svc.chart === "stack" ? "1" : undefined}
                stroke={f.color}
                strokeWidth={2}
                fill={`url(#grad-${svc.key}-${f.key})`}
                animationDuration={1100}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>

      {fields.length > 1 && (
        <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, color: "var(--g500)" }}>
          {fields.map((f) => (
            <span key={f.key}><span className="legend-dot" style={{ background: f.color }} /> {f.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function VercelHitsCard({ hits, hits7d }) {
  const series = hits?.series || [];
  const lifetime = hits?.lifetime_total || 0;
  const recent = hits?.recent_total || 0;
  const rate = hits?.rate_per_min || 0;
  const top = hits?.top_paths || [];
  const window = hits?.window_minutes || 60;
  const series7d = hits7d?.series || [];
  const recent7d = hits7d?.recent_total || 0;
  const COLOR = "#000"; // Vercel brand black
  const ACCENT = "#0070f3";

  return (
    <div className="card svc-card" style={{ padding: 22, borderTop: `3px solid ${COLOR}`, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center",
            justifyContent: "center", background: "var(--g50)", border: "1px solid var(--g200)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={COLOR}><path d="M12 2L2 20h20L12 2z" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--g900)" }}>Vercel · Frontend page hits</div>
            <div style={{ fontSize: 11.5, color: "var(--g500)" }}>Live page views to the deployed app (self-hosted beacon)</div>
          </div>
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700,
          padding: "4px 10px", borderRadius: 20,
          background: "var(--green-l)", color: "var(--green)", border: "1px solid var(--green)",
        }}>
          <span className="live-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />
          Live · updates every 5s
        </span>
      </div>

      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", margin: "14px 0 12px" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--g900)", lineHeight: 1.05 }}>{fmt(lifetime)}</div>
          <div style={{ fontSize: 11, color: "var(--g500)" }}>Total page hits</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--g900)", lineHeight: 1.05 }}>{fmt(recent)}</div>
          <div style={{ fontSize: 11, color: "var(--g500)" }}>Last {window} min</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: ACCENT, lineHeight: 1.05 }}>{rate}</div>
          <div style={{ fontSize: 11, color: "var(--g500)" }}>Hits / min (5-min avg)</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "2px 0 4px" }}>
        <div style={{ fontSize: 11, color: "var(--g500)", fontWeight: 600 }}>Last 7 days</div>
        <div style={{ fontSize: 11, color: "var(--g500)" }}>{fmt(recent7d)} hits</div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={series7d} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="grad-vercel-hits-7d" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ACCENT} stopOpacity={0.45} />
              <stop offset="95%" stopColor={ACCENT} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--g200)" vertical={false} />
          <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--g400)" }} interval={Math.ceil(Math.max(series7d.length, 1) / 7)} />
          <YAxis tick={{ fontSize: 10, fill: "var(--g400)" }} width={36} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "var(--bg)", border: "1px solid var(--g200)", borderRadius: 8, fontSize: 12 }} />
          <Area type="monotone" dataKey="hits" name="Hits" stroke={ACCENT} strokeWidth={2} fill="url(#grad-vercel-hits-7d)" animationDuration={600} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>

      {top.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "var(--g500)", marginBottom: 6, fontWeight: 600 }}>Top pages</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {top.map((p) => (
              <span key={p.path} className="chip" style={{ fontSize: 11 }}>
                <code style={{ background: "transparent", padding: 0 }}>{p.path}</code>
                <span style={{ marginLeft: 6, color: "var(--g500)" }}>{p.hits}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
