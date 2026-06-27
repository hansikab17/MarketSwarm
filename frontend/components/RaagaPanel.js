import { useState, useRef, useEffect } from "react";
import { askRaaga } from "@/lib/api";

/**
 * Raaga — RAG-powered product survey assistant chat panel.
 *
 * Props:
 *  - productName: string
 *  - scenarioId: string — backend Bedrock + Pinecone RAG knowledge base
 *  - onEscalate: (question) => void  — called when user clicks "Ask a human"
 *  - humanAnswers: [{id, answer}] — answers from PM pushed in
 */
export default function RaagaPanel({ productName, scenarioId, onEscalate, humanAnswers }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingHuman, setAwaitingHuman] = useState(false);
  const msgsRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages, busy, awaitingHuman]);

  // When human answers arrive, show them
  useEffect(() => {
    if (!humanAnswers || !humanAnswers.length) return;
    const last = humanAnswers[humanAnswers.length - 1];
    // Avoid duplicate
    if (messages.some(m => m.humanId === last.id)) return;
    setMessages(prev => [...prev, { role: "assistant", text: last.answer, human: true, humanId: last.id }]);
    setAwaitingHuman(false);
  }, [humanAnswers]);

  async function ask(question) {
    if (busy || !question.trim()) return;
    const q = question.trim();
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    setAwaitingHuman(false);

    let answer = "";
    let sources = [];

    // Real-time RAG via backend (Bedrock Titan embeddings + Pinecone + Nova)
    if (scenarioId) {
      console.debug("[Raaga] asking against scenarioId:", scenarioId, "·", q);
      try {
        const resp = await askRaaga(scenarioId, q, productName || "this product");
        answer = resp.answer || "";
        sources = (resp.sources || []).map(s => s.text || s);
      } catch (e) {
        answer = "";
      }
    }

    if (!answer) {
      answer = scenarioId
        ? "I couldn't reach the product knowledge base right now. Please try again, or ask a human specialist."
        : "Product documentation hasn't been set up for this survey yet. Would you like to ask a human specialist?";
    }

    setBusy(false);
    setMessages(prev => [...prev, { role: "assistant", text: answer, escalate: true, sources }]);
  }

  function handleEscalate() {
    const lastQ = [...messages].reverse().find(m => m.role === "user")?.text || "A respondent would like to speak to a human.";
    setMessages(prev => [
      ...prev,
      { role: "user", text: "I'd like a human to answer this." },
      { role: "assistant", text: "I've passed your question to the Marketing Manager. Their reply will appear here as soon as they respond.", human: true }
    ]);
    setAwaitingHuman(true);
    if (onEscalate) onEscalate(lastQ);
  }

  const suggestions = ["What's the battery life?", "How much does it cost?", "Is there a warranty?"];

  return (
    <div className="raaga-panel">
      <div className="raaga-head">
        <div className="raaga-avatar">R</div>
        <div style={{ flex: 1 }}>
          <div className="raaga-name">Raaga <span className="raaga-live">live</span></div>
          <div className="raaga-sub">Product survey assistant</div>
        </div>
      </div>

      <div className="raaga-msgs" ref={msgsRef}>
        {messages.length === 0 && (
          <>
            <div className="raaga-bubble assistant">
              Hi! I&apos;m Raaga. Ask me anything about &ldquo;{productName || "this product"}&rdquo; before you submit your response — price, features, warranty, comfort, anything.
            </div>
            <div className="raaga-suggest">
              {suggestions.map(q => (
                <button key={q} className="raaga-chip" onClick={() => ask(q)}>{q}</button>
              ))}
            </div>
          </>
        )}

        {messages.map((m, i) => (
          <div key={i}>
            <div className={`raaga-bubble ${m.role}${m.human ? " human" : ""}`}>
              {m.human && <div className="raaga-human-tag">🎧 Human specialist</div>}
              {m.text}
              {m.sources && m.sources.length > 0 && (
                <div className="raaga-src">
                  <div className="raaga-src-h">From the documentation:</div>
                  {m.sources.map((s, j) => (
                    <div key={j} className="raaga-src-item">{s.length > 160 ? s.slice(0, 160) + "…" : s}</div>
                  ))}
                </div>
              )}
            </div>
            {m.role === "assistant" && m.escalate && !busy && !awaitingHuman && (
              <button className="raaga-escalate" onClick={handleEscalate}>
                🎧 Not satisfied? Ask a human
              </button>
            )}
          </div>
        ))}

        {busy && (
          <div className="raaga-bubble assistant typing">
            <span className="raaga-dot" /><span className="raaga-dot" /><span className="raaga-dot" />
          </div>
        )}
        {awaitingHuman && (
          <div className="raaga-bubble assistant" style={{ fontStyle: "italic", opacity: 0.8 }}>
            Waiting for a human specialist to reply…
          </div>
        )}
      </div>

      <div className="raaga-inputrow">
        <input className="raaga-input" type="text"
          placeholder={busy ? "Raaga is replying…" : "Ask about the product…"}
          value={input} disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim() && !busy) ask(input); }}
        />
        <button className="raaga-send" onClick={() => { if (input.trim() && !busy) ask(input); }}>➤</button>
      </div>
    </div>
  );
}
