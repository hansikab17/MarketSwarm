import { useRef } from "react";
import { createPortal } from "react-dom";

const CHARACTERISTICS = [["earlyAdopter","Early adopters"],["priceSensitive","Price-sensitive"],["brandLoyal","Brand-loyal"],["riskAverse","Risk-averse"]];

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

export default function ConfigModal({ config, onChange, onSave, onCancel }) {
  const fileRef = useRef(null);
  const docRef = useRef(null);
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

              <div className="divider" />

              {/* ---- Product documentation ---- */}
              <Section icon="📄" title="Product documentation" sub="Used by Raaga to answer customer questions during the survey (RAG)" />
              <div className="form-row">
                <textarea className="form-textarea" style={{ minHeight: 120, fontSize: 12.5, fontFamily: "monospace" }}
                  placeholder="Paste product documentation here, or upload a .txt/.md file below..."
                  value={config.productDoc || ""}
                  onChange={(e) => set("productDoc", e.target.value)} />
                <input type="file" accept=".txt,.md,.text,text/plain" ref={docRef} style={{ display: "none" }} onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => set("productDoc", ev.target.result);
                  reader.readAsText(f);
                }} />
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button type="button" className="chip" onClick={() => docRef.current?.click()}>
                    {config.productDoc ? "Replace document" : "Upload .txt / .md"}
                  </button>
                  {config.productDoc && <button type="button" className="chip" onClick={() => set("productDoc", "")}>Clear</button>}
                  {config.productDoc && <span style={{ fontSize: 11, color: "var(--g500)", alignSelf: "center" }}>
                    {config.productDoc.length.toLocaleString()} chars loaded
                  </span>}
                </div>
                <div className="note" style={{ marginTop: 10 }}>Raaga uses this text to answer customer questions via RAG retrieval during the live survey.</div>
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

function Section({ icon, title, sub }) {
  return (
    <div className="sec">
      <div className="sec-h"><span>{icon}</span><span className="sec-t">{title}</span></div>
      {sub && <div className="sec-s">{sub}</div>}
    </div>
  );
}
