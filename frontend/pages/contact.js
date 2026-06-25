import { useState } from "react";

export default function ContactPage() {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const cards = [
    { icon: "📧", title: "Email", text: "support@marketswarm.ai" },
    { icon: "💬", title: "Live chat", text: "Available 9 AM – 6 PM IST" },
    { icon: "📖", title: "Documentation", text: "docs.marketswarm.ai" },
  ];

  return (
    <div className="fade-in">
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h1 className="section-h" style={{ marginBottom: 4 }}>Contact us</h1>
        <p style={{ color: "var(--g500)", fontSize: 14, marginBottom: 28 }}>Questions, feedback or partnership inquiries — we'd love to hear from you.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
          {cards.map(c => (
            <div key={c.title} className="card" style={{ padding: "20px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: "var(--g500)" }}>{c.text}</div>
            </div>
          ))}
        </div>

        {submitted ? (
          <div className="card" style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2>Thank you!</h2>
            <p style={{ color: "var(--g500)" }}>Your feedback has been submitted. We'll get back to you soon.</p>
            <button className="btn-primary" onClick={() => { setSubmitted(false); setRating(0); }}>Send another</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 28 }}>
            <h2 className="section-h" style={{ marginBottom: 16 }}>Send feedback</h2>
            <div className="form-row">
              <label className="form-label">Your name</label>
              <input className="form-input" type="text" placeholder="Jane Doe" />
            </div>
            <div className="form-row">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="jane@example.com" />
            </div>
            <div className="form-row">
              <label className="form-label">Message</label>
              <textarea className="form-textarea" placeholder="Your feedback or question…" rows={4} />
            </div>
            <div className="form-row">
              <label className="form-label">Rating</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setRating(s)}
                    style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: s <= rating ? "var(--yellow)" : "var(--g300)" }}>
                    ★
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={() => setSubmitted(true)}>Submit feedback</button>
            <div className="note" style={{ marginTop: 10, textAlign: "center" }}>Demo only — feedback is not persisted.</div>
          </div>
        )}
      </div>
    </div>
  );
}
