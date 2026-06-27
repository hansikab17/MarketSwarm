import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uploadRaagaDocs, uploadRaagaDocsJson, buildRaagaIndex, createScenario } from "@/lib/api";

const CHARACTERISTICS = [["earlyAdopter","Early adopters"],["priceSensitive","Price-sensitive"],["brandLoyal","Brand-loyal"],["riskAverse","Risk-averse"]];

function fmtSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Slider({ label, icon, value, min, max, step, fmt, hint, onChange }) {
  return (
    <div className="slider">
      <div className="slider-top">
        {icon && <span>{icon}</span>}
        <span className="slider-label">{label}</span>
        <span className="slider-val">{fmt ? fmt(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      {hint && <div className="slider-hint">{hint}</div>}
    </div>
  );
}

export default function ConfigModal({ config, onChange, onSave, onCancel, ragDocs, onRagDocsChange, ragBuilt, onRagBuiltChange, scenarioId, onScenarioIdChange }) {
  const fileRef = useRef(null);
  const docRef = useRef(null);
  const multiDocRef = useRef(null);
  const [buildingRag, setBuildingRag] = useState(false);
  const [buildStatus, setBuildStatus] = useState("");
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const set = (key, val) => onChange({ ...config, [key]: val });

  return createPortal(
    <div className="overlay" onClick={onCancel}>
      <div className="modal cfg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-ic">🎛️</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Configure a product</div>
            <div style={{ fontSize: 13, color: "var(--g500)" }}>Set the product, the human/agent mix and the audience</div>
          </div>
          <button className="modal-x" onClick={onCancel}>✕</button>
        </div>

        <div className="cfg-body" id="cfgBody">
          <div className="cfg-grid">
            {/* ======== LEFT COLUMN: Product + Documentation ======== */}
            <div className="cfg-col">
              <Section icon="🎯" title="Product to market" sub="What humans & agents will judge" />
              <div className="form-row">
                <label className="form-label">Product name</label>
                <input className="form-input" type="text" placeholder="e.g. AuroraBuds — wireless sleep earbuds" value={config.productName} onChange={(e) => set("productName", e.target.value)} />
              </div>
              <div className="form-row">
                <label className="form-label">Product description</label>
                <textarea className="form-textarea" placeholder="Describe what the product is, who it's for, and why it's new…" value={config.productDesc} onChange={(e) => set("productDesc", e.target.value)} />
              </div>
              <div className="form-row">
                <label className="form-label">Product image</label>
                <div className="prod-img-wrap">
                  {config.productImg ? (
                    <img src={config.productImg} className="prod-img" alt="Product" />
                  ) : (
                    <div className="prod-img-ph">🎯<div style={{ fontSize: 12, color: "var(--g500)", marginTop: 6 }}>No image yet</div></div>
                  )}
                </div>
                <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => set("productImg", ev.target.result);
                  reader.readAsDataURL(f);
                }} />
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button type="button" className="chip" onClick={() => fileRef.current?.click()}>{config.productImg ? "Replace image" : "Upload image"}</button>
                  {config.productImg && <button type="button" className="chip" onClick={() => set("productImg", null)}>Remove</button>}
                </div>
              </div>

              <label className="form-label" style={{ marginTop: 14 }}>Human survey options</label>
              <div className="ballot-preview">
                {[["Yes, will buy","var(--green)"],["Never this product","var(--red)"],["Not sure","var(--yellow)"]].map(([text,color]) => (
                  <div key={text} className="ballot-opt" style={{ borderColor: color }}>
                    <span className="legend-dot" style={{ background: color }} /> {text}
                  </div>
                ))}
              </div>

              <div className="divider" style={{ marginTop: 32 }} />

              {/* ---- Product documentation ---- */}
              <Section icon="📄" title="Product documentation" sub="Upload documents for Raaga RAG — customers can ask questions during the survey" style={{ marginTop: 44 }} />
              <div className="form-row">
                {/* Uploaded docs list */}
                {ragDocs && ragDocs.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {ragDocs.map((d, i) => (
                      <div key={d.doc_id || i} style={{ padding: "8px 10px", background: "var(--g100)", borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "var(--blue)" }}>📄</span>
                          <span style={{ flex: 1, fontWeight: 500 }}>{d.name}</span>
                          <span style={{ color: "var(--g500)", fontSize: 11 }}>{fmtSize(d.size || 0)}</span>
                          <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 14, padding: 2 }}
                            onClick={() => onRagDocsChange(ragDocs.filter((_, j) => j !== i))}>✕</button>
                        </div>
                        {d.content && (
                          <div style={{ marginTop: 6, color: "var(--g600)", fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap", maxHeight: 64, overflow: "hidden", borderLeft: "2px solid var(--g300)", paddingLeft: 8 }}>
                            {d.content.slice(0, 220).replace(/\n{2,}/g, "\n")}{d.content.length > 220 ? "…" : ""}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload multiple files (raw — parsed on the backend) */}
                <input type="file" accept=".txt,.md,.pdf,.docx" multiple ref={multiDocRef} style={{ display: "none" }} onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  const newDocs = files.map((f) => ({
                    doc_id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    name: f.name,
                    size: f.size,
                    file: f,
                  }));
                  onRagDocsChange([...(ragDocs || []), ...newDocs]);
                  if (onRagBuiltChange) onRagBuiltChange(false);
                  setBuildStatus("");
                  e.target.value = "";
                }} />

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button type="button" className="chip" disabled={uploadingDocs} onClick={() => multiDocRef.current?.click()}>
                    📎 Upload documents
                  </button>
                  {ragDocs && ragDocs.length > 0 && (
                    <button type="button" className={`chip${ragBuilt ? " active" : ""}`} disabled={buildingRag}
                      onClick={async () => {
                        setBuildingRag(true);
                        setBuildStatus("Creating scenario...");
                        try {
                          // Create a temporary scenario to hold the docs
                          let sid = scenarioId;
                          if (!sid) {
                            const sc = await createScenario({
                              name: config.productName || "Unnamed product",
                              product_name: config.productName || "Unnamed product",
                              product_description: config.productDesc || "",
                              product_price: config.price,
                              price_change_pct: 0,
                              product_market_fit: config.fit,
                              marketing_push: config.marketing,
                              innovation: config.innovation,
                              brand_strength: config.brandFit,
                              history_signal: config.history,
                              target_category: "all",
                              target_gender: "all",
                              offer: { type: "none", value_pct: 0 },
                              channel: "all",
                            });
                            sid = sc.scenario_id;
                            if (onScenarioIdChange) onScenarioIdChange(sid);
                          }

                          setBuildStatus("Uploading documents...");
                          const files = ragDocs.map((d) => d.file).filter(Boolean);
                          const textDocs = ragDocs.filter((d) => !d.file && d.content).map((d) => ({ name: d.name, content: d.content }));
                          if (textDocs.length) await uploadRaagaDocsJson(sid, textDocs);
                          if (files.length) await uploadRaagaDocs(sid, files);

                          setBuildStatus("Building RAG index...");
                          const result = await buildRaagaIndex(sid);

                          if (onRagBuiltChange) onRagBuiltChange(true);
                          setBuildStatus(result.reused
                            ? `✓ Ready — reused existing index (${result.num_passages} passages, ${result.num_documents} doc${result.num_documents > 1 ? "s" : ""})`
                            : `✓ Built — ${result.num_passages} passages from ${result.num_documents} doc${result.num_documents > 1 ? "s" : ""}`);
                        } catch (err) {
                          setBuildStatus(`✕ Build failed: ${err.message}`);
                        }
                        setBuildingRag(false);
                      }}>
                      {buildingRag ? "⏳ Updating…" : "✓ Update Product"}
                    </button>
                  )}
                  {ragDocs && ragDocs.length > 0 && (
                    <span style={{ fontSize: 11, color: "var(--g500)" }}>
                      {ragDocs.length} doc{ragDocs.length > 1 ? "s" : ""} · {fmtSize(ragDocs.reduce((s, d) => s + (d.size || 0), 0))} total
                    </span>
                  )}
                </div>
                {buildStatus && (
                  <div className="note" style={{ marginTop: 8, color: buildStatus.startsWith("✕") ? "var(--red)" : buildStatus.startsWith("✓") ? "var(--green)" : "var(--g600)" }}>
                    {buildStatus}
                  </div>
                )}
                <div className="note" style={{ marginTop: 10 }}>Upload product docs (.txt, .md, .pdf, .docx), then click &quot;Update Product&quot; to index them. Raaga will use Bedrock to answer customer questions in real-time.</div>
              </div>
            </div>

            {/* ======== RIGHT COLUMN: Audience + Context ======== */}
            <div className="cfg-col">
              {/* ---- Human vs Agent ---- */}
              <Section icon="👥" title="Human vs Agent mix" sub="Blend real human responses with the agent swarm" />
              <Slider label="Human respondents" value={config.humanPct} min={0} max={100} step={5}
                fmt={(v) => `${v}% human / ${100-v}% agent`}
                hint="Humans answer the 3-option survey; their verdict is reconciled with the agent swarm."
                onChange={(v) => set("humanPct", v)} />

              <div className="divider" />

              {/* ---- Panel size ---- */}
              <Section icon="👥" title="Panel size" sub="How many synthetic customers to simulate" />
              <Slider label="Number of customers" value={config.count} min={50} max={50000} step={50}
                fmt={(v) => v.toLocaleString()} onChange={(v) => set("count", v)} />
              <div className="chips" style={{ marginTop: -8, marginBottom: 4 }}>
                {[500,1000,5000,10000,20000].map(v => (
                  <button key={v} type="button" className={`chip${config.count===v?" active":""}`} onClick={() => set("count", v)}>{v.toLocaleString()}</button>
                ))}
              </div>

              <div className="divider" />

              {/* ---- Loops for harness ---- */}
              <Section icon="🔁" title="Loops for harness" sub="Repeated trials on a sample to measure verdict confidence" />
              <Slider label="Number of loops" value={config.loops ?? 1} min={1} max={100} step={1}
                fmt={(v) => `${v}×`}
                hint="Each sampled customer is judged this many times; the spread becomes a confidence interval."
                onChange={(v) => set("loops", v)} />
              <Slider label="Confidence sample" value={Math.min(config.confidenceSample ?? 500, config.count)} min={0} max={Math.min(config.count, 2000)} step={50}
                fmt={(v) => v === 0 ? "off" : v.toLocaleString()}
                hint="How many of the panel get looped. The rest run a single pass at full resolution."
                onChange={(v) => set("confidenceSample", v)} />
              {(() => {
                const loops = config.loops ?? 1;
                const sample = Math.min(config.confidenceSample ?? 500, config.count);
                const extraCalls = Math.max(0, sample * (loops - 1));
                const extraCost = extraCalls * 0.00008;
                const over = extraCost > 5;
                const base = { fontSize: 12.5, padding: "9px 12px", borderRadius: 8, marginTop: -8, marginBottom: 4, lineHeight: 1.5 };
                if (loops <= 1 || sample <= 0)
                  return <div style={{ ...base, background: "var(--g100)", color: "var(--g500)" }}>Looping off — single pass only, no extra cost.</div>;
                return (
                  <div style={{ ...base, background: over ? "#fce8e6" : "#e6f4ea", color: over ? "#c5221f" : "#137333", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span>≈ <b>{extraCalls.toLocaleString()}</b> extra agent calls → <b>${extraCost.toFixed(2)}</b> added (real mode)</span>
                    {over && <span style={{ fontWeight: 600 }}>⚠ over the $5 run cap — lower loops or sample</span>}
                  </div>
                );
              })()}

              <div className="divider" />

              {/* ---- Demographics ---- */}
              <Section icon="🎭" title="Demographics" sub="Who is in the market" />
              <Slider label="Gender split" value={config.genderSplit} min={0} max={100} step={1}
                fmt={(v) => `${v}% F / ${100-v}% M`} onChange={(v) => set("genderSplit", v)} />
              <div className="row">
                <div>
                  <Slider label="Youngest age" value={config.ageMin} min={18} max={config.ageMax} step={1}
                    fmt={(v) => String(v)} onChange={(v) => set("ageMin", v)} />
                </div>
                <div>
                  <Slider label="Oldest age" value={config.ageMax} min={config.ageMin} max={80} step={1}
                    fmt={(v) => String(v)} onChange={(v) => set("ageMax", v)} />
                </div>
              </div>

              <div className="divider" />

              {/* ---- Characteristics ---- */}
              <Section icon="✨" title="Characteristics" sub="Behavioural traits present in the cohort" />
              <div className="chips">
                {CHARACTERISTICS.map(([key, label]) => (
                  <button key={key} type="button" className={`chip${config.chars[key]?" active":""}`}
                    onClick={() => set("chars", { ...config.chars, [key]: !config.chars[key] })}>{label}</button>
                ))}
              </div>

              <div className="divider" />

              {/* ---- Budget & price ---- */}
              <Section icon="💰" title="Budget & price" sub="Affordability drives price sensitivity" />
              <Slider label="Average customer budget" value={config.budget} min={10} max={500} step={5}
                fmt={(v) => `$${v}`} onChange={(v) => set("budget", v)} />
              <Slider label="New product price" value={config.price} min={5} max={500} step={1}
                fmt={(v) => `$${v}`}
                hint={config.price > config.budget ? "Priced above average budget — expect resistance" : "Within reach of the average budget"}
                onChange={(v) => set("price", v)} />

              <div className="divider" />

              {/* ---- Product & sales context ---- */}
              <Section icon="🎯" title="Product & sales context" sub="The launch you want to validate" />
              <Slider label="Product–market fit" value={config.fit} min={0} max={100} step={1}
                fmt={(v) => `${v}/100`} hint="How well the product matches what this cohort wants" onChange={(v) => set("fit", v)} />
              <Slider label="Marketing push" value={config.marketing} min={0} max={100} step={1}
                fmt={(v) => `${v}/100`} hint="Reach and intensity of the go-to-market campaign" onChange={(v) => set("marketing", v)} />
              <Slider label="Innovation / novelty" value={config.innovation} min={0} max={100} step={1}
                fmt={(v) => `${v}/100`} hint="Rewards early-adopter cohorts, can deter the risk-averse" onChange={(v) => set("innovation", v)} />
              <Slider label="Brand strength" value={config.brandFit} min={0} max={100} step={1}
                fmt={(v) => `${v}/100`} hint="Reassures brand-loyal and risk-averse customers" onChange={(v) => set("brandFit", v)} />

              <div className="divider" />

              {/* ---- Historical signal ---- */}
              <Section icon="🗄️" title="Historical signal" sub="What past launches like this tell us" />
              <div className="hist-row">
                {[["good","Strong history","var(--green)"],["mixed","Mixed history","var(--yellow)"],["poor","Poor history","var(--red)"]].map(([val,label,color]) => (
                  <button key={val} className="hist-btn" onClick={() => set("history", val)}
                    style={{ borderColor: config.history===val ? color : undefined, background: config.history===val ? color+"14" : undefined, color: config.history===val ? color : undefined }}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="note">A weak history pulls predicted demand down and can flip the verdict to failure.</div>
            </div>
          </div>
        </div>

        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-confirm" onClick={onSave}>✓ Save configuration</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Section({ icon, title, sub, style }) {
  return (
    <div className="sec" style={{ marginTop: 22, ...style }}>
      <div className="sec-h"><span>{icon}</span><span className="sec-t">{title}</span></div>
      {sub && <div className="sec-s">{sub}</div>}
    </div>
  );
}
