/**
 * BroadcastChannel wrapper for cross-tab communication.
 * Channel: "market-swarm-bus"
 *
 * Message types:
 *  FROM Simulator → Survey:
 *   - product-sync: { type, product }
 *   - run-started:  { type, product }
 *   - run-ended:    { type }
 *   - human-answer: { type, id, answer, respondent }
 *
 *  FROM Survey → Simulator:
 *   - presence-ping: { type }
 *   - human-vote:    { type, vote, respondent, name }
 *   - escalation:    { type, id, question, from, respondent }
 */

const CHANNEL_NAME = "market-swarm-bus";

let bus = null;

export function getBus() {
  if (typeof window === "undefined") return null;
  if (!bus) {
    try { bus = new BroadcastChannel(CHANNEL_NAME); } catch (e) { bus = null; }
  }
  return bus;
}

export function busPost(msg) {
  const b = getBus();
  if (b) {
    try { b.postMessage(msg); } catch (e) { /* ignore */ }
  }
}
