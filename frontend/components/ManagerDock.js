import { useState } from "react";
import { busPost } from "@/lib/swarmBus";

/**
 * ManagerDock — floating FAB + panel at bottom-right for the PM to answer
 * escalated questions from survey respondents.
 *
 * Props:
 *  - threads: [{id, question, from, respondent, answered, answer}]
 *  - onAnswer: (threadId, answer) => void
 */
export default function ManagerDock({ threads, onAnswer }) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState({});

  const pending = threads.filter(t => !t.answered).length;

  function toggle() {
    setOpen(prev => !prev);
  }

  function handleSend(thread) {
    const answer = (drafts[thread.id] || "").trim();
    if (!answer) return;
    busPost({ type: "human-answer", id: thread.id, answer, respondent: thread.respondent });
    if (onAnswer) onAnswer(thread.id, answer);
    setDrafts(prev => ({ ...prev, [thread.id]: "" }));
  }

  return (
    <div className="mgr-dock">
      {/* Panel — shown when open */}
      {open && (
        <div className="mgr-panel">
          <div className="mgr-head">
            <div className="mgr-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 14v-3a9 9 0 0 1 18 0v3"/><path d="M21 16a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 16a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div className="mgr-title">Manager inbox</div>
              <div className="mgr-sub">Live questions escalated by respondents</div>
            </div>
            <button className="mgr-x" onClick={toggle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="mgr-body">
            {threads.length === 0 ? (
              <div className="mgr-empty">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--g300)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/>
                </svg>
                <div style={{ fontWeight: 700, color: "var(--g700)", marginTop: 8 }}>No questions yet</div>
                <div style={{ fontSize: "12.5px", color: "var(--g500)", marginTop: 4, lineHeight: 1.5 }}>
                  When a customer on the survey asks Raaga and escalates to a human, their question appears here for you to answer live.
                </div>
              </div>
            ) : (
              threads.map(t => (
                <div key={t.id} className="mgr-thread">
                  <div className="mgr-from">
                    <span className="mgr-dot" />
                    {t.from || "Respondent"} asked:
                  </div>
                  <div className="mgr-q">&ldquo;{t.question}&rdquo;</div>
                  {t.answered ? (
                    <div className="mgr-answered">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      {" You replied: "}{t.answer}
                    </div>
                  ) : (
                    <div className="mgr-reply">
                      <input className="mgr-input" type="text"
                        placeholder="Type your answer…"
                        value={drafts[t.id] || ""}
                        onChange={(e) => setDrafts(prev => ({ ...prev, [t.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter" && (drafts[t.id] || "").trim()) handleSend(t); }}
                      />
                      <button className="mgr-send" onClick={() => handleSend(t)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Floating action button */}
      <button className={`mgr-fab${open ? " open" : ""}`} onClick={toggle}>
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/>
          </svg>
        )}
        {!open && pending > 0 && <span className="mgr-badge">{pending}</span>}
      </button>
    </div>
  );
}
